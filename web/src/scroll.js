'use strict';

const scrollCircle = document.getElementById("circularScroll");
const editor = document.getElementById('text-editor');
const preview = document.getElementById('text-preview');

export default class Scroll {

  #correctionScroll = -1;
  #scrollDragStart;
  #lastFrameScroll;
  #currentMousePosition = 0;

  constructor() {
    editor.addEventListener('beforeinput', (event) => this.#handleNewLine(event), false);
    editor.addEventListener('scroll', () => this.handleEditorScroll(), false);

    scrollCircle.addEventListener('mousedown', () => this.#startScrollDrag());
    document.addEventListener('mouseup', () => this.#scrollDragStart = -1);
    document.addEventListener('mousemove', (event) => this.#currentMousePosition = event.clientX);
  }

  handleEditorScroll() {
    if (this.#correctionScroll != -1 && Math.abs(preview.scrollTop - editor.scrollTop) >= 3) {
      editor.scrollTop = this.#correctionScroll; // Hacky fix for a browser bug; scrollbar randomly jumps when inserting a new line
    }
    this.#correctionScroll = -1;
    preview.scrollTop = editor.scrollTop;

    const scroll = (editor.scrollTop / editor.scrollHeight) * 100 * 3.6;
    const current = (editor.clientHeight / editor.scrollHeight) * 100 * 3.6;

    console.log(scroll / 3.6, current / 3.6);
    scrollCircle.style.background = `conic-gradient(var(--sidebar-file-color) ${scroll}deg, var(--sidebar-folder-color) ${scroll}deg,
                                     var(--sidebar-folder-color) ${scroll + current}deg, var(--sidebar-selection-color) ${scroll + current}deg)`;
  }
  
  #handleNewLine(event) {
    if (event.inputType != 'insertLineBreak') return;
    this.#correctionScroll = editor.scrollTop;
  }

  #startScrollDrag() {
    this.#scrollDragStart = this.#currentMousePosition;
    this.#lastFrameScroll = this.#scrollDragStart;
    requestAnimationFrame(this.#updateScrollDrag.bind(this));
  }

  #updateScrollDrag() {
    editor.scrollTop += 5 * (this.#currentMousePosition - this.#lastFrameScroll);
    preview.scrollTop = editor.scrollTop;
    this.#lastFrameScroll = this.#currentMousePosition;
    if (this.#scrollDragStart != -1) requestAnimationFrame(this.#updateScrollDrag.bind(this));
  }
}