import {showFileTree, highlightSelectedFile, showSingleFile, clearFileTree} from '../src/file-view.js'
import { setActiveDirectoryPath, setActiveFilePath, activeDirectory, activeFile, handleEditorInput, saveConfig } from '../src/index.js';

const {exists, writeTextFile, readTextFile, readDir, renameFile, createDir, removeDir} = window.__TAURI__.fs;
const {open, save, message} = window.__TAURI__.dialog;
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
    await invoke('get_edit_time', {path: activeDirectory}).then((response) => editTime = response, () => {});
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

    showFileTree(directories, activeDirectory);
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

export async function createNewFolder() {
    if (!activeDirectory) return;
    
    var folderName = activeDirectory + "\\New Folder";
    for (var i = 0; i < Infinity; i++) {
        if (!await pathExists(folderName)) break;
        folderName = activeDirectory + `\\New Folder ${i + 1}`;
    }

    await createDir(folderName);

    reloadDirectory();
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
    // reloadDirectory();
    // tryOpenActiveFile();
}

export async function renameFolder(oldPath, newPath) {
    var finalPath = newPath;
    for (var i = 0; i < Infinity; i++) {
        if (! await pathExists(finalPath)) break;
        finalPath = newPath + ` ${i + 1}`;
    }

    await invoke('rename_dir', {oldPath: oldPath, newPath: newPath});
    
    if (activeFile.includes(oldPath)) {
        activeFile.replace(oldPath, newPath);
    }

    tryOpenActiveFile();
}

export async function moveFileTo(oldPath, newPath) {
    if (newPath == oldPath.substring(0,oldPath.lastIndexOf("\\"))) return;

    var fileName = oldPath.replace(/^.*[\\\/]/, '');
    var fileExtension = /[^.]*$/.exec(fileName)[0];
    var filePath = newPath + `\\${fileName}`;
    for (var i = 0; i < Infinity; i++) {
        if (!await pathExists(filePath)) break;
        filePath = newPath + `\\${fileName.replace(/\.[^/.]+$/, "")} ${i + 1}.${fileExtension}`;
    }

    await invoke('move_to', {oldPath: oldPath, newPath: filePath});

    setActiveFile(filePath);
    reloadDirectory();
    tryOpenActiveFile();
}

export async function moveFolderTo(oldPath, newPath) {
    if (!await pathExists(oldPath)) return;

    if (newPath == oldPath.substring(0,oldPath.lastIndexOf("\\"))) return;
    if (newPath.includes(oldPath)) return;

    var folderName = newPath + `\\${oldPath.replace(/^.*[\\\/]/, '')}`;
    for (var i = 0; i < Infinity; i++) {
        if (!await pathExists(folderName)) break;
        folderName = newPath + `\\${oldPath.replace(/^.*[\\\/]/, '')} ${i + 1}`;
    }

    await invoke('move_to', {oldPath: oldPath, newPath: folderName});

    tryOpenActiveFile();
    reloadDirectory();
}

export async function deleteFolder(path) {
    if (!await pathExists(activeFile)) return;
    await removeDir(path);
    tryOpenActiveFile();
    reloadDirectory();
}

export async function pathExists(path) {
    var pathExists = false;
    await exists(path).then(function(exists) { pathExists = exists });
    return pathExists;
}

export async function moveFolderToTrash(path) {
    moveFolderTo(path, `${activeDirectory}\\.trash`);
}

export async function moveFileToTrash(path) {
    moveFileTo(path, `${activeDirectory}\\.trash`)
}