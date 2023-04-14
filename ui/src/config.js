'use strict';

const { writeTextFile, readTextFile, createDir } = window.__TAURI__.fs;
const { appConfigDir } = window.__TAURI__.path;

export default class Config {
  async save() {
    const configPath = await appConfigDir();
    var configObject = {
      selectedFile: leto.directory.activeFile,
      selectedDirectory: leto.directory.activeDirectory,
      currentTheme: leto.windowManager.currentTheme,
      currentFont: leto.windowManager.currentFont,
      fontSize: leto.windowManager.fontSize,
      fontWeight: leto.windowManager.fontWeight,
    };
    await writeTextFile(
      `${configPath}config.json`,
      JSON.stringify(configObject)
    );
  }

  async load() {
    const configPath = await appConfigDir();
    if (!(await leto.directory.pathExists(`${configPath}config.json`))) {
      if (!(await leto.directory.pathExists(configPath))) {
        await createDir(configPath, { recursive: true });
      }
      await writeTextFile(`${configPath}config.json`, ``);
      leto.windowManager.currentTheme = 0;
      leto.windowManager.applyTheme();
      leto.windowManager.currentFont = 0;
      leto.windowManager.tempWindow.applyFont();
      leto.windowManager.fontWeight = 300;
      leto.windowManager.applyFontSize();
      return;
    }
    var config = await readTextFile(`${configPath}config.json`);
    var configObject = JSON.parse(config);
    leto.windowManager.currentTheme = configObject.currentTheme;
    leto.windowManager.applyTheme();
    leto.windowManager.currentFont = configObject.currentFont;
    leto.windowManager.applyFont();
    leto.directory.setActiveFile(configObject.selectedFile);
    leto.directory.setActiveDirectory(configObject.selectedDirectory);
    leto.windowManager.fontSize = configObject.fontSize;
    leto.windowManager.applyFontSize();
    leto.windowManager.fontWeight = configObject.fontWeight;
    leto.windowManager.applyFontWeight();

    leto.windowManager.populateFonts();
    leto.windowManager.populateThemes();
  }
}
