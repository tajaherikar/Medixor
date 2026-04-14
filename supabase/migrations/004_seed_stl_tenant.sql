-- Migration: Seed Star Trade Link (STL) tenant with admin user
-- Date: 2026-04-14
-- Description: 
--   Creates initial admin user for Star Trade Link business
--   Email: admin@stl.com
--   Password: stl123 (bcrypt hash)

-- Insert STL admin user
-- Using bcrypt hash of "stl123": $2a$10$hZiYvn1x6.7pKhYvZ5s0K.LYwlqzSGQe8Rz8L5K8vN9Q2K8M8a4pW
INSERT INTO users (id, tenantId, name, email, passwordHash, role, permissions, createdAt)
VALUES (
  'usr-' || floor(extract(epoch from now()) * 1000)::text,
  'stl',
  'Admin User',
  'admin@stl.com',
  '$2a$10$hZiYvn1x6.7pKhYvZ5s0K.LYwlqzSGQe8Rz8L5K8vN9Q2K8M8a4pW',
  'admin',
  '["billing", "inventory", "dashboard", "suppliers", "customers", "doctors", "payments", "reports"]'::jsonb,
  now()
)
ON CONFLICT (email) DO NOTHING;

-- If you need to verify the user was created:
-- SELECT id, tenantId, name, email, role, permissions FROM users WHERE email = 'admin@stl.com';
