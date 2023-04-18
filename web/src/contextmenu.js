'use strict';

const { readText } = window.__TAURI__.clipboard;

const contextMenu = document.getElementById('context-menu');
const editor = document.getElementById('text-editor');
const fileElementActions = ['Rename', 'Delete'];
const fileSystemActions = ['New File', 'New Folder'];
const editorActions = ['Copy', 'Paste', 'Cut']; 

export default class ContextMenu {
  
  #initialClickTarget;

  constructor() {
    document.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      this.#initialClickTarget = event.target;
      contextMenu.style.display = 'block';
      contextMenu.style.left = event.clientX + 'px';
      contextMenu.style.top = event.clientY + 'px';

      if (event.target === editor) this.#createEditorMenu();
      else this.#createFileSystemMenu();
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

  async #handleClick(action) {
    editor.focus();
    if (action == 'Copy') document.execCommand("copy", false);
    else if (action == 'Paste') document.execCommand("insertText", false, await readText());
    else if (action == 'Cut') document.execCommand("cut", false);

    else if (action == 'Rename') leto.explorer.renameItem(this.#initialClickTarget);
    else if (action == 'Delete') leto.explorer.deleteItem(this.#initialClickTarget);
    else if (action == 'New File') leto.directory.createNewFile(); // Specific location
    else if (action == 'New Folder') leto.directory.createNewFolder(); // Specific location
  }

  #createFileSystemMenu() {
    contextMenu.innerHTML = '';

     if (leto.explorer.isExpolorerElement(this.#initialClickTarget)) {
      for (var i in fileElementActions) {
        var action = document.createElement('li');
        action.innerHTML = fileElementActions[i];
        contextMenu.appendChild(action);
      }
      var separator = document.createElement('li');
      separator.className = 'separator';
      contextMenu.appendChild(separator);
    }

    for (var i in fileSystemActions) {
      var action = document.createElement('li');
      action.innerHTML = fileSystemActions[i];
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