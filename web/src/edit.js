'use strict';

const editor = document.getElementById('text-editor');

export default class Edit {

  selectLine() {
    editor.setSelectionRange(this.#getLineStart(), this.#getLineEnd());
  }

  deselect() {
    editor.selectionStart = editor.selectionEnd;
  }

  handleHyphen() {
    const previousSymbol = editor.value[editor.selectionStart - 1];
    if (editor.selectionEnd == editor.selectionStart && previousSymbol && previousSymbol == '-') {
      editor.selectionStart -= 1;
      document.execCommand('insertText', false, '—');
    } else {
      document.execCommand('insertText', false, '-');
    }
  }

  insertDoubleSymbol(symbol) {
    const nextSymbol = editor.value[editor.selectionStart];
    const previousSymbol = editor.value[editor.selectionStart - 1];
    if (editor.selectionEnd == editor.selectionStart && nextSymbol && nextSymbol !== '\n' && nextSymbol !== ' ') {
      document.execCommand('insertText', false, symbol);
      return;
    }
    if (editor.selectionEnd == editor.selectionStart && previousSymbol && previousSymbol !== '\n' && previousSymbol !== ' ') {
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
      document.execCommand('insertText', false, '\t');
    else if (editor.selectionEnd != editor.selectionStart)
      document.execCommand('insertText', false, '\t');
    else 
      this.#setSelectionAndFocus(editor.selectionEnd + 1);
    leto.handleEditorInput();
  }
  
  cutLine() {
    this.selectLine();
    document.execCommand(editor.selectionEnd - 1 === editor.selectionStart ? 'delete' : 'cut');
  }

  #deleteLine() {
    this.selectLine();
    document.execCommand('delete');
  }
  
  handleNewLine() {
    var [lineStart, lineEnd] = this.#getLineBorders();
    var insertText = '\n';

    if (editor.selectionStart != editor.selectionEnd) {} 
    else if (editor.value[lineStart] === '—' && editor.selectionEnd - lineStart > 1) 
      (/^—[\s]*$/.test(editor.value.slice(lineStart, lineEnd))) ? this.#deleteLine() : insertText = '\n— ';
    else if (editor.value.slice(lineStart, lineStart + 3) === '[ ]' && editor.selectionEnd - lineStart > 3)
      (/^\[ \][\s]*$/.test(editor.value.slice(lineStart, lineEnd))) ? this.#deleteLine() : insertText = '\n[ ] ';
    else if (editor.value.slice(lineStart, lineStart + 3) === '[x]' && editor.selectionEnd - lineStart > 3)
      (/^\[x\][\s]*$/.test(editor.value.slice(lineStart, lineEnd))) ? this.#deleteLine() : insertText = '\n[ ] ';
    else if (/^\d+\. /.test(editor.value.slice(lineStart, lineEnd))) {
      if (/^\d+\.\s*$/.test(editor.value.slice(lineStart, lineEnd))) this.#deleteLine();
      else {
        var dotIndex = editor.value.slice(lineStart, lineEnd).indexOf(".");
        var num = parseInt(editor.value.slice(lineStart, lineStart + dotIndex));
        if (num) insertText = `\n${num + 1}. `
      }
    }

    document.execCommand('insertText', false, insertText);
    this.#setSelectionAndFocus(editor.selectionStart);
  }

  moveDown() {
    var lineStart = this.#getLineStart(editor.selectionStart);
    var lineEnd = this.#getLineEnd(editor.selectionEnd);
    if (lineEnd - 1 === lineStart) return;
    if (lineEnd > editor.value.length) return;

    var startSelectionPosition = editor.selectionStart - lineStart;
    var endSelectionPosition = editor.selectionEnd - lineStart;
    var lineToMove = editor.value.slice(lineStart, lineEnd);
    var [nextLineStart, nextLineEnd] = this.#getLineBorders(lineEnd);
    var targetLine = editor.value.slice(nextLineStart, nextLineEnd);

    if (targetLine.slice(-1) != '\n') {
      targetLine += '\n';
      lineToMove = lineToMove.slice(0, -1);
    }

    editor.setSelectionRange(lineStart, nextLineEnd);
    document.execCommand('insertText', false, targetLine + lineToMove);
    this.#setSelectionAndFocus(lineStart + targetLine.length + startSelectionPosition, lineStart + targetLine.length + endSelectionPosition);
  }

  moveUp() {
    var lineStart = this.#getLineStart(editor.selectionStart);
    var lineEnd = this.#getLineEnd(editor.selectionEnd);
    if (lineEnd - 1 === lineStart) return;
    if (lineStart === 0) return;

    var startSelectionPosition = editor.selectionStart - lineStart;
    var endSelectionPosition = editor.selectionEnd - lineStart;
    var lineToMove = editor.value.slice(lineStart, lineEnd);
    var [prevLineStart, prevLineEnd] = this.#getLineBorders(lineStart - 1);
    var targetLine = editor.value.slice(prevLineStart, prevLineEnd);

    if (lineToMove.slice(-1) != '\n') {
      lineToMove += '\n';
      targetLine = targetLine.slice(0, -1);
    }

    editor.setSelectionRange(prevLineStart, lineEnd);
    document.execCommand('insertText', false, lineToMove + targetLine);
    this.#setSelectionAndFocus(prevLineStart + startSelectionPosition, prevLineStart + endSelectionPosition);
  }

  copyLineDown() {
    var lineStart = this.#getLineStart(editor.selectionStart);
    var lineEnd = this.#getLineEnd(editor.selectionEnd);
    if (lineEnd - 1 === lineStart) return;

    var startSelectionPosition = editor.selectionStart - lineStart;
    var endSelectionPosition = editor.selectionEnd - lineStart;
    var lineToCopy = editor.value.slice(lineStart, lineEnd);
    if (lineEnd > editor.value.length) lineToCopy = '\n' + lineToCopy;

    editor.setSelectionRange(lineEnd, lineEnd);
    document.execCommand('insertText', false, lineToCopy);
    this.#setSelectionAndFocus(lineEnd + startSelectionPosition, lineEnd + endSelectionPosition);
  }

  copyLineUp() {
    var lineStart = this.#getLineStart(editor.selectionStart);
    var lineEnd = this.#getLineEnd(editor.selectionEnd);
    if (lineEnd - 1 === lineStart) return;

    var startSelectionPosition = editor.selectionStart - lineStart;
    var endSelectionPosition = editor.selectionEnd - lineStart;
    var lineToCopy = editor.value.slice(lineStart, lineEnd);
    if (lineEnd > editor.value.length) lineToCopy += '\n';

    editor.setSelectionRange(lineStart, lineStart);
    document.execCommand('insertText', false, lineToCopy);
    this.#setSelectionAndFocus(lineStart + startSelectionPosition, lineStart + endSelectionPosition);
  }

  createCheckbox() {
    var lineStart = this.#getLineStart();
    var positionAtLine = editor.selectionEnd - lineStart;

    if (editor.value.slice(lineStart, lineStart + 3) === '[x]') {
      editor.setSelectionRange(lineStart + 1, lineStart + 2);
      document.execCommand('insertText', false, ' ');
      this.#setSelectionAndFocus(lineStart + positionAtLine);
    } else if (editor.value.slice(lineStart, lineStart + 3) === '[ ]') {
      editor.setSelectionRange(lineStart + 1, lineStart + 2);
      document.execCommand('insertText', false, 'x');
      this.#setSelectionAndFocus(lineStart + positionAtLine);
    } else {
      editor.setSelectionRange(lineStart, lineStart);
      document.execCommand('insertText', false, '[ ] ');
      this.#setSelectionAndFocus(lineStart + positionAtLine + 4);
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
    this.#setSelectionAndFocus(this.#getLineEnd() - 1);
  }

  jumpDown() {
    var position = editor.selectionEnd;

    for (; position < editor.value.length && editor.value[position] != '\n'; position++);
    for (; position < editor.value.length; position++) {
      if (editor.value[position] != '#') continue;
      if (position == 1 || editor.value[position - 1] == `\n`) break; 
    }

    editor.setSelectionRange(position, position);
    this.#setSelectionAndFocus(this.#getLineEnd() - 1);
  }

  #setSelectionAndFocus(start, end) {
    editor.setSelectionRange(start, end ?? start);
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
