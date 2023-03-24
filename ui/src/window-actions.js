import { saveConfig, currentFont, currentTheme } from "../src/index.js";

const {appWindow} = window.__TAURI__.window;
export const themes = ["gleam", "aske", "zima", "spirit"];
const fonts = ["arial", "georgia", "cascadia mono", "helvetica neue", "segoe ui", "inter"];

var prefsToggled = false;
var sidebarToggled = true;
var fullscreenToggled = true;

export async function closewindow() { 
    await appWindow.close(); 
}

export async function minimizeWindow() { 
    await appWindow.minimize(); 
}

export function toggleFullscreen() {
    fullscreenToggled = !fullscreenToggled;
    appWindow.setFullscreen(fullscreenToggled);
}

export function applyFont() {
    document.querySelector(':root').style.setProperty('--font-family', `"${fonts[currentFont]}", "Arial"`);
    saveConfig();
}

export function applyTheme() {
    document.getElementById("theme-link").setAttribute("href", `themes/${themes[currentTheme]}.css`);
    saveConfig();
}

export function togglePrefs() {
    prefsToggled = !prefsToggled;
    document.getElementById("preferences").style.display = prefsToggled ? "block" : "none";
}

export function toggleSidebar() {
    sidebarToggled = !sidebarToggled;
    document.getElementById("sidebar").style.maxWidth = sidebarToggled ? "200px" : "50px";

    document.getElementById("sidebar-content").style.opacity = sidebarToggled ? "1" : "0";
    document.getElementById("sidebar-content").style.pointerEvents = sidebarToggled ? "all" : "none";
}

export function populateThemes() {
    for (var i = 0; i < themes.length; i++) {
    var option = document.createElement('option');
       option.innerHTML = themes[i];
       option.value = i;
       document.getElementById("theme-selector").appendChild(option); 
    }
    document.getElementById("theme-selector").value = currentTheme;
}

export function populateFonts() {
    for (var i = 0; i < fonts.length; i++) {
    var option = document.createElement('option');
       option.innerHTML = fonts[i];
       option.value = i;
       document.getElementById("font-selector").appendChild(option); 
    }
    document.getElementById("font-selector").value = currentFont;
}
