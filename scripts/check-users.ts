/**
 * Check if users exist in database
 * Run: npx tsx scripts/check-users.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
  console.log("🔍 Checking users in Supabase...\n");

  const { data: users, error } = await supabase
    .from("users")
    .select("id, email, tenantId, role")
    .order("tenantId, email");

  if (error) {
    console.error("❌ Error fetching users:", error.message);
    console.log("\nℹ️  Make sure you've run the RLS policies in Supabase!");
    console.log("   File: supabase/enable-rls.sql");
    return;
  }

  if (!users || users.length === 0) {
    console.log("❌ No users found in database!");
    console.log("\n💡 You need to run the seed script:");
    console.log("   npx tsx scripts/seed.ts\n");
    return;
  }

  console.log(`✅ Found ${users.length} users:\n`);
  console.log("┌────────────────────────────┬──────────────┬─────────┐");
  console.log("│ Email                      │ Tenant       │ Role    │");
  console.log("├────────────────────────────┼──────────────┼─────────┤");
  
  for (const user of users) {
    const email = user.email.padEnd(26);
    const tenant = user.tenantId.padEnd(12);
    const role = user.role.padEnd(7);
    console.log(`│ ${email} │ ${tenant} │ ${role} │`);
  }
  
  console.log("└────────────────────────────┴──────────────┴─────────┘");

  // Try to find demo users
  const demoUsers = users.filter(u => u.tenantId === 'demo');
  
  if (demoUsers.length > 0) {
    console.log("\n✅ Demo users found! Try these credentials:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📧 admin@medixor.com  │ 🔑 medixor123");
    console.log("📧 demo@medixor.com   │ 🔑 demo123");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  } else {
    console.log("\n⚠️  No demo users found. Run seed script:");
    console.log("   npx tsx scripts/seed.ts\n");
  }
}

checkUsers().catch(console.error);
