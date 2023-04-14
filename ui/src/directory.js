'use strict';

const { exists, writeTextFile, readTextFile, readDir, createDir } =
  window.__TAURI__.fs;
const { open, save, message } = window.__TAURI__.dialog;
const { invoke } = window.__TAURI__.tauri;

const editor = document.getElementById('text-editor');
const DIRECTORY_ENTRIES_LIMIT = 2000;

export default class Directory {
  constructor() {
    this.activeFile;
    this.activeDirectory;

    this.entriesFound = 0;
    this.lastDirectoryEditTime = -1;
  }

  setActiveDirectory(path) {
    this.activeDirectory = path;
    this.displayActiveDirectory();
  }

  setActiveFile(path) {
    this.activeFile = path;
    this.tryOpenActiveFile();
    leto.config.save();
  }

  async selectNewDirectory() {
    var newDirectory = await open({ directory: true });
    if (!newDirectory) return;

    this.activeDirectory = newDirectory;

    this.reloadDirectory();
    this.removeActiveFile();
    leto.config.save();
  }

  async reloadDirectory() {
    this.lastDirectoryEditTime = -1;
    await this.displayActiveDirectory();
  }

  async displayActiveDirectory() {
    if (!this.activeDirectory) {
      return;
    }

    if (!(await this.pathExists(this.activeDirectory))) {
      leto.explorer.clearFileTree();
      this.activeDirectory = null;
      this.activeFile = null;
      return;
    }

    var editTime;
    await invoke('get_edit_time', { path: this.activeDirectory }).then(
      (response) => (editTime = response),
      () => {}
    );
    if (editTime === this.lastDirectoryEditTime) return;
    this.lastDirectoryEditTime = editTime;

    this.entriesFound = 0;
    var directories;
    await readDir(this.activeDirectory, { recursive: false }).then(function (
      entries
    ) {
      directories = entries;
    });
    await this.#populateChildren(directories);

    if (this.entriesFound > DIRECTORY_ENTRIES_LIMIT) {
      await message(
        `Selected directory is too big. You can only have ${DIRECTORY_ENTRIES_LIMIT} files and subfolders in the directory.`,
        { title: 'leto', type: 'error' }
      );
      this.activeDirectory = null;
      this.removeActiveFile();
      return;
    }

    leto.explorer.showFileTree(directories, this.activeDirectory);
    if (this.activeFile) leto.explorer.highlightSelectedFile(this.activeFile);
  }

