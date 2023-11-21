'use strict';

const { appWindow } = window.__TAURI__.window;
const { convertFileSrc } = window.__TAURI__.tauri;

const imagePreview = document.getElementById('image-preview');
const imagePreviewImage = document.getElementById('image-preview-image');
const contextMenu = document.getElementById('context-menu');
const editor = document.getElementById('text-editor');
const explorer = document.getElementById('sidebar');

export default class ContextMenu {
  
  #initialClickTarget;
  #deleting;
  #showingImagePreview;

  constructor() {
    document.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      if (contextMenu.contains(event.target)) return;
      this.#initialClickTarget = event.target;
      this.#show(event);
    });

    document.addEventListener('click', (event) => {
      this.hidePreviewImage();
      if (!contextMenu.contains(event.target)){
        this.hide();
        return;
      }
      if (event.target.tagName !== 'LI') return;
      this.#handleClick(event.target.textContent);
    });
    
    document.addEventListener('keydown', () => this.hide());
    document.addEventListener('mousemove', event => this.#updatePreviewImage(event));
  }

  hide() {
    contextMenu.style.top = -10000 + 'px';
    contextMenu.classList.remove('show');
  }

  async previewImage(imagePath, event) {
    this.#showingImagePreview = true;
    const size = await appWindow.innerSize();
    imagePreviewImage.setAttribute('src', convertFileSrc(imagePath));
    const deltaX = size.width > event.clientX + imagePreviewImage.clientWidth + 5 ? 0 :  imagePreviewImage.clientWidth;
    const deltaY = size.height > event.clientY + imagePreviewImage.clientHeight + 5 ? 0 : imagePreviewImage.clientHeight;
    imagePreview.classList.add('show');
    imagePreview.style.left = event.clientX - deltaX + 'px';
    imagePreview.style.top = event.clientY - deltaY + 'px';
  }

  hidePreviewImage() {
    this.#showingImagePreview = false;
    imagePreview.classList.remove('show');
  }

  async #updatePreviewImage(event) {
    if (!this.#showingImagePreview) return;
    if (!document.elementFromPoint(event.clientX, event.clientY).classList.contains("link")) this.hidePreviewImage();
    const size = await appWindow.innerSize();
    const deltaX = size.width > event.clientX + imagePreviewImage.clientWidth + 5 ? 0 :  imagePreviewImage.clientWidth;
    const deltaY = size.height > event.clientY + imagePreviewImage.clientHeight + 5 ? 0 : imagePreviewImage.clientHeight;
    imagePreview.style.left = event.clientX - deltaX + 'px';
    imagePreview.style.top = event.clientY - deltaY + 'px';
  }

  async #show(event) {
    if (event.target === editor) this.#createEditorMenu();
    else if (explorer.contains(event.target)) this.#createFileSystemMenu();
    else return;

    this.#deleting = false;
    const size = await appWindow.innerSize();
    contextMenu.classList.add('show');

    const deltaX = size.width > event.clientX + contextMenu.clientWidth + 5 ? 0 :  contextMenu.clientWidth;
    const deltaY = size.height > event.clientY + contextMenu.clientHeight + 5 ? 0 : contextMenu.clientHeight;
    contextMenu.style.left = event.clientX - deltaX + 'px';
    contextMenu.style.top = event.clientY - deltaY + 'px';
  }

  async #handleClick(action) {
    editor.focus();
    if (action === 'Copy') leto.edit.copy();
    else if (action === 'Paste') leto.edit.paste();
    else if (action === 'Cut') leto.edit.cut();

    else if (action === 'Delete') {
      this.#deleting = true;
      this.#createFileSystemMenu();
      return;
    } 

    else if (action === 'Delete?') leto.explorer.deleteItem(this.#initialClickTarget);
    else if (action === 'Pin') leto.explorer.pinItem(this.#initialClickTarget);
    else if (action === 'Unpin') leto.explorer.unpinItem(this.#initialClickTarget);
    else if (action === 'Unpin All') leto.explorer.setPins(null);
    else if (action === 'Rename') leto.explorer.renameItem(this.#initialClickTarget);
    else if (action === 'New File') this.#createFile(this.#initialClickTarget);
    else if (action === 'New Folder') this.#createFolder(this.#initialClickTarget);
    else if (action === 'Reload') leto.directory.tryDisplayActiveDirectory();
    else if (action === 'Preview') leto.render.openWindow(this.#initialClickTarget.getAttribute('data-path'));
    else if (action === 'Add to Dictionary') leto.spellcheck.addCurrentToDictionary();
    else if (action === 'Show') {
      var path = this.#initialClickTarget.getAttribute('data-path') ?? leto.directory.activeDirectory;
      leto.directory.showInExplorer(path);
    }

    else leto.edit.replaceWord(action);

    this.hide();
  }

  #createFile(target) {
    if (!target || !leto.explorer.isFile(target) && !leto.explorer.isFolder(target)) leto.directory.createNewFile();
    else if (leto.explorer.isFile(target)) 
      leto.directory.createNewFile(target.getAttribute('data-path').substring(0, target.getAttribute('data-path').lastIndexOf('\\')));
    else if (leto.explorer.isFolder(target)) {
      leto.directory.createNewFile(target.getAttribute('data-path'));
    }
  }

  #createFolder(target) {
    if (!target || !leto.explorer.isFile(target) && !leto.explorer.isFolder(target)) leto.directory.createNewFolder();
    else if (leto.explorer.isFile(target)) 
      leto.directory.createNewFolder(target.getAttribute('data-path').substring(0, target.getAttribute('data-path').lastIndexOf('\\')));
    else if (leto.explorer.isFolder(target)) 
      leto.directory.createNewFolder(target.getAttribute('data-path'));
  }

  #createFileSystemMenu() {
    contextMenu.innerHTML = '';

    if (leto.explorer.isFile(this.#initialClickTarget)) {
      this.#addAction('Rename');
      this.#addAction(this.#deleting ? 'Delete?' : 'Delete');
      this.#addAction(leto.explorer.isPinned(this.#initialClickTarget) ? 'Unpin' : 'Pin');
      this.#addAction('Preview');
      this.#addSeparator();
    } else if (leto.explorer.isFolder(this.#initialClickTarget)) {
      this.#addAction('Rename');
      this.#addAction(this.#deleting ? 'Delete?' : 'Delete');
      this.#addSeparator();
    } else if (leto.explorer.isPinned(this.#initialClickTarget)) {
      this.#addAction('Unpin');
      this.#addAction('Unpin All');
      this.#addSeparator();
      this.#addAction('Preview');
      return;
    }
    this.#addAction('New File');
    this.#addAction('New Folder');
    this.#addSeparator();
    this.#addAction('Show');
    this.#addAction('Reload');
  }

  #createEditorMenu() {
    contextMenu.innerHTML = '';
    this.#addAction('Copy');
    this.#addAction('Paste');
    this.#addAction('Cut');
    if (leto.spellcheck.toggled && !leto.spellcheck.checkCurrentWord()) {
      this.#addSeparator();
      this.#addAction("Add to Dictionary");
      var words = leto.spellcheck.correctCurrentWord();
      if (words != null && words.length != 0) {
        this.#addSeparator();
        words.forEach(word => this.#addAction(word));
      } 
    }
  }

  #addAction(name) {
    var action = document.createElement('li');
    action.innerHTML = name;
    contextMenu.appendChild(action);
  }

  #addSeparator() {
    var separator = document.createElement('li');
    separator.className = 'separator';
    contextMenu.appendChild(separator);
  }
}