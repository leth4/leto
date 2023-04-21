'use strict';

const scrollCircle = document.getElementById("circularScroll");
const editor = document.getElementById('text-editor');
const preview = document.getElementById('text-preview');

const SCROLL_DISPLAY_TIMEOUT = 1000;

export default class Scroll {

  #correctionScroll = -1;
  #scrollDragStart;
  #lastFrameScroll;
  #currentMousePosition = 0;
  #displayTimeout;

  constructor() {
    editor.addEventListener('beforeinput', (event) => this.#handleNewLine(event), false);
    editor.addEventListener('scroll', () => this.#handleScroll(), false);

    scrollCircle.addEventListener('mousedown', () => this.#startScrollDrag());
    document.addEventListener('mouseup', () => this.#scrollDragStart = -1);
    document.addEventListener('mousemove', (event) => this.#currentMousePosition = event.clientX);
  }

  handleEditorInput() {
    console.log(this.#correctionScroll, preview.scrollTop, editor.scrollTop);
    if (this.#correctionScroll != -1 && Math.abs(preview.scrollTop - editor.scrollTop) >= 3) {
      editor.scrollTop = this.#correctionScroll; // Hacky fix for a browser bug; scrollbar randomly jumps when inserting a new line
    }
    this.#correctionScroll = -1;
    preview.scrollTop = editor.scrollTop;
  }

  #handleScroll() {
    console.log("CALLED");
    clearTimeout(this.#displayTimeout);
    scrollCircle.style.opacity = '1';
    this.#displayTimeout = setTimeout(this.#hideScrollCircle.bind(this), SCROLL_DISPLAY_TIMEOUT);

    const scroll = (editor.scrollTop / (editor.scrollHeight - editor.clientHeight)) * 360;
    scrollCircle.style.background = `conic-gradient(var(--editor-text-color) ${scroll}deg, var(--editor-hashtag-color) ${scroll}deg)`;
    preview.scrollTop = editor.scrollTop;
  }

  #hideScrollCircle() {
    scrollCircle.style.opacity = '0';
  }
  
  #handleNewLine(event) {
    // Never called
    if (event.inputType != 'insertLineBreak') return;
    this.#correctionScroll = editor.scrollTop;
  }

  #startScrollDrag() {
    this.#scrollDragStart = this.#currentMousePosition;
    this.#lastFrameScroll = this.#scrollDragStart;
    requestAnimationFrame(this.#updateScrollDrag.bind(this));
  }

  #updateScrollDrag() {
    editor.scrollTop += (this.#currentMousePosition - this.#lastFrameScroll) * editor.scrollHeight / editor.clientHeight - 1;
    this.#handleScroll();
    this.#lastFrameScroll = this.#currentMousePosition;
    if (this.#scrollDragStart != -1) requestAnimationFrame(this.#updateScrollDrag.bind(this));
  }
}