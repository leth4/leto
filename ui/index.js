const {appWindow} = window.__TAURI__.window;
const {register, unregister} = window.__TAURI__.globalShortcut;
const {writeTextFile, readTextFile, readDir, BaseDirectory} = window.__TAURI__.fs;
const {open} = window.__TAURI__.dialog;
const {appDir} = window.__TAURI__.path;

await register('CmdOrControl+S', () => {saveSelectedFile()})
await register('CmdOrControl+O', () => {openFile()})
await register('CmdOrControl+]', () => {changeFontSize(3)})
await register('CmdOrControl+[', () => {changeFontSize(-3)})

const editor = document.getElementById("text-editor");

document.addEventListener('keydown', function(event) {
    if(event.key == 'Escape') { closewindow(); }
});

document.addEventListener('contextmenu', event => event.preventDefault());

window.onkeydown = (e) => {
  if (e.ctrlKey && (e.code === 'KeyQ')) {
      e.preventDefault();
      toggleSpellcheck();
      return;
  }
}

 document.getElementById("select-directory-button").onclick=async ()=>{selectDirectory()};

//editor.addEventListener('input', saveSelectedFile(), false);

var selectedFile;
var selectedDirectory;

async function closewindow() { await appWindow.close(); }

 
async function openFile() {
    selectedFile = await open({
        multiple: false,
        filters: [{name: "", extensions: ['txt', 'md'] }]
    });
    if (selectedFile == null) return;
    openSelectedFile();
}

async function selectDirectory() {
    var selected = await open({ directory: true});
    await readDir(selected, {recursive: true }).then(function(entries) {selectDirectory = entries});
    showFileTree(selectDirectory);
}

function showFileTree(directoryElements) {
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
    fileButton.onclick = async () => {await openSpecificFile(fileButton.getAttribute("data-path"))};
    var liElement = document.createElement('li');
    liElement.appendChild(fileButton);
    parentElement.appendChild(liElement);
}

function showDirectory(directory, parentElement) {
    var liElement = document.createElement('li');
    parentElement.appendChild(liElement);

    var groupToggle =  document.createElement('button');
    groupToggle.className="group-toggle";
    groupToggle.onclick = () => {
        liElement.querySelector('.nested').classList.toggle("active");
        groupToggle.classList.toggle("unfolded");
    };
    liElement.appendChild(groupToggle);
    
    var fileButton = document.createElement('button');
    fileButton.className = 'file-button';
    fileButton.setAttribute("data-path", directory.path);
    fileButton.innerHTML = directory.name;
    fileButton.onclick = () => {
        liElement.querySelector('.nested').classList.toggle("active");
        groupToggle.classList.toggle("unfolded");
    };
    liElement.appendChild(fileButton);

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

async function openSpecificFile(path) {
    editor.value = await readTextFile(path);
}

async function openSelectedFile() {
    editor.value = await readTextFile(selectedFile);
}

async function saveSelectedFile() {
    if (selectedFile == null) return;
    await writeTextFile(selectedFile, editor.value);
}

function setTheme(theme) {
    document.getElementById("theme-link").setAttribute("href", `themes/${theme}.css`);
}

function toggleSpellcheck() {
    var newValue = editor.getAttribute("spellcheck") == "true" ? "false" : "true";
    editor.setAttribute("spellcheck", newValue);
}

function changeFontSize(change) {
    var r = document.querySelector(':root');
    var currentSize = getComputedStyle(r).getPropertyValue('--font-size');
    var num = parseInt(currentSize.replace(/[^0-9]/g, ''));
    r.style.setProperty('--font-size', `${num + change}px`);
}

