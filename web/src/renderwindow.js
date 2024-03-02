const { appWindow } = window.__TAURI__.window;
const { listen, emit } = window.__TAURI__.event;
const { invoke } = window.__TAURI__.tauri;

const content = document.getElementById('content');
const imageDisplay = document.getElementById('image-display');
const imageContainer = document.getElementById('image-container');

var displayedFile;
var isDisplayingImage;
var currentTheme;
var fontSize = 20;
var isAlwaysOnTop = false;

var currentImageZoom = 1;
var startImagePosition = {x: 0, y: 0};
var currentImagePosition = {x: 0, y: 0};
var isPanningImage;

const themes = [
  'gleam',
  'aske',
  'shell',
  'zima',
  'spirit',
  'perlin',
  'dart',
  'glass',
  'beetle'
];

document.getElementById('minimize').addEventListener('click', () => appWindow.minimize());
document.getElementById('maximize').addEventListener('click', async () => await appWindow.isMaximized() ? appWindow.unmaximize() : appWindow.maximize());
document.getElementById('close').addEventListener('click', () => closeWindow());
document.getElementById('title').addEventListener('mousedown', e => e.button == 2 ? toggleAlwaysOnTop() : null);
document.getElementById('open').addEventListener('mousedown', () => openFile());
document.addEventListener('wheel', e => handleMouseWheel(e));
document.addEventListener('contextmenu', e => e.preventDefault());

window.onkeydown = (e) => {
  if (e.ctrlKey && !e.shiftKey && e.code === 'KeyQ') closeWindow();
  else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyM') appWindow.minimize();
  else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyT') setNextTheme();
  else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyR') {}
  else if (e.ctrlKey && !e.shiftKey && e.code === 'Equal') changeFontSize(+1);
  else if (e.ctrlKey && !e.shiftKey && e.code === 'Minus') changeFontSize(-1);
  else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyP') toggleAlwaysOnTop();
  else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyO') openFile();
  else if (e.ctrlKey && !e.shiftKey && e.code === 'KeyH') setNonScrollableSize();
  else return;

  e.preventDefault();
}

imageContainer.addEventListener('wheel', event => {
  var direction = event.deltaY > 0 ? -1 : 1;
  var newZoom = currentImageZoom + direction * 0.15; 
  if (newZoom < 1) newZoom = 1; 
  if (newZoom > 5) newZoom = 5; 
  currentImageZoom = newZoom;
  setImageTransform();
});

imageContainer.addEventListener('mouseup', () => {
  isPanningImage = false;
  if (currentImageZoom > 1) imageDisplay.style.cursor = 'grab';
});

imageContainer.addEventListener('mousedown', event => {
  event.preventDefault();
  if (event.clientX < 10 || event.clientY < 10 || event.clientX > window.innerWidth - 10 || event.clientY > window.innerHeight - 10) return;
  isPanningImage = true; 
  if (currentImageZoom > 1) imageDisplay.style.cursor = 'grabbing';
  startImagePosition = { x: event.clientX - currentImagePosition.x, y: event.clientY - currentImagePosition.y };
});

imageContainer.addEventListener('mousemove', event => {
  event.preventDefault();
  if (!isPanningImage) return;
  currentImagePosition = { x: event.clientX - startImagePosition.x, y: event.clientY - startImagePosition.y };
  setImageTransform();
});

function setImageTransform() {
  if (currentImagePosition.x < -((currentImageZoom - 1) * imageDisplay.clientWidth) / 2) currentImagePosition.x = -((currentImageZoom - 1) * imageDisplay.clientWidth) / 2;
  if (currentImagePosition.x > ((currentImageZoom - 1) * imageDisplay.clientWidth) / 2) currentImagePosition.x = ((currentImageZoom - 1) * imageDisplay.clientWidth) / 2;
  if (currentImagePosition.y < -((currentImageZoom - 1) * imageDisplay.clientHeight) / 2) currentImagePosition.y = -((currentImageZoom - 1) * imageDisplay.clientHeight) / 2;
  if (currentImagePosition.y > ((currentImageZoom - 1) * imageDisplay.clientHeight) / 2) currentImagePosition.y = ((currentImageZoom - 1) * imageDisplay.clientHeight) / 2;

  imageDisplay.style.transform = "translate(" + currentImagePosition.x + "px, " + currentImagePosition.y + "px) scale(" + currentImageZoom + ")";
  if (currentImageZoom <= 1) imageDisplay.style.cursor = 'default';
  else imageDisplay.style.cursor = isPanningImage ? 'grabbing' : 'grab';
}

