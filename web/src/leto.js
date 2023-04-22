'use strict';

import Undo from './undo.js';
import Directory from './directory.js';
import Edit from './edit.js';
import Window from './window.js';
import Explorer from './explorer.js';
import Shortcuts from './shortcuts.js';
import Config from './config.js';
import ContextMenu from './contextmenu.js';
import Scroll from './scroll.js';

const { appWindow } = window.__TAURI__.window;

const editor = document.getElementById('text-editor');
const preview = document.getElementById('text-preview');

class Leto {

  constructor() {
    this.undo = new Undo();
    this.directory = new Directory();
    this.edit = new Edit();
    this.windowManager = new Window();
    this.explorer = new Explorer();
    this.shortcuts = new Shortcuts();
    this.config = new Config();
    this.contextMenu = new ContextMenu();
    this.scroll = new Scroll();

    this.focused = true;

    editor.addEventListener('input', (event) => this.handleEditorInput(event), false);
  }

  async handleEditorInput(e) {
    this.directory.saveActiveFile();
    this.#setPreviewText();
    preview.scrollTop = editor.scrollTop;

    this.undo.pushToBuffer(e);
  }
  
  #setPreviewText() {
    var editorText = editor.value + (editor.value.slice(-1) === '\n' ? ' ' : '');
    preview.innerHTML = editorText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/(?<!# )(\*)(.*?)(\*)/g, `<mark class='hashtag'>$1</mark><mark class='bold'>$2</mark><mark class='hashtag'>$3</mark>`)
      .replace(/(^#{1,4})( .*)/gm, `<mark class='hashtag'>$1</mark><mark class='header'>$2</mark>`);
  }
}

globalThis.leto = new Leto();
leto.config.load();

await appWindow.onFocusChanged(({ payload: hasFocused }) => {
  leto.contextMenu.hide();
  leto.focused = hasFocused;
  if (hasFocused) {
    leto.directory.tryDisplayActiveDirectory();
    leto.directory.tryOpenActiveFile();
  }
});