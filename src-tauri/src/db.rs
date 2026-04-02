// Database module - SQLite operations
use rusqlite::{Connection, Result};
use std::sync::Mutex;
use lazy_static::lazy_static;
use std::path::PathBuf;

lazy_static! {
  static ref DB: Mutex<Option<Connection>> = Mutex::new(None);
}

pub struct Database {
  conn: Connection,
}

impl Database {
  pub fn new() -> Result<Self> {
    // Use local directory for database file
    let db_path = PathBuf::from("medixor.db");

    let conn = Connection::open(&db_path)?;
    Self::init_schema(&conn)?;
    
    Ok(Database { conn })
  }

  fn init_schema(conn: &Connection) -> Result<()> {
    // Create tables if they don't exist
    conn.execute_batch(
      "
      CREATE TABLE IF NOT EXISTS sync_metadata (
        id INTEGER PRIMARY KEY,
        table_name TEXT UNIQUE NOT NULL,
        last_synced_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        table_name TEXT NOT NULL,
        operation TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        synced_at TEXT
      );

      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        gstNumber TEXT,
        licenseNumber TEXT,
        discount TEXT,
        createdAt TEXT NOT NULL,
        synced BOOLEAN DEFAULT 0,
        version INTEGER DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL,
        customerId TEXT,
        customerName TEXT NOT NULL,
        referredBy TEXT,
        lineItems TEXT,
        customerDiscountType TEXT,
        customerDiscountValue NUMERIC,
        subtotal NUMERIC NOT NULL,
        customerDiscountAmount NUMERIC NOT NULL,
        taxableAmount NUMERIC NOT NULL,
        totalGst NUMERIC NOT NULL,
        grandTotal NUMERIC NOT NULL,
        paymentStatus TEXT NOT NULL,
        paidAmount NUMERIC NOT NULL,
        dueDate TEXT,
        createdAt TEXT NOT NULL,
        customerGstNumber TEXT,
        customerLicenseNumber TEXT,
        customerAddress TEXT,
        synced BOOLEAN DEFAULT 0,
        version INTEGER DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS batches (
        id TEXT PRIMARY KEY,
        tenantId TEXT NOT NULL,
        itemName TEXT NOT NULL,
        batchNumber TEXT NOT NULL,
        supplierId TEXT,
        supplierName TEXT NOT NULL,
        invoiceNumber TEXT NOT NULL,
        expiryDate TEXT NOT NULL,
        mrp NUMERIC NOT NULL,
        purchasePrice NUMERIC NOT NULL,
        availableQty INTEGER NOT NULL,
        originalQty INTEGER NOT NULL,
        status TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        synced BOOLEAN DEFAULT 0,
        version INTEGER DEFAULT 1
      );

      CREATE INDEX IF NOT EXISTS idx_sync_queue_table ON sync_queue(table_name);
      CREATE INDEX IF NOT EXISTS idx_sync_queue_synced ON sync_queue(synced_at);
      CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenantId);
      CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenantId);
      CREATE INDEX IF NOT EXISTS idx_batches_tenant ON batches(tenantId);
      "
    )?;

    Ok(())
  }
}

