'use strict';

const scrollCircle = document.getElementById('circularScroll');
const editor = document.getElementById('text-editor');
const preview = document.getElementById('text-preview');
const search = document.getElementById('search-preview');

const SCROLL_DISPLAY_TIMEOUT = 1000;

export default class Scroll {

  #correctionScroll = -1;
  #scrollDragStart;
  #lastFrameScroll;
  #currentMousePosition = 0;
  #displayTimeout;
  #scrollPositionsMap = new Map();

  constructor() {
    editor.addEventListener('beforeinput', (event) => this.#handleNewLine(event), false);
    editor.addEventListener('scroll', () => this.handleEditorScroll(), false);

    scrollCircle.addEventListener('mouseover', () => {scrollCircle.style.opacity = '1'; clearTimeout(this.#displayTimeout);});
    scrollCircle.addEventListener('mouseleave', () => scrollCircle.style.opacity = '0');

    scrollCircle.addEventListener('mousedown', () => this.#startScrollDrag());
    document.addEventListener('mouseup', () => this.#scrollDragStart = -1);
    document.addEventListener('mousemove', (event) => this.#currentMousePosition = event.clientX);
  }

  handleNewFile() {
    editor.scrollTop = this.#scrollPositionsMap.get(leto.directory.activeFile);
    this.handleEditorScroll();
  }

  handleEditorScroll() {
    if (this.#correctionScroll != -1 && Math.abs(preview.scrollTop - editor.scrollTop) >= 3) {
      editor.scrollTop = this.#correctionScroll; // Hacky fix for a browser bug; scrollbar randomly jumps when inserting a new line
    }
    this.#correctionScroll = -1;
    preview.scrollTop = editor.scrollTop;

    clearTimeout(this.#displayTimeout);
    scrollCircle.style.opacity = '1';
    this.#displayTimeout = setTimeout(this.#hideScrollCircle.bind(this), SCROLL_DISPLAY_TIMEOUT);

    const scroll = (editor.scrollTop / (editor.scrollHeight - editor.clientHeight)) * 360;
    scrollCircle.style.background = `conic-gradient(var(--editor-text-color) ${scroll}deg, var(--editor-muted-color) ${scroll}deg)`;
    preview.scrollTop = editor.scrollTop;
    search.scrollTop = editor.scrollTop;

    this.#scrollPositionsMap.set(leto.directory.activeFile, editor.scrollTop);
  }

  #handleNewLine(event) {
    if (event.inputType != 'insertLineBreak') return;
    this.#correctionScroll = editor.scrollTop;
  }

  #hideScrollCircle() {
    scrollCircle.style.opacity = '0';
  }
  
  #startScrollDrag() {
    this.#scrollDragStart = this.#currentMousePosition;
    this.#lastFrameScroll = this.#scrollDragStart;
    requestAnimationFrame(this.#updateScrollDrag.bind(this));
  }

  #updateScrollDrag() {
    if (this.#currentMousePosition !=  this.#lastFrameScroll) {
      editor.scrollTop += (this.#currentMousePosition - this.#lastFrameScroll) * editor.scrollHeight / editor.clientHeight - 1;
      this.handleEditorScroll();
      this.#lastFrameScroll = this.#currentMousePosition;
    }
    if (this.#scrollDragStart != -1) requestAnimationFrame(this.#updateScrollDrag.bind(this));
  }
}