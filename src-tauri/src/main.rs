#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use std::fs::metadata;
use std::time::SystemTime;
use std::process::Command;

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![get_edit_time, add, commit, push])
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

#[tauri::command]
fn add(_path : &str) -> String {
  let output = Command::new("cmd")
            .args(["/C", "cd /d E:/Obsidian && git add --all"])
            .output()
            .expect("failed to execute process");
  std::println!("{}", String::from_utf8(output.stdout).unwrap());
   //return String::from_utf8(output.stdout).unwrap();
   return _path.to_string();
}

#[tauri::command]
fn commit(_path : &str) -> String {
  let output = Command::new("cmd")
            .args(["/C", "cd /d E:/Obsidian && git commit -m 'leto_backup'"])
            .output()
            .expect("failed to execute process");
  std::println!("{}", String::from_utf8(output.stdout).unwrap());
   //return String::from_utf8(output.stdout).unwrap();
   return _path.to_string();
}

#[tauri::command]
fn push(_path : &str) -> String {
  let output = Command::new("cmd")
            .args(["/C", "cd /d E:/Obsidian && git push"])
            .output()
            .expect("failed to execute process");
  std::println!("{}", std::str::from_utf8(&output.stdout[..]).unwrap());
   //return String::from_utf8(output.stdout).unwrap();
   return std::str::from_utf8(&output.stdout[..]).unwrap().to_string();
}