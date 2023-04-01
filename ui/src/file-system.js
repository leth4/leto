import {showFileTree, highlightSelectedFile, clearFileTree, setFileToRename} from '../src/file-view.js'
import { handleEditorInput, saveConfig } from '../src/index.js';
import { resetBuffers } from '../src/undo-buffer.js'

const {exists, writeTextFile, readTextFile, readDir, createDir, removeDir} = window.__TAURI__.fs;
const {open, save, message} = window.__TAURI__.dialog;
const {invoke} = window.__TAURI__.tauri;

const editor = document.getElementById("text-editor");
const directoryEntriesLimit = 2000;

export var activeFile;
export var activeDirectory;

var entriesFound = 0;
var lastDirectoryEditTime = -1;

export function setActiveDirectory(path) {
    activeDirectory = path;
    displayActiveDirectory();
}

export function setActiveFile(path) {
    activeFile = path;
    tryOpenActiveFile();
    saveConfig();
} 

export async function selectNewDirectory() {
    var newDirectory = await open({ directory: true});
    if (!newDirectory) return;

    activeDirectory = newDirectory;
    
    reloadDirectory();
    removeActiveFile();
    saveConfig();
}

async function reloadDirectory() {
    lastDirectoryEditTime = -1;
    await displayActiveDirectory();
}

export async function displayActiveDirectory() {
    if (!activeDirectory) {
        return;
    }

    if (! await pathExists(activeDirectory)) {
        clearFileTree(); 
        activeDirectory = null;
        activeFile = null;
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
        activeDirectory = null;
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
    activeFile = null;
    editor.value = "";
    editor.disabled = true;
    handleEditorInput();
    reloadDirectory();
}

export async function tryOpenActiveFile() {
    editor.disabled = true;
    try {
        await openActiveFile();
        resetBuffers();
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
        return;
    }
    
    activeFile = activeDirectory + `\\new.md`;
    for (var i = 0; i < Infinity; i++) {
        if (!await pathExists(activeFile)) break;
        activeFile = activeDirectory + `\\new ${i + 1}.md`;
    }   

    await writeTextFile(activeFile, "");

    await reloadDirectory();
    tryOpenActiveFile();
    setFileToRename(activeFile);
}

export async function renameFile(filePath, newName) {
    var newFile = `${filePath.substring(0,filePath.lastIndexOf("\\")+1)}${newName}.md`;
    if (newFile == filePath) return;
    for (var i = 0; i < Infinity; i++) {
        if (! await pathExists(newFile)) break;
        newFile = `${filePath.substring(0,filePath.lastIndexOf("\\")+1)}${newName} ${i + 1}.md`;
    }

    await invoke('rename', {oldPath: filePath, newPath: newFile});
    if (activeFile == filePath)
    activeFile = newFile;
    console.log("UNCALLED");

    reloadDirectory();
    tryOpenActiveFile();
}

export async function renameFolder(oldPath, newName) {
    var newPath = oldPath.substring(0,oldPath.lastIndexOf("\\") + 1) + newName;
    var finalPath = newPath;
    for (var i = 0; i < Infinity; i++) {
        if (! await pathExists(finalPath)) break;
        finalPath = newPath + ` ${i + 1}`;
    }

    await invoke('rename', {oldPath: oldPath, newPath: newPath});
    
    if (activeFile && activeFile.includes(oldPath)) {
        activeFile.replace(oldPath, newPath);
    }

    reloadDirectory();
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