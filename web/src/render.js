'use strict';

const { WebviewWindow, getAll } = window.__TAURI__.window;
const { emit, listen, once } = window.__TAURI__.event;
const { exists, writeTextFile, readTextFile } = window.__TAURI__.fs;
const { invoke } = window.__TAURI__.tauri;

const editor = document.getElementById('text-editor');
const preview = document.getElementById('text-preview');

export default class Render {

    #webviews = [];

    constructor() {this.#setupListeners()}

    async #setupListeners() {
        await listen('renderWindowClosed', event => { this.#handleWindowClosed(event.payload.label) });
        await listen('renderTodoClicked', event => { this.#toggleTodo(event.payload.index, event.payload.file) });
        await listen('renderOpenFile', event => { leto.directory.setActiveFile(event.payload.file); leto.windowManager.showIsHidden(); });
        await listen('renderOpenLink', event => { leto.explorer.openFromLink(event.payload.file); leto.windowManager.showIsHidden(); });
    }

    openCurrent() {
        this.openWindow(leto.directory.activeFile);
    }

    #handleWindowClosed(label) {
        var index = this.#webviews.indexOf(label);
        this.#webviews.splice(index, 1);
        if (leto.windowManager.isHidden && !this.hasWebviews()) leto.windowManager.closeAllWindows();
    }

    async openWindow(file) {
        var text;
        if (file == leto.directory.activeFile) {
            text = editor.value;
        } else {
            if (!(await exists(file))) return;
            text = await readTextFile(file);
        }
        var [preview, _] = leto.preview.getPreview(text);

        var windowLabel = this.#generateRandomId();

        new WebviewWindow(windowLabel, {
            title: leto.directory.removeFileExtension(leto.directory.getNameFromPath(file)),
            url: 'preview.html',
            decorations: false,
            transparent: true,
            focus: true,
            height: 800,
            width: 600
        });

        this.#webviews.push(windowLabel);

        await once('renderWindowLoaded', event => {
            this.update(preview, file);
            invoke('apply_shadow', {  label: event.payload.label });
        });
    }

    hasWebviews() {
        if (!this.#webviews) return false;
        return this.#webviews != 0;
    }

    closeAllWindows() {
        var windows = getAll();
        for (var i = 0; i < windows.length; i++) {
            windows[i].close();
        }
    }

    #generateRandomId() {
        return (Math.random() + 1).toString(36).substring(7);
    }

    async #toggleTodo(index, file) {
        var text;
        if (file == leto.directory.activeFile) {
            text = editor.value;
        } else {
            if (!(await exists(file))) return;
            text = await readTextFile(file);
        }

        var lines = text.split('\n');
        var count = 0;

        for (var i = 0; i < lines.length; i++) {
            if (/^\[ \]\s/.test(lines[i])) {
                if (count === index) {
                    lines[i] = lines[i].replace('[ ]', '[x]');
                    break;
                }
                count++;
            }
            if (/^\[x\]\s/.test(lines[i])) {
                if (count === index) {
                    lines[i] = lines[i].replace('[x]', '[ ]');
                    break;
                }
                count++;
            }
        }

        var newText = lines.join('\n');

        if (file == leto.directory.activeFile) {
            editor.value = newText;
            leto.handleEditorInput();
        } else {
            if (!(await exists(file))) return;
            await writeTextFile(file, newText);
            this.update(leto.preview.getPreview(newText)[0], file);
        }   
    }

    update(text = preview.innerHTML, file = leto.directory.activeFile) {
        if (file === null) return;
        emit('renderWindowUpdate', {
            text: this.#createRender(text),
            font: leto.windowManager.currentFont,
            fontSize: leto.windowManager.fontSize,
            fontWeight: leto.windowManager.fontWeight,
            theme: leto.windowManager.currentTheme,
            file: file,
            title: leto.directory.removeFileExtension(leto.directory.getNameFromPath(file))
        });
    }

    #createRender(text) {
        const html = text.replace(/^\[ \] (.*$)/gm, `<button class="todo"></button> $1`)
                         .replace(/^\[x\] (.*$)/gm, `<button class="todo checked"></button> <s>$1</s>`)
                         .replace(/^— (.*)(\n)?/gm, "<ul><li>$1</li></ul>")
                         .replace(/(^----*)[\r\n]/gm, `<hr>`)
                         .replace(/\n/g, "<br>");

	    return html.trim();
    }
}