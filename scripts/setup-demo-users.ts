/**
 * Quick setup script to create demo users
 * Run: npx tsx scripts/setup-demo-users.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), ".env.local") });

// Create Supabase client with loaded environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Error: Missing Supabase credentials in .env.local");
  console.error("Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDemoUsers() {
  console.log("🚀 Setting up demo users in Supabase...\n");

  // Hash passwords
  const adminHash = await bcrypt.hash("medixor123", 10);
  const viewerHash = await bcrypt.hash("demo123", 10);
  const pharmaoneHash = await bcrypt.hash("PharmaOne@2026", 10);
  const medreliefHash = await bcrypt.hash("MedRelief@2026", 10);

  const users = [
    // Demo tenant
    {
      id: "usr-1",
      tenantId: "demo",
      name: "Admin User",
      email: "admin@medixor.com",
      passwordHash: adminHash,
      role: "admin",
      createdAt: new Date().toISOString(),
    },
    {
      id: "usr-2",
      tenantId: "demo",
      name: "Demo User",
      email: "demo@medixor.com",
      passwordHash: viewerHash,
      role: "viewer",
      createdAt: new Date().toISOString(),
    },
    // PharmaOne tenant (if it exists)
    {
      id: "usr-pharmaone",
      tenantId: "pharmaone",
      name: "PharmaOne Admin",
      email: "admin@pharmaone.com",
      passwordHash: pharmaoneHash,
      role: "admin",
      createdAt: new Date().toISOString(),
    },
    // MedRelief tenant (if it exists)
    {
      id: "usr-medrelief",
      tenantId: "medrelief",
      name: "MedRelief Admin",
      email: "admin@medrelief.com",
      passwordHash: medreliefHash,
      role: "admin",
      createdAt: new Date().toISOString(),
    },
  ];

  for (const user of users) {
    console.log(`Checking user: ${user.email} (${user.tenantId})...`);

    // Check if user exists
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", user.email)
      .single();

    if (existing) {
      console.log(`✓ User already exists: ${user.email}`);
      continue;
    }

    // Insert user
    const { error } = await supabase.from("users").insert(user);

    if (error) {
      console.error(`✗ Failed to create ${user.email}:`, error.message);
    } else {
      console.log(`✓ Created user: ${user.email}`);
    }
  }

  console.log("\n✅ Demo users setup complete!");
  console.log("\nAvailable credentials:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📧 admin@medixor.com  │ 🔑 medixor123");
  console.log("📧 demo@medixor.com   │ 🔑 demo123");
  console.log("📧 admin@pharmaone.com│ 🔑 PharmaOne@2026");
  console.log("📧 admin@medrelief.com│ 🔑 MedRelief@2026");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

setupDemoUsers().catch((error) => {
  console.error("Failed to setup demo users:", error);
  process.exit(1);
});
