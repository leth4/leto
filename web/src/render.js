'use strict';

const { WebviewWindow, getAll, appWindow } = window.__TAURI__.window;
const { emit, listen, once } = window.__TAURI__.event;
const { exists, writeTextFile, readTextFile } = window.__TAURI__.fs;
const { invoke, convertFileSrc } = window.__TAURI__.tauri;

const editor = document.getElementById('text-editor');
const preview = document.getElementById('text-preview');

export default class Render {

  constructor() {this.#setupListeners()}

  async #setupListeners() {
    await listen('renderWindowClosed', () => this.#handleWindowClosed());
    await listen('renderTodoClicked', event => { this.#toggleTodo(event.payload.index, event.payload.file) });
    await listen('renderOpenFile', event => { leto.directory.setActiveFile(event.payload.file); leto.windowManager.showIsHidden(); appWindow.setFocus(); });
    await listen('renderOpenLink', event => { leto.explorer.openFromLink(event.payload.file); leto.windowManager.showIsHidden(); appWindow.setFocus(); });
  }

  openCurrent() {
    this.openWindow(leto.directory.activeFile);
  }

  #handleWindowClosed() {
    if (leto.windowManager.isHidden && !this.hasWebviews()) leto.windowManager.closeAllWindows();
  }

  async openWindow(file) {
    var imagePath = '', _;
    var preview = '';
    var windowSize = {width: 700, height: 500};

    if (leto.directory.isFileACanvas(file)) return;

    if (leto.directory.isFileAnImage(file)) {
      imagePath = convertFileSrc(file);
    } else {
      var text;
      if (file == leto.directory.activeFile) {
        text = editor.value;
      } else {
        if (!(await exists(file))) return;
        text = await readTextFile(file);
      }
      [preview, _] = leto.preview.getPreview(text);
    }

    new WebviewWindow(this.#generateRandomId(), {
      title: leto.directory.removeFileExtension(leto.directory.getNameFromPath(file)),
      url: 'preview.html',
      decorations: false,
      transparent: true,
      focus: true,
      width: windowSize.width,
      height: windowSize.height + 35
    });

    await once('renderWindowLoaded', event => {
      this.update(preview, file, imagePath);
      invoke('apply_shadow', {  label: event.payload.label });
    });
  }
  
  hasWebviews() {
    return getAll().length > 1;
  }

  closeAllWindows() {
    var windows = getAll();
    for (var i = 0; i < windows.length; i++) {
      windows[i].close();
    }
  }

  #generateRandomId() {
    return (Math.random() + 1).toString(36).substring(7);
  }

  async #toggleTodo(index, file) {
    var text;
    if (file == leto.directory.activeFile) {
      text = editor.value;
    } else {
      if (!(await exists(file))) return;
      text = await readTextFile(file);
    }

    var lines = text.split('\n');
    var count = 0;

    for (var i = 0; i < lines.length; i++) {
      if (/^\[ \]\s/.test(lines[i])) {
        if (count === index) {
          lines[i] = lines[i].replace('[ ]', '[x]');
          break;
        }
        count++;
      }
      if (/^\[x\]\s/.test(lines[i])) {
        if (count === index) {
          lines[i] = lines[i].replace('[x]', '[ ]');
          break;
        }
        count++;
      }
    }

    var newText = lines.join('\n');

    if (file == leto.directory.activeFile) {
      editor.value = newText;
      leto.handleEditorInput();
    } else {
      if (!(await exists(file))) return;
      await writeTextFile(file, newText);
      this.update(leto.preview.getPreview(newText)[0], file);
    }   
  }

  update(text = preview.innerHTML, file = leto.directory.activeFile, imagePath = '') {
    if (file === null) return;
    emit('renderWindowUpdate', {
      text: this.#createRender(text),
      imagePath: imagePath,
      font: leto.windowManager.currentFont,
      fontSize: leto.windowManager.fontSize,
      fontWeight: leto.windowManager.fontWeight,
      theme: leto.windowManager.currentTheme,
      file: file,
      title: leto.directory.removeFileExtension(leto.directory.getNameFromPath(file))
    });
  }

  #createRender(text) {
    text = text.trim();
    const html = text.replace(/^\[ \] (.*$)/gm, `<button class="todo"></button> $1`)
             .replace(/^\[x\] (.*$)/gm, `<button class="todo checked"></button> <s>$1</s>`)
             .replace(/^— (.*)(\n)?/gm, "<ul><li>$1</li></ul>")
             .replace(/(^----*)[\r\n]/gm, `<hr>`)
             .replace(/\[\[([^[\]]+)\]\]/g, this.#imageReplacerFunction)
             .replace(/\n/g, "<br>");
	return html;
  }

  #imageReplacerFunction(match, p1) {
    var imagePath = leto.explorer.getImagePathFromLink(p1);
    if (imagePath == '') return match;
    return `<img src='${convertFileSrc(imagePath)}' alt='${p1}'>`;
  }
}