import {setActiveFile, moveFileTo, moveFolderTo, moveFolderToTrash, moveFileToTrash, renameFile, renameFolder} from "../src/file-system.js"

var openFolders = [];
var renamingFolder;

var fileNameInput = document.getElementById("file-name");
fileNameInput.addEventListener('input', async () => { fileNameInput.value = sanitizeFilename(fileNameInput.value) });
fileNameInput.addEventListener('focusout', async () => {
    renameFile(fileNameInput.parentElement.firstChild.getAttribute("data-path"), fileNameInput.value);
    fileNameInput.parentElement.firstChild.innerHTML = fileNameInput.value;
    fileNameInput.parentElement.firstChild.style.display = "block";
    fileNameInput.parentElement.draggable = "true";
    fileNameInput.style.display = "none";
    document.getElementById("preferences").append(fileNameInput);
});

var folderNameInput = document.getElementById("folder-name");
folderNameInput.addEventListener('input', () => { folderNameInput.value = sanitizeFilename(folderNameInput.value); });
folderNameInput.addEventListener('focusout', async () => {
    await renameFolder(renamingFolder.getAttribute("data-path"), folderNameInput.value);
    renamingFolder.innerHTML = folderNameInput.value;
    renamingFolder.style.display = "block";
    renamingFolder.parentElement.draggable = "true";
    folderNameInput.style.display = "none";
    document.getElementById("preferences").append(folderNameInput);
});

function sanitizeFilename(name) {
    return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
}

export function setFileToRename(path) {
    var files = document.getElementsByClassName("file-button");
    var fileElement;
    for (var i = 0; i < files.length; i++) {
        if (files[i].getAttribute('data-path') == path) {
            fileElement = files[i];
            break;
        }
    }

    if (fileElement == null) return;

    fileElement.parentElement.append(fileNameInput);
    fileNameInput.focus();
    fileElement.parentElement.draggable = false;
    fileElement.style.display = "none";
}


export function showSingleFile(file) {
    openFolders = null;
    var name = file.replace(/^.*[\\\/]/, '')
    name = name.replace(/\.[^/.]+$/, "");

    var fileButton = document.createElement('button');
    fileButton.className = 'file-button';
    fileButton.classList.add("selected");
    fileButton.innerHTML = name;

    var liElement = document.createElement('li');
    liElement.appendChild(fileButton);
    clearFileTree();
    document.getElementById("file-tree").appendChild(liElement);
}

export function clearFileTree() {
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

export function showFileTree(directoryElements, directoryPath) {
    clearFileTree();

    directoryElements.forEach(child => {
        if (child.children != null) {showFolder(child, document.getElementById("file-tree"));}
    })
    directoryElements.forEach(child => {
        if (child.children == null) {showFile(child, document.getElementById("file-tree"));}
    })

    var mainDropArea = document.createElement('li');
    mainDropArea.style.height = "30px";
    mainDropArea.setAttribute("data-tauri-drag-region", "");
    document.getElementById("file-tree").appendChild(mainDropArea);

    mainDropArea.addEventListener('dragenter', (event) => { event.preventDefault(); });
    mainDropArea.addEventListener('dragover', (event) => { event.preventDefault(); });
    mainDropArea.addEventListener('drop', (event) => {
        var path = event.dataTransfer.getData("text");
        if (path.slice(-1) == "/") {
            moveFolderTo(path.slice(0, -1), directoryPath)
        }
        else {
            moveFileTo(event.dataTransfer.getData("text"), directoryPath);
        }
        event.preventDefault();
    });
}

function showFile(file, parentElement) {
    var extension = /[^.]*$/.exec(file.name)[0];
    if (extension != "md" && extension != "txt") return;

    var fileButton = document.createElement('button');
    fileButton.className = 'file-button';
    fileButton.setAttribute("data-path", file.path);
    fileButton.innerHTML = file.name.replace(/\.[^/.]+$/, "");
    if (fileButton.innerHTML.replace(/\s/g, '').length == 0) fileButton.innerHTML = "--";    
    
    fileButton.addEventListener('dragenter', (event) => { event.preventDefault(); });
    fileButton.addEventListener('dragover', (event) => { event.preventDefault(); });
    fileButton.addEventListener('drop', (event) => {
        var path = event.dataTransfer.getData("text");
        if (path.slice(-1) == "/") {
            moveFolderTo(path.slice(0, -1), file.path.substring(0,file.path.lastIndexOf("\\")))
        }
        else {
            moveFileTo(event.dataTransfer.getData("text"), file.path.substring(0,file.path.lastIndexOf("\\")))
        }
        event.preventDefault();
    });

    var liElement = document.createElement('li');
    liElement.appendChild(fileButton);
    parentElement.appendChild(liElement);
    liElement.draggable = true;
    liElement.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData("text/path", file.path);
        event.dataTransfer.setData("text", file.path);
    });
}