pub fn get_table_data(table: &str) -> Result<String, String> {
  // Fetch all data from table as JSON array
  let db_path = PathBuf::from("medixor.db");
  let conn = Connection::open(&db_path)
    .map_err(|e| format!("Failed to open database: {}", e))?;

  let query = match table {
    "customers" => "SELECT id, tenantId, name, phone, email, address, gstNumber, licenseNumber, discount, createdAt, version FROM customers ORDER BY createdAt DESC",
    "invoices" => "SELECT id, tenantId, customerId, customerName, referredBy, lineItems, customerDiscountType, customerDiscountValue, subtotal, customerDiscountAmount, taxableAmount, totalGst, grandTotal, paymentStatus, paidAmount, dueDate, createdAt, version FROM invoices ORDER BY createdAt DESC",
    "batches" => "SELECT id, tenantId, itemName, batchNumber, supplierId, supplierName, invoiceNumber, expiryDate, mrp, purchasePrice, availableQty, originalQty, status, createdAt, version FROM batches ORDER BY expiryDate ASC",
    _ => return Err(format!("Unknown table: {}", table)),
  };

  let mut stmt = conn.prepare(query)
    .map_err(|e| format!("Failed to prepare statement: {}", e))?;

  let rows = stmt.query_map([], |row| {
    let mut obj = serde_json::json!({});
    
    match table {
      "customers" => {
        obj = serde_json::json!({
          "id": row.get::<_, String>(0)?,
          "tenantId": row.get::<_, String>(1)?,
          "name": row.get::<_, String>(2)?,
          "phone": row.get::<_, Option<String>>(3)?,
          "email": row.get::<_, Option<String>>(4)?,
          "address": row.get::<_, Option<String>>(5)?,
          "gstNumber": row.get::<_, Option<String>>(6)?,
          "licenseNumber": row.get::<_, Option<String>>(7)?,
          "discount": row.get::<_, Option<String>>(8)?,
          "createdAt": row.get::<_, String>(9)?,
          "version": row.get::<_, i32>(10)?,
        });
      }
      "invoices" => {
        obj = serde_json::json!({
          "id": row.get::<_, String>(0)?,
          "tenantId": row.get::<_, String>(1)?,
          "customerId": row.get::<_, Option<String>>(2)?,
          "customerName": row.get::<_, String>(3)?,
          "referredBy": row.get::<_, Option<String>>(4)?,
          "lineItems": row.get::<_, String>(5)?,
          "customerDiscountType": row.get::<_, Option<String>>(6)?,
          "customerDiscountValue": row.get::<_, Option<f64>>(7)?,
          "subtotal": row.get::<_, f64>(8)?,
          "customerDiscountAmount": row.get::<_, f64>(9)?,
          "taxableAmount": row.get::<_, f64>(10)?,
          "totalGst": row.get::<_, f64>(11)?,
          "grandTotal": row.get::<_, f64>(12)?,
          "paymentStatus": row.get::<_, String>(13)?,
          "paidAmount": row.get::<_, f64>(14)?,
          "dueDate": row.get::<_, Option<String>>(15)?,
          "createdAt": row.get::<_, String>(16)?,
          "version": row.get::<_, i32>(17)?,
        });
      }
      "batches" => {
        obj = serde_json::json!({
          "id": row.get::<_, String>(0)?,
          "tenantId": row.get::<_, String>(1)?,
          "itemName": row.get::<_, String>(2)?,
          "batchNumber": row.get::<_, String>(3)?,
          "supplierId": row.get::<_, Option<String>>(4)?,
          "supplierName": row.get::<_, String>(5)?,
          "invoiceNumber": row.get::<_, String>(6)?,
          "expiryDate": row.get::<_, String>(7)?,
          "mrp": row.get::<_, f64>(8)?,
          "purchasePrice": row.get::<_, f64>(9)?,
          "availableQty": row.get::<_, i32>(10)?,
          "originalQty": row.get::<_, i32>(11)?,
          "status": row.get::<_, String>(12)?,
          "createdAt": row.get::<_, String>(13)?,
          "version": row.get::<_, i32>(14)?,
        });
      }
      _ => {}
    }
    
    Ok(obj)
  })
  .map_err(|e| format!("Failed to query: {}", e))?;

  let mut items = vec![];
  for row_result in rows {
    items.push(row_result.map_err(|e| format!("Row error: {}", e))?);
  }

  serde_json::to_string(&items)
    .map_err(|e| format!("Failed to serialize: {}", e))
}

