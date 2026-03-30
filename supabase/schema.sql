-- Medixor — Supabase Schema
-- Run this in your Supabase project: Dashboard → SQL Editor → New query
--
-- Column names are camelCase to match TypeScript types directly.
-- Enable RLS on each table and add tenant-level policies as needed.

-- ─── suppliers ────────────────────────────────────────────────────────────────
create table if not exists suppliers (
  id            text primary key,
  "tenantId"    text not null,
  name          text not null,
  phone         text,
  email         text,
  "createdAt"   timestamptz not null default now()
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
  "createdAt"              timestamptz not null default now()
);
create index if not exists invoices_tenantId_idx on invoices ("tenantId");
create index if not exists invoices_customerId_idx on invoices ("customerId");

-- ─── supplier_bills ───────────────────────────────────────────────────────────
create table if not exists supplier_bills (
  id               text primary key,
  "tenantId"       text not null,
  "supplierId"     text,
  "supplierName"   text not null,
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

-- ─── Row Level Security (recommended) ─────────────────────────────────────────
-- Enable RLS and add policies per your auth strategy, e.g.:
--
-- alter table suppliers    enable row level security;
-- alter table batches      enable row level security;
-- alter table customers    enable row level security;
-- alter table invoices     enable row level security;
-- alter table supplier_bills enable row level security;
-- alter table payments     enable row level security;
