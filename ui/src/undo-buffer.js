const editor = document.getElementById("text-editor");

const undoBuffer = [];
const redoBuffer = [];
var previousUndoType;
var bufferTimeout;

var previousSelection;
var currentSelection;

editor.addEventListener("beforeinput", () => currentSelection = editor.selectionStart);

export function resetBuffers() {
    undoBuffer.length = 0;
    redoBuffer.length = 0;
}

export async function addInputToBuffer(inputType) { 
    clearTimeout(bufferTimeout);
    if (inputType == "historyUndo" || inputType == "historyRedo") return;
    redoBuffer.length = 0;

    bufferTimeout = setTimeout(addUndoChain, 2500);

    if (inputType != "insertText" && inputType != "deleteContentBackward" && inputType != "deleteContentForward") {
        addUndoChain();
    }
    else if (inputType != previousUndoType || currentSelection != previousSelection){
        addUndoChain();
    }
    else {
        undoBuffer[undoBuffer.length - 1]++;
    }

    previousUndoType = inputType;
    previousSelection = editor.selectionStart;
        
}

function addUndoChain() {
    undoBuffer.push(1);
}

export async function undo() {
    var length = undoBuffer.pop();
    if (!length) return;
    
    editor.focus();
    for (var i = 0; i < length; i++) {
        document.execCommand("undo");
    }
    redoBuffer.push(length);
}

export async function redo() {
    var length = redoBuffer.pop();
    if (!length) return;
    
    editor.focus();
    for (var i = 0; i < length; i++) {
        document.execCommand("redo");
    }
    undoBuffer.push(length);
}