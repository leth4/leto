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
    selectDirectory.forEach(element => {
        showDirectory(element);
    });
}


function showDirectory(directory, parentElement = document.getElementById("file-tree")) {
    if (directory.children == null) {
        var element = directory;
        var fileButton = document.createElement('button');
        fileButton.className = 'file-button';
        fileButton.setAttribute("data-path", element.path);
        fileButton.innerHTML = element.name;
        fileButton.onclick = async () => {await openSpecificFile(fileButton.getAttribute("data-path"))};
        var liElement = document.createElement('li');
        liElement.appendChild(fileButton);
        parentElement.appendChild(liElement);
    }
    else {
        var element = directory;
        var liElement = document.createElement('li');
        parentElement.appendChild(liElement);

        var groupToggle =  document.createElement('button');
        groupToggle.className="group-toggle";
        groupToggle.innerHTML="▶";
        groupToggle.onclick = () => {parentElement.querySelector('.nested').classList.toggle("active")};
        liElement.appendChild(groupToggle);
        
        var fileButton = document.createElement('button');
        fileButton.className = 'file-button';
        fileButton.setAttribute("data-path", element.path);
        fileButton.innerHTML = element.name;
        fileButton.onclick = () => {parentElement.querySelector('.nested').classList.toggle("active")};
        liElement.appendChild(fileButton);

        var ulElement = document.createElement('ul');
        ulElement.className = 'nested';
        parentElement.appendChild(ulElement);
        element.children.forEach(child => {
            if (child.children != null) {console.log(child); showDirectory(child, ulElement);}
        })
        element.children.forEach(child => {
            if (child.children == null) {console.log(child); showDirectory(child, ulElement);}
        })
    }
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

