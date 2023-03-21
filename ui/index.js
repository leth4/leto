import {showFileTree} from '/treeview.js'

const {appWindow} = window.__TAURI__.window;
const {register} = window.__TAURI__.globalShortcut;
const {writeTextFile, readTextFile, readDir} = window.__TAURI__.fs;
const {open} = window.__TAURI__.dialog;

await register('CmdOrControl+S', () => {saveSelectedFile()})
await register('CmdOrControl+O', () => {openFile()})
await register('CmdOrControl+Shift+O', () => {selectDirectory()})
await register('CmdOrControl+]', () => {changeFontSize(3)})
await register('CmdOrControl+[', () => {changeFontSize(-3)})

const editor = document.getElementById("text-editor");

document.addEventListener('keydown', function(event) {
    if(event.key == 'Escape') { closewindow(); }
});

document.addEventListener('contextmenu', event => event.preventDefault());
editor.addEventListener('input', () => saveSelectedFile(), false);

window.onkeydown = (e) => {
  if (e.ctrlKey && (e.code === 'KeyQ')) {
      e.preventDefault();
      toggleSpellcheck();
      return;
  }
}


var selectedFile;
var selectedDirectory;

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
    var selected = await open({ directory: true});
    if (selected == null) return;
    await readDir(selected, {recursive: true }).then(function(entries) {selectedDirectory = entries});
    showFileTree(selectedDirectory);
}

export async function selectFile(path) {
    selectedFile = path;
    editor.value = await readTextFile(path);
} 

async function saveSelectedFile() {
    console.log("saved");
    if (selectedFile == null) return;
    await writeTextFile(selectedFile, editor.value);
}

function setTheme(theme) {
    document.getElementById("theme-link").setAttribute("href", `themes/${theme}.css`);
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

