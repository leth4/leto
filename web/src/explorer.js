'use strict';

const pinsList = document.getElementById('pins-list');
const fileTree = document.getElementById('file-tree');
const nameInput = document.getElementById('name-input');

export default class Explorer {

  #openFolders = [];
  #pinsBeforeCheck = [];
  #elementPendingRename = null;

  constructor() {
    this.pins = [];
    this.pendingRename = null;
    
    nameInput.addEventListener('input', () => this.#sanitizeNameInput());
    nameInput.addEventListener('focusout', async () => {
      var element;
      if (nameInput.parentElement.querySelector('.folder-button')) {
        element = nameInput.parentElement.querySelector('.folder-button');
        await leto.directory.renameFolder(element.getAttribute('data-path'), nameInput.value);
      }
      else if (nameInput.parentElement.querySelector('.file-button')) {
        element = nameInput.parentElement.querySelector('.file-button');
        await leto.directory.renameFile(element.getAttribute('data-path'), nameInput.value);
      }
      
      element.parentElement.draggable = true;
      element.innerHTML = nameInput.value;
      element.style.display = 'block';
      nameInput.style.display = 'none';
    });

    pinsList.addEventListener('click', (event) => {
      if (!event.target) return;
      if (event.target.classList.contains('pin-button')) {
        this.#handleFileClick(event.target.getAttribute('data-path'));
      }
    })

    fileTree.addEventListener('click', (event) => {
      if (!event.target) return;
      if (event.target.classList.contains('file-button')) {
        this.#handleFileClick(event.target.getAttribute('data-path'));
      } else if (event.target.classList.contains('folder-button')) {
        this.#handleFolderClick(event);
      }
    });
  }

  openFromLink(file) {
    file = file.replaceAll('/', '\\');
    const files = document.getElementsByClassName('file-button');

    for (var i = 0; i < files.length; i++) {
      if (files[i].getAttribute('data-path').endsWith("\\" + file + '.md')) {
        leto.directory.setActiveFile(files[i].getAttribute('data-path'));
        break;
      }
    }
  }

  #getUniqueLink(file) {
    const files = document.getElementsByClassName('file-button');

    var parts = file.split('\\');
    var link = parts.pop();
    
    while (parts.length != 0) {
      var filesFound = 0;
      for (var i = 0; i < files.length; i++) {
        if (files[i].getAttribute('data-path').endsWith('\\' + link)) {
          filesFound++;
        }
      }
      if (filesFound == 1) break;
      link = parts.pop() + '\\' + link;
    }

    return this.#removeFileExtension(link.replaceAll('\\', '/'));
  }

  updateFolderPath(oldPath, newPath) {
    this.#openFolders.filter(item => item != oldPath);
    if (newPath) this.#openFolders.push(newPath);
  }

  #sanitizeNameInput() {
    nameInput.value = nameInput.value.replace(/[<>:"/\\|?*\x00-\x1F]/g, '');
  }

  isPinned(element) {
    const path = element.getAttribute('data-path');
    for (var i = 0; i < this.pins.length; i++) {
      if (this.pins[i] === path) return true;
    }
    return false;
  }

  isFile(element) {
    return element.classList.contains('file-button');
  }
  
  isFolder(element) {
    return element.classList.contains('folder-button');
  }

  openPin(index) {
    if (index >= this.pins.length) return;
    this.#handleFileClick(this.pins[index]);
  }

  pinItem(target) {
    if (!target) return;
    if (!this.isFile(target)) return;
    if (this.pins.includes(target.getAttribute('data-path'))) return;
    this.pins.unshift(target.getAttribute('data-path'));
    leto.config.save();
    this.#showPins();
  }
  
  unpinItem(target) {
    if (!target) return;
    const index = this.pins.indexOf(target.getAttribute('data-path'));
    if (index < 0) return;
    this.pins.splice(index, 1);
    leto.config.save();
    this.#showPins();
  }

  setPins(pins) {
    this.pins = pins ?? [];
    this.#showPins();
    leto.config.save();
  }

  #showPins() {
    pinsList.innerHTML = '';

    this.pins.forEach(pin => {
      var pinButton = document.createElement('button');
      pinButton.className = 'pin-button';
      pinButton.setAttribute('data-path', pin);
      pinButton.innerHTML = this.#removeFileExtension(this.#getNameFromPath(pin));
      if (pinButton.innerHTML.replace(/\s/g, '').length === 0) pinButton.innerHTML = '--';
      var liElement = document.createElement('li');
      liElement.appendChild(pinButton);
      pinsList.appendChild(liElement);
    });
  }

  deleteItem(target) {
    if (!target) return;
    if (!this.isFile(target) && !this.isFolder(target)) return;
    leto.directory.moveToTrash(target.getAttribute('data-path'));
  }

  renameItem(target) {
    if (!target) return;
    if (!this.isFile(target) && !this.isFolder(target)) return;

    const button = target;
    button.parentElement.insertBefore(nameInput, button.parentElement.firstChild);
    button.parentElement.draggable = false;
    button.style.display = 'none';
    nameInput.style.display = 'block';
    nameInput.value = button.innerHTML;
    nameInput.focus();
  }

