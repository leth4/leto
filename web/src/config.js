'use strict';

const { writeTextFile, readTextFile, createDir, exists } = window.__TAURI__.fs;
const { appConfigDir } = window.__TAURI__.path;

export default class Config {

  #isSaving = false;
  #savePending = false;

  async save() {
    if (this.#isSaving) {
      this.#savePending = true;
      return;
    }
    this.#isSaving = true;

    const configObject = {
      selectedFile: leto.directory.activeFile,
      selectedDirectory: leto.directory.activeDirectory,
      windowSize: leto.windowManager.windowSize,
      windowPosition: leto.windowManager.windowPosition,
      currentTheme: leto.windowManager.currentTheme,
      currentFont: leto.windowManager.currentFont,
      fontSize: leto.windowManager.fontSize,
      sidebarFontSize: leto.windowManager.sidebarFontSize,
      fontWeight: leto.windowManager.fontWeight,
      pins: leto.explorer.pins,
      dictionary: leto.spellcheck.userDictionary
    };

    const configPath = await appConfigDir();
    await writeTextFile(`${configPath}config.json`, JSON.stringify(configObject, null, 2));

    this.#isSaving = false;
    if (this.#savePending) {
      this.#savePending = false;
      this.save();
    }
  }

  async load() {
    const configPath = await appConfigDir();

    try {
      var config = await readTextFile(`${configPath}config.json`);
      var configObject = JSON.parse(config);
    } catch {
      this.#create();
      return;
    }

    leto.windowManager.setTheme(configObject.currentTheme, false)
    leto.windowManager.setFont(configObject.currentFont, false)
    leto.windowManager.setFontSize(configObject.fontSize, false);
    leto.windowManager.setSidebarFontSize(configObject.sidebarFontSize, false);
    leto.windowManager.setFontWeight(configObject.fontWeight, false);
    leto.windowManager.applyWindowSize(configObject.windowSize);
    leto.windowManager.applyWindowPosition(configObject.windowPosition);
    
    leto.spellcheck.setUserDictionary(configObject.dictionary);
    leto.directory.setActiveDirectory(configObject.selectedDirectory);
    leto.directory.setActiveFile(configObject.selectedFile, false);
    leto.explorer.setPins(configObject.pins);
  }

  async #create() {
    const configPath = await appConfigDir();
    if (!(await exists(configPath))) {
      await createDir(configPath, { recursive: true });
    }
    await writeTextFile(`${configPath}config.json`, '');
    this.save().then(this.load);
  }
}
