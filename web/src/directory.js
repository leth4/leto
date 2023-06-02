'use strict';

const { exists, writeTextFile, readTextFile, readDir, createDir } = window.__TAURI__.fs;
const { open, save, message } = window.__TAURI__.dialog;
const { invoke } = window.__TAURI__.tauri;

const editor = document.getElementById('text-editor');
const DIRECTORY_ENTRIES_LIMIT = 2000;
const TOO_BIG_MESSAGE = `Selected directory is too big. You can only have ${DIRECTORY_ENTRIES_LIMIT} files and subfolders in the directory.`;
const NO_DIRECTORY_MESSAGE = `Press <Ctrl+O> to open a directory.`

export default class Directory {

  #previousActiveFile;

  constructor() {
    this.activeFile;
    this.activeDirectory;
  }

  setActiveDirectory(path) {
    this.activeDirectory = path;
    this.#displayActiveDirectory();
  }

  setPreviousActiveFile() {
    if (!this.#previousActiveFile) return;
    this.setActiveFile(this.#previousActiveFile);
  }

  setActiveFile(path) {
    if (this.activeFile != path)
      this.#previousActiveFile = this.activeFile;
    this.activeFile = path;
    this.tryOpenActiveFile();
    leto.config.save();
  }

  async selectNewDirectory() {
    var newDirectory = await open({ directory: true });
    if (!newDirectory) return;

    this.activeDirectory = newDirectory;
    this.#removeActiveFile();
  }

  async tryOpenActiveFile() {
    editor.disabled = true;
    try {
      await this.#openActiveFile();
    } catch {
      this.#removeActiveFile();
    }
  }

  async #openActiveFile() {
    if (!this.activeFile || !(await exists(this.activeFile))) {
      this.#removeActiveFile();
      return;
    }

    if (this.activeDirectory) leto.explorer.highlightSelectedFile(this.activeFile);

    var newEditorValue = await readTextFile(this.activeFile);
    var isNewValue = editor.value != newEditorValue;
    var scrollBuffer = editor.scrollTop;
    editor.disabled = false;
    editor.style.cursor = 'auto';
    editor.focus();
    editor.value = newEditorValue;
    if (isNewValue) {
      editor.setSelectionRange(0, 0);
      leto.undo.resetBuffers();
    } else {
      editor.scrollTop = scrollBuffer;
    }
    leto.handleEditorInput();
  }

  async tryDisplayActiveDirectory() {
    try {
      await this.#displayActiveDirectory();
    } catch {
      this.#removeActiveDirectory();
    }
  }

  async #displayActiveDirectory() {
    if (!this.activeDirectory) return;

    if (!(await exists(this.activeDirectory))) {
      this.#removeActiveDirectory();
      return;
    }

    const directories = await this.#getDirectories();

    if (directories == null) {
      this.activeDirectory = null;
      await message( TOO_BIG_MESSAGE, { title: 'leto', type: 'error' });
      this.#removeActiveDirectory();
      return;
    }

    leto.explorer.showFileTree(directories, this.activeDirectory);
    if (this.activeFile) leto.explorer.highlightSelectedFile(this.activeFile);
  }

  async #getDirectories() {
    var directories;
    var entriesFound = 0;
    await readDir(this.activeDirectory, { recursive: false }).then(function (entries) { directories = entries; });

    async function getSubEntries(entries) {
      for (var i = 0; i < entries.length; i++) {
        if (++entriesFound > DIRECTORY_ENTRIES_LIMIT) return;
        if (entries[i].children == null) continue;
        await readDir(entries[i].path, { recursive: false }).then((ent) => entries[i].children = ent);
        await getSubEntries(entries[i].children);
      }
    }

