import {setActiveFile, moveFileTo, moveFolderTo, moveFolderToTrash, moveFileToTrash} from "../src/file-system.js"

export function showSingleFile(file) {
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

    mainDropArea.addEventListener('dragenter', (event) => {
        event.preventDefault();
    });
    mainDropArea.addEventListener('dragover', (event) => {
        event.preventDefault();
    });
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
    fileButton.onclick = async () => {setActiveFile(fileButton.getAttribute("data-path"))};

    var liElement = document.createElement('li');
    liElement.appendChild(fileButton);
    parentElement.appendChild(liElement);
    liElement.draggable = true;
    liElement.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData("text", file.path);
    });
}

function showFolder(folder, parentElement) {
    if (folder.name.substring(0, 1) == ".") return;

    var folderButton = document.createElement('button');
    folderButton.className="folder-button";
    folderButton.setAttribute("data-path", folder.path);
    folderButton.innerHTML = folder.name;
    folderButton.onclick = () => { liElement.querySelector('.nested').classList.toggle("active"); };

    folderButton.draggable = true;
    folderButton.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData("text", folder.path + "/");
    });
    
    var liElement = document.createElement('li');
    liElement.appendChild(folderButton);
    
    folderButton.addEventListener('dragenter', (event) => {
        event.preventDefault();
    });
    folderButton.addEventListener('dragover', (event) => {
        event.preventDefault();
    });
    folderButton.addEventListener('drop', (event) => {
        var path = event.dataTransfer.getData("text");
        if (path.slice(-1) == "/") {
            moveFolderTo(path.slice(0, -1), folder.path)
        }
        else {
            moveFileTo(event.dataTransfer.getData("text"), folder.path);
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
}



var deleteArea = document.getElementById("delete-area");

deleteArea.addEventListener('dragenter', (event) => {
    event.preventDefault();
});
deleteArea.addEventListener('dragover', (event) => {
    event.preventDefault();
});
deleteArea.addEventListener('drop', (event) => {
    const path = event.dataTransfer.getData("text");
    if (path.slice(-1) == "/") {
        moveFolderToTrash(path.slice(0, -1))
    }
    else {
        moveFileToTrash(path);
    }
    event.preventDefault();
});

document.addEventListener("dragstart", () => {
    deleteArea.classList.add("active");
});

document.addEventListener("dragend", function(event) {
  deleteArea.classList.remove("active");
});