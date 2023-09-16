'use strict';

const { appWindow } = window.__TAURI__.window;
const { invoke } = window.__TAURI__.tauri;

const themeSelector = document.getElementById('theme-selector');
const editor = document.getElementById('text-editor')
const root = document.querySelector(':root');

const fontInput = document.getElementById('font-input');

const themes = [
  'gleam',
  'aske',
  'zima',
  'spirit',
  'perlin',
  'dart',
  'glass'
];

export default class Window {

  #prefsToggled = false;
  #sidebarToggled = true;

  constructor() {
    this.currentTheme = 0;
    this.currentFont = 'inter';
    this.fontSize = 20;
    this.fontWeight = 300;

    themeSelector.addEventListener('change', () => this.setTheme(themeSelector.value), false);
    fontInput.addEventListener('input', () => this.setFont(fontInput.value), false);
    document.addEventListener('wheel', e => this.#handleMouseWheel(e), false);
    document.addEventListener('keydown', e => {if (e.key === 'Control') editor.style.pointerEvents = 'none'}, false);
    document.addEventListener('keyup', e => {if (e.key === 'Control') editor.style.pointerEvents = 'auto'}, false);
    document.addEventListener('mousemove', e => editor.style.pointerEvents = e.ctrlKey ? 'none' : 'auto');

    this.populateThemes();
  }
  
  closewindow() {
    leto.render.closeAllWindows();
    appWindow.close();
  }

  minimizeWindow() {
    appWindow.minimize();
  }

  togglePrefs() {
    this.#prefsToggled = !this.#prefsToggled;
    document.getElementById('preferences').style.display = this.#prefsToggled ? 'block' : 'none';
  }

  toggleSidebar() {
    this.#sidebarToggled = !this.#sidebarToggled;
    document.getElementById('sidebar').style.maxWidth = this.#sidebarToggled ? '200px' : '50px';
    document.getElementById('sidebar').style.overflowY = this.#sidebarToggled ? 'auto' : 'hidden';
    document.getElementById('sidebar-content').style.opacity = this.#sidebarToggled ? '1' : '0';
    document.getElementById('sidebar-content').style.pointerEvents = this.#sidebarToggled ? 'all' : 'none';
    document.getElementById('preferences').style.opacity = this.#sidebarToggled ? '1' : '0';
    document.getElementById('preferences').style.pointerEvents = this.#sidebarToggled ? 'all' : 'none';
  }

  #handleMouseWheel(event) {
    if (!event.ctrlKey) return;
    if (event.shiftKey) return;
    this.changeFontSize(-event.deltaY / Math.abs(event.deltaY));
  }

  changeFontSize(change = 0) {
    var newSize = this.fontSize + change;
    if (newSize > 50) newSize = 50;
    else if (newSize < 12) newSize = 12;
    this.setFontSize(newSize);
  }

  setFontSize(size, save = true) {
    this.fontSize = size ?? 20;
    root.style.setProperty('--font-size', `${this.fontSize}px`);
    if (save) leto.config.save();
  }

  changeFontWeight(change = 0) {
    var newWeight = this.fontWeight + change;
    if (newWeight > 500) newWeight = 500;
    else if (newWeight < 200) newWeight = 200;
    this.setFontWeight(newWeight)
  }

  setFontWeight(weight, save = true) {
    this.fontWeight = weight ?? 300;
    root.style.setProperty('--font-weight', `${this.fontWeight}`);
    if (save) leto.config.save();
  }

  setFont(font, save = true) {
    this.currentFont = font ?? 'inter';
    fontInput.value = this.currentFont;
    root.style.setProperty('--font-family', `'${this.currentFont}', 'inter', sans-serif`);
    root.style.setProperty('--italic-style', this.isFontMonospaced(font) ? "italic" : "normal");
    root.style.setProperty('--bold-weight', this.isFontMonospaced(font) ? "calc(var(--font-weight) + 100)" : "var(--font-weight)");
    if (save) leto.config.save();
  }

  isFontMonospaced(font) {
    if (font === 'monospace') return false;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = `30px ${font}`;
    const width = context.measureText('a').width;

    const alphabet = `0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ`
    for (var i = 0; i < alphabet.length; i++)
      if (context.measureText(alphabet[i]).width !== width) return false;

    return true;
  }
  
  setTheme(theme, save = true) {
    this.currentTheme = theme ?? 0;
    if (theme >= themes.length) this.currentTheme = 0;
    invoke(this.currentTheme == 6 ? 'add_blur' : 'remove_blur', {  label: "main" });
    themeSelector.value = this.currentTheme;
    document.getElementById('theme-link').setAttribute('href', `themes/${themes[this.currentTheme]}.css`);
    if (save) leto.config.save();
  }

  setNextTheme() {
    this.setTheme(parseInt(this.currentTheme) + 1)
  }

  populateThemes() {
    for (var i = 0; i < themes.length; i++) {
      var option = document.createElement('option');
      option.innerHTML = themes[i];
      option.value = i;
      themeSelector.appendChild(option);
    }
  }
}
