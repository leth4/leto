const {appWindow} = window.__TAURI__.window;
const {register, unregister} = window.__TAURI__.globalShortcut;
const {writeTextFile, readTextFile, readDir, BaseDirectory} = window.__TAURI__.fs;
const {open} = window.__TAURI__.dialog;
const {appDir} = window.__TAURI__.path;

await register('CmdOrControl+S', () => {saveSelectedFile()})
await register('CmdOrControl+O', () => {openFile()})
await register('CmdOrControl+]', () => {changeFontSize(3)})
await register('CmdOrControl+[', () => {changeFontSize(-3)})
//await register('CmdOrControl+Q', () => {toggleSpellcheck()})

document.addEventListener('keydown', function(event) {
    if(event.key == 'Escape') { closewindow(); }
});

window.onkeydown = (e) => {
  if (e.ctrlKey && (e.code === 'KeyQ')) {
      e.preventDefault();
      toggleSpellcheck();
      return;
  }
}

//document.getElementById("text-editor").addEventListener('input', saveSelectedFile(), false);

var selectedFile;

async function closewindow() { await appWindow.close(); }

 
async function openFile() {
    selectedFile = await open({
        multiple: false,
        filters: [{name: "", extensions: ['txt', 'md'] }]
    });
    openSelectedFile();
}

// async function readSelectedDir() {
// await readDir(selected[0], {recursive: true }).then(function showFiles(entries) {
// entries.forEach(element => {
//         console.log(element);
//     });
// });
// }

async function openSelectedFile() {
    document.getElementById('text-editor').value = await readTextFile(selectedFile);
}

async function saveSelectedFile() {
    if (selectedFile == null) return;
    await writeTextFile(selectedFile, document.getElementById('text-editor').value);
}




function setTheme(theme) {
    document.getElementById("theme-link").setAttribute("href", `themes/${theme}.css`);
}

function toggleSpellcheck() {
    var editor = document.getElementById("text-editor");
    var newValue = editor.getAttribute("spellcheck") == "true" ? "false" : "true";
    editor.setAttribute("spellcheck", newValue);
}

function changeFontSize(change) {
    var r = document.querySelector(':root');
    var currentSize = getComputedStyle(r).getPropertyValue('--font-size');
    var num = parseInt(currentSize.replace(/[^0-9]/g, ''));
    r.style.setProperty('--font-size', `${num + change}px`);
}

