import {showFileTree} from '/treeview.js'
import {selectLine, cutLine, moveLineUp, createCheckbox} from '/textactions.js'

const {appWindow} = window.__TAURI__.window;
const {register} = window.__TAURI__.globalShortcut;
const {exists, writeTextFile, readTextFile, readDir, renameFile} = window.__TAURI__.fs;
const {open, save} = window.__TAURI__.dialog;
const {appConfigDir} = window.__TAURI__.path;

// await register('CmdOrControl+S', () => {saveSelectedFile()})
// await register('CmdOrControl+O', () => {openFile()})
await register('CmdOrControl+Shift+O', () => {selectDirectory()})
await register('CmdOrControl+]', () => {changeFontSize(3)})
await register('CmdOrControl+[', () => {changeFontSize(-3)})

const editor = document.getElementById("text-editor");
const preview = document.getElementById("text-preview");
const title = document.getElementById("file-name");

document.addEventListener('keydown', function(event) {
    if(event.key == 'Escape') { closewindow(); }
});

document.addEventListener('contextmenu', event => event.preventDefault());
editor.addEventListener('input', () => handleEditorInput(), false);
editor.addEventListener('scroll', () => handleEditorScroll(), false);
title.addEventListener('input', () => renameSelectedFile(), false);

var focused = true;
var selectedFile;
var selectedDirectory;
var currentTheme = 0;
const themes = ["black", "gray", "light", "slick"];

window.onkeydown = (e) => {
    if (!focused) return;
    if (e.ctrlKey && (e.code === 'KeyQ')) {
        e.preventDefault();
        toggleSpellcheck();
    }
    else if (e.ctrlKey && (e.code === 'KeyX')) {
        if (editor.selectionStart != editor.selectionEnd) return;
        e.preventDefault();
        cutLine(editor);
        handleEditorInput();
    }
    else if (e.altKey && (e.code === 'ArrowUp')) {
        if (editor.selectionStart != editor.selectionEnd) return;
        e.preventDefault();
        moveLineUp(editor);
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
}



await loadUserData();


async function handleEditorInput() {
    saveSelectedFile();
    setPreviewText();
}

await appWindow.onFocusChanged(({ payload: focused }) => {
    this.focused = focused;
    if (focused) {
       openSelectedDirectory();
       openSelectedFile();
    }
});

async function setPreviewText() {
    var editorText = editor.value + ((editor.value.slice(-1) == "\n") ? " " : "");
    preview.innerHTML = editorText.replace(/^#{1,4}\s.*/gm, "<mark class='header'>$&</mark>");
}

async function handleEditorScroll() {
    preview.scrollTop = editor.scrollTop;
}

async function saveConfig() {
    const configPath = await appConfigDir();
    var configObject = {
        selectedFile : selectedFile,
        selectedDirectory : selectedDirectory,
        currentTheme : currentTheme
    }
    await writeTextFile(`${configPath}config.json`, JSON.stringify(configObject))
}

async function loadUserData() {
    const configPath = await appConfigDir();
    var config = await readTextFile(`${configPath}config.json`);
    var configObject = JSON.parse(config);
    selectedFile = configObject.selectedFile;
    openSelectedFile();
    selectedDirectory = configObject.selectedDirectory;
    openSelectedDirectory();
    currentTheme = configObject.currentTheme;
    setCurrentTheme();
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
    setCurrentTheme();
    saveConfig();
}

function setCurrentTheme() {
    document.getElementById("theme-link").setAttribute("href", `themes/${themes[currentTheme]}.css`);
}

function toggleSpellcheck() {
    var newValue = editor.getAttribute("spellcheck") == "true" ? "false" : "true";
    editor.setAttribute("spellcheck", newValue);
}

function changeFontSize(change) {
    var r = document.querySelector(':root');
    var currentSize = getComputedStyle(r).getPropertyValue('--font-size');
    var num = parseInt(currentSize.replace(/[^0-9]/g, ''));
    r.style.setProperty('--font-size', `${num + change}px`);
}