  #handleFileClick(path) {
    leto.directory.setActiveFile(path);
  }

  #handleFolderClick(event) {
    const folderButton = event.target;
    const nested = folderButton.parentElement.querySelector('.nested');
    if (nested.style.display == 'block') {
      nested.style.display = 'none';
      this.#openFolders = this.#openFolders.filter(item => item != folderButton.getAttribute('data-path'));
    } else {
      nested.style.display = 'block';
      this.#openFolders.push(folderButton.getAttribute('data-path'));
    }
    this.highlightSelectedFile(leto.directory.activeFile);
  }

  clearFileTree() {
    fileTree.innerHTML = '';
  }

  highlightSelectedFile(path) {
    const pins = document.getElementsByClassName('pin-button');
    for (var i = 0; i < pins.length; i++) {
      pins[i].classList.remove('selected');
      if (pins[i].getAttribute('data-path') === path)
        pins[i].classList.add('selected');
    }

    const files = document.getElementsByClassName('file-button');
    var highlightedElement;

    for (var i = 0; i < files.length; i++) {
      if (files[i].getAttribute('data-path') === path)
        highlightedElement = files[i];
      files[i].classList.remove('selected');
    }

    if (highlightedElement == null) return;

    var folders = document.getElementsByClassName('folder-button');
    for (var i = 0; i < folders.length; i++) {
      folders[i].classList.remove('selected');
    }

    highlightedElement.classList.add('selected');
    
    while (true) {
      var folder = highlightedElement.parentElement.parentElement.parentElement.firstChild;
      if (folder == null || folder.className != 'folder-button') break;
      highlightedElement = folder;
      if (!this.#openFolders.includes(highlightedElement.getAttribute('data-path'))) highlightedElement.classList.add('selected');
    }
}

  showFileTree(directoryElements, directoryPath) {
    this.#pinsBeforeCheck = [...this.pins];
    this.pins = [];

    this.clearFileTree();

    directoryElements.forEach(child => child.children && this.#showFolder(child, fileTree));
    directoryElements.forEach(child => !child.children && this.#showFile(child, fileTree));

    var rootDropArea = document.createElement('li');
    rootDropArea.style.height = '30px';
    rootDropArea.setAttribute('data-tauri-drag-region', '');
    fileTree.appendChild(rootDropArea);
    this.#makeDroppable(rootDropArea);
    rootDropArea.addEventListener('drop', (event) => this.#handleElementDrop(event, directoryPath));

    this.pins.sort((a, b) => this.#pinsBeforeCheck.indexOf(a) - this.#pinsBeforeCheck.indexOf(b));

    this.#showPins();

    this.renameItem(this.#elementPendingRename);
    this.#elementPendingRename = null;
    this.pendingRename = null;
  }

  #showFile(file, parentElement) {
    var extension = this.#getFileExtension(file.name);
    if (extension != 'md' && extension != 'txt') return;

    if (this.#pinsBeforeCheck.includes(file.path)) this.pins.push(file.path);

    var fileButton = document.createElement('button');
    fileButton.className = 'file-button';
    fileButton.setAttribute('data-path', file.path);
    fileButton.innerHTML = this.#removeFileExtension(file.name);
    if (fileButton.innerHTML.replace(/\s/g, '').length === 0) fileButton.innerHTML = '--';

    this.#makeDroppable(fileButton);
    fileButton.addEventListener('drop', (event) => this.#handleElementDrop(event, file.path.substring(0, file.path.lastIndexOf('\\'))));

    var liElement = document.createElement('li');
    liElement.appendChild(fileButton);
    parentElement.appendChild(liElement);
    liElement.draggable = true;
    liElement.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/oldpath', file.path);
      event.dataTransfer.setData('text/path', file.path);
      event.dataTransfer.setData('text', `[[${this.#getUniqueLink(file.path)}]]`);
    });

    if (file.path == this.pendingRename) this.#elementPendingRename = fileButton;
  }

  #showFolder(folder, parentElement) {
    if (folder.name.startsWith('.')) return;

    var folderButton = document.createElement('button');
    folderButton.className = 'folder-button';
    folderButton.setAttribute('data-path', folder.path);
    folderButton.innerHTML = folder.name;

    folderButton.draggable = true;
    folderButton.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/oldpath', folder.path);
      event.dataTransfer.setData('text/path', folder.path);
      event.dataTransfer.setData('text', folder.path);
    });

    var liElement = document.createElement('li');
    liElement.appendChild(folderButton);

    this.#makeDroppable(folderButton);
    folderButton.addEventListener('drop', (event) => this.#handleElementDrop(event, folder.path));

    parentElement.appendChild(liElement);
    var ulElement = document.createElement('ul');
    ulElement.className = 'nested';
    liElement.appendChild(ulElement);

    folder.children.forEach(child => child.children && this.#showFolder(child, ulElement));
    folder.children.forEach(child => !child.children && this.#showFile(child, ulElement));

    if (this.#openFolders.includes(folder.path)) {
      liElement.querySelector('.nested').style.display = 'block';
    }

    if (folder.path == this.pendingRename) this.#elementPendingRename = folderButton;
  }

  #handleElementDrop(event, newPath) {
    var path = event.dataTransfer.getData('text/path');
    leto.directory.moveTo(path, newPath);
    event.preventDefault();
  }

  #getFileExtension(file) {
    return /[^.]*$/.exec(file)[0];
  }
  
  #removeFileExtension(file) {
    return file.replace(/\.[^/.]+$/, '');
  }

  #makeDroppable(element) {
    element.addEventListener('dragenter', (event) => { event.preventDefault(); });
    element.addEventListener('dragover', (event) => { event.preventDefault(); });
  }

  #getNameFromPath(path) {
    return path.replace(/^.*[\\\/]/, '');
  }
}
