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
import Spellcheck from './spellcheck.js';
import Render from './render.js';
import Lea from './lea.js';
import QuickOpen from './quickopen.js';

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
    this.spellcheck = new Spellcheck();
    this.render = new Render();
    this.lea = new Lea();
    this.quickOpen = new QuickOpen();

    this.focused = true;

    editor.addEventListener('input', (event) => this.handleEditorInput(event), false);
  }

  async handleEditorInput(e) {
    this.scroll.handleEditorScroll();
    this.directory.saveActiveFile();
    this.preview.setPreviewText();
    this.undo.pushToBuffer(e);
    this.search.find();
    this.render.update();
  }
}

globalThis.leto = new Leto();
leto.config.load();