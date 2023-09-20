![image](https://user-images.githubusercontent.com/44412176/236444916-ca598da3-26cc-4626-9f15-d8a02ba269eb.png)

leto is a minimalistic lightweight plain text editor for Windows.

Visually inspired by [Left](https://github.com/hundredrabbits/Left), functionally by [Obsidian](https://obsidian.md). Made using [Tauri](https://github.com/tauri-apps/tauri).

## Usage

Create a file directory to store your notes. Open the app, press `Ctrl + O` and select the directory. You can browse, open, create, pin, preview, rename, delete and move files and folders via the sidebar. Deleted files and folders are kept in a `.trash` folder in the working directory. All your changes are auto-saved.

Markdown `# headers`, `*italics*`, `**bold**` and `` `inline code` `` are highlighted. You can also `[[link]]` to other files and ctrl-click to open them. There's also syntax highlighting for code blocks wrapped between `` ``` `` symbols — you can specify the language in the first line, like `` ```csharp ``. Languages that support highlighting are *C#*, *C++*, *C*, *JavaScript*, *Python*, *Rust*, *Go*, *Java* and *HLSL*.

You can open a preview window for any file; task items in a preview window are clickable. Note that in leto tasks start with `[ ]`, not `- [ ]`. Press `Ctrl + O` to open a file corresponding to the selected preview. Press `Ctrl + P` or right-click the title bar of the preview window to make it always stay on top.

The default font is [Inter](https://github.com/rsms/inter), but you can input any font via the Preferences menu (opened with `Ctrl+P`). Note that you need the font installed locally. Real italics and bold are only displayed for monospace fonts; otherwise those are just colored.

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
`Ctrl + D` | Open preview of the active file
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
`Ctrl + Enter` | Create or check/uncheck a task
`Ctrl + L` | Select the current line
`Ctrl + X` | Cut the current line
