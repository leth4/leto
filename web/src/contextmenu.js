'use strict';

const{ appWindow } = window.__TAURI__.window;
const { readText } = window.__TAURI__.clipboard;

const contextMenu = document.getElementById('context-menu');
const editor = document.getElementById('text-editor');
const explorerElementActions = ['Rename', 'Delete'];
const explorerActions = ['New File', 'New Folder']; // Select directory
const editorActions = ['Copy', 'Paste', 'Cut'];

export default class ContextMenu {
  
  #initialClickTarget;

  constructor() {
    document.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      if (contextMenu.contains(event.target)) return;
      this.#initialClickTarget = event.target;
      this.#show(event);
    });

    document.addEventListener('click', (event) => {
      this.hide();
      if (!contextMenu.contains(event.target)) return;
      if (event.target.tagName !== 'LI') return;
      this.#handleClick(event.target.textContent);
    });
    
    document.addEventListener('keydown', () => this.hide());
  }

  hide() {
    contextMenu.style.display = 'none';
  }

  async #show(event) {
    const size = await appWindow.innerSize();
    contextMenu.style.display = 'block';

    const deltaX = size.width > event.clientX + contextMenu.clientWidth + 5 ? 0 :  contextMenu.clientWidth;
    const deltaY = size.height > event.clientY + contextMenu.clientHeight + 5 ? 0 : contextMenu.clientHeight;
    contextMenu.style.left = event.clientX - deltaX + 'px';
    contextMenu.style.top = event.clientY - deltaY + 'px';

    if (event.target === editor) this.#createEditorMenu();
    else this.#createFileSystemMenu();
  }

  async #handleClick(action) {
    editor.focus();
    if (action == 'Copy') document.execCommand("copy", false);
    else if (action == 'Paste') document.execCommand("insertText", false, await readText());
    else if (action == 'Cut') document.execCommand("cut", false);

    else if (action == 'Rename') leto.explorer.renameItem(this.#initialClickTarget);
    else if (action == 'Delete') leto.explorer.deleteItem(this.#initialClickTarget);
    else if (action == 'New File') this.#createFile(this.#initialClickTarget);
    else if (action == 'New Folder') this.#createFolder(this.#initialClickTarget);
  }

  #createFile(target) {
    if (!target || !leto.explorer.isExpolorerElement(target)) leto.directory.createNewFile();
    else if (target.classList.contains('file-button')) 
      leto.directory.createNewFile(target.getAttribute('data-path').substring(0, target.getAttribute('data-path').lastIndexOf('\\')));
    else if (target.classList.contains('folder-button')) 
      leto.directory.createNewFile(target.getAttribute('data-path'));
  }

  #createFolder(target) {
    if (!target || !leto.explorer.isExpolorerElement(target)) leto.directory.createNewFolder();
    else if (target.classList.contains('file-button')) 
      leto.directory.createNewFolder(target.getAttribute('data-path').substring(0, target.getAttribute('data-path').lastIndexOf('\\')));
    else if (target.classList.contains('folder-button')) 
      leto.directory.createNewFolder(target.getAttribute('data-path'));
  }

  #createFileSystemMenu() {
    contextMenu.innerHTML = '';

     if (leto.explorer.isExpolorerElement(this.#initialClickTarget)) {
      for (var i in explorerElementActions) {
        var action = document.createElement('li');
        action.innerHTML = explorerElementActions[i];
        contextMenu.appendChild(action);
      }
      var separator = document.createElement('li');
      separator.className = 'separator';
      contextMenu.appendChild(separator);
    }

    for (var i in explorerActions) {
      var action = document.createElement('li');
      action.innerHTML = explorerActions[i];
      contextMenu.appendChild(action);
    }
  }

  #createEditorMenu() {
    contextMenu.innerHTML = '';
    for (var i in editorActions) {
      var action = document.createElement('li');
      action.innerHTML = editorActions[i];
      contextMenu.appendChild(action);
    }
  }
}