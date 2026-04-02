# Installation Guide - Medixor Desktop App

## Windows Installation (Multiple Laptops)

### Option A: MSI Installer (Recommended for IT Departments)
- **File**: `Medixor_1.0.0_x64.msi`
- **Advantage**: Can be deployed via Group Policy or SCCM
- **Installation**: 
  1. Download `.msi` from [Releases](https://github.com/tajaherikar/Medixor/releases)
  2. Double-click the installer
  3. Follow the wizard
  4. App installs to `Program Files\Medixor\`

**Silent Installation** (for batch deployment):
```powershell
msiexec /i Medixor_1.0.0_x64.msi /qn
```

### Option B: NSIS Installer (Portable, No Admin Required)
- **File**: `Medixor_1.0.0_x64.exe` (NSIS)
- **Advantage**: Works without admin rights
- **Installation**: 
  1. Download `.exe` from [Releases](https://github.com/tajaherikar/Medixor/releases)
  2. Double-click and follow wizard
  3. Can install to User folder (no admin needed)

### Bulk Deployment

**For IT Departments with 10+ Users:**

1. **Group Policy Deployment** (Domain-joined computers)
   - Convert MSI → GPO package
   - Deploy to OU containing Windows 10+ machines
   - Auto-updates via [tauri-updater](https://tauri.app/v1/guides/distribution/updater/)

2. **Configuration Management**
   ```powershell
   # Batch deployment script
   $urls = @(
     "https://github.com/tajaherikar/Medixor/releases/download/v1.0.0/Medixor_1.0.0_x64.msi"
   )
   
   foreach ($url in $urls) {
     $file = Split-Path $url -Leaf
     Invoke-WebRequest -Uri $url -OutFile $file
     msiexec /i $file /qn
   }
   ```

3. **OneDrive/SharePoint Distribution**
   - Upload `.msi` to company OneDrive
   - Users download and install manually
   - Or use [Microsoft Intune](https://learn.microsoft.com/en-us/mem/intune/apps/apps-win32-app-management) for managed deployment

---

## macOS Installation

- **File**: `Medixor_1.0.0_x64.dmg`
- **Installation**:
  1. Download from [Releases](https://github.com/tajaherikar/Medixor/releases)
  2. Open the `.dmg` file
  3. Drag `Medixor.app` to **Applications** folder
  4. Launch from Applications or Spotlight search

---

## Linux Installation

- **File**: `medixor_1.0.0_amd64.deb` (Ubuntu/Debian)
```bash
sudo dpkg -i medixor_1.0.0_amd64.deb
# Or with dependencies:
sudo apt install ./medixor_1.0.0_amd64.deb
```

---

## Configuration

After installation on **any platform**:

1. Create `.env` file in the app directory with:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

2. For **offline-only** mode (local SQLite):
   - Skip `.env` configuration
   - Data syncs to Supabase only when credentials are set

3. For **enterprise** deployment:
   - Use configuration management to deploy `.env` to all machines
   - Centralize Supabase credentials

---

## Auto-Updates

Once configured, users get automatic updates:
- Check runs on app startup
- Downloads in background
- Prompts user to restart (non-blocking)
- No manual download needed

---

## Troubleshooting

### Windows: "Windows Defender - Unknown Publisher"
- Click **More info** → **Run anyway**
- Or request IT to code-sign the MSI

### Windows: Needs Admin Rights
- Use NSIS `.exe` instead (installs to user folder)
- Or have IT pre-approve the MSI in Group Policy

### macOS: "Cannot open because Apple cannot check it for malicious software"
```bash
xattr -d com.apple.quarantine /Applications/Medixor.app
```

### All Platforms: App Won't Start
- Check `.env` file is correctly formatted
- Or reinstall fresh if corrupted

---

## Building for Distribution

### Local Machine
```bash
npm run tauri:build
# Outputs to: src-tauri/target/release/bundle/
```

### Automated via GitHub Actions
- Every commit to `main` triggers build
- Artifacts available in [Actions tab](https://github.com/tajaherikar/Medixor/actions)
- Tag release as `v1.0.0` to create GitHub Release

### Cross-Platform Build
```bash
# On Windows:
npm run tauri:build  # Creates .msi + .exe

# On macOS:
npm run tauri:build  # Creates .dmg

# On Linux:
npm run tauri:build  # Creates .deb
```

---

## Support

For issues during installation:
- Check [GitHub Issues](https://github.com/tajaherikar/Medixor/issues)
- Review app logs in:
  - **Windows**: `%APPDATA%\Medixor\`
  - **macOS**: `~/Library/Application Support/Medixor/`
  - **Linux**: `~/.config/Medixor/`
