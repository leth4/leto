'use strict';

const scrollCircle = document.getElementById('circularScroll');
const editor = document.getElementById('text-editor');
const preview = document.getElementById('text-preview');

const SCROLL_DISPLAY_TIMEOUT = 1000;

export default class Scroll {

  #scrollDragStart;
  #lastFrameScroll;
  #currentMousePosition = 0;
  #displayTimeout;

  constructor() {
    editor.addEventListener('scroll', () => this.#handleScroll(), false);

    scrollCircle.addEventListener('mouseover', () => {scrollCircle.style.opacity = '1'; clearTimeout(this.#displayTimeout);});
    scrollCircle.addEventListener('mouseleave', () => scrollCircle.style.opacity = '0');

    scrollCircle.addEventListener('mousedown', () => this.#startScrollDrag());
    document.addEventListener('mouseup', () => this.#scrollDragStart = -1);
    document.addEventListener('mousemove', (event) => this.#currentMousePosition = event.clientX);
  }

  #handleScroll() {
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
  
  #startScrollDrag() {
    this.#scrollDragStart = this.#currentMousePosition;
    this.#lastFrameScroll = this.#scrollDragStart;
    requestAnimationFrame(this.#updateScrollDrag.bind(this));
  }

  #updateScrollDrag() {
    if (this.#currentMousePosition !=  this.#lastFrameScroll) {
      editor.scrollTop += (this.#currentMousePosition - this.#lastFrameScroll) * editor.scrollHeight / editor.clientHeight - 1;
      this.#handleScroll();
      this.#lastFrameScroll = this.#currentMousePosition;
    }
    if (this.#scrollDragStart != -1) requestAnimationFrame(this.#updateScrollDrag.bind(this));
  }
}