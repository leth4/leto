'use strict';

const editor = document.getElementById("text-editor");
const BUFFER_TIMEOUT = 2500;

export default class Undo {

    constructor() {
        this.undoBuffer = [];
        this.redoBuffer = [];

        this.previousUndoType;
        this.previousSelection;
        this.currentSelection;
        
        this.bufferTimeout;

        editor.addEventListener('beforeinput', this.#setSelection.bind(this), false);      
    }

    #setSelection() {
        this.currentSelection = editor.selectionStart;
    }

    resetBuffers() {
        this.undoBuffer.length = 0;
        this.redoBuffer.length = 0;
    };

    pushToBuffer(event) {
        if (!event) return;
        const inputType = event.inputType;
        
        clearTimeout(this.bufferTimeout);
        if (inputType === "historyUndo" || inputType === "historyRedo") return;
        this.redoBuffer.length = 0;

        this.bufferTimeout = setTimeout(this.#addUndoChain.bind(this), BUFFER_TIMEOUT);

        if (inputType != "insertText" && inputType != "deleteContentBackward" && inputType != "deleteContentForward") {
            this.#addUndoChain();
        } else if (inputType != this.previousUndoType || this.currentSelection != this.previousSelection){
            this.#addUndoChain();
        } else if (event.data === " "){
            this.#addUndoChain();
        } else {
            this.undoBuffer[this.undoBuffer.length - 1]++;
        }

        this.previousUndoType = inputType;
        this.previousSelection = editor.selectionStart;   
    }

    #addUndoChain() {
        this.undoBuffer.push(1);
    }

    undo() {
        var length = this.undoBuffer.pop();
        if (!length) return;
        
        for (var i = 0; i < length; i++) {
            document.execCommand("undo");
        }
        
        this.redoBuffer.push(length);
    }

    redo() {
        var length = this.redoBuffer.pop();
        if (!length) return;
        
        for (var i = 0; i < length; i++) {
            document.execCommand("redo");
        }

        this.undoBuffer.push(length);
    }
}