import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

execSync('vite build --mode tauri', { stdio: 'inherit' });
execSync('vite build --config vite.tauri-bridge.config.js --mode tauri', { stdio: 'inherit' });
execSync('vite build --config vite.tauri-pdf.config.js --mode tauri', { stdio: 'inherit' });

const projectRoot = process.cwd();
const userscriptPath = path.join(projectRoot, 'dist', 'pku-art.user.js');
if (!fs.existsSync(userscriptPath)) {
    throw new Error('No pku-art.user.js file found in dist directory');
}

const customJsPath = path.join(projectRoot, 'src-tauri', 'src', 'inject', 'custom.js');
fs.copyFileSync(userscriptPath, customJsPath);
console.log('successfully copy to tauri:  src-tauri/src/inject/custom.js');

const tauriBridgeJsPath = path.join(projectRoot, 'dist-tauri-inject', 'tauri-bridge.js');
if (!fs.existsSync(tauriBridgeJsPath)) {
    throw new Error('No tauri-bridge.js file found in dist-tauri-inject directory');
}

const tauriInjectBridgeJsPath = path.join(projectRoot, 'src-tauri', 'src', 'inject', 'tauri-bridge.js');
fs.copyFileSync(tauriBridgeJsPath, tauriInjectBridgeJsPath);
console.log('successfully copy to tauri:  src-tauri/src/inject/tauri-bridge.js');

const pdfViewerJsPath = path.join(projectRoot, 'dist-tauri-inject', 'pdf-viewer.js');
if (!fs.existsSync(pdfViewerJsPath)) {
    throw new Error('No pdf-viewer.js file found in dist-tauri-inject directory');
}

const tauriPdfViewerJsPath = path.join(projectRoot, 'src-tauri', 'src', 'inject', 'pdf-viewer.js');
fs.copyFileSync(pdfViewerJsPath, tauriPdfViewerJsPath);

console.log('successfully copy to tauri:  src-tauri/src/inject/pdf-viewer.js');
