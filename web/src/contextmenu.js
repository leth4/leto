'use strict';

const { appWindow } = window.__TAURI__.window;
const { convertFileSrc } = window.__TAURI__.tauri;

const imageDisplay = document.getElementById('image-display');
const imagePreview = document.getElementById('image-preview');
const imagePreviewImage = document.getElementById('image-preview-image');
const contextMenu = document.getElementById('context-menu');
const editor = document.getElementById('text-editor');
const explorer = document.getElementById('sidebar');
const canvas = document.getElementById('canvas-container');

export default class ContextMenu {
  
  #initialClickTarget;
  #isDeleting;
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
      if (event.target.classList.contains('locked')) return;
      this.#handleClick(event.target.textContent, event);
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
    this.#isDeleting = false;

    if (event.target.nodeName === 'TEXTAREA') this.#createEditorMenu();
    else if (explorer.contains(event.target)) this.#createFileSystemMenu();
    else if (event.target === canvas) this.#createCanvasMenu();
    else if (event.target === imageDisplay) this.#createImageMenu();
    else if (event.target.classList.contains('card')) this.#createCardMenu();
    else if (event.target.classList.contains('arrow')) this.#createArrowMenu();
    else return;

    const size = await appWindow.innerSize();
    contextMenu.classList.add('show');

