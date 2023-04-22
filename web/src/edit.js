'use strict';

const editor = document.getElementById('text-editor');

export default class Edit {

  selectLine() {
    editor.setSelectionRange(this.#getLineStart(), this.#getLineEnd());
  }

  deselect() {
    editor.selectionStart = editor.selectionEnd;
  }

  insertDoubleSymbol(symbol) {
    const nextSymbol = editor.value[editor.selectionStart];
    if (editor.selectionEnd == editor.selectionStart && nextSymbol && nextSymbol !== '\n' && nextSymbol !== ' ') {
      document.execCommand('insertText', false, symbol);
      return;
    }
    const insideValue = editor.value.slice(editor.selectionStart, editor.selectionEnd);
    document.execCommand('insertText', false, symbol + insideValue + symbol);
    if (insideValue) return;
    editor.selectionEnd = editor.selectionEnd - 1;
    editor.selectionStart = editor.selectionEnd;
  }

  handleTab() {
    if (editor.value[editor.selectionEnd] !== '\"' && editor.value[editor.selectionEnd] !== ')' && editor.value[editor.selectionEnd] !== '*')
      return;
    this.#setCursorAndFocus(editor.selectionEnd + 1);
    leto.handleEditorInput();
  }
  
  cutLine() {
    this.selectLine();
    if (editor.selectionEnd - 1 === editor.selectionStart) {
      document.execCommand('delete');
    } else {
      document.execCommand('cut');
    }
  }
  
  handleNewLine() {
    var [lineStart, lineEnd] = this.#getLineBorders();
    var insertText = '\n';

    if (editor.selectionStart != editor.selectionEnd) {} 
    else if (editor.value[lineStart] === '—' && editor.selectionEnd - lineStart > 1) 
      (/^—[\s]*$/.test(editor.value.slice(lineStart, lineEnd))) ?  this.cutLine() : insertText = '\n— ';
    else if (editor.value.slice(lineStart, lineStart + 3) === '[ ]' && editor.selectionEnd - lineStart > 3)
      (/^\[ \][\s]*$/.test(editor.value.slice(lineStart, lineEnd))) ?  this.cutLine() : insertText = '\n[ ] ';
    else if (editor.value.slice(lineStart, lineStart + 3) === '[x]' && editor.selectionEnd - lineStart > 3)
      (/^\[x\][\s]*$/.test(editor.value.slice(lineStart, lineEnd))) ?  this.cutLine() : insertText = '\n[ ] ';

    document.execCommand('insertText', false, insertText);
    editor.blur();
    editor.focus();
    leto.handleEditorInput();
  }

  moveDown() {
    var [lineStart, lineEnd] = this.#getLineBorders();
    if (lineEnd - 1 === lineStart) return;
    if (lineEnd > editor.value.length) return;

    var positionAtLine = editor.selectionEnd - lineStart;
    var lineToMove = editor.value.slice(lineStart, lineEnd);
    var [nextLineStart, nextLineEnd] = this.#getLineBorders(lineEnd);
    var targetLine = editor.value.slice(nextLineStart, nextLineEnd);

    if (targetLine.slice(-1) != '\n') {
      targetLine += '\n';
      lineToMove = lineToMove.slice(0, -1);
    }

    editor.setSelectionRange(lineStart, nextLineEnd);
    document.execCommand('insertText', false, targetLine + lineToMove);
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

    if (lineToMove.slice(-1) != '\n') {
      lineToMove += '\n';
      targetLine = targetLine.slice(0, -1);
    }

    editor.setSelectionRange(prevLineStart, lineEnd);
    document.execCommand('insertText', false, lineToMove + targetLine);
    this.#setCursorAndFocus(prevLineStart + positionAtLine);
  }

  copyLineDown() {
    var [lineStart, lineEnd] = this.#getLineBorders();
    if (lineEnd - 1 === lineStart) return;

    var positionAtLine = editor.selectionEnd - lineStart;
    var lineToCopy = editor.value.slice(lineStart, lineEnd);
    if (lineEnd > editor.value.length) lineToCopy = '\n' + lineToCopy;

    editor.setSelectionRange(lineEnd, lineEnd);
    document.execCommand('insertText', false, lineToCopy);
    this.#setCursorAndFocus(lineEnd + positionAtLine);
  }

  copyLineUp() {
    var [lineStart, lineEnd] = this.#getLineBorders();
    if (lineEnd - 1 === lineStart) return;

    var positionAtLine = editor.selectionEnd - lineStart;
    var lineToCopy = editor.value.slice(lineStart, lineEnd);
    if (lineEnd > editor.value.length) lineToCopy += '\n';

    editor.setSelectionRange(lineStart, lineStart);
    document.execCommand('insertText', false, lineToCopy);
    this.#setCursorAndFocus(lineStart + positionAtLine);
  }

  createCheckbox() {
    var lineStart = this.#getLineStart();
    var positionAtLine = editor.selectionEnd - lineStart;

    if (editor.value.slice(lineStart, lineStart + 3) === '[x]') {
      editor.setSelectionRange(lineStart + 1, lineStart + 2);
      document.execCommand('insertText', false, ' ');
      this.#setCursorAndFocus(lineStart + positionAtLine);
    } else if (editor.value.slice(lineStart, lineStart + 3) === '[ ]') {
      editor.setSelectionRange(lineStart + 1, lineStart + 2);
      document.execCommand('insertText', false, 'x');
      this.#setCursorAndFocus(lineStart + positionAtLine);
    } else {
      editor.setSelectionRange(lineStart, lineStart);
      document.execCommand('insertText', false, '[ ] ');
      this.#setCursorAndFocus(lineStart + positionAtLine + 4);
    }
  }

  jumpUp() {
    var position = editor.selectionEnd - 1;

    for (; position >= 0 && editor.value[position] != '\n'; position--);
    for (; position > 0; position--) {
      if (editor.value[position] != '#') continue;
      if (position == 1 || editor.value[position - 1] == `\n`) break; 
    }

    position = Math.max(0, position);

    editor.setSelectionRange(position, position);
    this.#setCursorAndFocus(this.#getLineEnd() - 1);
  }

  jumpDown() {
    var position = editor.selectionEnd;

    for (; position < editor.value.length && editor.value[position] != '\n'; position++);
    for (; position < editor.value.length; position++) {
      if (editor.value[position] != '#') continue;
      if (position == 1 || editor.value[position - 1] == `\n`) break; 
    }

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
    for (; lineStart >= 0 && editor.value[lineStart] != '\n'; lineStart--);
    return lineStart + 1;
  }

  #getLineEnd(position = editor.selectionEnd) {
    var lineEnd = position;
    for ( ; lineEnd < editor.value.length && editor.value[lineEnd] != '\n'; lineEnd++ );
    return lineEnd + 1;
  }
}
