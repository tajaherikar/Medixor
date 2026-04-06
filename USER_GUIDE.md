# Medixor - Quick Start Guide

## For End Users (Non-Technical)

### Super Simple Setup - No Installation Required! 🎉

**Running the App:**

Just **double-click** one of these:
- `Start Medixor.bat` (anywhere in the Medixor folder)
- OR the desktop shortcut (if you created one)

That's it! The app opens in your browser instantly.

### Create a Desktop Shortcut (Optional but Recommended):

1. Right-click `Create-Desktop-Shortcut.ps1`
2. Select "Run with PowerShell"
3. A "Medixor" icon will appear on your desktop
4. Double-click it anytime to launch Medixor

### What You Need:
- ✅ A web browser (Chrome, Edge, Firefox, etc.)
- ✅ Internet connection
- ❌ **No Node.js needed!**
- ❌ **No installation needed!**

---

## Login Credentials

Use your Supabase account credentials to log in at:
**https://medixor.vercel.app/**

---

## Troubleshooting

### Browser doesn't open automatically
- Manually open your browser
- Go to: https://medixor.vercel.app/

### Lost your password
- Contact your system administrator
- Or use Supabase password reset

### Internet connection required
- Medixor is a cloud-based application
- You need an active internet connection to use it

---

## For Developers

### Live Deployment:
The app is deployed at: https://medixor.vercel.app/

### Local Development:
```bash
npm run dev
```

### Production Build:
```bash
npm run build
npm start
```

### Vercel Deployment:
- Pushes to main branch auto-deploy to Vercel
- Environment variables configured in Vercel dashboard

### Environment Variables:
Edit `.env.local` for local development:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

Vercel deployment uses environment variables from Vercel dashboard.
