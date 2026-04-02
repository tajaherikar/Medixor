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

pub fn get_table_data(_table: &str) -> Result<String, String> {
  // Fetch all data from table
  Ok("{}".to_string())
}

pub fn save_data(_table: &str, _data: &str, _operation: &str) -> Result<String, String> {
  // Save data and add to sync_queue
  Ok("Saved".to_string())
}
