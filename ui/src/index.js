import {showFileTree, highlightSelectedFile, showSingleFile, openInExplorer, clearTree} from '../src/file-view.js'
import {closewindow, minimizeWindow, togglePrefs, toggleSidebar, populateFonts, populateThemes, themes, applyTheme, applyFont} from '../src/window-actions.js'
import {selectLine, cutLine, moveUp, moveDown, createCheckbox, deselect, copyLineUp, copyLineDown, jumpUp, jumpDown} from '../src/text-actions.js'

const {appWindow} = window.__TAURI__.window;
const {exists, writeTextFile, readTextFile, readDir, removeFile, renameFile} = window.__TAURI__.fs;
const {open, save, confirm} = window.__TAURI__.dialog;
const {appConfigDir} = window.__TAURI__.path;
const {invoke} = window.__TAURI__.tauri;

var focused = true;
var activeFile;
var activeDirectory;
export var currentTheme = 0;
export var currentFont = 0;
var fontSize = 20;

var previousEditTime = -1;

const editor = document.getElementById("text-editor");
const preview = document.getElementById("text-preview");
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
    else if (e.ctrlKey && e.code === 'KeyF') {}
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
    activeDirectory = await open({ directory: true});
    if (activeDirectory == null) return;
    
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
    
    await readDir(activeDirectory, {recursive: true }).then(function(entries) {
        showFileTree(entries);
    });
    if (activeFile != null) highlightSelectedFile(activeFile);
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

    console.log(pathExists);

    if (activeDirectory != null) highlightSelectedFile(activeFile);
    editor.value = await readTextFile(activeFile);
    editor.disabled = false;
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
    // activeFile = activeDirectory + '\\new.txt';
    // for (var i = 0; i < Infinity; i++) {
    //     var pathExists = false;
    //     await exists(activeFile).then(function(exists) { pathExists = exists });
    //     if (!pathExists) break;
    //     activeFile = activeDirectory + `\\new ${i + 1}.txt`;
    // }
    // await writeTextFile(activeFile, " ");
    // displayActiveDirectory();
    // openActiveFile();
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