const {appWindow} = window.__TAURI__.window;
const {register} = window.__TAURI__.globalShortcut;
const {readDir, BaseDirectory} = window.__TAURI__.fs;


async function closewindow() {
    await appWindow.close();
}

// await readDir('users', { dir: BaseDirectory.Desktop, recursive: true }).then(function showFiles(entries) {
// entries.forEach(element => {
//         console.log(element);
//     });
// });

//await register('CmdOrControl+Plus', () => {changeFontSize(3)})

function setTheme(theme) {
    document.getElementById("theme-link").setAttribute("href", `themes/${theme}.css`);
}

function changeFontSize(change) {
    var r = document.querySelector(':root');
    var currentSize = getComputedStyle(r).getPropertyValue('--font-size');
    var num = parseInt(currentSize.replace(/[^0-9]/g, ''));
    r.style.setProperty('--font-size', `${num + change}px`);
}



document.addEventListener('keydown', function(event) {
    if(event.key == 'Escape') {
        closewindow();
    }
    if(event.ctrlKey && event.key=="-") {
        changeFontSize(-3)
    }
    if(event.ctrlKey && event.key=="=") {
        changeFontSize(3)
    }
});
