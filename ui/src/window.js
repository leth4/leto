'use strict';

const { appWindow } = window.__TAURI__.window;

const themeSelector = document.getElementById('theme-selector');
const fontSelector = document.getElementById('font-selector');
const editor = document.getElementById('text-editor')
const root = document.querySelector(':root');

const themes = [
  'gleam',
  'aske',
  'zima',
  'spirit',
  'fragment',
  'patrol',
  'osen',
];

const fonts = [
  'arial',
  'cascadia mono',
  'helvetica neue',
  'segoe ui',
  'inter',
  'raleway',
  'poppins',
  'roboto',
];

export default class Window {

  constructor() {
    this.prefsToggled = false;
    this.sidebarToggled = true;
    this.fullscreenToggled = true;

    this.currentTheme = 0;
    this.currentFont = 0;
    this.fontSize = 20;
    this.fontWeight = 300;

    themeSelector.addEventListener('change', () => this.setTheme(themeSelector.value), false);
    fontSelector.addEventListener('change', () => this.setFont(fontSelector.value), false);
  }

  closewindow() {
    appWindow.close();
  }

  minimizeWindow() {
    appWindow.minimize();
  }

  toggleSpellcheck() {
    var newValue = editor.getAttribute('spellcheck') === 'true' ? 'false' : 'true';
    editor.setAttribute('spellcheck', newValue);
  }

  toggleFullscreen() {
    this.fullscreenToggled = !this.fullscreenToggled;
    appWindow.setFullscreen(this.fullscreenToggled);
  }

  applyFont() {
    root.style.setProperty('--font-family', `"${fonts[this.currentFont]}", "Arial"`);
    leto.config.save();
  }

  applyFontSize(change = 0) {
    this.fontSize += change;
    if (this.fontSize > 40) this.fontSize = 40;
    else if (this.fontSize < 14) this.fontSize = 14;

    root.style.setProperty('--font-size', `${this.fontSize}px`);
    leto.config.save();
  }

  setTheme(theme) {
    this.currentTheme = theme;
    this.applyTheme();
  }

  setFont(font) {
    this.currentFont = font;
    this.applyFont();
  }

  applyFontWeight(change = 0) {
    this.fontWeight += change;
    if (this.fontWeight > 500) this.fontWeight = 500;
    else if (this.fontWeight < 200) this.fontWeight = 200;
    root.style.setProperty('--font-weight', `${this.fontWeight}`);
    leto.config.save();
  }

  setNextTheme() {
    this.currentTheme++;
    if (this.currentTheme >= themes.length) this.currentTheme = 0;
    themeSelector.value = this.currentTheme;
    this.applyTheme();
  }

  applyTheme() {
    document
      .getElementById('theme-link')
      .setAttribute('href', `themes/${themes[this.currentTheme]}.css`);
    leto.config.save();
  }

  togglePrefs() {
    this.prefsToggled = !this.prefsToggled;
    document.getElementById('preferences').style.display = this.prefsToggled
      ? 'block'
      : 'none';
  }

  toggleSidebar() {
    this.sidebarToggled = !this.sidebarToggled;
    document.getElementById('sidebar').style.maxWidth = this.sidebarToggled
      ? '200px'
      : '50px';
    document.getElementById('sidebar').style.overflowY = this.sidebarToggled
      ? 'auto'
      : 'hidden';

    document.getElementById('sidebar-content').style.opacity = this
      .sidebarToggled
      ? '1'
      : '0';
    document.getElementById('sidebar-content').style.pointerEvents = this
      .sidebarToggled
      ? 'all'
      : 'none';
  }

  populateThemes() {
    for (var i = 0; i < themes.length; i++) {
      var option = document.createElement('option');
      option.innerHTML = themes[i];
      option.value = i;
      document.getElementById('theme-selector').appendChild(option);
    }
    document.getElementById('theme-selector').value = this.currentTheme;
  }

  populateFonts() {
    for (var i = 0; i < fonts.length; i++) {
      var option = document.createElement('option');
      option.innerHTML = fonts[i];
      option.value = i;
      document.getElementById('font-selector').appendChild(option);
    }
    document.getElementById('font-selector').value = this.currentFont;
  }
}
