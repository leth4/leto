
import {populateFonts, populateThemes, themes, applyTheme, applyFont} from '../src/window-actions.js'
import {pathExists, displayActiveDirectory, setActiveFile, setActiveDirectory, activeFile, activeDirectory, saveActiveFile} from '../src/file-system.js'

const {appWindow} = window.__TAURI__.window;
const {writeTextFile, readTextFile, createDir} = window.__TAURI__.fs;
const {appConfigDir} = window.__TAURI__.path;
const {invoke} = window.__TAURI__.tauri;
const {confirm} = window.__TAURI__.dialog;

export var focused = true;
export var currentTheme = 0;
export var currentFont = 0;
var fontSize = 20;

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
    editorText = editorText.replace(/(?<!# )(\*)(.*?)(\*)/g, "<mark class='hashtag'>$1</mark><mark class='bold'>$2</mark><mark class='hashtag'>$3</mark>");
    
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
    setActiveFile(configObject.selectedFile);
    setActiveDirectory(configObject.selectedDirectory);
    fontSize = configObject.fontSize;
    applyFontSize();
}

export function setActiveFilePath(file) {
    activeFile = file;
}

export function setActiveDirectoryPath(directory) {
    activeDirectory = directory;
}

export function setNextTheme() {
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

export async function pushToGit() {
    var message;
    await invoke("add", {path: activeDirectory}).then((response) => message += response);
    await invoke("commit", {path: activeDirectory}).then((response) => message += response);
    await invoke("push", {path: activeDirectory}).then((response) => message += response);
    await confirm(message, 'leto');
}

export function toggleSpellcheck() {
    var newValue = editor.getAttribute("spellcheck") == "true" ? "false" : "true";
    editor.setAttribute("spellcheck", newValue);
}

export function applyFontSize(change = 0) {
    fontSize += change;
    if (fontSize > 40) fontSize = 40;
    else if (fontSize < 14) fontSize = 14;
    document.querySelector(':root').style.setProperty('--font-size', `${fontSize}px`);
    saveConfig();
}

