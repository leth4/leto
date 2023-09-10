'use strict';

const { WebviewWindow } = window.__TAURI__.window;
const { emit, listen } = window.__TAURI__.event;

const { exists, writeTextFile, readTextFile } = window.__TAURI__.fs;

const editor = document.getElementById('text-editor');
const preview = document.getElementById('text-preview');

export default class Render {

    #webviews = [];

    constructor() {this.#setupTodoListener()}

    async #setupTodoListener() {
        await listen('renderTodoClicked', event => { this.#toggleTodo(event.payload.index, event.payload.file) });
    }

    async openWindow(file) {
        if (!(await exists(file))) return;
        var text = await readTextFile(file);
        var [preview, _] = leto.preview.getPreview(text);
        var render  = this.#createRender(preview);
        
        var webview = new WebviewWindow(this.#generateRandomId(), {
            title: leto.directory.removeFileExtension(leto.directory.getNameFromPath(file)),
            url: 'preview.html',
            transparent: true,
            center: true,
            focus: true
        });

        this.#webviews.push(webview);

        await listen('renderWindowLoaded', () => {
            emit('renderWindowUpdate', {
                text: render,
                theme: leto.windowManager.themes[leto.windowManager.currentTheme],
                file: file
            });
        });
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
        emit('renderWindowUpdate', {
            text: this.#createRender(text),
            theme: leto.windowManager.themes[leto.windowManager.currentTheme],
            file: file
        });
    }

    #createRender(text) {
        const html = text.replace(/^\[ \] (.*$)/gm, `<button class="todo"></button> $1`)
                         .replace(/^\[x\] (.*$)/gm, `<button class="todo checked"></button> <s>$1</s>`)
                         .replace(/^— (.*)(\n)?/gm, "<ul><li>$1</li></ul>")
                         .replace(/\n/g, "<br>");

	    return html.trim();
    }
}