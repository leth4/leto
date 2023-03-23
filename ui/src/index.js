import {showFileTree, highlightSelectedFile, showSingleFile, openInExplorer, clearTree} from '../src/file-view.js'
import {closewindow, minimizeWindow, togglePrefs, toggleSidebar, populateFonts, populateThemes, themes, applyTheme, applyFont, toggleFullscreen} from '../src/window-actions.js'
import {selectLine, cutLine, moveUp, moveDown, createCheckbox, deselect, copyLineUp, copyLineDown, jumpUp, jumpDown} from '../src/text-actions.js'

const {appWindow} = window.__TAURI__.window;
const {exists, writeTextFile, readTextFile, readDir, removeFile, renameFile} = window.__TAURI__.fs;
const {open, save, confirm, message} = window.__TAURI__.dialog;
const {appConfigDir} = window.__TAURI__.path;
const {invoke} = window.__TAURI__.tauri;

var focused = true;
var activeFile;
var activeDirectory;
export var currentTheme = 0;
export var currentFont = 0;
var fontSize = 20;

var entriesFound = 0;
const entriesLimit = 2000;
var previousEditTime = -1;

const editor = document.getElementById("text-editor");
const preview = document.getElementById("text-preview");
const fileName = document.getElementById("file-name");
const themeSelector = document.getElementById("theme-selector");
const fontSelector = document.getElementById("font-selector");

await loadConfig();
populateFonts();
populateThemes();

document.addEventListener('contextmenu', event => event.preventDefault());
editor.addEventListener('input', () => handleEditorInput(), false);
editor.addEventListener('scroll', () => handleEditorScroll(), false);
themeSelector.addEventListener('change', () => setTheme(themeSelector.value), false);
fontSelector.addEventListener('change', () => setFont(fontSelector.value), false);
fileName.addEventListener('input', () => changeFileName(), false);

window.onkeydown = (e) => {
    if (!focused) return;

    if (e.ctrlKey && e.shiftKey && e.code === 'KeyO') {
        selectNewDirectory();
    }
    else if (e.ctrlKey && e.code === 'KeyO') {
        selectNewFile();
    }
    else if (e.ctrlKey && e.shiftKey && e.code === 'KeyS') {
        exportActiveFile();
    }
    else if (e.ctrlKey && e.code === 'KeyR') {
        toggleSpellcheck();
    }
    else if (e.ctrlKey && e.code === 'KeyB') {
        toggleSidebar();
    }
    else if (e.ctrlKey && e.code === 'KeyX') {
        if (editor.selectionStart != editor.selectionEnd) return;
        cutLine();
        handleEditorInput();
    }
    else if (e.altKey && e.shiftKey && e.code === 'ArrowUp') {
        if (editor.selectionStart != editor.selectionEnd) return;
        copyLineUp();
        handleEditorInput();
    }
    else if (e.altKey && e.shiftKey && e.code === 'ArrowDown') {
        if (editor.selectionStart != editor.selectionEnd) return;
        copyLineDown();
        handleEditorInput();
    }
    else if (e.altKey && e.code === 'ArrowUp') {
        if (editor.selectionStart != editor.selectionEnd) return;
        moveUp();
        handleEditorInput();
    }
    else if (e.altKey && e.code === 'ArrowDown') {
        if (editor.selectionStart != editor.selectionEnd) return;
        moveDown();
        handleEditorInput();
    }
    else if (e.ctrlKey && e.code === 'ArrowUp') {
        jumpUp();
        handleEditorInput();
    }
    else if (e.ctrlKey && e.code === 'ArrowDown') {
        jumpDown();
        handleEditorInput();
    }
    else if (e.ctrlKey && e.code === 'KeyT') {
        setNextTheme();
    }
    else if (e.ctrlKey && e.code === "Enter") {
        createCheckbox();
    }
    else if (e.ctrlKey && e.code === 'KeyL') {
        selectLine();
    }
    else if (e.ctrlKey && e.code === 'KeyQ') {
        closewindow();
    }
    else if (e.ctrlKey && e.code === 'KeyM') {
        minimizeWindow();
    }
    else if (!e.ctrlKey && e.code === 'Escape') {
        deselect();
    }
    else if (e.ctrlKey && e.code === 'Equal') {
        applyFontSize(+3);
    }
    else if (e.ctrlKey && e.code === 'Minus') {
         applyFontSize(-3);
    }
    else if (e.ctrlKey && e.code === 'KeyN') {
        createNewFile();
    }
    else if (e.ctrlKey && e.code === 'KeyE') {
        if (activeDirectory != null)
            openInExplorer(activeDirectory);
    }
    else if (e.ctrlKey && e.code === 'KeyP') {
        togglePrefs();
    }
    else if (e.ctrlKey && e.shiftKey && e.code === 'KeyD') {
        deleteActiveFile();
    }
    else if (e.ctrlKey && e.code === 'KeyU') {}
    else if (e.ctrlKey && e.code === 'KeyF') {
        toggleFullscreen();
    }
    else if (e.ctrlKey && e.code === 'KeyG') {}
    else { return; }
    e.preventDefault();
}

