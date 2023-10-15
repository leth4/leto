const { appWindow } = window.__TAURI__.window;
const { listen, emit } = window.__TAURI__.event;
const { invoke } = window.__TAURI__.tauri;
const content = document.getElementById('content');

var displayedFile;
var currentTheme;
var fontSize = 20;
var isAlwaysOnTop = false;

const themes = [
  'gleam',
  'aske',
  'zima',
  'spirit',
  'perlin',
  'dart',
  'glass'
];

document.getElementById('minimize').addEventListener('click', () => appWindow.minimize());
document.getElementById('maximize').addEventListener('click', async () => await appWindow.isMaximized() ? appWindow.unmaximize() : appWindow.maximize());
document.getElementById('close').addEventListener('click', () => appWindow.close());
document.getElementById('title').addEventListener('mousedown', e => e.button == 2 ? toggleAlwaysOnTop() : null);
document.getElementById('open').addEventListener('mousedown', () => openFile());
document.addEventListener('wheel', e => handleMouseWheel(e));
document.addEventListener('contextmenu', e => e.preventDefault());

window.onkeydown = (e) => {
  if (e.ctrlKey && !e.shiftKey && e.code === 'KeyQ') appWindow.close();
  else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyM') appWindow.minimize();
  else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyT') setNextTheme();
  else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyR') {}
  else if (e.ctrlKey && !e.shiftKey && e.code === 'Equal') changeFontSize(+1);
  else if (e.ctrlKey && !e.shiftKey && e.code === 'Minus') changeFontSize(-1);
  else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyP') toggleAlwaysOnTop();
  else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyO') openFile();
  else return;

  e.preventDefault();
}

function openFile() {
  emit('renderOpenFile', { file: displayedFile });
}

function handleMouseWheel(event) {
    if (!event.ctrlKey) return;
    if (event.shiftKey) return;
    changeFontSize(-event.deltaY / Math.abs(event.deltaY));
}

function toggleAlwaysOnTop() {
  isAlwaysOnTop = !isAlwaysOnTop;
  appWindow.setAlwaysOnTop(isAlwaysOnTop);
  document.querySelector(':root').style.setProperty('--before-title', isAlwaysOnTop ? '"↓ "' : '""');
}

function changeFontSize(change = 0) {
    var newSize = fontSize + change;
    if (newSize > 50) newSize = 50;
    else if (newSize < 12) newSize = 12;
    setFontSize(newSize);
  }

function setFontSize(size) {
    fontSize = size ?? 20;
    document.querySelector(':root').style.setProperty('--font-size', `${fontSize}px`);
}

function setTheme(theme) {
  currentTheme = theme ?? 0;
  if (theme >= themes.length) currentTheme = 0;
  invoke(currentTheme == 6 ? 'add_blur' : 'remove_blur', { label:appWindow.label });
  document.getElementById('theme-link').setAttribute('href', `themes/${themes[currentTheme]}.css`);
}

function setNextTheme() {
  setTheme(parseInt(currentTheme) + 1)
}

await listen('renderWindowUpdate', (event) => {
  if (!displayedFile) {
    setTheme(event.payload.theme);
    setFontSize(event.payload.fontSize);
    document.getElementById('title').innerHTML = event.payload.title;
    document.querySelector(':root').style.setProperty('--font-family', `'${event.payload.font}', 'inter', sans-serif`);
    document.querySelector(':root').style.setProperty('--font-weight', `${event.payload.fontWeight}`);
    displayedFile = event.payload.file;
  }
  else if (displayedFile != event.payload.file) return;  
  
  content.innerHTML = event.payload.text;
  var buttons = document.getElementsByClassName('todo');
  for (let i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener('click', () => emit('renderTodoClicked', { index: i, file: displayedFile }));
  }
});

emit('renderWindowLoaded', {label: appWindow.label});