import {showFileTree, highlightSelectedFile, showSingleFile, clearFileTree} from '../src/file-view.js'
import { setActiveDirectoryPath, setActiveFilePath, activeDirectory, activeFile, handleEditorInput, saveConfig } from '../src/index.js';

const {exists, writeTextFile, readTextFile, readDir, removeFile, renameFile} = window.__TAURI__.fs;
const {open, save, confirm, message} = window.__TAURI__.dialog;
const {invoke} = window.__TAURI__.tauri;

const editor = document.getElementById("text-editor");
const fileName = document.getElementById("file-name");
const directoryEntriesLimit = 2000;

var entriesFound = 0;
var lastDirectoryEditTime = -1;
var isRenaming = false;

export async function selectNewFile() {
    var file = await open({
        multiple: false,
        filters: [{name: "", extensions: ['txt', 'md'] }]
    });
    if (!file) return;

    setActiveDirectoryPath(null);
    setActiveFile(file);
    displayActiveDirectory();
}

export function setActiveFile(path) {
    setActiveFilePath(path);
    tryOpenActiveFile();
    saveConfig();
} 

export async function selectNewDirectory() {
    var newDirectory = await open({ directory: true});
    if (!newDirectory) return;

    setActiveDirectoryPath(newDirectory);
    
    reloadDirectory();
    removeActiveFile();
    saveConfig();
}

async function reloadDirectory() {
    lastDirectoryEditTime = -1;
    displayActiveDirectory();
}

export async function displayActiveDirectory() {
    if (!activeDirectory) {
        if (activeFile) showSingleFile(activeFile);
        return;
    }

    if (! await pathExists(activeDirectory)) {
        clearFileTree(); 
        setActiveDirectoryPath(null);
        setActiveFilePath(null);
        return;
    }

    var editTime;
    await invoke('get_edit_time', {path: activeDirectory}).then((response) => editTime = response, (error) => {});
    if (editTime == lastDirectoryEditTime) return;
    lastDirectoryEditTime = editTime;
    
    entriesFound = 0;
    var directories;
    await readDir(activeDirectory, {recursive: false }).then(function(entries) {
        directories = entries;
    });
    await populateChildren(directories)

    if (entriesFound > directoryEntriesLimit) {
        await message(`Selected directory is too big. You can only have ${directoryEntriesLimit} files and subfolders in the directory.`, { title: 'leto', type: 'error' });
        setActiveDirectoryPath(null);
        removeActiveFile();
        return;
    }

    showFileTree(directories);
    if (activeFile) highlightSelectedFile(activeFile);
}

async function populateChildren(entries) {
    for (var i = 0; i < entries.length; i++) {
        if (++entriesFound > directoryEntriesLimit) return;
        if (entries[i].children == null) continue;
        await readDir(entries[i].path, {recursive: false }).then(function(ent) {
                entries[i].children = ent;
            });
        await populateChildren(entries[i].children);
    }
}

export function removeActiveFile() {
    setActiveFilePath(null);
    editor.value = "";
    editor.disabled = true;
    handleEditorInput();
    reloadDirectory();
}

export async function tryOpenActiveFile() {
    try {
        await openActiveFile();
    }
    catch {
        removeActiveFile();
    }
}

async function openActiveFile() {
if (!activeFile || ! await pathExists(activeFile)) {
        removeActiveFile();
        return;
    }

    if (activeDirectory != null) highlightSelectedFile(activeFile);
    editor.value = await readTextFile(activeFile);
    editor.disabled = false;
    handleEditorInput();

    fileName.value = activeFile.replace(/^.*[\\\/]/, '').replace(/\.[^/.]+$/, "");
}



export async function saveActiveFile() {
    if (!activeFile) return;
    await writeTextFile(activeFile, editor.value);
}

export async function exportActiveFile() {
    if (!activeFile) return;

    var exportPath;
    await save({
        filters: [{name: "", extensions: ['txt', 'md']}]
    }).then(function(path) {exportPath = path});
    if (exportPath == null) return;

    await writeTextFile(exportPath, editor.value);
}

export async function deleteActiveFile() {
    if (!activeFile) return;

    if (! await confirm('Are you sure you want to delete this file?', 'leto')) return;

    await removeFile(activeFile);

    removeActiveFile();
}

export async function createFileInDirectory() {
    if (!activeDirectory) {
        createFileAnywhere();
        return;
    }
    
    setActiveFilePath(activeDirectory + `\\new.md`);
    for (var i = 0; i < Infinity; i++) {
        if (!await pathExists(activeFile)) break;
        setActiveFilePath(activeDirectory + `\\new ${i + 1}.md`);
    }   

    await writeTextFile(activeFile, "");

    reloadDirectory();
    tryOpenActiveFile();  
}

export async function createFileAnywhere() {
    var exportPath;
    await save({
        filters: [{name: "", extensions: ['md', 'txt']}]
    }).then(function(path) {exportPath = path});
    if (exportPath == null) return;

    await writeTextFile(exportPath, "");
    setActiveFilePath(exportPath);
    reloadDirectory();
    tryOpenActiveFile();
}

export async function tryChangeFileName() {
    if (isRenaming) return;
    isRenaming = true;
    await changeFileName().then(isRenaming = false);
}

async function changeFileName() {
    if (activeFile == null) return;
    
    var newFile = activeFile.substring(0,activeFile.lastIndexOf("\\")+1) + fileName.value + ".md";
    
    var success = ! await pathExists(newFile);
    if (!success) return;

    await renameFile(activeFile, newFile).then(function(){success = true}, function(){success = false});
    if (!success) {
        fileName.value = activeFile.replace(/^.*[\\\/]/, '').replace(/\.[^/.]+$/, "");
        return;
    }

    setActiveFilePath(newFile);
    reloadDirectory();
    tryOpenActiveFile();
}

export async function pathExists(path) {
    var pathExists = false;
    await exists(path).then(function(exists) { pathExists = exists });
    return pathExists;
}