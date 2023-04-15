'use strict';

const fileTree = document.getElementById('file-tree');
const nameInput = document.getElementById('name-input');
const deleteArea = document.getElementById('delete-area');

export default class Explorer {

  constructor() {
    this.openFolders = [];

    nameInput.addEventListener('input', () => this.#sanitizeNameInput());
    nameInput.addEventListener('focusout', async () => {
      var element;
      if (nameInput.parentElement.querySelector('.file-button')) {
        element = nameInput.parentElement.querySelector('.file-button');
        await leto.directory.renameFile(element.getAttribute('data-path'), nameInput.value);
      }
      else if (nameInput.parentElement.querySelector('.folder-button')) {
        element = nameInput.parentElement.querySelector('.folder-button');
        await leto.directory.renameFolder(element.getAttribute('data-path'), nameInput.value);
      }
      
      element.parentElement.draggable = true;
      element.innerHTML = nameInput.value;
      element.style.display = 'block';
      nameInput.style.display = 'none';
    });

    document.addEventListener('dragstart', (event) => {
      if (event.dataTransfer.getData('text/path')) deleteArea.style.display = 'block' });
    document.addEventListener('dragend', () => { deleteArea.style.display = 'none' });

    this.#makeDroppable(deleteArea);
    deleteArea.addEventListener('drop', (event) => {
      const path = event.dataTransfer.getData('text/path');
      leto.directory.moveToTrash(path);
      event.preventDefault();
    });

    fileTree.addEventListener('click', (event) => {
      if (!event.target) return;
      if (event.target.classList.contains('file-button')) {
        this.#handleFileClick(event);
      } else if (event.target.classList.contains('folder-button')) {
        this.#handleFolderClick(event);
      }
    });

    fileTree.addEventListener('mouseup', (event) => {
      if (!event.target) return;
      if (event.button != 2) return;

      if (!event.target.classList.contains('file-button') && !event.target.classList.contains('folder-button')) return;

      const button = event.target;
      button.parentElement.append(nameInput);
      button.parentElement.draggable = false;
      button.style.display = 'none';
      nameInput.style.display = 'block';
      nameInput.value = button.innerHTML;
      nameInput.focus();
    });
  }

  #sanitizeNameInput() {
    nameInput.value = nameInput.value.replace(/[<>:"/\\|?*\x00-\x1F]/g, '');
  }

  #handleFileClick(event) {
    const fileButton = event.target;
    leto.directory.setActiveFile(fileButton.getAttribute('data-path'));
  }

  #handleFolderClick(event) {
    const folderButton = event.target;
    const nested = folderButton.parentElement.querySelector('.nested');
    if (nested.style.display == 'block') {
      nested.style.display = 'none';
      this.openFolders = this.openFolders.filter(item => item != folderButton.getAttribute('data-path'));
    } else {
      nested.style.display = 'block';
      this.openFolders.push(folderButton.getAttribute('data-path'));
    }
  }

  clearFileTree() {
    fileTree.innerHTML = '';
  }

  highlightSelectedFile(path) {
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

    while (true) {
      highlightedElement.classList.add('selected');
      var folder = highlightedElement.parentElement.parentElement.parentElement.firstChild;
      if (folder == null || folder.className != 'folder-button') break;
      highlightedElement = folder;
    }
  }

  showFileTree(directoryElements, directoryPath) {
    this.clearFileTree();

    directoryElements.forEach(child => child.children && this.#showFolder(child, fileTree));
    directoryElements.forEach(child => !child.children && this.#showFile(child, fileTree));

    var rootDropArea = document.createElement('li');
    rootDropArea.style.height = '30px';
    rootDropArea.setAttribute('data-tauri-drag-region', '');
    fileTree.appendChild(rootDropArea);
    this.#makeDroppable(rootDropArea);
    rootDropArea.addEventListener('drop', (event) => this.#handleElementDrop(event, directoryPath));
  }

  #showFile(file, parentElement) {
    var extension = this.#getFileExtension(file.name);
    if (extension != 'md' && extension != 'txt') return;

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
      event.dataTransfer.setData('text', file.path);
    });
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

    if (this.openFolders.includes(folder.path)) {
      liElement.querySelector('.nested').style.display = 'block';
    }
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
}