function showFolder(folder, parentElement) {
    if (folder.name.substring(0, 1) == ".") return;

    var folderButton = document.createElement('button');
    folderButton.className="folder-button";
    folderButton.setAttribute("data-path", folder.path);
    folderButton.innerHTML = folder.name;
    
    folderButton.draggable = true;
    folderButton.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData("text/path", folder.path  + "/");
        event.dataTransfer.setData("text", folder.path  + "/");
    });
    
    var liElement = document.createElement('li');
    liElement.appendChild(folderButton);
    
    folderButton.addEventListener('dragenter', (event) => { event.preventDefault(); });
    folderButton.addEventListener('dragover', (event) => { event.preventDefault(); });
    folderButton.addEventListener('drop', (event) => {
        var path = event.dataTransfer.getData("text/path");
        if (path.slice(-1) == "/") {
            moveFolderTo(path.slice(0, -1), folder.path)
        }
        else {
            moveFileTo(path, folder.path);
        }
        event.preventDefault();
    });
    
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
    
    if (openFolders.includes(folder.path)) {
        liElement.querySelector('.nested').classList.add("active");
    }
}



var deleteArea = document.getElementById("delete-area");

deleteArea.addEventListener('dragenter', (event) => { event.preventDefault(); });
deleteArea.addEventListener('dragover', (event) => { event.preventDefault(); });
deleteArea.addEventListener('drop', (event) => {
    const path = event.dataTransfer.getData("text/path");
    if (path.slice(-1) == "/") {
        moveFolderToTrash(path.slice(0, -1))
    }
    else {
        moveFileToTrash(path);
    }
    event.preventDefault();
});

document.addEventListener("dragstart", (event) => {
    if (event.dataTransfer.getData("text/path"))
        deleteArea.classList.add("active");
});

document.addEventListener("dragend", () => {
    deleteArea.classList.remove("active");
});

document.getElementById("file-tree").addEventListener("mouseup", (event) => {
    if (!event.target) return;
    if (event.target.classList.contains("file-button")) {
        const fileButton = event.target;
        if (event.button == 2) {
            fileButton.parentElement.append(fileNameInput);
            fileButton.parentElement.draggable = false;
            fileNameInput.style.display = "block";
            fileNameInput.focus();
            fileNameInput.value = fileButton.innerHTML;
            fileButton.style.display = "none";
        }
        setActiveFile(fileButton.getAttribute("data-path"));
    }
    else if (event.target.classList.contains("folder-button")) {
        const folderButton = event.target;
        if (event.button == 2) {
            folderButton.parentElement.insertBefore(folderNameInput, folderButton.parentElement.firstChild);
            folderNameInput.value = folderButton.innerHTML;
            folderNameInput.style.display = "block";
            folderNameInput.focus();
            renamingFolder = folderButton;
            folderButton.parentElement.draggable = false;
            folderButton.style.display = "none";
        }
        else {
            const nested = folderButton.parentElement.querySelector('.nested');
            if (nested.classList.contains("active")) {
                nested.classList.remove("active");
                openFolders.filter(item => item !== folderButton.getAttribute("data-path"))
            }
            else {
                nested.classList.add("active");
                openFolders.push(folderButton.getAttribute("data-path"));
            }
        }
    }
});