'use strict';

const editor = document.getElementById("text-editor");

export default class Edit {

  selectLine() {
    editor.setSelectionRange(this.#getLineStart(), this.#getLineEnd());
  }

  deselect() {
    editor.selectionStart = editor.selectionEnd;
  }
  
  cutLine() {
    selectLine();
    if (editor.selectionEnd - 1 === editor.selectionStart) {
      document.execCommand("delete");
    } else {
      document.execCommand("cut");
    }
  }
  
  newLineInserted() {
    var [lineStart, lineEnd] = this.#getLineBorders();
    var insertText = "\n";

    if (editor.selectionStart != editor.selectionEnd) {
    } else if (editor.selectionEnd && editor.value[lineStart] === "—")
      insertText = "\n— ";
    else if (editor.value.slice(lineStart, lineStart + 3) === "[ ]")
      insertText = "\n[ ] ";
    else if (editor.value.slice(lineStart, lineStart + 3) === "[x]")
      insertText = "\n[ ] ";
    else if (/^\d+\.\s+\S+.*$/.test(editor.value.slice(lineStart, lineEnd)))
      insertText = "\n" + ( parseInt(editor.value.slice(lineStart, lineEnd).match(/^\d+/)[0]) + 1 ).toString() + ". ";

    document.execCommand("insertText", false, insertText);
  }

  moveDown() {
    var [lineStart, lineEnd] = this.#getLineBorders();
    if (lineEnd - 1 === lineStart) return;
    if (lineEnd > editor.value.length) return;

    var positionAtLine = editor.selectionEnd - lineStart;
    var lineToMove = editor.value.slice(lineStart, lineEnd);
    var [nextLineStart, nextLineEnd] = this.#getLineBorders(lineEnd);
    var targetLine = editor.value.slice(nextLineStart, nextLineEnd);

    if (targetLine.slice(-1) != "\n") {
      targetLine += "\n";
      lineToMove = lineToMove.slice(0, -1);
    }

    editor.setSelectionRange(lineStart, nextLineEnd);
    document.execCommand("insertText", false, targetLine + lineToMove);
    this.#setCursorAndFocus(lineStart + targetLine.length + positionAtLine);
  }

  moveUp() {
    var [lineStart, lineEnd] = this.#getLineBorders();
    if (lineEnd - 1 === lineStart) return;
    if (lineStart === 0) return;

    var positionAtLine = editor.selectionEnd - lineStart;
    var lineToMove = editor.value.slice(lineStart, lineEnd);
    var [prevLineStart, prevLineEnd] = this.#getLineBorders(lineStart - 1);
    var targetLine = editor.value.slice(prevLineStart, prevLineEnd);

    if (lineToMove.slice(-1) != "\n") {
      lineToMove += "\n";
      targetLine = targetLine.slice(0, -1);
    }

    editor.setSelectionRange(prevLineStart, lineEnd);
    document.execCommand("insertText", false, lineToMove + targetLine);
    this.#setCursorAndFocus(prevLineStart + positionAtLine);
  }

  copyLineDown() {
    var [lineStart, lineEnd] = this.#getLineBorders();
    if (lineEnd - 1 === lineStart) return;

    var positionAtLine = editor.selectionEnd - lineStart;
    var lineToCopy = editor.value.slice(lineStart, lineEnd);
    if (lineEnd > editor.value.length) lineToCopy = "\n" + lineToCopy;

    editor.setSelectionRange(lineEnd, lineEnd);
    document.execCommand("insertText", false, lineToCopy);
    this.#setCursorAndFocus(lineEnd + positionAtLine);
  }

  copyLineUp() {
    var [lineStart, lineEnd] = this.#getLineBorders();
    if (lineEnd - 1 === lineStart) return;

    var positionAtLine = editor.selectionEnd - lineStart;
    var lineToCopy = editor.value.slice(lineStart, lineEnd);
    if (lineEnd > editor.value.length) lineToCopy += "\n";

    editor.setSelectionRange(lineStart, lineStart);
    document.execCommand("insertText", false, lineToCopy);
    this.#setCursorAndFocus(lineStart + positionAtLine);
  }

  createCheckbox() {
    var lineStart = this.#getLineStart();
    var positionAtLine = editor.selectionEnd - lineStart;

    if (editor.value.slice(lineStart, lineStart + 4) === "[x] ") {
      editor.setSelectionRange(lineStart + 1, lineStart + 2);
      document.execCommand("insertText", false, " ");
      this.#setCursorAndFocus(lineStart + positionAtLine);
    } else if (editor.value.slice(lineStart, lineStart + 4) === "[ ] ") {
      editor.setSelectionRange(lineStart + 1, lineStart + 2);
      document.execCommand("insertText", false, "x");
      this.#setCursorAndFocus(lineStart + positionAtLine);
    } else {
      editor.setSelectionRange(lineStart, lineStart);
      document.execCommand("insertText", false, "[ ] ");
      this.#setCursorAndFocus(lineStart + positionAtLine + 4);
    }
  }

  jumpUp() {
    var position = editor.selectionEnd - 1;

    for (; position >= 0 && editor.value[position] != "\n"; position--);
    for (; position >= 0 && editor.value[position] != "#"; position--);

    position = Math.max(0, position);

    editor.setSelectionRange(position, position);
    this.#setCursorAndFocus(this.#getLineEnd() - 1);
  }

  jumpDown() {
    var position = editor.selectionEnd;

    for (; position < editor.value.length && editor.value[position] != "\n"; position++);
    for (; position < editor.value.length && editor.value[position] != "#"; position++);

    editor.setSelectionRange(position, position);
    this.#setCursorAndFocus(this.#getLineEnd() - 1);
  }

  #setCursorAndFocus(position) {
    editor.setSelectionRange(position, position);
    editor.blur();
    editor.focus();
    leto.handleEditorInput();
  }

  #getLineBorders(position = editor.selectionEnd) {
    return [this.#getLineStart(position), this.#getLineEnd(position)];
  }

  #getLineStart(position = editor.selectionEnd) {
    var lineStart = position - 1;
    for (; lineStart >= 0 && editor.value[lineStart] != "\n"; lineStart--);
    return lineStart + 1;
  }

  #getLineEnd(position = editor.selectionEnd) {
    var lineEnd = position;
    for ( ; lineEnd < editor.value.length && editor.value[lineEnd] != "\n"; lineEnd++ );
    return lineEnd + 1;
  }
}
