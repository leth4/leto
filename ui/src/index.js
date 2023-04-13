
import {addInputToBuffer} from '../src/undo-buffer.js'
import {populateFonts, populateThemes, themes, applyTheme, applyFont} from '../src/window-actions.js'
import {pathExists, displayActiveDirectory, setActiveFile, setActiveDirectory, activeFile, activeDirectory, saveActiveFile} from '../src/file-system.js'

const {appWindow} = window.__TAURI__.window;
const {writeTextFile, readTextFile, createDir} = window.__TAURI__.fs;
const {appConfigDir} = window.__TAURI__.path;

export var focused = true;
export var currentTheme = 0;
export var currentFont = 0;
var fontSize = 20;
var fontWeight = 300;
var correctionScroll = -1;

const editor = document.getElementById("text-editor");
const preview = document.getElementById("text-preview");
const themeSelector = document.getElementById("theme-selector");
const fontSelector = document.getElementById("font-selector");

loadConfig();

document.addEventListener('contextmenu', event => event.preventDefault());
editor.addEventListener('input', (event) => handleEditorInput(event), false);
editor.addEventListener('beforeinput', (event) => handleScrollJump(event), false);
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

async function handleScrollJump(e) {
    if (e.inputType != "insertLineBreak") return;
    correctionScroll = editor.scrollTop;
}

export async function handleEditorInput(e) {
    saveActiveFile();
    setPreviewText();
    handleEditorScroll();

    addInputToBuffer(e);

}

export async function handleNewFile() {
    setPreviewText();
    editor.blur();
    editor.focus();
    editor.selectionStart = 0;
    editor.selectionEnd = 0;
    editor.scrollTop = 1;
    handleEditorScroll();
}

export async function setPreviewText() {
    var editorText = editor.value + ((editor.value.slice(-1) == "\n") ? " " : "");
    editorText = editorText.replace("&", "&amp").replace("<", "&lt;")
        .replace(/(?<!# )(\*)(.*?)(\*)/g, "<mark class='hashtag'>$1</mark><mark class='bold'>$2</mark><mark class='hashtag'>$3</mark>")
        .replace(/(^#{1,4})( .*)/gm, "<mark class='hashtag'>$1</mark><mark class='header'>$2</mark>");
    preview.innerHTML = editorText;
}


async function handleEditorScroll() {
    console.log(correctionScroll);
    if (correctionScroll != -1) {
        if (Math.abs(preview.scrollTop - editor.scrollTop) >= 3) 
            editor.scrollTop = correctionScroll; // Hacky fix for a browser bug; scrollbar randomly jumps when inserting a new line
        correctionScroll = -1;
    }

    preview.scrollTop = editor.scrollTop; 
}

export async function saveConfig() {
    const configPath = await appConfigDir();
    var configObject = {
        selectedFile : activeFile,
        selectedDirectory : activeDirectory,
        currentTheme : currentTheme,
        currentFont : currentFont,
        fontSize : fontSize,
        fontWeight : fontWeight
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
        fontWeight = 300;
        applyFontSize();
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
    fontWeight = configObject.fontWeight;
    applyFontWeight();

    populateFonts();
    populateThemes();
}

function setTheme(theme) {
    currentTheme = theme;
    applyTheme();
}

function setFont(font) {
    currentFont = font;
    applyFont();
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

export function applyFontWeight(change = 0) {
    fontWeight += change;
    if (fontWeight > 500) fontWeight = 500;
    else if (fontWeight < 200) fontWeight = 200;
    document.querySelector(':root').style.setProperty('--font-weight', `${fontWeight}`);
    saveConfig();
}

export function setNextTheme() {
    currentTheme++;
    if (currentTheme >= themes.length) currentTheme = 0;
    themeSelector.value = currentTheme;
    applyTheme();
}