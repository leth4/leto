'use strict';

const fileTree = document.getElementById('file-tree');
const preferences = document.getElementById('preferences');
const fileNameInput = document.getElementById('file-name');
const folderNameInput = document.getElementById('folder-name');

export default class Explorer {
  constructor() {
    this.openFolders = [];
    this.renamingFolder;

    fileNameInput.addEventListener('input', async () => {
      fileNameInput.value = this.#sanitizeFilename(fileNameInput.value);
    });
    fileNameInput.addEventListener('focusout', async () => {
      leto.directory.renameFile(
        fileNameInput.parentElement.firstChild.getAttribute('data-path'),
        fileNameInput.value
      );
      fileNameInput.parentElement.firstChild.innerHTML = fileNameInput.value;
      fileNameInput.parentElement.firstChild.style.display = 'block';
      fileNameInput.parentElement.draggable = 'true';
      fileNameInput.style.display = 'none';
      preferences.append(fileNameInput);
    });

    folderNameInput.addEventListener('input', () => {
      folderNameInput.value = this.#sanitizeFilename(folderNameInput.value);
    });
    folderNameInput.addEventListener('focusout', async () => {
      await leto.directory.renameFolder(
        this.renamingFolder.getAttribute('data-path'),
        folderNameInput.value
      );
      this.renamingFolder.innerHTML = folderNameInput.value;
      this.renamingFolder.style.display = 'block';
      this.renamingFolder.parentElement.draggable = 'true';
      folderNameInput.style.display = 'none';
      preferences.append(folderNameInput);
    });

    var deleteArea = document.getElementById('delete-area');

    deleteArea.addEventListener('dragenter', (event) => {
      event.preventDefault();
    });

    deleteArea.addEventListener('dragover', (event) => {
      event.preventDefault();
    });

    deleteArea.addEventListener('drop', (event) => {
      const path = event.dataTransfer.getData('text/path');
      if (path.slice(-1) === '/') {
        leto.directory.moveFolderToTrash(path.slice(0, -1));
      } else {
        leto.directory.moveFileToTrash(path);
      }
      event.preventDefault();
    });

    document.addEventListener('dragstart', (event) => {
      if (event.dataTransfer.getData('text/path'))
        deleteArea.classList.add('active');
    });

    document.addEventListener('dragend', () => {
      deleteArea.classList.remove('active');
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
      if (event.target.classList.contains('file-button')) {
        if (event.button != 2) return;
        this.#handleFileRightClick(event);
      } else if (event.target.classList.contains('folder-button')) {
        if (event.button != 2) return;
        this.#handleFolderRightClick(event);
      }
    });
  }

