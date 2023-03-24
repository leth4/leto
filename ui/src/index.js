import {openInExplorer} from '../src/file-view.js'
import {closewindow, minimizeWindow, togglePrefs, toggleSidebar, populateFonts, populateThemes, themes, applyTheme, applyFont, toggleFullscreen} from '../src/window-actions.js'
import {selectLine, cutLine, moveUp, moveDown, createCheckbox, deselect, copyLineUp, copyLineDown, jumpUp, jumpDown} from '../src/text-actions.js'
import {pathExists, selectNewFile, selectNewDirectory, displayActiveDirectory, tryOpenActiveFile, saveActiveFile, exportActiveFile, deleteActiveFile, createFileInDirectory, tryChangeFileName} from '../src/file-system.js'

const {appWindow} = window.__TAURI__.window;
const {writeTextFile, readTextFile, createDir} = window.__TAURI__.fs;
const {appConfigDir} = window.__TAURI__.path;
const {invoke} = window.__TAURI__.tauri;


var focused = true;
export var activeFile;
export var activeDirectory;
export var currentTheme = 0;
export var currentFont = 0;
var fontSize = 20;

const editor = document.getElementById("text-editor");
const preview = document.getElementById("text-preview");
const fileName = document.getElementById("file-name");
const themeSelector = document.getElementById("theme-selector");
const fontSelector = document.getElementById("font-selector");

await loadConfig();
populateFonts();
populateThemes();

// await invoke("add", {path: activeDirectory}).then((response) => console.log(response));
// await invoke("commit", {path: activeDirectory}).then((response) => console.log(response));
// await invoke("push", {path: activeDirectory}).then((response) => console.log(response));

document.addEventListener('contextmenu', event => event.preventDefault());
editor.addEventListener('input', () => handleEditorInput(), false);
editor.addEventListener('scroll', () => handleEditorScroll(), false);
themeSelector.addEventListener('change', () => setTheme(themeSelector.value), false);
fontSelector.addEventListener('change', () => setFont(fontSelector.value), false);
fileName.addEventListener('input', () => tryChangeFileName(), false);

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
        copyLineUp();
        handleEditorInput();
    }
    else if (e.altKey && e.shiftKey && e.code === 'ArrowDown') {
        copyLineDown();
        handleEditorInput();
    }
    else if (e.altKey && e.code === 'ArrowUp') {
        moveUp();
        handleEditorInput();
    }
    else if (e.altKey && e.code === 'ArrowDown') {
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
        createFileInDirectory();
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
        tryOpenActiveFile();
    }
});

export async function handleEditorInput() {
    handleEditorScroll();
    saveActiveFile();
    setPreviewText();
}

export async function setPreviewText() {
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
    if (! await pathExists(`${configPath}config.json`)) {
        if (! await pathExists(configPath)) {
            await createDir(configPath, {recursive: true});
        }
        await writeTextFile(`${configPath}config.json`, ``);
        currentTheme = 0;
        applyTheme();
        currentFont = 0;
        applyFont();
        return;
    }
    var config = await readTextFile(`${configPath}config.json`);
    var configObject = JSON.parse(config);
    currentTheme = configObject.currentTheme;
    applyTheme();
    currentFont = configObject.currentFont;
    applyFont();
    activeFile = configObject.selectedFile;
    activeDirectory = configObject.selectedDirectory;
    await displayActiveDirectory();
    tryOpenActiveFile();
    fontSize = configObject.fontSize;
    applyFontSize();
}

export function setActiveFilePath(file) {
    activeFile = file;
}

export function setActiveDirectoryPath(directory) {
    activeDirectory = directory;
}

function setNextTheme() {
    currentTheme++;
    if (currentTheme >= themes.length) currentTheme = 0;
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

