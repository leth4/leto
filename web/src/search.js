'use strict';

const editor = document.getElementById('text-editor');
const searchBox = document.getElementById('search-box');
const searchInput = document.getElementById('search-input');

export default class Search {

  toggled = false;
  text = "";

  constructor() {
    searchInput.addEventListener('input', () => this.#find(), false);
  }

  disable() {
    if (this.toggled) this.toggle();
  }
  
  toggle() {
    this.toggled = !this.toggled;
    this.text = this.toggled ? searchInput.value : "";
    searchBox.style.top = this.toggled ? '10px' : '-50px';
    this.toggled ? searchInput.focus() : editor.focus();
    leto.preview.setPreviewText();
  }

  #find() {
    if (!this.toggled) return;
    this.text = searchInput.value;
    leto.preview.setPreviewText();
  }
}