  #handleFileClick(event) {
    const fileButton = event.target;
    leto.directory.setActiveFile(fileButton.getAttribute('data-path'));
  }

  #handleFolderClick(event) {
    const folderButton = event.target;
    const nested = folderButton.parentElement.querySelector('.nested');
    if (nested.classList.contains('active')) {
      nested.classList.remove('active');
      this.openFolders.filter(
        (item) => item !== folderButton.getAttribute('data-path')
      );
    } else {
      nested.classList.add('active');
      this.openFolders.push(folderButton.getAttribute('data-path'));
    }
  }

  #handleFileRightClick(event) {
    const fileButton = event.target;
    leto.directory.setActiveFile(fileButton.getAttribute('data-path'));
    fileButton.parentElement.append(fileNameInput);
    fileButton.parentElement.draggable = false;
    fileNameInput.style.display = 'block';
    fileNameInput.focus();
    fileNameInput.value = fileButton.innerHTML;
    fileButton.style.display = 'none';
  }

  #handleFolderRightClick(event) {
    const folderButton = event.target;
    folderButton.parentElement.insertBefore(
      folderNameInput,
      folderButton.parentElement.firstChild
    );
    folderNameInput.value = folderButton.innerHTML;
    folderNameInput.style.display = 'block';
    folderNameInput.focus();
    this.renamingFolder = folderButton;
    folderButton.parentElement.draggable = false;
    folderButton.style.display = 'none';
  }

  #sanitizeFilename(name) {
    return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '');
  }

  clearFileTree() {
    fileTree.innerHTML = '';
  }

  highlightSelectedFile(path) {
    var files = document.getElementsByClassName('file-button');
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
      var folder =
        highlightedElement.parentElement.parentElement.parentElement.firstChild;
      if (folder == null || folder.className != 'folder-button') break;
      highlightedElement = folder;
    }
  }

  showFileTree(directoryElements, directoryPath) {
    this.clearFileTree();

    directoryElements.forEach(child => child.children && this.#showFolder(child, fileTree));
    directoryElements.forEach(child => !child.children && this.#showFile(child, fileTree));

    var mainDropArea = document.createElement('li');
    mainDropArea.style.height = '30px';
    mainDropArea.setAttribute('data-tauri-drag-region', '');
    fileTree.appendChild(mainDropArea);

    mainDropArea.addEventListener('dragenter', (event) => { event.preventDefault(); });
    mainDropArea.addEventListener('dragover', (event) => { event.preventDefault(); });
    mainDropArea.addEventListener('drop', (event) => {
      var path = event.dataTransfer.getData('text');
      if (path.slice(-1) === '/') {
        leto.directory.moveFolderTo(path.slice(0, -1), directoryPath);
      } else {
        leto.directory.moveFileTo(event.dataTransfer.getData('text'),directoryPath);
      }
      event.preventDefault();
    });
  }

  #showFile(file, parentElement) {
    var extension = this.#getFileExtension(file.name);
    if (extension != 'md' && extension != 'txt') return;

    var fileButton = document.createElement('button');
    fileButton.className = 'file-button';
    fileButton.setAttribute('data-path', file.path);
    fileButton.innerHTML = file.name.replace(/\.[^/.]+$/, '');
    if (fileButton.innerHTML.replace(/\s/g, '').length === 0)
      fileButton.innerHTML = '--';

    fileButton.addEventListener('dragenter', (event) => { event.preventDefault(); });
    fileButton.addEventListener('dragover', (event) => { event.preventDefault(); });
    fileButton.addEventListener('drop', (event) => {
      var path = event.dataTransfer.getData('text');
      if (path.slice(-1) === '/') {
        leto.directory.moveFolderTo(path.slice(0, -1), file.path.substring(0, file.path.lastIndexOf('\\')));
      } else {
        leto.directory.moveFileTo(event.dataTransfer.getData('text'), file.path.substring(0, file.path.lastIndexOf('\\')));
      }
      event.preventDefault();
    });

    var liElement = document.createElement('li');
    liElement.appendChild(fileButton);
    parentElement.appendChild(liElement);
    liElement.draggable = true;
    liElement.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/path', file.path);
      event.dataTransfer.setData('text', file.path);
    });
  }

  #showFolder(folder, parentElement) {
    if (folder.name.substring(0, 1) === '.') return;

    var folderButton = document.createElement('button');
    folderButton.className = 'folder-button';
    folderButton.setAttribute('data-path', folder.path);
    folderButton.innerHTML = folder.name;

    folderButton.draggable = true;
    folderButton.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/path', folder.path + '/');
      event.dataTransfer.setData('text', folder.path + '/');
    });

    var liElement = document.createElement('li');
    liElement.appendChild(folderButton);

    folderButton.addEventListener('dragenter', (event) => { event.preventDefault(); });
    folderButton.addEventListener('dragover', (event) => { event.preventDefault(); });
    folderButton.addEventListener('drop', (event) => {
      var path = event.dataTransfer.getData('text/path');
      if (path.slice(-1) === '/') {
        leto.directory.moveFolderTo(path.slice(0, -1), folder.path);
      } else {
        leto.directory.moveFileTo(path, folder.path);
      }
      event.preventDefault();
    });

    parentElement.appendChild(liElement);
    var ulElement = document.createElement('ul');
    ulElement.className = 'nested';
    liElement.appendChild(ulElement);


    folder.children.forEach(child => child.children && this.#showFolder(child, ulElement));
    folder.children.forEach(child => !child.children && this.#showFile(child, ulElement));

    if (this.openFolders.includes(folder.path)) {
      liElement.querySelector('.nested').classList.add('active');
    }
  }

  #getFileExtension = (file) => /[^.]*$/.exec(file)[0];
}
