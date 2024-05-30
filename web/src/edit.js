'use strict';

const { readText } = window.__TAURI__.clipboard;

const editor = document.getElementById('text-editor');

export default class Edit {

  #activeEditor() {
    if (document.activeElement.nodeName == 'TEXTAREA') return document.activeElement;
    return null;
  }

  selectLine() {
    this.#activeEditor().setSelectionRange(this.#getLineStart(), this.#getLineEnd());
  }

  selectWord() {
    var alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'";

    for (var i = this.#activeEditor().selectionStart; i < this.#activeEditor().value.length + 1; i++) {
      this.#activeEditor().selectionEnd = i;
      if (!alphabet.includes(this.#activeEditor().value[i])) break;
    }
    for (var i = this.#activeEditor().selectionStart; i >= -1; i--) {
      this.#activeEditor().selectionStart = i + 1;
      if (!alphabet.includes(this.#activeEditor().value[i])) break;
    }
  }

  deselect() {
    this.#activeEditor().selectionStart = this.#activeEditor().selectionEnd;
  }

  replaceWord(newWord) {
    this.selectWord();
    var oldWord = this.#activeEditor().value.substring(this.#activeEditor().selectionStart, this.#activeEditor().selectionEnd);

    if (oldWord[0].toLowerCase() != oldWord[0]) newWord = newWord.charAt(0).toUpperCase() + newWord.slice(1);
    var capitalLetters = 0;
    for (var i = 0; i < oldWord.length; i++) 
      if (oldWord[i].toLowerCase() != oldWord[i]) capitalLetters++;
    if (capitalLetters == oldWord.length) newWord = newWord.toUpperCase();

    document.execCommand('insertText', false, newWord);
  }

  copy() {
    var selectionStart = this.#activeEditor().selectionStart;
    if (this.#activeEditor().selectionStart == this.#activeEditor().selectionEnd) this.selectLine();
    document.execCommand('copy', false);
    this.#setSelectionAndFocus(selectionStart);
  }

  async paste() {
    document.execCommand('insertText', false, await readText());
  }

  cut() {
    if (this.#activeEditor().selectionStart == this.#activeEditor().selectionEnd) this.selectLine();
    document.execCommand('cut', false);
  }

  renameLinks(oldLink, newFile) {
    var oldLink = `\[\[${oldLink}\]\]`
    var newLink = `[[${leto.explorer.getUniqueLink(newFile)}]]`
    if (this.#activeEditor() == null) return;
    while (this.#activeEditor().value.indexOf(oldLink) != -1) {
      this.#setSelectionAndFocus(this.#activeEditor().value.indexOf(oldLink), this.#activeEditor().value.indexOf(oldLink) + oldLink.length);
      document.execCommand('insertText', false, newLink);
    }
  }

  handleHyphen() {
    const previousSymbol = this.#activeEditor().value[this.#activeEditor().selectionStart - 1];
    const secondPreviousSymbol = this.#activeEditor().value[this.#activeEditor().selectionStart - 2];
    if (this.#activeEditor().selectionEnd == this.#activeEditor().selectionStart && previousSymbol == '-' && secondPreviousSymbol != '-') {
      this.#activeEditor().selectionStart -= 1;
      document.execCommand('insertText', false, '—');
    } else if (this.#activeEditor().selectionEnd == this.#activeEditor().selectionStart && previousSymbol == '—') {
      this.#activeEditor().selectionStart -= 1;
      document.execCommand('insertText', false, '---');
    } else {
      document.execCommand('insertText', false, '-');
    }
  }

  insertDoubleSymbol(symbol) {
    const nextSymbol = this.#activeEditor().value[this.#activeEditor().selectionStart];
    const previousSymbol = this.#activeEditor().value[this.#activeEditor().selectionStart - 1];
    if (this.#activeEditor().selectionEnd == this.#activeEditor().selectionStart && nextSymbol && nextSymbol !== '\n' && nextSymbol !== ' ') {
      document.execCommand('insertText', false, symbol);
      return;
    }
    if (this.#activeEditor().selectionEnd == this.#activeEditor().selectionStart && previousSymbol && previousSymbol !== '\n' && previousSymbol !== ' ') {
      document.execCommand('insertText', false, symbol);
      return;
    }
    const insideValue = this.#activeEditor().value.slice(this.#activeEditor().selectionStart, this.#activeEditor().selectionEnd);
    document.execCommand('insertText', false, symbol + insideValue + symbol);
    if (insideValue) return;
    this.#activeEditor().selectionEnd = this.#activeEditor().selectionEnd - 1;
    this.#activeEditor().selectionStart = this.#activeEditor().selectionEnd;
  }

  insertDateTime(includeTime = false) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    var date = new Date();
    var dateString = months[date.getMonth()] + " " + (date.getDate() < 10 ? "0" + date.getDate() : date.getDate()) + ", " + date.getFullYear();

    if (includeTime) {
      var hours =  date.getHours() < 10 ? "0" + date.getHours() : date.getHours();
      var minutes =  date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes();
      dateString += " at " + hours + ":" + minutes;
    }

    document.execCommand('insertText', false, `*${dateString}*`);
  }

  handleBracket() {
    const nextSymbol = this.#activeEditor().value[this.#activeEditor().selectionStart];
    const previousSymbol = this.#activeEditor().value[this.#activeEditor().selectionStart - 1];
    if (this.#activeEditor().selectionEnd == this.#activeEditor().selectionStart && nextSymbol && nextSymbol !== '\n' && nextSymbol !== ' ' && nextSymbol !== ']') {
      document.execCommand('insertText', false, '[');
      return;
    }
    if (this.#activeEditor().selectionEnd == this.#activeEditor().selectionStart && previousSymbol && previousSymbol !== '\n' && previousSymbol !== ' ' && previousSymbol !== '[') {
      document.execCommand('insertText', false, '[');
      return;
    }
    const insideValue = this.#activeEditor().value.slice(this.#activeEditor().selectionStart, this.#activeEditor().selectionEnd);
    document.execCommand('insertText', false, '[' + insideValue + ']');
    if (!insideValue) {
      this.#activeEditor().selectionEnd = this.#activeEditor().selectionEnd - 1;
      this.#activeEditor().selectionStart = this.#activeEditor().selectionEnd;
    }
    else {
      this.#activeEditor().selectionStart -= insideValue.length + 1;
      this.#activeEditor().selectionEnd--;
    }
  }

  handleTab() {
    if (this.#activeEditor().value[this.#activeEditor().selectionEnd] !== '\"' && this.#activeEditor().value[this.#activeEditor().selectionEnd] !== ')' && this.#activeEditor().value[this.#activeEditor().selectionEnd] !== '*' 
        && this.#activeEditor().value[this.#activeEditor().selectionEnd] !== ']' && this.#activeEditor().value[this.#activeEditor().selectionEnd] !== '`')
      document.execCommand('insertText', false, '\t');
    else if (this.#activeEditor().selectionEnd != this.#activeEditor().selectionStart)
      document.execCommand('insertText', false, '\t');
    else if (this.#activeEditor().value[this.#activeEditor().selectionEnd] === "]" && this.#activeEditor().value[this.#activeEditor().selectionEnd + 1] === "]")
      this.#setSelectionAndFocus(this.#activeEditor().selectionEnd + 2);
    else
      this.#setSelectionAndFocus(this.#activeEditor().selectionEnd + 1);
    if (this.#activeEditor == editor) leto.handleEditorInput();
  }
  
  cutLine() {
    this.selectLine();
    document.execCommand(this.#activeEditor().selectionEnd - 1 === this.#activeEditor().selectionStart ? 'delete' : 'cut');
  }
  
  handleNewLine() {
    var [lineStart, lineEnd] = this.#getLineBorders();
    var insertText = '';

    var deleteLine = false;

    if (this.#activeEditor().selectionStart != this.#activeEditor().selectionEnd) 
      insertText = '\n';
    else if (this.#activeEditor().value[lineStart] === '—' && this.#activeEditor().selectionEnd - lineStart > 1) 
      (/^—[\s]*$/.test(this.#activeEditor().value.slice(lineStart, lineEnd))) ? deleteLine = true : insertText = '\n— ';
    else if (this.#activeEditor().value.slice(lineStart, lineStart + 3) === '[ ]' && this.#activeEditor().selectionEnd - lineStart > 3)
      (/^\[ \][\s]*$/.test(this.#activeEditor().value.slice(lineStart, lineEnd))) ? deleteLine = true : insertText = '\n[ ] ';
    else if (this.#activeEditor().value.slice(lineStart, lineStart + 3) === '[x]' && this.#activeEditor().selectionEnd - lineStart > 3)
      (/^\[x\][\s]*$/.test(this.#activeEditor().value.slice(lineStart, lineEnd))) ? deleteLine = true : insertText = '\n[ ] ';
    else if (/^\d+\. /.test(this.#activeEditor().value.slice(lineStart, lineEnd))) {
      if (/^\d+\.\s*$/.test(this.#activeEditor().value.slice(lineStart, lineEnd))) deleteLine = true;
      else {
        var dotIndex = this.#activeEditor().value.slice(lineStart, lineEnd).indexOf(".");
        var num = parseInt(this.#activeEditor().value.slice(lineStart, lineStart + dotIndex));
        if (num) insertText = `\n${num + 1}. `
      }
    }
    else insertText = '\n';

    if (deleteLine) {
      this.#activeEditor().setSelectionRange(this.#getLineStart(), this.#getLineEnd() - 1);
      document.execCommand('delete');
    }

    document.execCommand('insertText', false, insertText);
    this.#setSelectionAndFocus(this.#activeEditor().selectionStart);
  }

  moveDown() {
    var lineStart = this.#getLineStart(this.#activeEditor().selectionStart);
    var lineEnd = this.#getLineEnd(this.#activeEditor().selectionEnd);
    if (lineEnd - 1 === lineStart) return;
    if (lineEnd > this.#activeEditor().value.length) return;

    var startSelectionPosition = this.#activeEditor().selectionStart - lineStart;
    var endSelectionPosition = this.#activeEditor().selectionEnd - lineStart;
    var lineToMove = this.#activeEditor().value.slice(lineStart, lineEnd);
    var [nextLineStart, nextLineEnd] = this.#getLineBorders(lineEnd);
    var targetLine = this.#activeEditor().value.slice(nextLineStart, nextLineEnd);

    if (targetLine.slice(-1) != '\n') {
      targetLine += '\n';
      lineToMove = lineToMove.slice(0, -1);
    }

    this.#activeEditor().setSelectionRange(lineStart, nextLineEnd);
    document.execCommand('insertText', false, targetLine + lineToMove);
    this.#setSelectionAndFocus(lineStart + targetLine.length + startSelectionPosition, lineStart + targetLine.length + endSelectionPosition);
  }

  moveUp() {
    var lineStart = this.#getLineStart(this.#activeEditor().selectionStart);
    var lineEnd = this.#getLineEnd(this.#activeEditor().selectionEnd);
    if (lineEnd - 1 === lineStart) return;
    if (lineStart === 0) return;

    var startSelectionPosition = this.#activeEditor().selectionStart - lineStart;
    var endSelectionPosition = this.#activeEditor().selectionEnd - lineStart;
    var lineToMove = this.#activeEditor().value.slice(lineStart, lineEnd);
    var [prevLineStart, prevLineEnd] = this.#getLineBorders(lineStart - 1);
    var targetLine = this.#activeEditor().value.slice(prevLineStart, prevLineEnd);

    if (lineToMove.slice(-1) != '\n') {
      lineToMove += '\n';
      targetLine = targetLine.slice(0, -1);
    }

    this.#activeEditor().setSelectionRange(prevLineStart, lineEnd);
    document.execCommand('insertText', false, lineToMove + targetLine);
    this.#setSelectionAndFocus(prevLineStart + startSelectionPosition, prevLineStart + endSelectionPosition);
  }

  copyLineDown() {
    var lineStart = this.#getLineStart(this.#activeEditor().selectionStart);
    var lineEnd = this.#getLineEnd(this.#activeEditor().selectionEnd);
    if (lineEnd - 1 === lineStart) return;

    var startSelectionPosition = this.#activeEditor().selectionStart - lineStart;
    var endSelectionPosition = this.#activeEditor().selectionEnd - lineStart;
    var lineToCopy = this.#activeEditor().value.slice(lineStart, lineEnd);
    if (lineEnd > this.#activeEditor().value.length) lineToCopy = '\n' + lineToCopy;

    this.#activeEditor().setSelectionRange(lineEnd, lineEnd);
    document.execCommand('insertText', false, lineToCopy);
    this.#setSelectionAndFocus(lineEnd + startSelectionPosition, lineEnd + endSelectionPosition);
  }

  copyLineUp() {
    var lineStart = this.#getLineStart(this.#activeEditor().selectionStart);
    var lineEnd = this.#getLineEnd(this.#activeEditor().selectionEnd);
    if (lineEnd - 1 === lineStart) return;

    var startSelectionPosition = this.#activeEditor().selectionStart - lineStart;
    var endSelectionPosition = this.#activeEditor().selectionEnd - lineStart;
    var lineToCopy = this.#activeEditor().value.slice(lineStart, lineEnd);
    if (lineEnd > this.#activeEditor().value.length) lineToCopy += '\n';

    this.#activeEditor().setSelectionRange(lineStart, lineStart);
    document.execCommand('insertText', false, lineToCopy);
    this.#setSelectionAndFocus(lineStart + startSelectionPosition, lineStart + endSelectionPosition);
  }

  createCheckbox() {
    var lineStart = this.#getLineStart();
    var positionAtLine = this.#activeEditor().selectionEnd - lineStart;

    if (this.#activeEditor().value.slice(lineStart, lineStart + 3) === '[x]') {
      this.#activeEditor().setSelectionRange(lineStart + 1, lineStart + 2);
      document.execCommand('insertText', false, ' ');
      this.#setSelectionAndFocus(lineStart + positionAtLine);
    } else if (this.#activeEditor().value.slice(lineStart, lineStart + 3) === '[ ]') {
      this.#activeEditor().setSelectionRange(lineStart + 1, lineStart + 2);
      document.execCommand('insertText', false, 'x');
      this.#setSelectionAndFocus(lineStart + positionAtLine);
    } else {
      this.#activeEditor().setSelectionRange(lineStart, lineStart);
      document.execCommand('insertText', false, '[ ] ');
      this.#setSelectionAndFocus(lineStart + positionAtLine + 4);
    }
  }

  jumpUp() {
    var position = this.#activeEditor().selectionEnd - 1;

    for (; position >= 0 && this.#activeEditor().value[position] != '\n'; position--);
    for (; position > 0; position--) {
      if (this.#activeEditor().value[position] != '#') continue;
      if (position == 1 || this.#activeEditor().value[position - 1] == `\n`) break; 
    }

    position = Math.max(0, position);

    this.#activeEditor().setSelectionRange(position, position);
    this.#setSelectionAndFocus(this.#getLineEnd() - 1);
  }

  jumpDown() {
    var position = this.#activeEditor().selectionEnd;

    for (; position < this.#activeEditor().value.length && this.#activeEditor().value[position] != '\n'; position++);
    for (; position < this.#activeEditor().value.length; position++) {
      if (this.#activeEditor().value[position] != '#') continue;
      if (position == 1 || this.#activeEditor().value[position - 1] == `\n`) break; 
    }

    this.#activeEditor().setSelectionRange(position, position);
    this.#setSelectionAndFocus(this.#getLineEnd() - 1);
  }

  #setSelectionAndFocus(start, end) {
    this.#activeEditor().setSelectionRange(start, end ?? start);
    var activeEditor = this.#activeEditor();
    activeEditor.blur();
    activeEditor.focus();
    if (activeEditor == editor) leto.handleEditorInput();
  }

  #getLineBorders(position = this.#activeEditor().selectionEnd) {
    return [this.#getLineStart(position), this.#getLineEnd(position)];
  }

  #getLineStart(position = this.#activeEditor().selectionEnd) {
    var lineStart = position - 1;
    for (; lineStart >= 0 && this.#activeEditor().value[lineStart] != '\n'; lineStart--);
    return lineStart + 1;
  }

  #getLineEnd(position = this.#activeEditor().selectionEnd) {
    var lineEnd = position;
    for ( ; lineEnd < this.#activeEditor().value.length && this.#activeEditor().value[lineEnd] != '\n'; lineEnd++ );
    return lineEnd + 1;
  }
}
