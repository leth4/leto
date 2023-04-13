const editor = document.getElementById("text-editor")

export function selectLine() {
    editor.setSelectionRange(getLineStart(), getLineEnd());
}

export function deselect() {
    editor.selectionStart = editor.selectionEnd;
}

export function cutLine() {
    selectLine();
    var command = editor.selectionEnd - 1 == editor.selectionStart ? "delete" : "cut";
    document.execCommand(command);
}

export function newLineInserted() {
    var [ lineStart, lineEnd ] = getLineBorders();
    var insertText = "\n";

    if (editor.selectionStart != editor.selectionEnd) {}
    else if (editor.selectionEnd && editor.value[lineStart] == "—")
        insertText = "\n— ";
    else if (editor.value.slice(lineStart, lineStart + 3) == "[ ]")
        insertText = "\n[ ] ";
    else if (editor.value.slice(lineStart, lineStart + 3) == "[x]")
        insertText = "\n[ ] ";
    else if (/^\d+\.\s+\S+.*$/.test(editor.value.slice(lineStart, lineEnd)))
        insertText = "\n" + (parseInt((editor.value.slice(lineStart, lineEnd).match(/^\d+/))[0]) + 1).toString() + ". ";

    document.execCommand("insertText", false, insertText);
}

export function moveDown() {
    var [ lineStart, lineEnd ] = getLineBorders();
    if (lineEnd - 1 == lineStart) return;
    if (lineEnd > editor.value.length) return;

    var positionAtLine = editor.selectionStart - lineStart;
    var lineToMove = editor.value.slice(lineStart, lineEnd);
    var [nextLineStart, nextLineEnd] = getLineBorders(lineEnd);
    var targetLine = editor.value.slice(nextLineStart, nextLineEnd);

    if (targetLine.slice(-1) != "\n") {
        targetLine += "\n";
        lineToMove = lineToMove.slice(0, -1);
    }

    editor.setSelectionRange(lineStart, nextLineEnd);
    document.execCommand("insertText", false, targetLine + lineToMove);
    setCursorAndFocus(lineStart + targetLine.length + positionAtLine);
}

export function moveUp() {
    var [ lineStart, lineEnd ] = getLineBorders(editor.selectionStart);
    if (lineEnd - 1 == lineStart) return;
    if (lineStart == 0) return;

    var positionAtLine = editor.selectionStart - lineStart;
    var lineToMove = editor.value.slice(lineStart, lineEnd);
    var [prevLineStart, prevLineEnd] = getLineBorders(lineStart - 1);
    var targetLine = editor.value.slice(prevLineStart, prevLineEnd);

    if (lineToMove.slice(-1) != "\n") {
        lineToMove += "\n";
        targetLine = targetLine.slice(0, -1);
    }

    editor.setSelectionRange(prevLineStart, lineEnd);
    document.execCommand("insertText", false, lineToMove + targetLine);
    setCursorAndFocus(prevLineStart + positionAtLine);
}

export function copyLineDown() {
    var [ lineStart, lineEnd ] = getLineBorders();
    if (lineEnd - 1 == lineStart) return;

    var positionAtLine = editor.selectionStart - lineStart;
    var lineToCopy = editor.value.slice(lineStart, lineEnd);
    if (lineEnd > editor.value.length) lineToCopy = "\n" + lineToCopy;

    editor.setSelectionRange(lineEnd, lineEnd);
    document.execCommand("insertText", false, lineToCopy);
    setCursorAndFocus(lineEnd + positionAtLine);
}

export function copyLineUp() {
    var [ lineStart, lineEnd ] = getLineBorders();
    if (lineEnd - 1 == lineStart) return;

    var positionAtLine = editor.selectionStart - lineStart;
    var lineToCopy = editor.value.slice(lineStart, lineEnd);
    if (lineEnd > editor.value.length) lineToCopy += "\n";

    editor.setSelectionRange(lineStart, lineStart);
    document.execCommand("insertText", false, lineToCopy);
    setCursorAndFocus(lineStart + positionAtLine);
}

export function createCheckbox() {
    var lineStart = getLineStart();
    var positionAtLine = editor.selectionStart - lineStart;

    if (editor.value.slice(lineStart, lineStart + 4) == "[x] ") {
        editor.setSelectionRange(lineStart + 1, lineStart + 2);
        document.execCommand("insertText", false, " ");
        setCursorAndFocus(lineStart + positionAtLine);
    }
    else if (editor.value.slice(lineStart, lineStart + 4) == "[ ] ") {
        editor.setSelectionRange(lineStart + 1, lineStart + 2);
        document.execCommand("insertText", false, "x");
        setCursorAndFocus(lineStart + positionAtLine);
    }
    else {
       editor.setSelectionRange(lineStart, lineStart);
       document.execCommand("insertText", false, "[ ] ");
       setCursorAndFocus(lineStart + positionAtLine + 4);
    }
}

export function jumpUp() {
    var position = editor.selectionStart - 1;

    for (; position >= 0 && editor.value[position] != "\n"; position--);
    for (; position >= 0 && editor.value[position] != "#"; position--);

    position = Math.max(0, position);

    editor.setSelectionRange(position, position);
    setCursorAndFocus(getLineEnd() - 1);
}

export function jumpDown() {
    var position = editor.selectionStart;

    for (; position < editor.value.length && editor.value[position] != "\n"; position++);
    for (; position < editor.value.length && editor.value[position] != "#"; position++);

    editor.setSelectionRange(position, position);
    setCursorAndFocus(getLineEnd() - 1);
}

function setCursorAndFocus(position) {
    editor.setSelectionRange(position, position);
    editor.blur();
    editor.focus();
}

function getLineBorders(position = editor.selectionEnd) {
    return [getLineStart(position), getLineEnd(position)];
}

function getLineStart(position = editor.selectionEnd) {
    var lineStart = position - 1;
    for (; lineStart >= 0 && editor.value[lineStart] != "\n"; lineStart--);
    return lineStart + 1;
}

function getLineEnd(position = editor.selectionEnd) {
    var lineEnd = position;
    for (; lineEnd < editor.value.length && editor.value[lineEnd] != "\n"; lineEnd++);
    return lineEnd + 1;
}