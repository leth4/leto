'use strict';

const editor = document.getElementById("text-editor");
const chainableInputs = ["insertText", "deleteContentBackward", "deleteContentForward"];
const BUFFER_TIMEOUT = 2500;

export default class Undo {

    #undoBuffer = [];
    #redoBuffer = [];
    #previousUndoType;
    #previousSelection;
    #currentSelection;
    #bufferTimeout;

    constructor() {
        editor.addEventListener('beforeinput', this.#setCurrentSelection.bind(this), false);      
    }

    #setCurrentSelection() {
        this.#currentSelection = editor.selectionStart;
    }

    undo() {
        const length = this.#undoBuffer.pop();
        if (!length) return;
        
        for (var i = 0; i < length; i++) document.execCommand("undo");
        this.#redoBuffer.push(length);
    }

    redo() {
        const length = this.#redoBuffer.pop();
        if (!length) return;
        
        for (var i = 0; i < length; i++) document.execCommand("redo");
        this.#undoBuffer.push(length);
    }

    resetBuffers() {
        this.#undoBuffer.length = 0;
        this.#redoBuffer.length = 0;
    };

    pushToBuffer(event) {
        if (!event) return;
        clearTimeout(this.#bufferTimeout);

        const inputType = event.inputType;
        if (inputType === "historyUndo" || inputType === "historyRedo") return;

        console.log(event);

        this.#redoBuffer.length = 0;
        this.#bufferTimeout = setTimeout(this.#addUndoChain.bind(this), BUFFER_TIMEOUT);

        if (!chainableInputs.includes(inputType) || inputType != this.#previousUndoType) {
            this.#addUndoChain();
        } else if (this.#currentSelection != this.#previousSelection || event.data === " ") {
            this.#addUndoChain();
        } else {
            this.#undoBuffer[this.#undoBuffer.length - 1]++;
        }

        this.#previousUndoType = inputType;
        this.#previousSelection = editor.selectionStart;
    }

    #addUndoChain() {
        this.#undoBuffer.push(1);
    }
}