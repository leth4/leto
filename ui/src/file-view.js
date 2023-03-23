import {setActiveFile} from "./index.js"

const {open} = window.__TAURI__.shell;

export function showSingleFile(file) {
    var name = file.replace(/^.*[\\\/]/, '')
    name = name.replace(/\.[^/.]+$/, "");

    var fileButton = document.createElement('button');
    fileButton.className = 'file-button';
    fileButton.classList.add("selected");
    fileButton.innerHTML = name;

    var liElement = document.createElement('li');
    liElement.appendChild(fileButton);
    document.getElementById("file-tree").innerHTML = '';
    document.getElementById("file-tree").appendChild(liElement);
}

export function clearTree() {
    document.getElementById("file-tree").innerHTML = '';
}

export function highlightSelectedFile(path) {
    var files = document.getElementsByClassName("file-button");
    var highlightedElement;
    for (var i = 0; i < files.length; i++) {
        if (files[i].getAttribute('data-path') == path)
            highlightedElement = files[i];
        files[i].classList.remove("selected");
    }

    if (highlightedElement == null) return;

    var folders = document.getElementsByClassName("folder-button");
    for (var i = 0; i < folders.length; i++) {
        folders[i].classList.remove("selected");
    }

    while (true) {
        highlightedElement.classList.add("selected");
        var folder = highlightedElement.parentElement.parentElement.parentElement.firstChild;
        if (folder == null || folder.className != "folder-button") break;
        highlightedElement = folder;
    }
}

export async function openInExplorer(directory) {
    await open(directory);
}

export function showFileTree(directoryElements) {
    document.getElementById("file-tree").innerHTML = '';

    directoryElements.forEach(child => {
        if (child.children != null) {showFolder(child, document.getElementById("file-tree"));}
    })
    directoryElements.forEach(child => {
        if (child.children == null) {showFile(child, document.getElementById("file-tree"));}
    })
}

function showFile(file, parentElement) {
    var extension = /[^.]*$/.exec(file.name)[0];
    if (extension != "md" && extension != "txt") return;

    var fileButton = document.createElement('button');
    fileButton.className = 'file-button';
    fileButton.setAttribute("data-path", file.path);
    fileButton.innerHTML = file.name.replace(/\.[^/.]+$/, "");
    fileButton.onclick = async () => {setActiveFile(fileButton.getAttribute("data-path"))};

    var liElement = document.createElement('li');
    liElement.appendChild(fileButton);
    parentElement.appendChild(liElement);
}

function showFolder(folder, parentElement) {
    if (folder.name.substring(0, 1) == ".") return;

    var folderButton = document.createElement('button');
    folderButton.className="folder-button";
    folderButton.innerHTML = folder.name;
    folderButton.onclick = () => { liElement.querySelector('.nested').classList.toggle("active"); };
    
    var liElement = document.createElement('li');
    liElement.appendChild(folderButton);
    parentElement.appendChild(liElement);
    
    var ulElement = document.createElement('ul');
    ulElement.className = 'nested';
    liElement.appendChild(ulElement);

    folder.children.forEach(child => {
        if (child.children != null) {showFolder(child, ulElement);}
    })
    folder.children.forEach(child => {
        if (child.children == null) {showFile(child, ulElement);}
    })
}