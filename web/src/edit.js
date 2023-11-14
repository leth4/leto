'use strict';

const { readText } = window.__TAURI__.clipboard;

const editor = document.getElementById('text-editor');

export default class Edit {

  selectLine() {
    editor.setSelectionRange(this.#getLineStart(), this.#getLineEnd());
  }

  selectWord() {
    var alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'";

    for (var i = editor.selectionStart; i < editor.value.length + 1; i++) {
      editor.selectionEnd = i;
      if (!alphabet.includes(editor.value[i])) break;
    }
    for (var i = editor.selectionStart; i >= -1; i--) {
      editor.selectionStart = i + 1;
      if (!alphabet.includes(editor.value[i])) break;
    }
  }

  deselect() {
    editor.selectionStart = editor.selectionEnd;
  }

  replaceWord(newWord) {
    this.selectWord();
    var oldWord = editor.value.substring(editor.selectionStart, editor.selectionEnd);

    if (oldWord[0].toLowerCase() != oldWord[0]) newWord = newWord.charAt(0).toUpperCase() + newWord.slice(1);
    var capitalLetters = 0;
    for (var i = 0; i < oldWord.length; i++) 
      if (oldWord[i].toLowerCase() != oldWord[i]) capitalLetters++;
    if (capitalLetters == oldWord.length) newWord = newWord.toUpperCase();

    document.execCommand('insertText', false, newWord);
  }

  copy() {
    var selectionStart = editor.selectionStart;
    if (editor.selectionStart == editor.selectionEnd) this.selectLine();
    document.execCommand('copy', false);
    this.#setSelectionAndFocus(selectionStart);
  }

  async paste() {
    document.execCommand('insertText', false, await readText());
  }

  cut() {
    if (editor.selectionStart == editor.selectionEnd) this.selectLine();
    document.execCommand('cut', false);
  }

  renameLinks(oldLink, newFile) {
    var oldLink = `\[\[${oldLink}\]\]`
    var newLink = `[[${leto.explorer.getUniqueLink(newFile)}]]`
    while (editor.value.indexOf(oldLink) != -1) {
      this.#setSelectionAndFocus(editor.value.indexOf(oldLink), editor.value.indexOf(oldLink) + oldLink.length);
      document.execCommand('insertText', false, newLink);
    }
  }

  handleHyphen() {
    const previousSymbol = editor.value[editor.selectionStart - 1];
    const secondPreviousSymbol = editor.value[editor.selectionStart - 2];
    if (editor.selectionEnd == editor.selectionStart && previousSymbol == '-' && secondPreviousSymbol != '-') {
      editor.selectionStart -= 1;
      document.execCommand('insertText', false, '—');
    } else if (editor.selectionEnd == editor.selectionStart && previousSymbol == '—') {
      editor.selectionStart -= 1;
      document.execCommand('insertText', false, '---');
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

  handleBracket() {
    const nextSymbol = editor.value[editor.selectionStart];
    const previousSymbol = editor.value[editor.selectionStart - 1];
    if (editor.selectionEnd == editor.selectionStart && nextSymbol && nextSymbol !== '\n' && nextSymbol !== ' ' && nextSymbol !== ']') {
      document.execCommand('insertText', false, '[');
      return;
    }
    if (editor.selectionEnd == editor.selectionStart && previousSymbol && previousSymbol !== '\n' && previousSymbol !== ' ' && previousSymbol !== '[') {
      document.execCommand('insertText', false, '[');
      return;
    }
    const insideValue = editor.value.slice(editor.selectionStart, editor.selectionEnd);
    document.execCommand('insertText', false, '[' + insideValue + ']');
    if (!insideValue) {
      editor.selectionEnd = editor.selectionEnd - 1;
      editor.selectionStart = editor.selectionEnd;
    }
    else {
      editor.selectionStart -= insideValue.length + 1;
      editor.selectionEnd--;
    }
  }

  handleTab() {
    if (editor.value[editor.selectionEnd] !== '\"' && editor.value[editor.selectionEnd] !== ')' && editor.value[editor.selectionEnd] !== '*' && editor.value[editor.selectionEnd] !== ']')
      document.execCommand('insertText', false, '\t');
    else if (editor.selectionEnd != editor.selectionStart)
      document.execCommand('insertText', false, '\t');
    else if (editor.value[editor.selectionEnd] === "]" && editor.value[editor.selectionEnd + 1] === "]")
      this.#setSelectionAndFocus(editor.selectionEnd + 2);
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
    var insertText = '';

    var deleteLine = false;

    if (editor.selectionStart != editor.selectionEnd) 
      insertText = '\n';
    else if (editor.value[lineStart] === '—' && editor.selectionEnd - lineStart > 1) 
      (/^—[\s]*$/.test(editor.value.slice(lineStart, lineEnd))) ? deleteLine = true : insertText = '\n— ';
    else if (editor.value.slice(lineStart, lineStart + 3) === '[ ]' && editor.selectionEnd - lineStart > 3)
      (/^\[ \][\s]*$/.test(editor.value.slice(lineStart, lineEnd))) ? deleteLine = true : insertText = '\n[ ] ';
    else if (editor.value.slice(lineStart, lineStart + 3) === '[x]' && editor.selectionEnd - lineStart > 3)
      (/^\[x\][\s]*$/.test(editor.value.slice(lineStart, lineEnd))) ? deleteLine = true : insertText = '\n[ ] ';
    else if (/^\d+\. /.test(editor.value.slice(lineStart, lineEnd))) {
      if (/^\d+\.\s*$/.test(editor.value.slice(lineStart, lineEnd))) deleteLine = true;
      else {
        var dotIndex = editor.value.slice(lineStart, lineEnd).indexOf(".");
        var num = parseInt(editor.value.slice(lineStart, lineStart + dotIndex));
        if (num) insertText = `\n${num + 1}. `
      }
    }
    else insertText = '\n';

    if (deleteLine) {
      editor.setSelectionRange(this.#getLineStart(), this.#getLineEnd() - 1);
      document.execCommand('delete');
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
