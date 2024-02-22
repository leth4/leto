'use strict';

const quickOpenBox = document.getElementById('quick-open-box');
const quickOpenInput = document.getElementById('quick-open-input');
const quickOpenResults = document.getElementById('quick-open-results');

const fileLimit = 8;

export default class QuickOpen {

  toggled = false;
  files = [];
  selectedItemIndex;

  constructor() {
    quickOpenInput.addEventListener('input', () => this.#showResults(), false);
    document.addEventListener('keydown', e => {
      if (this.toggled && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) e.preventDefault();
      if (e.key === 'ArrowUp') this.#selectNext();
      if (e.key === 'Escape') this.close();
      if (e.key === 'ArrowDown') this.#selectPrevious();
      if (e.key === 'Enter') this.#openSelected();
    }, false);
    document.addEventListener('click', e => this.close());
  }

  open() {
    this.toggled = true;
    quickOpenInput.value = '';
    quickOpenBox.style.display = 'block'
    quickOpenInput.focus();
    this.#showResults();
  }

  close() {
    this.toggled = false;
    quickOpenInput.blur();
    quickOpenBox.style.display = 'none';
    quickOpenResults.innerHTML = "";
  }

  handleFileOpened(file) {
    this.files.splice(this.files.indexOf(file), 1);
    this.files.unshift(file);
  }

  #openSelected() {
    var file = quickOpenResults.children[this.selectedItemIndex];
    if (file == undefined) {
      this.close();
      return;
    }
    leto.directory.setActiveFile(file.getAttribute('data-path')); 
    this.close();
  }

  #selectNext() {
    this.#toggleSelectedAtIndex(this.selectedItemIndex);
    this.selectedItemIndex--;
    if (this.selectedItemIndex < 0) {
      this.selectedItemIndex = quickOpenResults.childElementCount - 1;
    }
    this.#toggleSelectedAtIndex(this.selectedItemIndex);
  }

  #selectPrevious() {
    this.#toggleSelectedAtIndex(this.selectedItemIndex);
    this.selectedItemIndex++;
    if (this.selectedItemIndex >= quickOpenResults.childElementCount) {
      this.selectedItemIndex = 0;
    }
    this.#toggleSelectedAtIndex(this.selectedItemIndex);
  }

  #toggleSelectedAtIndex(index) {
    var file = quickOpenResults.children[index];
    if (file != undefined) file.classList.toggle('selected');
  }

  #showResults() {
    quickOpenResults.innerHTML = "";
    var filesShown = 0;
    for (let index = 0; index < this.files.length; index++) {
      const file = this.files[index];
      if (file == leto.directory.activeFile) continue;
      if (this.#removeRootPath(file).toLowerCase().includes(quickOpenInput.value.toLowerCase())) {
        var fileButton = document.createElement('button');
        fileButton.innerHTML = this.#getFileDisplayName(file);
        fileButton.className = 'quick-open-file-button';
        fileButton.setAttribute('data-path', file);
        quickOpenResults.prepend(fileButton);
        fileButton.addEventListener('click', () => { leto.directory.setActiveFile(file); this.close(); });
        if (filesShown++ > fileLimit) break;
      }
    }
    this.selectedItemIndex = quickOpenResults.childElementCount;
  }

  #removeRootPath(path) {
    return path.replace(leto.directory.activeDirectory, '');
  }

  #getFileDisplayName(path) {
    var symbol = "";
    if (path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.gif')) symbol = "● ";
    if (path.endsWith('.lea')) symbol = "▲ ";
    path = this.#removeRootPath(path).replace(/\.[^/.]+$/, '');
    var name = symbol + path.replace(/^.*[\\\/]/, '');
    var path = path.substring(0, path.lastIndexOf('\\'))
    return `${name} <mark class='full-path'>${path.substring(1, path.length)}</mark>`;
  }

  resetFiles() {
    this.files = [];
  }

  addFile(path) {
    this.files.push(path);
  }
}