async function setNonScrollableSize() {
  var size = await appWindow.innerSize();
  if (isDisplayingImage) {
    size = {type: "Logical", width: 800, height: 600};
    var imageSize = await getImageSize(imageDisplay.getAttribute('src'));
    if (imageSize.width < size.width) size.width = imageSize.width;
    if (imageSize.height < size.height) size.height = imageSize.height;
    var aspectRatio = imageSize.width / imageSize.height;
    if (aspectRatio > 1) size.height = size.width / aspectRatio;
    else size.width = size.height * aspectRatio;
    size.height = size.height + 35;
    currentImageZoom = 1;
    setImageTransform();
  } else {
    if (content.offsetHeight + 15 < 800) {
      size.height = Math.max(content.offsetHeight + 15, 200);
    }
  }
  appWindow.setSize(size);  
}

function getImageSize(src) {
  return new Promise((resolve, reject) => {
    var image = new Image();
    image.src = src;
    image.onload = () => resolve({width: image.width, height: image.height});
    image.onerror = reject;
  });
}

function closeWindow() {
  appWindow.close();
  emit('renderWindowClosed');
}

function openFile() {
  emit('renderOpenFile', { file: displayedFile });
}

function handleMouseWheel(event) {
    if (!event.ctrlKey) return;
    if (event.shiftKey) return;
    changeFontSize(-event.deltaY / Math.abs(event.deltaY));
}

function toggleAlwaysOnTop() {
  isAlwaysOnTop = !isAlwaysOnTop;
  appWindow.setAlwaysOnTop(isAlwaysOnTop);
  document.querySelector(':root').style.setProperty('--before-title', isAlwaysOnTop ? '"↓ "' : '""');
}

function changeFontSize(change = 0) {
    var newSize = fontSize + change;
    if (newSize > 50) newSize = 50;
    else if (newSize < 12) newSize = 12;
    setFontSize(newSize);
  }

function setFontSize(size) {
    fontSize = size ?? 20;
    document.querySelector(':root').style.setProperty('--font-size', `${fontSize}px`);
}

function setTheme(theme) {
  currentTheme = theme ?? 0;
  if (theme >= themes.length) currentTheme = 0;
  invoke(currentTheme == 2 || currentTheme == 7 ? 'add_blur' : 'remove_blur', { label:appWindow.label });
  document.getElementById('theme-link').setAttribute('href', `themes/${themes[currentTheme]}.css`);
}

function setNextTheme() {
  setTheme(parseInt(currentTheme) + 1)
}

await listen('renderWindowUpdate', (event) => {
  var firstOpen = false;
  if (!displayedFile) {
    setTheme(event.payload.theme);
    setFontSize(event.payload.fontSize);
    document.getElementById('title').innerHTML = event.payload.title;
    document.querySelector(':root').style.setProperty('--font-family', `'${event.payload.font}', 'inter', sans-serif`);
    document.querySelector(':root').style.setProperty('--font-weight', `${event.payload.fontWeight}`);
    displayedFile = event.payload.file;
    firstOpen = true;
  }
  else if (displayedFile != event.payload.file) return;  

  if (event.payload.imagePath != '') {
    isDisplayingImage = true;
    imageDisplay.setAttribute('src', event.payload.imagePath);
    imageContainer.style.display = 'flex';
  }

  if (isDisplayingImage) {
    setNonScrollableSize();
    return;
  };

  imageContainer.style.display = 'none';
  
  content.innerHTML = event.payload.text;

  var buttons = document.getElementsByClassName('todo');
  for (let i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener('click', () => emit('renderTodoClicked', { index: i, file: displayedFile }));
  }

  var innerLinks = document.getElementsByClassName('link');
  for (let i = 0; i < innerLinks.length; i++) {
    innerLinks[i].addEventListener('click', event => emit('renderOpenLink', { file: event.target.getAttribute('data-link') }));
  }

  if (firstOpen) setNonScrollableSize();
});

emit('renderWindowLoaded', {label: appWindow.label});