  async #populateChildren(entries) {
    for (var i = 0; i < entries.length; i++) {
      if (++this.entriesFound > DIRECTORY_ENTRIES_LIMIT) return;
      if (entries[i].children == null) continue;
      await readDir(entries[i].path, { recursive: false }).then(function (ent) {
        entries[i].children = ent;
      });
      await this.#populateChildren(entries[i].children);
    }
  }

  removeActiveFile() {
    this.activeFile = null;
    editor.value = '';
    editor.disabled = true;
    leto.handleEditorInput();
    this.reloadDirectory();
  }

  async tryOpenActiveFile() {
    editor.disabled = true;
    try {
      await this.openActiveFile();
      leto.undo.resetBuffers();
    } catch {
      this.removeActiveFile();
    }
  }

  async openActiveFile() {
    if (!this.activeFile || !(await this.pathExists(this.activeFile))) {
      this.removeActiveFile();
      return;
    }

    if (this.activeDirectory != null)
      leto.explorer.highlightSelectedFile(this.activeFile);
    editor.value = await readTextFile(this.activeFile);
    editor.disabled = false;
    leto.handleEditorInput();
  }

  async saveActiveFile() {
    if (!this.activeFile) return;
    await writeTextFile(this.activeFile, editor.value);
  }

  async exportActiveFile() {
    if (!this.activeFile) return;

    var exportPath;
    await save({
      filters: [{ name: '', extensions: ['txt', 'md'] }],
    }).then(function (path) {
      exportPath = path;
    });
    if (exportPath == null) return;

    await writeTextFile(exportPath, editor.value);
  }

  async createNewFolder() {
    if (!this.activeDirectory) return;

    var folderName = this.activeDirectory + '\\New Folder';
    for (var i = 0; i < Infinity; i++) {
      if (!(await pathExists(folderName))) break;
      folderName = this.activeDirectory + `\\New Folder ${i + 1}`;
    }

    await createDir(folderName);

    this.reloadDirectory();
  }

  async createNewFile() {
    if (!this.activeDirectory) return;

    this.activeFile = this.activeDirectory + `\\new.md`;
    for (var i = 0; i < Infinity; i++) {
      if (!(await this.pathExists(this.activeFile))) break;
      this.activeFile = this.activeDirectory + `\\new ${i + 1}.md`;
    }

    await writeTextFile(this.activeFile, '');

    this.reloadDirectory();
    this.tryOpenActiveFile();
  }

  async renameFile(filePath, newName) {
    var newFile = `${filePath.substring(
      0,
      filePath.lastIndexOf('\\') + 1
    )}${newName}.md`;
    if (newFile === filePath) return;
    for (var i = 0; i < Infinity; i++) {
      if (!(await this.pathExists(newFile))) break;
      newFile = `${filePath.substring(
        0,
        filePath.lastIndexOf('\\') + 1
      )}${newName} ${i + 1}.md`;
    }

    await invoke('rename', { oldPath: filePath, newPath: newFile });
    if (this.activeFile === filePath) this.activeFile = newFile;

    this.reloadDirectory();
    this.tryOpenActiveFile();
  }

  async renameFolder(oldPath, newName) {
    var newPath = oldPath.substring(0, oldPath.lastIndexOf('\\') + 1) + newName;
    var finalPath = newPath;
    for (var i = 0; i < Infinity; i++) {
      if (!(await this.pathExists(finalPath))) break;
      finalPath = newPath + ` ${i + 1}`;
    }

    await invoke('rename', { oldPath: oldPath, newPath: newPath });

    if (this.activeFile && this.activeFile.includes(oldPath)) {
      this.activeFile.replace(oldPath, newPath);
    }

    this.reloadDirectory();
    this.tryOpenActiveFile();
  }

  async moveFileTo(oldPath, newPath, open = true) {
    if (newPath === oldPath.substring(0, oldPath.lastIndexOf('\\'))) return;

    var fileName = oldPath.replace(/^.*[\\\/]/, '');
    var fileExtension = /[^.]*$/.exec(fileName)[0];
    var filePath = newPath + `\\${fileName}`;
    for (var i = 0; i < Infinity; i++) {
      if (!(await this.pathExists(filePath))) break;
      filePath =
        newPath +
        `\\${fileName.replace(/\.[^/.]+$/, '')} ${i + 1}.${fileExtension}`;
    }

    await invoke('move_to', { oldPath: oldPath, newPath: filePath });

    if (open) this.setActiveFile(filePath);
    this.reloadDirectory();
    this.tryOpenActiveFile();
  }

  async moveFolderTo(oldPath, newPath) {
    if (!(await this.pathExists(oldPath))) return;

    if (newPath === oldPath.substring(0, oldPath.lastIndexOf('\\'))) return;
    if (newPath.includes(oldPath)) return;

    var folderName = newPath + `\\${oldPath.replace(/^.*[\\\/]/, '')}`;
    for (var i = 0; i < Infinity; i++) {
      if (!(await this.pathExists(folderName))) break;
      folderName = newPath + `\\${oldPath.replace(/^.*[\\\/]/, '')} ${i + 1}`;
    }

    await invoke('move_to', { oldPath: oldPath, newPath: folderName });

    this.tryOpenActiveFile();
    this.reloadDirectory();
  }

  async pathExists(path) {
    var pathExists = false;
    await exists(path).then(function (exists) {
      pathExists = exists;
    });
    return pathExists;
  }

  async moveFolderToTrash(path) {
    moveFolderTo(path, `${this.activeDirectory}\\.trash`, false);
  }

  async moveFileToTrash(path) {
    moveFileTo(path, `${this.activeDirectory}\\.trash`, false);
  }
}
