#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use std::fs::metadata;
use std::time::SystemTime;

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![get_edit_time])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[tauri::command]
fn get_edit_time(path : &str) -> i32 {
    let metadata = metadata(path).expect("Error while trying to get metadata");
    let time_modified = metadata.modified().expect("Error while parcing metadata");
    let since_the_epoch = time_modified.duration_since(SystemTime::UNIX_EPOCH).expect("Error while parsing duration");
    since_the_epoch.as_secs() as i32
}