# Build Troubleshooting Guide

## Common Build Issues

### 1. **"Failed to collect page data for /api/..." errors**

**Cause:** Next.js is trying to pre-render dynamic API routes that can't be pre-rendered during build.

**Solution:** Add `export const dynamic = 'force-dynamic';` at the top of the route file (after imports).

Example:
```typescript
import { NextRequest, NextResponse } from "next/server";
import * as db from "@/lib/db";

export const dynamic = 'force-dynamic';  // ← Add this

export async function GET(req: NextRequest) {
  // ...
}
```

**Files Already Fixed:**
- ✅ All `/api/[tenant]/*` routes (16 files)
- ✅ `/api/auth/login`
- ✅ `/api/health`

---

### 2. **"the name `dynamic` is defined multiple times" error**

**Cause:** The `export const dynamic` line was added multiple times to the same file.

**Solution:** Remove duplicate lines. There should be only ONE `export const dynamic` per file.

---

### 3. **Build fails but no clear error message**

**Cause:** Turbopack (Next.js compiler) cache corruption.

**Solution:** Clean the build cache and rebuild:

```bash
npm run clean-build
# Or manually:
rm -rf .next && npm run build
```

---

### 4. **Successful local build but GitHub Actions fails**

**Cause:**
- Different Node.js version (fixed: updated to Node 20)
- Missing system dependencies on Linux (fixed: added libsoup-3.0-dev, xdg-utils)
- Platform-specific bundle target issues (fixed: use Node.js to update JSON)

**Solution:**
1. Always test locally first: `npm run build`
2. If it fails locally, the fix is your responsibility
3. If it passes locally but fails in GitHub Actions, it's usually a system dependency issue

---

## Building for Production

### Test Locally First (Recommended)

```bash
# 1. Clean build (if having issues)
npm run clean-build

# 2. Dev mode test
npm run tauri:dev

# 3. Production build test
npm run build

# 4. If tests pass, commit and push
git add -A
git commit -m "your message"
git push origin main
```

### GitHub Actions Builds

Automatically triggers on every push to `main`:
- Windows builds: Creates `.msi` + `.exe`
- macOS builds: Creates `.dmg`
- Linux builds: Creates `.deb`

**Always test locally first to catch errors before GitHub Actions!**

---

## Available Commands

```bash
# Development
npm run dev              # Next.js dev server only
npm run tauri:dev       # Full desktop app with dev server

# Production Builds
npm run build           # Next.js production build
npm run clean-build     # Clean cache and rebuild
npm run tauri:build     # Full desktop app build (all platforms)

# Cleanup
npm run clean           # Remove .next, out, build caches
```

---

## Fix Checklist for New API Routes

If you add new API routes, ensure they have:

```typescript
import { NextRequest, NextResponse } from "next/server";

// ✅ REQUIRED for dynamic routes
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Your handler
}
```

**When to use `force-dynamic`:**
- ✅ All routes under `/api/[tenant]/*`
- ✅ Routes that access the database
- ✅ Routes that access environment variables
- ✅ Routes that can't be pre-rendered

**When NOT to use `force-dynamic`:**
- ❌ Static routes like `/sitemap.xml`
- ❌ Routes that return the same data for every request (use `revalidate`)

---

## Prevention

1. **Always test locally first** - Run `npm run build` before pushing
2. **Use clean build if confused** - `npm run clean-build` clears cache issues
3. **Check GitHub Actions** - See build logs if it fails: https://github.com/tajaherikar/Medixor/actions
4. **Keep dependencies updated** - Run `npm install` if you see version warnings

---

## Need Help?

If builds are failing:

1. Run `npm run clean-build` (clears cache)
2. Check the error message carefully
3. Look at similar files that work
4. Check GitHub build logs for platform-specific issues
5. If GitHub Actions fails but local build works, it's likely a system dependency issue

