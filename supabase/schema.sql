-- Medixor — Supabase Schema
-- Run this in your Supabase project: Dashboard → SQL Editor → New query
--
-- Column names are camelCase to match TypeScript types directly.
-- Enable RLS on each table and add tenant-level policies as needed.

-- ─── suppliers ────────────────────────────────────────────────────────────────
create table if not exists suppliers (
  id              text primary key,
  "tenantId"      text not null,
  name            text not null,
  phone           text,
  email           text,
  address         text,
  "gstNumber"     text,
  "licenseNumber" text,
  "createdAt"     timestamptz not null default now()
);
create index if not exists suppliers_tenantId_idx on suppliers ("tenantId");

-- ─── batches ──────────────────────────────────────────────────────────────────
create table if not exists batches (
  id               text primary key,
  "tenantId"       text not null,
  "itemName"       text not null,
  "batchNumber"    text not null,
  "supplierId"     text,
  "supplierName"   text not null,
  "invoiceNumber"  text not null,
  "expiryDate"     text not null,
  mrp              numeric not null,
  "purchasePrice"  numeric not null,
  "availableQty"   integer not null,
  "originalQty"    integer not null,
  status           text not null,
  "createdAt"      timestamptz not null default now()
);
create index if not exists batches_tenantId_idx on batches ("tenantId");
create index if not exists batches_itemName_idx on batches ("itemName");

-- ─── customers ────────────────────────────────────────────────────────────────
create table if not exists customers (
  id           text primary key,
  "tenantId"   text not null,
  name         text not null,
  phone        text,
  email        text,
  address      text,
  "gstNumber"     text,
  "licenseNumber" text,
  discount     jsonb,
  "createdAt"  timestamptz not null default now()
);
create index if not exists customers_tenantId_idx on customers ("tenantId");

-- ─── invoices ─────────────────────────────────────────────────────────────────
create table if not exists invoices (
  id                       text primary key,
  "tenantId"               text not null,
  "customerId"             text,
  "customerName"           text not null,
  "referredBy"             text,
  "lineItems"              jsonb not null default '[]',
  "customerDiscountType"   text,
  "customerDiscountValue"  numeric,
  subtotal                 numeric not null,
  "customerDiscountAmount" numeric not null,
  "taxableAmount"          numeric not null,
  "totalGst"               numeric not null,
  "grandTotal"             numeric not null,
  "paymentStatus"          text not null,
  "paidAmount"             numeric not null,
  "dueDate"                text,
  "createdAt"              timestamptz not null default now(),
  "customerGstNumber"      text,
  "customerLicenseNumber"  text,
  "customerAddress"        text
);
create index if not exists invoices_tenantId_idx on invoices ("tenantId");
create index if not exists invoices_customerId_idx on invoices ("customerId");

-- ─── supplier_bills ───────────────────────────────────────────────────────────
create table if not exists supplier_bills (
  id               text primary key,
  "tenantId"       text not null,
  "supplierId"     text,
  "supplierName"   text not null,
  "supplierGstNumber"     text,
  "supplierLicenseNumber" text,
  "invoiceNumber"  text not null,
  date             text not null,
  items            jsonb not null default '[]',
  "taxableAmount"  numeric not null,
  "totalGst"       numeric not null,
  "grandTotal"     numeric not null,
  "paymentStatus"  text not null,
  "paidAmount"     numeric not null,
  "dueDate"        text,
  "createdAt"      timestamptz not null default now()
);
create index if not exists supplier_bills_tenantId_idx on supplier_bills ("tenantId");

-- ─── payments ─────────────────────────────────────────────────────────────────
create table if not exists payments (
  id           text primary key,
  "tenantId"   text not null,
  "partyId"    text not null,
  "partyType"  text not null,
  "invoiceId"  text not null,
  amount       numeric not null,
  date         text not null,
  mode         text not null,
  reference    text,
  "createdAt"  timestamptz not null default now()
);
create index if not exists payments_tenantId_idx on payments ("tenantId");
create index if not exists payments_partyId_idx  on payments ("partyId");

-- ─── doctors ──────────────────────────────────────────────────────────────────
create table if not exists doctors (
  id              text primary key,
  "tenantId"      text not null,
  name            text not null,
  type            text not null default 'doctor',  -- doctor | lab | consultant
  phone           text,
  "targetAmount"  numeric not null default 0,
  "createdAt"     timestamptz not null default now()
);
create index if not exists doctors_tenantId_idx on doctors ("tenantId");

-- Migration: add referredById to existing invoices table (safe to re-run)
alter table invoices add column if not exists "referredBy" text;
alter table invoices add column if not exists "referredById" text;
create index if not exists invoices_referredById_idx on invoices ("referredById");

-- Migration: add customer meta columns to invoices (safe to re-run)
alter table invoices add column if not exists "customerGstNumber" text;
alter table invoices add column if not exists "customerLicenseNumber" text;
alter table invoices add column if not exists "customerAddress" text;

-- Migration: add address/gst/license to suppliers and customers (safe to re-run)
alter table suppliers add column if not exists address text;
alter table suppliers add column if not exists "gstNumber" text;
alter table suppliers add column if not exists "licenseNumber" text;
alter table customers add column if not exists address text;
alter table customers add column if not exists "gstNumber" text;
alter table customers add column if not exists "licenseNumber" text;

-- ─── users ──────────────────────────────────────────────────────────────────────
create table if not exists users (
  id               text primary key,
  "tenantId"       text not null,
  name             text not null,
  email            text not null,
  "passwordHash"   text not null,
  role             text not null default 'viewer',
  "createdAt"      timestamptz not null default now()
);
create unique index if not exists users_email_tenant_idx on users (email, "tenantId");
create index if not exists users_tenantId_idx on users ("tenantId");

-- ─── tenant_settings ──────────────────────────────────────────────────────────
-- One row per tenant. Upsert on save. logoBase64 stored as text (data URI).
create table if not exists tenant_settings (
  "tenantId"           text primary key,
  "businessName"       text not null default '',
  "logoBase64"         text,
  gstin                text not null default '',
  address              text not null default '',
  phone                text not null default '',
  "accentHue"          numeric not null default 196,
  "invoicePrefix"      text not null default 'INV-',
  "invoiceFooter"      text not null default 'Thank you for your business.',
  "showReferenceField" boolean not null default false,
  "lowStockThreshold"  integer not null default 20,
  "updatedAt"          timestamptz not null default now()
);

-- Migration: add lowStockThreshold to existing tenant_settings rows (safe to re-run)
alter table tenant_settings add column if not exists "lowStockThreshold" integer not null default 20;
alter table tenant_settings add column if not exists "showReferenceField" boolean not null default false;

-- ─── Unit Type (pharmaceutical dosage form) ───────────────────────────────────
alter table batches add column if not exists "unitType" text;
alter table batches add column if not exists "packSize" integer;

-- ─── Row Level Security (recommended) ─────────────────────────────────────────
-- Enable RLS and add policies per your auth strategy, e.g.:
--
-- alter table suppliers    enable row level security;
-- alter table batches      enable row level security;
-- alter table customers    enable row level security;
-- alter table invoices     enable row level security;
-- alter table supplier_bills enable row level security;
-- alter table payments     enable row level security;
