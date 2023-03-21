import {selectFile} from "/index.js"

export function showFileTree(directoryElements, path) {
    var directoryName = path.split("\\").slice(-1);

    var titleLi = document.createElement('li');
    titleLi.innerHTML = directoryName;
    titleLi.className = "path-title";
    document.getElementById("file-tree").innerHTML = '';
    document.getElementById("file-tree").appendChild(titleLi)

    directoryElements.forEach(child => {
        if (child.children != null) {showDirectory(child, document.getElementById("file-tree"));}
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
    fileButton.onclick = async () => {await selectFile(fileButton.getAttribute("data-path"))};

    var liElement = document.createElement('li');
    liElement.appendChild(fileButton);
    parentElement.appendChild(liElement);
}

function showDirectory(directory, parentElement) {
    if (directory.name.substring(0, 1) == ".") return;

    var liElement = document.createElement('li');
    parentElement.appendChild(liElement);

    var groupToggle = document.createElement('image');
    groupToggle.className="group-toggle";

    var folderTitle = document.createElement('span');
    folderTitle.className="directory-label";
    folderTitle.innerHTML = directory.name;
    
    var folderButton = document.createElement('button');
    folderButton.className="folder-button";
    folderButton.onclick = () => {
        liElement.querySelector('.nested').classList.toggle("active");
        groupToggle.classList.toggle("unfolded");
    };
    liElement.appendChild(folderButton);
    folderButton.appendChild(groupToggle);
    folderButton.appendChild(folderTitle);
    
    var ulElement = document.createElement('ul');
    ulElement.className = 'nested';
    liElement.appendChild(ulElement);

    directory.children.forEach(child => {
        if (child.children != null) {showDirectory(child, ulElement);}
    })
    directory.children.forEach(child => {
        if (child.children == null) {showFile(child, ulElement);}
    })
}