// Tauri Backend - Main entry point
#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use std::sync::Mutex;

mod db;
mod sync_engine;

use db::Database;

pub struct AppState {
  db: Mutex<Option<Database>>,
}

#[tauri::command]
async fn init_db() -> Result<String, String> {
  let _db = Database::new().map_err(|e| e.to_string())?;
  Ok("Database initialized".to_string())
}

#[tauri::command]
async fn sync_with_server(
  changes: String,
) -> Result<String, String> {
  // This will be called from frontend to sync changes
  sync_engine::process_sync(changes).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_local_data(
  table: String,
) -> Result<String, String> {
  // Fetch data from local SQLite
  db::get_table_data(&table).map_err(|e| e.to_string())
}

#[tauri::command]
async fn save_local_data(
  table: String,
  data: String,
  operation: String,
) -> Result<String, String> {
  db::save_data(&table, &data, &operation).map_err(|e| e.to_string())
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      init_db,
      get_local_data,
      save_local_data,
      sync_with_server,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