    const deltaX = size.width > event.clientX + contextMenu.clientWidth + 5 ? 0 :  contextMenu.clientWidth;
    const deltaY = size.height > event.clientY + contextMenu.clientHeight + 5 ? 0 : contextMenu.clientHeight;
    contextMenu.style.left = event.clientX - deltaX + 'px';
    contextMenu.style.top = event.clientY - deltaY + 'px';
  }

  async #handleClick(action) {
    this.#initialClickTarget.focus();

    if (action === 'Copy') {
      if (this.#initialClickTarget.classList.contains('card')) leto.canvas.copySelectedCards();
      else if (this.#initialClickTarget === imageDisplay) leto.directory.copyActiveImage();
      else leto.edit.copy();
    }
    else if (action === 'Paste') {
      if (this.#initialClickTarget === canvas) leto.canvas.pasteCopiedCards();
      else leto.edit.paste();
    }
    else if (action === 'Cut') {
      if (this.#initialClickTarget.classList.contains('card')) {
        leto.canvas.copySelectedCards();
        leto.canvas.deleteSelectedCards();
      } else leto.edit.cut();
    }

    else if (action === 'Delete') {
      if (this.#initialClickTarget.classList.contains('card')) leto.canvas.deleteSelectedCards();
      else {
        this.#isDeleting = true;
        this.#createFileSystemMenu();
        return;
      }
    } 

    else if (action === 'Delete?') leto.explorer.deleteItem(this.#initialClickTarget);
    else if (action === 'Pin') leto.explorer.pinItem(this.#initialClickTarget);
    else if (action === 'Unpin') leto.explorer.unpinItem(this.#initialClickTarget);
    else if (action === 'Unpin All') leto.explorer.setPins(null);
    else if (action === 'Rename') leto.explorer.renameItem(this.#initialClickTarget);
    else if (action === 'New Note') this.#createFile(this.#initialClickTarget, 'md');
    else if (action === 'New Lea') this.#createFile(this.#initialClickTarget, 'lea');
    else if (action === 'New Folder') this.#createFolder(this.#initialClickTarget);
    else if (action === 'Reload') leto.directory.tryDisplayActiveDirectory();
    else if (action === 'Preview') leto.render.openWindow(this.#initialClickTarget.getAttribute('data-path'));
    else if (action === 'Add to Dictionary') leto.spellcheck.addCurrentToDictionary();
    else if (action === 'Show') {
      var path = this.#initialClickTarget.getAttribute('data-path') ?? leto.directory.activeDirectory;
      leto.directory.showInExplorer(path);
    }

    else if (action === 'Connect') leto.canvas.connectSelectedCards();
    else if (action === 'New Card') leto.canvas.createEmptyCard();
    else if (action === 'Align ↓') leto.canvas.alignSelectedVertically();
    else if (action === 'Align →') leto.canvas.alignSelectedHorizontally();
    else if (action === 'To Front') leto.canvas.sendSelectedToFront();
    else if (action === 'To Back') leto.canvas.sendSelectedToBack();
    else if (action === 'Invert') leto.canvas.inverseSelectedCards();
    else if (action === 'Remove') leto.canvas.removeSelectedArrow();
    else if (action === 'Reverse') leto.canvas.reverseSelectedArrow();

    else leto.edit.replaceWord(action);

    this.hide();
  }

  #createFile(target, extension) {
    if (!target || !leto.explorer.isFile(target) && !leto.explorer.isFolder(target)) leto.directory.createNewFile(null, extension);
    else if (leto.explorer.isFile(target)) 
      leto.directory.createNewFile(target.getAttribute('data-path').substring(0, target.getAttribute('data-path').lastIndexOf('\\')), extension);
    else if (leto.explorer.isFolder(target)) {
      leto.directory.createNewFile(target.getAttribute('data-path'), extension);
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
      this.#addAction(this.#isDeleting ? 'Delete?' : 'Delete');
      this.#addAction(leto.explorer.isPinned(this.#initialClickTarget) ? 'Unpin' : 'Pin');
      this.#addAction('Preview', !this.#initialClickTarget.getAttribute('data-path').endsWith('.lea'));
      this.#addSeparator();
    } else if (leto.explorer.isFolder(this.#initialClickTarget)) {
      this.#addAction('Rename');
      this.#addAction(this.#isDeleting ? 'Delete?' : 'Delete');
      this.#addSeparator();
    } else if (leto.explorer.isPinned(this.#initialClickTarget)) {
      this.#addAction('Unpin');
      this.#addAction('Unpin All');
      this.#addSeparator();
      this.#addAction('Preview', !this.#initialClickTarget.getAttribute('data-path').endsWith('.lea'));
      return;
    }
    this.#addAction('New Note');
    this.#addAction('New Lea');
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
    if (this.#initialClickTarget == editor && leto.spellcheck.toggled && !leto.spellcheck.checkCurrentWord()) {
      this.#addSeparator();
      this.#addAction("Add to Dictionary");
      var words = leto.spellcheck.correctCurrentWord();
      if (words != null && words.length != 0) {
        this.#addSeparator();
        words.forEach(word => this.#addAction(word));
      } 
    }
  }

  #createCanvasMenu() {
    contextMenu.innerHTML = '';
    this.#addAction('New Card');
    this.#addAction('Paste', leto.canvas.hasCopiedCards());
  }

  #createImageMenu() {
    contextMenu.innerHTML = '';
    this.#addAction('Copy');
  }

  #createCardMenu() {
    contextMenu.innerHTML = '';
    if (leto.canvas.hasMultipleSelected()) {
      this.#addAction('Connect');
      this.#addSeparator();
    }
    this.#addAction('Copy');
    this.#addAction('Cut');
    this.#addAction('Delete');
    this.#addSeparator();
    this.#addAction('Invert');
    this.#addSeparator();
    this.#addAction('To Front');
    this.#addAction('To Back');
    if (leto.canvas.hasMultipleSelected()) {
      this.#addSeparator();
      this.#addAction('Align ↓');
      this.#addAction('Align →');
    }
  }

  #createArrowMenu() {
    contextMenu.innerHTML = '';
    this.#addAction('Remove');
    this.#addAction('Reverse');
  }

  #addAction(name, isActive = true) {
    var action = document.createElement('li');
    if (!isActive) action.classList.add('locked');
    action.innerHTML = name;
    contextMenu.appendChild(action);
  }

  #addSeparator() {
    var separator = document.createElement('li');
    separator.className = 'separator';
    contextMenu.appendChild(separator);
  }
}