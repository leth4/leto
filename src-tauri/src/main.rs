#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use tauri::Manager;
use std::fs;
use std::path::Path;
use std::path::PathBuf;
use window_shadows::set_shadow;
use window_vibrancy::{apply_blur, clear_blur};

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![move_to, rename, is_dir, apply_shadow, add_blur, remove_blur])
    .setup(|app| {
      let window = app.get_window("main").unwrap();
      set_shadow(&window, true).expect("Unsupported platform!");
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[tauri::command]
fn apply_shadow<R: tauri::Runtime>(app: tauri::AppHandle<R>, label: &str) {
	let window = app.get_window(label).unwrap();
	set_shadow(&window, true).unwrap();
}

#[tauri::command]
fn add_blur<R: tauri::Runtime>(app: tauri::AppHandle<R>, label: &str) {
	let window = app.get_window(label).unwrap();
  apply_blur(&window, Some((18, 18, 18, 125))).expect("Unsupported platform!");
}

#[tauri::command]
fn remove_blur<R: tauri::Runtime>(app: tauri::AppHandle<R>, label: &str) {
  let window = app.get_window(label).unwrap();
  clear_blur(&window).expect("Unsupported platform!");
}

#[tauri::command]
fn rename(old_path : &str, new_path : &str) {
  _ = fs::rename(old_path, new_path);
}

#[tauri::command]
fn is_dir(path: &str) -> bool {
  Path::new(path).is_dir()
}

#[tauri::command]
fn move_to(old_path : &str, new_path : &str) {
  let src = Path::new(old_path);
  let dst = Path::new(new_path);
  if src.is_dir() {
    move_dir_recursive(src, dst).map_err(|err| println!("{:?}", err)).ok();
  } else {
    let path_buf = PathBuf::from(dst);
    let folder = path_buf.parent().unwrap();
    fs::create_dir_all(folder).expect("");
    fs::rename(&src, &dst).expect("");
  }
}

fn move_dir_recursive(src: &Path, dst: &Path) -> std::io::Result<()> {
  if src.is_dir() {
    fs::create_dir_all(dst)?;

    for entry in src.read_dir()? {
      let entry = entry?;
      let src_path = entry.path();
      let dst_path = dst.join(entry.file_name());
      if src_path.is_dir() {
        move_dir_recursive(&src_path, &dst_path)?;
      } else {
        fs::rename(&src_path, &dst_path)?;
      }
    }
  } else {
    fs::rename(src, dst)?;
  }

  fs::remove_dir_all(src)?;
  Ok(())
}