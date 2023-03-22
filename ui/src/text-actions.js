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

export function moveDown() {
    var [ lineStart, lineEnd ] = getLineBorders();
    if (lineEnd - 1 == lineStart) return;

    var positionAtLine = editor.selectionStart - lineStart;
    var lineToMove = editor.value.slice(lineStart, lineEnd);

    if (lineEnd > editor.value.length) {
        editor.setSelectionRange(lineStart, lineStart);
        document.execCommand("insertText", false, "\n");
        editor.setSelectionRange(lineStart + positionAtLine + 1, lineStart + positionAtLine + 1);
        return;
    }

    selectLine();
    document.execCommand("delete");
    lineEnd = getLineEnd();
    if (lineEnd > editor.value.length) lineToMove = "\n" + lineToMove;

    editor.setSelectionRange(lineEnd, lineEnd);
    document.execCommand("insertText", false, lineToMove);
    setCursorAndFocus(lineEnd + positionAtLine);
}

export function moveUp() {
    var [ lineStart, lineEnd ] = getLineBorders();
    if (lineEnd - 1 == lineStart) return;
    if (lineStart == 0) return;

    var positionAtLine = editor.selectionStart - lineStart;
    var lineToMove = editor.value.slice(lineStart, lineEnd);

    selectLine();
    document.execCommand("delete");
    editor.setSelectionRange(lineStart-1, lineStart-1);
    lineStart = getLineStart();

    editor.setSelectionRange(lineStart, lineStart);
    document.execCommand("insertText", false, lineToMove);
    setCursorAndFocus(lineStart + positionAtLine);
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

function getLineBorders() {
    return [getLineStart(), getLineEnd()];
}

function getLineStart() {
    var lineStart = editor.selectionStart - 1;
    for (; lineStart >= 0 && editor.value[lineStart] != "\n"; lineStart--);
    return lineStart + 1;
}

function getLineEnd() {
    var lineEnd = editor.selectionStart;
    for (; lineEnd < editor.value.length && editor.value[lineEnd] != "\n"; lineEnd++);
    return lineEnd + 1;
}
