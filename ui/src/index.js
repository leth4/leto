import {showFileTree, openInExplorer} from '../src/tree-view.js'
import {selectLine, cutLine, moveLineUp, moveLineDown, createCheckbox, deselect, copyLineUp, copyLineDown, jumpUp, jumpDown} from '../src/text-actions.js'

const {appWindow, WebviewWindow} = window.__TAURI__.window;
const {exists, writeTextFile, readTextFile, readDir, renameFile} = window.__TAURI__.fs;
const {open, save} = window.__TAURI__.dialog;
const {appConfigDir} = window.__TAURI__.path;

// await register('CmdOrControl+S', () => {saveSelectedFile()})
// await register('CmdOrControl+O', () => {openFile()})
//await register('CmdOrControl+Shift+O', () => {selectDirectory()})

var focused = true;
var selectedFile;
var selectedDirectory;
var currentTheme = 0;
var fontSize = 20;
var prefsToggled = false;

const themes = ["black", "gray", "light", "slick"];
const fonts = ["arial", "georgia", "consolas"];
const editor = document.getElementById("text-editor");
const preview = document.getElementById("text-preview");
const title = document.getElementById("file-name");
const themeSelector = document.getElementById("theme-selector");

await loadConfig();

document.addEventListener('contextmenu', event => event.preventDefault());
editor.addEventListener('input', () => handleEditorInput(), false);
editor.addEventListener('scroll', () => handleEditorScroll(), false);
title.addEventListener('input', () => renameSelectedFile(), false);
themeSelector.addEventListener('change', () => setTheme(themeSelector.value), false);

window.onkeydown = (e) => {
    if (!focused) return;

    if (e.ctrlKey && (e.code === 'KeyR')) {
        e.preventDefault();
        toggleSpellcheck();
    }
    else if (e.ctrlKey && (e.code === 'KeyX')) {
        if (editor.selectionStart != editor.selectionEnd) return;
        e.preventDefault();
        cutLine(editor);
        handleEditorInput();
    }
    else if (e.altKey && e.shiftKey && (e.code === 'ArrowUp')) {
        if (editor.selectionStart != editor.selectionEnd) return;
        e.preventDefault();
        copyLineUp(editor);
        handleEditorInput();
    }
    else if (e.altKey && e.shiftKey && (e.code === 'ArrowDown')) {
        if (editor.selectionStart != editor.selectionEnd) return;
        e.preventDefault();
        copyLineDown(editor);
        handleEditorInput();
    }
    else if (e.altKey && e.code === 'ArrowUp') {
        if (editor.selectionStart != editor.selectionEnd) return;
        e.preventDefault();
        moveLineUp(editor);
        handleEditorInput();
    }
    else if (e.altKey && e.code === 'ArrowDown') {
        if (editor.selectionStart != editor.selectionEnd) return;
        e.preventDefault();
        moveLineDown(editor);
        handleEditorInput();
    }
    else if (e.ctrlKey && e.code === 'ArrowUp') {
        e.preventDefault();
        jumpUp(editor);
        handleEditorInput();
    }
    else if (e.ctrlKey && e.code === 'ArrowDown') {
        e.preventDefault();
        jumpDown(editor);
        handleEditorInput();
    }
    else if (e.ctrlKey && e.code === 'KeyT') {
        e.preventDefault();
        setNextTheme();
    }
    else if (e.ctrlKey && e.code === "Enter") {
        e.preventDefault();
        createCheckbox(editor);
    }
    else if (e.ctrlKey && e.code === 'KeyL') {
        e.preventDefault();
        selectLine(editor);
    }
    else if (e.ctrlKey && e.code === 'KeyQ') {
        e.preventDefault();
        closewindow();
    }
    else if (!e.ctrlKey && e.code === 'Escape') {
        e.preventDefault();
        deselect(editor);
    }
    else if (e.ctrlKey && e.code === 'Equal') {
        e.preventDefault();
        applyFontSize(+3);
    }
    else if (e.ctrlKey && e.code === 'Minus') {
        e.preventDefault();
         applyFontSize(-3);
    }
    else if (e.ctrlKey && e.code === 'KeyN') {
        e.preventDefault();
        createNewFile();
    }
    else if (e.ctrlKey && e.code === 'KeyE') {
        e.preventDefault();
        openInExplorer(selectedDirectory);
    }
    else if (e.ctrlKey && e.code === 'KeyP') {
        e.preventDefault();
        togglePrefs();
    }
}

