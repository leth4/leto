'use strict';

import Undo from './undo.js';
import Directory from './directory.js';
import Edit from './edit.js';
import Window from './window.js';
import Explorer from './explorer.js';
import Shortcuts from './shortcuts.js';
import Config from './config.js';

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

    this.focused = true;
    this.correctionScroll = -1;

    document.addEventListener('contextmenu', (event) => event.preventDefault());
    editor.addEventListener('input', (event) => this.handleEditorInput(event), false);
    editor.addEventListener('beforeinput', (event) => this.handleScrollJump(event), false);
    editor.addEventListener('scroll', () => this.handleEditorScroll(), false);

    this.config.load();
  }

  async handleScrollJump(e) {
    if (e.inputType != 'insertLineBreak') return;
    this.correctionScroll = editor.scrollTop;
  }

  async handleEditorInput(e) {
    this.directory.saveActiveFile();
    this.setPreviewText();
    this.handleEditorScroll();

    this.undo.pushToBuffer(e);
  }

  setPreviewText() {
    var editorText =
      editor.value + (editor.value.slice(-1) === '\n' ? ' ' : '');
    editorText = editorText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/(?<!# )(\*)(.*?)(\*)/g, "<mark class='hashtag'>$1</mark><mark class='bold'>$2</mark><mark class='hashtag'>$3</mark>")
      .replace(/(^#{1,4})( .*)/gm, "<mark class='hashtag'>$1</mark><mark class='header'>$2</mark>");
    preview.innerHTML = editorText;
  }

  handleEditorScroll() {
    if (this.correctionScroll != -1) {
      if (Math.abs(preview.scrollTop - editor.scrollTop) >= 3)
        editor.scrollTop = this.correctionScroll; // Hacky fix for a browser bug; scrollbar randomly jumps when inserting a new line
      this.correctionScroll = -1;
    }

    preview.scrollTop = editor.scrollTop;
  }
}

globalThis.leto = new Leto();

await appWindow.onFocusChanged(({ payload: hasFocused }) => {
  leto.focused = hasFocused;
  if (hasFocused) {
    leto.directory.displayActiveDirectory();
    leto.directory.tryOpenActiveFile();
  }
});
