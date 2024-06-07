![leto](https://github.com/leth4/leto/assets/44412176/96cb37ac-8774-4428-b16b-f2b06b0b539f)

leto is a minimalistic lightweight markdown editor for Windows.

Visually inspired by [Left](https://github.com/hundredrabbits/Left), functionally by [Obsidian](https://obsidian.md). Made using [Tauri](https://github.com/tauri-apps/tauri).

## Usage

Create a file directory to store your notes. Open the app, press `Ctrl + O` and select the directory. You can browse, open, create, pin, preview, rename, delete and move files and folders via the sidebar. Deleted files and folders are kept in a `.trash` folder in the working directory. All your changes are auto-saved.

Markdown `# headers`, `*italics*`, `**bold**` and `` `inline code` `` are highlighted. You can `[[link]]` to other files and ctrl-click to open them. There's syntax highlighting for code blocks wrapped between `` ``` `` symbols—you can specify the language in the first line, like `` ```csharp ``. Languages that support highlighting are *C#*, *C++*, *C*, *JavaScript*, *Python*, *Rust*, *Go*, *Java* and *HLSL*.

You can open a preview window for any file; task items in a preview window are clickable. Note that in leto tasks start with `[ ]`, not `- [ ]`. Press `Ctrl + O` to open the file corresponding to the active preview. Press `Ctrl + P` or right-click the title bar of the preview window to make it always stay on top. Right-click any link to open a preview window for it.

You can open `.png`, `.jpg` and `.gif` images and `[[link]]` them just like regular files. Hover on a link while holding `Ctrl` to preview the image; you can also open a separate preview window for it, where you can zoom and move it. Paste an image directly into the text, and leto will make a file for it and link it automatically.

There's a canvas mode with cards, called Lea. Right-click the sidebar and select `New Lea` to make a `.lea` file. Use context menu to create, copy, delete and cut cards, as well as send them to back or front, invert their colors and connect them via arrows. Right-click an arrow to remove or reverse it. Scroll to zoom in or out. Use left mouse button to drag cards and the canvas, and right mouse button to select cards. If multiple cards are selected, you can align them via the context menu. Drag a card by its sides to resize it. You can drag notes and images from the sidebar directly onto the canvas.

The default font is [Inter](https://github.com/rsms/inter); you can select any font via the Preferences menu (opened with `Ctrl+P`). Note that you need the font installed locally. Real italics and bold are only displayed for monospace fonts; otherwise those are just colored.

## Shortcuts

Shortcut | Action
:-|:-
`Ctrl + O` | Open a new directory
`Ctrl + Q` | Close active window
`Ctrl + Shift + Q` | Close all windows
`Ctrl + Shift + S` | Save active file as new
`Ctrl + Shift + F` | Toggle fullscreen
`Ctrl + M` | Minimize leto
`Ctrl + E` | Show quick open
`Ctrl + P` | Show/hide preferences
`Ctrl + F` | Show/hide the search box
`Ctrl + B` | Fold/unfold the sidebar
`Ctrl + R` | Toggle spellcheck
`Ctrl + D` | Insert current date
`Ctrl + Shift + D` | Insert current date and time
`Ctrl + G` | Open preview of the active file
`Ctrl + T` | Next theme
`Ctrl + Shift + T` | Previous theme
`Ctrl + Plus / Minus` | Change font size
`Ctrl + Shift + Plus / Minus` | Change sidebar size
`Ctrl + ] / [` | Change font weight
`Ctrl + N` | Create a new file
`Ctrl + Shift + N` | Create a new folder
`Ctrl + Number` | Open pinned file
`Ctrl + Tab` | Switch to the previous file
`Ctrl + ↑ / ↓` | Jump between headers
`Alt + ↑ / ↓` | Move selected lines
`Alt + Shift + ↑ / ↓` | Duplicate selected lines
`Ctrl + Enter` | Create or check/uncheck a task
`Ctrl + L` | Select the current line
`Ctrl + X` | Cut the current line

## Lea Shortcuts

Shortcut | Action
:-|:-
`Enter` | Create a new card
`Shift + Enter` | Create a new canvas
`] / [` | Send to front/back
`I` | Invert the card's color
`V` | Align selected cards vertically
`H` | Align selected cards horizontally
`C` | Connect selected cards
`D` | Disconnect selected cards
`Plus / Minus` | Zoom in/out
`Ctrl + R` | Reset canvas position
`Ctrl + Shift + V` | Paste an image
