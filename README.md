![image](https://user-images.githubusercontent.com/44412176/236444916-ca598da3-26cc-4626-9f15-d8a02ba269eb.png)

leto is a minimalistic lightweight plain text editor for Windows.

Visually inspired by [Left](https://github.com/hundredrabbits/Left), functionally by [Obsidian](https://obsidian.md). Made using [Tauri](https://github.com/tauri-apps/tauri).

## Usage

Create a file directory to store your notes. Open the app, press `Ctrl + O` and select the directory. You can browse, open, create, pin, rename, delete and move files and folders via the sidebar. Deleted files and folders are kept in a `.trash` folder in the working directory. All your changes are auto-saved.

Markdown `# headers`, `*italics*` and `` `inline code` `` are highlighted. There's also syntax highlighting for code blocks wrapped between `` ``` `` symbols — you can specify the language in the first line, like `` ```csharp ``. Languages that support highlighting are *C#*, *C++*, *C*, *JavaScript*, *Python*, *Rust*, *Java* and *HLSL*. 

The default font is [Inter](https://github.com/rsms/inter), but you can input any font via the Preferences menu (opened with `Ctrl+P`). Note that you need the font installed locally.

## Shortcuts

Shortcut | Action
:-|:-
`Ctrl + O` | Open a new directory
`Ctrl + Shift + S` | Save active file as new
`Ctrl + Q` | Exit leto
`Ctrl + M` | Minimize leto
`Ctrl + P` | Show/hide preferences
`Ctrl + F` | Show/hide the search box
`Ctrl + B` | Fold/unfold the sidebar
`Ctrl + R` | Toggle spellcheck
`Ctrl + T` | Cycle through themes
`Ctrl + Plus / Minus` | Change font size
`Ctrl + ] / [` | Change font weight
`Ctrl + N` | Create a new file
`Ctrl + Shift + N` | Create a new folder
`Ctrl + Number` | Open pinned file
`Ctrl + Tab` | Switch to the previous file
`Ctrl + ↑ / ↓` | Jump between headers
`Alt + ↑ / ↓` | Move selected lines
`Alt + Shift + ↑ / ↓` | Duplicate selected lines
`Ctrl + Enter` | Create or check/uncheck a to-do task
`Ctrl + L` | Select the current line
`Ctrl + X` | Cut the current line
`F11` | Toggle fullscreen