    await getSubEntries(directories);
    return entriesFound < DIRECTORY_ENTRIES_LIMIT ? directories : null;
  }

  #removeActiveFile() {
    this.activeFile = null;
    editor.value = this.activeDirectory ? '' : NO_DIRECTORY_MESSAGE;
    editor.disabled = true;
    leto.handleEditorInput();
    this.tryDisplayActiveDirectory();
    leto.config.save();
  }

  #removeActiveDirectory() {
    leto.explorer.clearFileTree();
    this.activeDirectory = null;
    this.#removeActiveFile();
  }

  async saveActiveFile() {
    if (!this.activeFile) return;
    if (editor.disabled) return;
    await writeTextFile(this.activeFile, editor.value);
  }

  async exportActiveFile() {
    if (!this.activeFile) return;

    var exportPath;
    await save({ filters: [{ name: '', extensions: ['txt', 'md'] }], }).then(function (path) { exportPath = path; });
    if (exportPath == null) return;

    await writeTextFile(exportPath, editor.value);
  }

  async createNewFolder(directory) {
    if (!this.activeDirectory) return;
    directory = directory ?? this.activeDirectory;

    var folderName = directory + '\\New Folder';
    for (var i = 0; i < Infinity; i++) {
      if (!(await exists(folderName))) break;
      folderName = directory + `\\New Folder ${i + 1}`;
    }

    await createDir(folderName);

    this.tryDisplayActiveDirectory();
  }

  async createNewFile(directory) {
    if (!this.activeDirectory) return;
    directory = directory ?? this.activeDirectory;

    var newFile = directory + `\\new.md`;
    for (var i = 0; i < Infinity; i++) {
      if (!(await exists(newFile))) break;
      newFile = directory + `\\new ${i + 1}.md`;
    }

    await writeTextFile(newFile, '');

    this.activeFile = newFile;
    this.tryDisplayActiveDirectory();
    this.tryOpenActiveFile();
  }

  async renameFile(filePath, newName) {
    var newFile = `${filePath.substring(0, filePath.lastIndexOf('\\') + 1)}${newName}.md`;
    if (newFile === filePath) return;

    for (var i = 0; i < Infinity; i++) {
      if (!(await exists(newFile))) break;
      newFile = `${filePath.substring(0, filePath.lastIndexOf('\\') + 1)}${newName} ${i + 1}.md`;
    }
    await invoke('rename', { oldPath: filePath, newPath: newFile });
    if (this.activeFile === filePath) this.activeFile = newFile;

    this.tryDisplayActiveDirectory();
    this.tryOpenActiveFile();
  }

  async renameFolder(oldPath, newName) {
    var newPath = oldPath.substring(0, oldPath.lastIndexOf('\\') + 1) + newName;
    var finalPath = newPath;
    for (var i = 0; i < Infinity; i++) {
      if (!(await exists(finalPath))) break;
      finalPath = newPath + ` ${i + 1}`;
    }

    await invoke('rename', { oldPath: oldPath, newPath: newPath });

    if (this.activeFile && this.activeFile.includes(oldPath)) {
      this.activeFile = this.activeFile.replace(oldPath, newPath);
    }

    leto.explorer.updateFolderPath(oldPath, newPath);

    this.tryDisplayActiveDirectory();
    this.tryOpenActiveFile();
  }

  async moveTo(oldPath, newPath) {
    if (!(await exists(oldPath))) return;
    if (newPath === oldPath.substring(0, oldPath.lastIndexOf('\\'))) return;
    if (newPath.includes(oldPath)) return;

    var name = this.#getNameFromPath(oldPath);
    const extension = this.#getFileExtension(name);

    var isFile;
    await invoke('is_dir', { path: oldPath }).then((response) => (isFile = !response), () => {});
    if (isFile) name = this.#removeFileExtension(name);
    
    var finalPath = `${newPath}\\${name}${isFile ? `.${extension}` : ''}`;
    for (var i = 0; i < Infinity; i++) {
      if (!(await exists(finalPath))) break;
      finalPath = `${newPath}\\${name} ${i + 1}${isFile ? `.${extension}` : ''}`;
    }

    await invoke('move_to', { oldPath: oldPath, newPath: finalPath });
    
    if (this.activeFile === oldPath) this.activeFile = newPath;
    if (!isFile) leto.explorer.updateFolderPath(oldPath);

    this.tryDisplayActiveDirectory();
    this.tryOpenActiveFile();
  }

  moveToTrash(path) {
    this.moveTo(path, `${this.activeDirectory}\\.trash`);
  }
  
  #getFileExtension(file) {
    return /[^.]*$/.exec(file)[0];
  }
  
  #getNameFromPath(path) {
    return path.replace(/^.*[\\\/]/, '');
  }

  #removeFileExtension(file) {
    return file.replace(/\.[^/.]+$/, '');
  }
}