await appWindow.onFocusChanged(({ payload: hasFocused }) => {
    focused = hasFocused;
    if (hasFocused) {
        displayActiveDirectory();
        openActiveFile();
    }
});

export async function handleEditorInput() {
    handleEditorScroll();
    saveActiveFile();
    setPreviewText();
}

async function setPreviewText() {
    var editorText = editor.value + ((editor.value.slice(-1) == "\n") ? " " : "");
    editorText = editorText.replace("&", "&amp").replace("<", "&lt;");
    preview.innerHTML = editorText.replace(/(^#{1,4})( .*)/gm, "<mark class='hashtag'>$1</mark><mark class='header'>$2</mark>");
}

async function handleEditorScroll() { preview.scrollTop = editor.scrollTop; }

export async function saveConfig() {
    const configPath = await appConfigDir();
    var configObject = {
        selectedFile : activeFile,
        selectedDirectory : activeDirectory,
        currentTheme : currentTheme,
        currentFont : currentFont,
        fontSize : fontSize
    }
    await writeTextFile(`${configPath}config.json`, JSON.stringify(configObject))
}

async function loadConfig() {
    const configPath = await appConfigDir();
    var config = await readTextFile(`${configPath}config.json`);
    var configObject = JSON.parse(config);
    currentTheme = configObject.currentTheme;
    applyTheme();
    currentFont = configObject.currentFont;
    applyFont();
    activeFile = configObject.selectedFile;
    activeDirectory = configObject.selectedDirectory;
    await displayActiveDirectory();
    openActiveFile();
    fontSize = configObject.fontSize;
    applyFontSize();
}

async function selectNewFile() {
    var file = await open({
        multiple: false,
        filters: [{name: "", extensions: ['txt', 'md'] }]
    });
    if (file == null) return;

    activeDirectory = null;
    setActiveFile(file);
    displayActiveDirectory();
}

export function setActiveFile(path) {
    activeFile = path;
    openActiveFile();
    saveConfig();
} 

async function selectNewDirectory() {

    var newDirectory = await open({ directory: true});
    if (newDirectory == null) return;

    activeDirectory = newDirectory;
    
    previousEditTime = -1;
    displayActiveDirectory();
    closeActiveFile();
    saveConfig();
}

async function displayActiveDirectory() {
    if (activeDirectory == null) {
        clearTree();
        if (activeFile != null) showSingleFile(activeFile);
        return;
    }

    var pathExists;
    await exists(activeDirectory).then(function(exists) { pathExists = exists });
    if (!pathExists) { 
        clearTree(); 
        activeDirectory = null;
        activeFile = null;
        return;
    }

    var editTime;
    await invoke('get_edit_time', {path: activeDirectory}).then((response) => editTime = response);
    if (editTime == previousEditTime) return;
    previousEditTime = editTime;
    
    entriesFound = 0;
    var directories;
    await readDir(activeDirectory, {recursive: false }).then(function(entries) {
        directories = entries;
    });
    await populateChildren(directories)

    console.log(entriesFound);
    console.log("HELLO");

    if (entriesFound > entriesLimit) {
        await message(`Selected directory is too big. You can only have ${entriesLimit} files and subfolders in the directory.`, { title: 'leto', type: 'error' });
        activeDirectory = null;
        activeFile = null;
        openActiveFile();
        return;
    }


    showFileTree(directories);
    
    if (activeFile != null) highlightSelectedFile(activeFile);
}

async function populateChildren(entries) {
    for (var i = 0; i < entries.length; i++) {
        if (++entriesFound > entriesLimit) return;
        if (entries[i].children == null) continue;
        await readDir(entries[i].path, {recursive: false }).then(function(ent) {
                entries[i].children = ent;
            });
        await populateChildren(entries[i].children);
    }
}

function closeActiveFile() {
    activeFile = null;
    editor.value = "";
    handleEditorInput();
    editor.disabled = true;
}

async function openActiveFile() {
    if (activeFile == null) {
        editor.value = "";
        editor.disabled = true;
        setPreviewText();
        previousEditTime = -1;
        displayActiveDirectory();
        return;
    }

    var pathExists;
    await exists(activeFile).then(function(exists) { pathExists = exists });
    if (!pathExists) {
        activeFile = null;
        openActiveFile();
        return;
    }

    if (activeDirectory != null) highlightSelectedFile(activeFile);
    editor.value = await readTextFile(activeFile);
    editor.disabled = false;
    showFileName();
    setPreviewText();
}

async function saveActiveFile() {
    if (activeFile == null) return;
    await writeTextFile(activeFile, editor.value);
}

async function exportActiveFile() {
    if (activeFile == null) return;
    await save({
        filters: [{name: "*", extensions: ['txt', 'md']}]
    }).then(function(path) {
        writeTextFile(path, editor.value);
    });
}

async function deleteActiveFile() {
    if (activeFile == null) return;

    var confirmed = await confirm('Are you sure you want to delete this file?', 'leto');
    if (!confirmed) return;

    await removeFile(activeFile);

    activeFile = null;
    openActiveFile();
}

async function createNewFile() {
    if (activeDirectory != null) {
        for (var i = 0; i < Infinity; i++) {
            var pathExists = false;
            await exists(activeFile).then(function(exists) { pathExists = exists });
            if (!pathExists) break;
            activeFile = activeDirectory + `\\new ${i + 1}.md`;
        }   
        await writeTextFile(activeFile, " ");
        displayActiveDirectory();
        openActiveFile();  
    }
}

var isRenaming = false;
async function changeFileName() {
    if (isRenaming) return;
    isRenaming = true;

    if (activeFile == null) return;
    var pathToFile = activeFile.substring(0,activeFile.lastIndexOf("\\")+1);
    var newFile = pathToFile + fileName.value + ".md";
    var success = false;

    await exists(newFile).then(function(exists) { success = !exists });
    if (!success) {
        isRenaming = false;
        return;
    }
    await renameFile(activeFile, newFile).then(function(){success = true}, function(){success = false});
    isRenaming = false;
    if (!success) {
        fileName.value = activeFile.replace(/^.*[\\\/]/, '').replace(/\.[^/.]+$/, "");
        return;
    }

    activeFile = newFile;
    previousEditTime = -1;
    displayActiveDirectory(true);
    openActiveFile();
}

async function showFileName() {
    fileName.value = activeFile.replace(/^.*[\\\/]/, '').replace(/\.[^/.]+$/, "");
}

function setNextTheme() {
    currentTheme++;
    if (currentTheme == themes.length) currentTheme = 0;
    themeSelector.value = currentTheme;
    applyTheme();
}

function setTheme(theme) {
    currentTheme = theme;
    applyTheme();
}

function setFont(font) {
    currentFont = font;
    applyFont();
}

function toggleSpellcheck() {
    var newValue = editor.getAttribute("spellcheck") == "true" ? "false" : "true";
    editor.setAttribute("spellcheck", newValue);
}

function applyFontSize(change = 0) {
    fontSize += change;
    if (fontSize > 40) fontSize = 40;
    else if (fontSize < 14) fontSize = 14;
    document.querySelector(':root').style.setProperty('--font-size', `${fontSize}px`);
    saveConfig();
}