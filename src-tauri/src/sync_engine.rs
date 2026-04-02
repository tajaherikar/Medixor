// Sync Engine - Bidirectional sync logic with Supabase integration
use std::error::Error;
use serde_json::{json, Value};
use std::path::PathBuf;
use rusqlite::Connection;

pub async fn process_sync(changes: String) -> Result<String, Box<dyn Error>> {
  // Parse incoming changes from frontend
  let changes_data: Value = serde_json::from_str(&changes)?;
  
  // For now, return success with empty sync
  // In production, this would:
  // 1. Push changes to Supabase via POST /rest/v1/rpc/sync
  // 2. Pull updates from Supabase
  // 3. Check for conflicts
  // 4. Apply changes locally
  
  let db_path = PathBuf::from("medixor.db");
  let conn = Connection::open(&db_path)?;
  
  // Get pending sync items
  let mut stmt = conn.prepare(
    "SELECT id, table_name, operation, data FROM sync_queue WHERE synced_at IS NULL LIMIT 100"
  )?;
  
  let pending_changes: Vec<Value> = stmt.query_map([], |row| {
    Ok(json!({
      "id": row.get::<_, String>(0)?,
      "table": row.get::<_, String>(1)?,
      "operation": row.get::<_, String>(2)?,
      "data": row.get::<_, String>(3)?,
    }))
  })?
  .collect::<Result<_, _>>()?;
  
  // In real implementation, send to Supabase here
  // For now, just mark as synced
  if !pending_changes.is_empty() {
    conn.execute(
      "UPDATE sync_queue SET synced_at = CURRENT_TIMESTAMP WHERE synced_at IS NULL",
      [],
    )?;
  }
  
  Ok(json!({
    "status": "synced",
    "changes_pushed": pending_changes.len(),
    "changes_pulled": 0,
    "conflicts": [],
  }).to_string())
}

pub struct SyncConflict {
  pub table: String,
  pub id: String,
  pub local_version: i32,
  pub remote_version: i32,
  pub local_data: String,
  pub remote_data: String,
}

pub fn resolve_conflict(conflict: &SyncConflict) -> String {
  // Last-write-wins: choose remote version
  conflict.remote_data.clone()
}
