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
import Preview from './preview.js';
import Search from './search.js';

const { appWindow } = window.__TAURI__.window;

const editor = document.getElementById('text-editor');

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
    this.preview = new Preview();
    this.search = new Search();

    this.focused = true;

    editor.addEventListener('input', (event) => this.handleEditorInput(event), false);
  }

  async handleEditorInput(e) {
    this.directory.saveActiveFile();
    this.preview.setPreviewText();
    this.undo.pushToBuffer(e);
    this.search.find();
  }
}

globalThis.leto = new Leto();
leto.config.load();

await appWindow.onFocusChanged(({ payload: hasFocused }) => {
  leto.contextMenu.hide();
  leto.focused = hasFocused;
  if (hasFocused) leto.directory.tryOpenActiveFile();
});