pub fn save_data(table: &str, data: &str, operation: &str) -> Result<String, String> {
  // Parse JSON data
  let json_data: serde_json::Value = serde_json::from_str(data)
    .map_err(|e| format!("Invalid JSON: {}", e))?;

  let db_path = PathBuf::from("medixor.db");
  let conn = Connection::open(&db_path)
    .map_err(|e| format!("Failed to open database: {}", e))?;

  let id = json_data.get("id")
    .and_then(|v| v.as_str())
    .ok_or_else(|| "Missing id field".to_string())?;

  // Execute operation
  match (table, operation) {
    ("customers", "insert") | ("customers", "update") => {
      let tenant_id = json_data.get("tenantId").and_then(|v| v.as_str()).unwrap_or("");
      let name = json_data.get("name").and_then(|v| v.as_str()).unwrap_or("");
      let phone = json_data.get("phone").and_then(|v| v.as_str());
      let email = json_data.get("email").and_then(|v| v.as_str());
      let address = json_data.get("address").and_then(|v| v.as_str());
      let created_at = json_data.get("createdAt").and_then(|v| v.as_str()).unwrap_or("CURRENT_TIMESTAMP");

      conn.execute(
        "INSERT OR REPLACE INTO customers (id, tenantId, name, phone, email, address, createdAt, version)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1)",
        rusqlite::params![id, tenant_id, name, phone, email, address, created_at],
      ).map_err(|e| format!("Failed to insert customer: {}", e))?;
    }
    ("customers", "delete") => {
      conn.execute("DELETE FROM customers WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| format!("Failed to delete customer: {}", e))?;
    }
    ("invoices", "insert") | ("invoices", "update") => {
      let tenant_id = json_data.get("tenantId").and_then(|v| v.as_str()).unwrap_or("");
      let customer_name = json_data.get("customerName").and_then(|v| v.as_str()).unwrap_or("");
      let line_items = json_data.get("lineItems").map(|v| v.to_string()).unwrap_or_else(|| "[]".to_string());
      let subtotal: f64 = json_data.get("subtotal").and_then(|v| v.as_f64()).unwrap_or(0.0);
      let grand_total: f64 = json_data.get("grandTotal").and_then(|v| v.as_f64()).unwrap_or(0.0);
      let payment_status = json_data.get("paymentStatus").and_then(|v| v.as_str()).unwrap_or("pending");
      let created_at = json_data.get("createdAt").and_then(|v| v.as_str()).unwrap_or("CURRENT_TIMESTAMP");

      conn.execute(
        "INSERT OR REPLACE INTO invoices (id, tenantId, customerName, lineItems, subtotal, grandTotal, paymentStatus, createdAt, version)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 1)",
        rusqlite::params![id, tenant_id, customer_name, line_items, subtotal, grand_total, payment_status, created_at],
      ).map_err(|e| format!("Failed to insert invoice: {}", e))?;
    }
    ("invoices", "delete") => {
      conn.execute("DELETE FROM invoices WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| format!("Failed to delete invoice: {}", e))?;
    }
    ("batches", "insert") | ("batches", "update") => {
      let tenant_id = json_data.get("tenantId").and_then(|v| v.as_str()).unwrap_or("");
      let item_name = json_data.get("itemName").and_then(|v| v.as_str()).unwrap_or("");
      let batch_number = json_data.get("batchNumber").and_then(|v| v.as_str()).unwrap_or("");
      let supplier_name = json_data.get("supplierName").and_then(|v| v.as_str()).unwrap_or("");
      let expiry_date = json_data.get("expiryDate").and_then(|v| v.as_str()).unwrap_or("");
      let mrp: f64 = json_data.get("mrp").and_then(|v| v.as_f64()).unwrap_or(0.0);
      let purchase_price: f64 = json_data.get("purchasePrice").and_then(|v| v.as_f64()).unwrap_or(0.0);
      let available_qty: i32 = json_data.get("availableQty").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
      let original_qty: i32 = json_data.get("originalQty").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
      let status = json_data.get("status").and_then(|v| v.as_str()).unwrap_or("active");
      let created_at = json_data.get("createdAt").and_then(|v| v.as_str()).unwrap_or("CURRENT_TIMESTAMP");

      conn.execute(
        "INSERT OR REPLACE INTO batches (id, tenantId, itemName, batchNumber, supplierName, expiryDate, mrp, purchasePrice, availableQty, originalQty, status, createdAt, version)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, 1)",
        rusqlite::params![id, tenant_id, item_name, batch_number, supplier_name, expiry_date, mrp, purchase_price, available_qty, original_qty, status, created_at],
      ).map_err(|e| format!("Failed to insert batch: {}", e))?;
    }
    ("batches", "delete") => {
      conn.execute("DELETE FROM batches WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| format!("Failed to delete batch: {}", e))?;
    }
    _ => return Err(format!("Unsupported operation: {} on {}", operation, table)),
  }

  // Add to sync_queue for syncing
  let sync_id = format!("{}-{}", id, chrono::Local::now().timestamp());
  conn.execute(
    "INSERT INTO sync_queue (id, table_name, operation, data, created_at) VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP)",
    rusqlite::params![sync_id, table, operation, data],
  ).map_err(|e| format!("Failed to queue sync: {}", e))?;

  Ok(format!("Successfully saved to {}", table))
}
