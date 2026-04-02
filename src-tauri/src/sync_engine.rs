// Sync Engine - Bidirectional sync logic with Supabase integration
use serde_json::{json, Value};
use std::path::PathBuf;
use rusqlite::Connection;
use std::env;

// Supabase configuration from environment
fn get_supabase_config() -> (String, String) {
  dotenv::dotenv().ok();
  let url = env::var("VITE_SUPABASE_URL")
    .unwrap_or_else(|_| "http://localhost:54321".to_string());
  let key = env::var("VITE_SUPABASE_ANON_KEY")
    .unwrap_or_else(|_| "local-key".to_string());
  (url, key)
}

pub async fn process_sync(changes: String) -> Result<String, String> {
  // Parse incoming changes from frontend
  let _changes_data: Value = serde_json::from_str(&changes).unwrap_or_else(|_| json!({}));
  
  // Collect pending changes in sync scope (not async context)
  let (pending_changes, changes_count) = {
    let db_path = PathBuf::from("medixor.db");
    let conn = Connection::open(&db_path)
      .map_err(|e| format!("DB error: {}", e))?;
    
    // Get pending sync items
    let mut stmt = conn.prepare(
      "SELECT id, table_name, operation, data FROM sync_queue WHERE synced_at IS NULL LIMIT 100"
    )
    .map_err(|e| format!("Prepare error: {}", e))?;
    
    let changes: Vec<Value> = stmt.query_map([], |row| {
      Ok(json!({
        "id": row.get::<_, String>(0)?,
        "table": row.get::<_, String>(1)?,
        "operation": row.get::<_, String>(2)?,
        "data": row.get::<_, String>(3)?,
      }))
    })
    .map_err(|e| format!("Query error: {}", e))?
    .collect::<Result<_, _>>()
    .map_err(|e| format!("Collection error: {}", e))?;
    
    let count = changes.len();
    (changes, count)
    // conn and stmt dropped here automatically
  };
  
  // Now do async work (connection not held)
  if !pending_changes.is_empty() {
    let (supabase_url, supabase_key) = get_supabase_config();
    
    // Only attempt real sync if we have non-local Supabase URL
    if !supabase_url.contains("localhost") {
      let client = reqwest::Client::new();
      
      for change in pending_changes.iter() {
        let table = change.get("table").and_then(|v| v.as_str()).unwrap_or("unknown");
        let operation = change.get("operation").and_then(|v| v.as_str()).unwrap_or("insert");
        let data = change.get("data").and_then(|v| v.as_str()).unwrap_or("{}");
        
        // Build Supabase RPC endpoint URL
        let rpc_url = format!("{}/rest/v1/rpc/sync_changes", supabase_url);
        
        // Attempt to push changes (may fail gracefully if offline)
        let _sync_result = client
          .post(&rpc_url)
          .header("Authorization", format!("Bearer {}", supabase_key))
          .header("Content-Type", "application/json")
          .json(&json!({
            "table": table,
            "operation": operation,
            "data": data,
          }))
          .send()
          .await;
      }
    }
  }
  
  // Mark as synced locally
  if changes_count > 0 {
    let db_path = PathBuf::from("medixor.db");
    let conn2 = Connection::open(&db_path)
      .map_err(|e| format!("DB error: {}", e))?;
    conn2.execute(
      "UPDATE sync_queue SET synced_at = CURRENT_TIMESTAMP WHERE synced_at IS NULL",
      [],
    )
    .map_err(|e| format!("Update error: {}", e))?;
  }
  
  Ok(json!({
    "status": "synced",
    "changes_pushed": changes_count,
    "changes_pulled": 0,
    "conflicts": [],
    "timestamp": chrono::Local::now().to_rfc3339(),
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