function togglePrefs() {
    prefsToggled = !prefsToggled;
    document.getElementById("preferences").style.display = prefsToggled ? "block" : "none";
}

async function handleEditorInput() {
    handleEditorScroll();
    saveSelectedFile();
    setPreviewText();
}

await appWindow.onFocusChanged(({ payload: hasFocused }) => {
    focused = hasFocused;
    if (hasFocused) {
       openSelectedDirectory();
       openSelectedFile();
    }
});

populateThemes();
function populateThemes() {
    for (var i = 0; i < themes.length; i++) {
    var option = document.createElement('option');
       option.innerHTML = themes[i];
       option.value = i;
       themeSelector.appendChild(option); 
    }
    themeSelector.value = currentTheme;
}

async function setPreviewText() {
    var editorText = editor.value + ((editor.value.slice(-1) == "\n") ? " " : "");
    preview.innerHTML = editorText.replace(/(^#{1,4})( .*)/gm, "<mark class='hashtag'>$1</mark><mark class='header'>$2</mark>");
}

async function handleEditorScroll() {
    preview.scrollTop = editor.scrollTop;
}

async function saveConfig() {
    const configPath = await appConfigDir();
    var configObject = {
        selectedFile : selectedFile,
        selectedDirectory : selectedDirectory,
        currentTheme : currentTheme,
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
    selectedFile = configObject.selectedFile;
    openSelectedFile();
    selectedDirectory = configObject.selectedDirectory;
    openSelectedDirectory();
    fontSize = configObject.fontSize;
    applyFontSize();
}

async function closewindow() { await appWindow.close(); }

async function openFile() {
    var file = await open({
        multiple: false,
        filters: [{name: "", extensions: ['txt', 'md'] }]
    });
    if (file == null) return;
    selectFile(file);
}

async function selectDirectory() {
    selectedDirectory = await open({ directory: true});
    if (selectedDirectory == null) return;
    openSelectedDirectory();
    saveConfig();
}

async function openSelectedDirectory() {
    if (selectedDirectory == null) return;
    await readDir(selectedDirectory, {recursive: true }).then(function(entries) {
        showFileTree(entries, selectedDirectory);
    });
}

export function selectFile(path) {
    selectedFile = path;
    openSelectedFile();
    saveConfig();
} 

async function openSelectedFile() {
    if (selectedFile == null) return;
    var pathExists;
    await exists(selectedFile).then(function(exists) { pathExists = exists });
    if (!pathExists) return;

    setFileTitle();
    editor.value = await readTextFile(selectedFile);
    setPreviewText();
}

async function saveSelectedFile() {
    if (selectedFile != null) {
        await writeTextFile(selectedFile, editor.value);
    }
    else {
        await save({
            filters: [{name: "*", extensions: ['txt', 'md']}]
        }).then(function(path) {
            writeTextFile(path, editor.value);
        });
    }
}

async function createNewFile() {

    selectedFile = selectedDirectory + '\\new.txt';
    for (var i = 0; i < Infinity; i++) {
        var pathExists = false;
        await exists(selectedFile).then(function(exists) { pathExists = exists });
        if (!pathExists) break;
        selectedFile = selectedDirectory + `\\new ${i + 1}.txt`;
    }
    await writeTextFile(selectedFile, " ");
    openSelectedDirectory();
    openSelectedFile();
}

async function renameSelectedFile() {
    // if (selectFile == null) return;
    // var nameStart = selectedFile.lastIndexOf("\\");
    // var nameEnd = selectedFile.lastIndexOf(".");
    // await renameFile(selectedFile, selectedFile.substring(0, nameStart) + title.value + selectedFile.substring(nameEnd));
    // selectedFile = selectedFile.substring(0, nameStart) + title.value + selectedFile.substring(nameEnd);
    // openSelectedDirectory();
    // openSelectedFile();
}

function setFileTitle() {
    title.value = selectedFile.split("\\").slice(-1);
    title.value = title.value.replace(/\.[^/.]+$/, "");
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

function applyTheme() {
    document.getElementById("theme-link").setAttribute("href", `themes/${themes[currentTheme]}.css`);
    saveConfig();
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