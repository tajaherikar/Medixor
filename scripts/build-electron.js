// Build script for offline Electron app
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔨 Building Medixor Offline Desktop App...\n');

// Step 1: Build Next.js
console.log('📦 Step 1: Building Next.js production build...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Next.js build complete\n');
} catch (error) {
  console.error('❌ Next.js build failed');
  process.exit(1);
}

// Step 2: Create electron package structure
console.log('📦 Step 2: Preparing Electron package...');

const electronDir = path.join(__dirname, '..', 'electron-dist');
const appDir = path.join(electronDir, 'resources', 'app');

// Create directories
[electronDir, path.join(electronDir, 'resources'), appDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Step 3: Copy standalone build
console.log('📦 Step 3: Copying standalone build files...');
const nextStandalone = path.join(__dirname, '..', '.next', 'standalone');
const nextStatic = path.join(__dirname, '..', '.next', 'static');
const publicDir = path.join(__dirname, '..', 'public');

if (fs.existsSync(nextStandalone)) {
  // Copy standalone server
  copyRecursive(nextStandalone, appDir);
  
  // Copy static files
  const staticDest = path.join(appDir, '.next', 'static');
  if (fs.existsSync(nextStatic)) {
    copyRecursive(nextStatic, staticDest);
  }
  
  // Copy public files  
  const publicDest = path.join(appDir, 'public');
  if (fs.existsSync(publicDir)) {
    copyRecursive(publicDir, publicDest);
  }
  
  console.log('✅ Files copied\n');
} else {
  console.error('❌ Standalone build not found. Make sure output: "standalone" is in next.config.ts');
  process.exit(1);
}

// Step 4: Download portable Node.js
console.log('📦 Step 4: Downloading Node.js runtime...');
console.log('⚠️  Manual step required: Download Node.js portable from https://nodejs.org/');
console.log('   Extract node.exe to: electron-dist/resources/app/\n');

// Step 5: Run electron-builder
console.log('📦 Step 5: Running electron-builder...');
try {
  execSync('npx electron-builder --dir', { stdio: 'inherit' });
  console.log('\n✅ Build complete!');
  console.log('📁 Output: dist-electron/win-unpacked/\n');
} catch (error) {
  console.error('❌ Electron build failed');
  process.exit(1);
}

function copyRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
