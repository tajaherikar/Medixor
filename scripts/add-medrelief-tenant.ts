/**
 * scripts/add-medrelief-tenant.ts
 * --------------------------------
 * Adds a new premium tenant: MedRelief Pharmacy
 * Run with: npx tsx scripts/add-medrelief-tenant.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function addMedReliefTenant() {
  console.log("🏥 Adding MedRelief Pharmacy tenant...\n");

  // Tenant details
  const tenantId = "medrelief";
  const tenantName = "MedRelief Pharmacy";
  
  // User credentials — loaded from env vars so no secrets are committed to VCS.
  // Set MEDRELIEF_ADMIN_USERNAME and MEDRELIEF_ADMIN_PASSWORD in .env.local
  const username = process.env.MEDRELIEF_ADMIN_USERNAME;
  const password = process.env.MEDRELIEF_ADMIN_PASSWORD;

  if (!username || !password) {
    console.error("❌ MEDRELIEF_ADMIN_USERNAME and MEDRELIEF_ADMIN_PASSWORD must be set in .env.local");
    process.exit(1);
  }
  
  // Hash the password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create admin user
  const newUser = {
    id: `usr-medrelief-${Date.now()}`,
    tenantId: tenantId,
    name: `${tenantName} Admin`,
    email: username,
    passwordHash: passwordHash,
    role: "admin",
    createdAt: new Date().toISOString(),
  };

  // Create default business settings
  const defaultSettings = {
    tenantId: tenantId,
    businessName: tenantName,
    address: "",
    phone: "",
    email: username,
    gstin: "",
    accentHue: 220,
  };

  try {
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("email", username)
      .single();

    if (existingUser) {
      console.log("⚠️  User already exists:", username);
      console.log("   Please use a different username or delete the existing user first.\n");
      return;
    }

    // Insert user
    const { error: userError } = await supabase
      .from("users")
      .insert(newUser);

    if (userError) {
      console.error("❌ Error creating user:", userError);
      return;
    }

    // Insert settings
    const { error: settingsError } = await supabase
      .from("settings")
      .insert(defaultSettings);

    if (settingsError) {
      console.error("⚠️  Error creating settings (may already exist):", settingsError);
    }

    console.log("✅ Successfully created MedRelief Pharmacy tenant!\n");
    console.log("📋 Tenant Details:");
    console.log("   Tenant ID:  ", tenantId);
    console.log("   Tenant Name:", tenantName);
    console.log("\n🔐 Login Credentials:");
    console.log("   Username:   ", username);
    console.log("   Password:   ", password);
    console.log("\n🌐 Login URL:");
    console.log("   https://medixor.vercel.app/login");
    console.log("   OR");
    console.log("   http://localhost:3000/login");
    console.log("\n⚠️  IMPORTANT: Save these credentials securely!");
    console.log("   This is a PREMIUM tenant with full access.\n");

  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
}

addMedReliefTenant().catch(console.error);
