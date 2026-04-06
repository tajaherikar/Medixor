# Desktop App Update Strategy

## 📋 Overview

The Medixor desktop app uses a **dual-layer update system** for optimal user experience:

### 1️⃣ **Automatic Web Updates** (Daily Changes)
- 🎯 **What:** All UI, features, bug fixes deployed to Vercel
- ✅ **How:** Users automatically get latest when online
- 🚀 **Speed:** Instant (next page load)
- 💾 **Size:** None (no download)
- 🔄 **Frequency:** As often as you deploy to Vercel

### 2️⃣ **Desktop Wrapper Updates** (Occasional)
- 🎯 **What:** Electron wrapper, offline features, window settings
- ✅ **How:** Auto-updater downloads from GitHub Releases
- 🚀 **Speed:** Background download, installs on next restart
- 💾 **Size:** ~5-10MB delta updates
- 🔄 **Frequency:** Only when wrapper changes (rare)

---

## 🔄 Update Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User Opens Medixor                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────┐
         │  Electron Wrapper       │ ◄─── Auto-checks GitHub Releases
         │  (v1.0.0-beta.1)        │      for wrapper updates
         └─────────────┬───────────┘
                       │
                       │ Loads URL
                       ▼
         ┌─────────────────────────┐
         │  https://medixor.       │ ◄─── Always latest from Vercel
         │  vercel.app/            │      (no manual updates needed)
         └─────────────────────────┘
```

---

## 🎯 When Do Users Need Updates?

### ❌ **NEVER Need Redistribution:**
- New dashboard features
- UI/UX improvements
- New reports or pages
- Database schema changes
- Bug fixes in React components
- API route updates
- Authentication changes
- Any code deployed to Vercel

### ⚠️ **Sometimes Need Desktop Update:**
- Changes to `electron/main-simple-offline.js`
- Updates to preload script
- Window size/settings changes
- App icon changes
- Offline caching logic updates
- New Electron version upgrades

---

## 🚀 How to Deploy Updates

### For Web Updates (90% of changes):

```bash
# 1. Make your changes
git add .
git commit -m "feat: Add new dashboard feature"
git push origin main

# 2. Vercel auto-deploys
# 3. Users get it automatically - DONE! ✅
```

**Timeline:** 
- Push to GitHub: 0 seconds
- Vercel build: 2-3 minutes
- Users see it: Next page refresh

---

### For Desktop Updates (10% of changes):

```bash
# 1. Update version in package.json
npm version patch  # 1.0.0 → 1.0.1

# 2. Build new installer
npm run electron:build

# 3. Create GitHub Release
# - Go to https://github.com/tajaherikar/Medixor/releases/new
# - Tag: v1.0.1
# - Title: Medixor Beta v1.0.1
# - Upload: dist-electron/Medixor-Beta-Setup-1.0.1.exe
# - Publish release

# 4. Users auto-download next time they open app
```

**Timeline:**
- Build time: 5-10 minutes
- Users notified: Next app launch
- Download: Background (5-15 seconds)
- Install: On next restart

---

## 👥 User Experience

### First Install:
1. Download `Medixor-Beta-Setup.exe` (one time, ~200MB)
2. Install (creates desktop shortcut)
3. Launch app
4. Login and use

### Daily Use:
- Open app → Always latest Vercel version ✅
- No manual updates needed ✅
- Works offline with cached data ✅

### When Desktop Update Available:
```
┌──────────────────────────────────────────────┐
│  🔄 Update Available (v1.0.2)                │
│  Downloading in background...                │
│  Will install on next restart                │
└──────────────────────────────────────────────┘
```

User continues working, update installs silently.

---

## 📊 Update Statistics

**Current Setup:**
```
Web Layer (Vercel):
├─ 95% of changes        → Auto-updates ✅
├─ Deploy frequency      → Multiple times/day
└─ User action required  → None

Desktop Layer (Electron):
├─ 5% of changes         → Auto-downloads ✅
├─ Update frequency      → Monthly or less
└─ User action required  → Restart app (when convenient)
```

---

## 🔧 Technical Details

### Auto-Updater Configuration

**Location:** `electron/main-simple-offline.js`

```javascript
// Checks GitHub Releases for new versions
autoUpdater.checkForUpdates();

// Events:
- 'update-available'   → Starts download
- 'download-progress'  → Shows %
- 'update-downloaded'  → Ready to install
- 'error'              → Logs issue
```

**Build Configuration:** `package.json`

```json
"build": {
  "publish": {
    "provider": "github",
    "owner": "tajaherikar",
    "repo": "Medixor"
  }
}
```

### Version Numbering

```
Major.Minor.Patch-PreRelease

Examples:
1.0.0-beta.1    → First beta
1.0.0-beta.2    → Second beta
1.0.0           → Production release
1.0.1           → Bug fix
1.1.0           → New feature
2.0.0           → Major update
```

---

## ✅ Best Practices

### Daily Development:
1. ✅ **Push to Vercel** - users get updates automatically
2. ✅ **Test on staging** - before deploying
3. ✅ **Monitor deployments** - check Vercel dashboard

### Monthly Desktop Releases:
1. ✅ **Batch Electron changes** - don't release for every tweak
2. ✅ **Test locally first** - `npm run electron:dev`
3. ✅ **Increment version** - `npm version patch/minor/major`
4. ✅ **Build installer** - `npm run electron:build`
5. ✅ **Create GitHub Release** - upload .exe file
6. ✅ **Test auto-update** - install old version, check for update

### User Communication:
- ✅ Web updates → No announcement needed (instant)
- ✅ Desktop updates → In-app notification
- ⚠️ Breaking changes → Email users before deployment

---

## 🐛 Troubleshooting

### Users Not Getting Web Updates:
- **Cause:** Hard refresh needed or browser cache
- **Fix:** `Ctrl + F5` in app or clear localStorage
- **Prevention:** Use cache-busting for assets

### Auto-Updater Not Working:
- **Cause:** GitHub Release not published correctly
- **Fix:** Check release has .exe attached and is published
- **Test:** Copy auto-update URL and verify accessible

### Updates Download But Don't Install:
- **Cause:** User hasn't restarted app
- **Fix:** Add "Restart Now" button in UI
- **Note:** Auto-installs on next quit

---

## 📈 Monitoring Updates

### Check Vercel Deployments:
```
https://vercel.com/tajaherikar/medixor/deployments
```

### Check GitHub Releases:
```
https://github.com/tajaherikar/Medixor/releases
```

### Check Active Users:
```sql
-- Latest app versions in use
SELECT 
  app_version,
  COUNT(*) as users
FROM user_sessions
GROUP BY app_version
ORDER BY users DESC;
```

---

## 🎓 Summary

### The Golden Rule:
> **99% of your changes go to Vercel and update automatically.**  
> **Only rebuild desktop app when you change the wrapper itself.**

### User Benefits:
- ✅ Always latest features (no manual updates)
- ✅ Offline support when needed
- ✅ Tiny delta updates for wrapper
- ✅ No interruptions during work

### Developer Benefits:
- ✅ Deploy to production multiple times/day
- ✅ No user management for updates
- ✅ Fast iteration cycle
- ✅ Separate web and desktop release cycles

---

## 📞 Quick Reference

| What Changed | Action Required | Timeline |
|--------------|----------------|----------|
| React component | `git push` | Instant |
| API route | `git push` | Instant |
| Database schema | `git push` + migration | Instant |
| Bug fix | `git push` | Instant |
| Electron config | Build + Release | Next restart |
| App icon | Build + Release | Next restart |
| Offline logic | Build + Release | Next restart |

**Default answer:** Just push to Vercel ✅
