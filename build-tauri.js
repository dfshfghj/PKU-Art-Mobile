import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

execSync('vite build --mode tauri', { stdio: 'inherit' });

const distDir = path.join(process.cwd(), 'dist');
const userJsFiles = fs.readdirSync(distDir).filter(file => file.endsWith('.user.js'));
if (userJsFiles.length === 0) {
    throw new Error('No .user.js file found in dist directory');
}

const userJsFile = path.join(distDir, userJsFiles[0]);
const userJsContent = fs.readFileSync(userJsFile, 'utf8');

const lines = userJsContent.split('\n');
let startIndex = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('(function () {')) {
        startIndex = i;
        break;
    }
}

const contentLines = lines.slice(startIndex + 1, -1);
const extractedContent = contentLines.join('\n');
const DesktopContent = `observer.observe(document, { childList: true });`;
const MobileContent = `observer.observe(document.documentElement, { childList: true });`;
const customJsContent = `function onDocumentElementReady() {
${extractedContent}
}

(function () {
  if (document.head) {
    onDocumentElementReady();
    return;
  }

  const observer = new MutationObserver(() => {
    if (document.head) {
      observer.disconnect();
      onDocumentElementReady();
    }
  });

  ${process.argv[2] === 'mobile' ? MobileContent : DesktopContent}
})();`;

const customJsPath = path.join(process.cwd(), 'src-tauri', 'src', 'inject', 'custom.js');
fs.writeFileSync(customJsPath, customJsContent, 'utf8');

console.log('successfully copy to tauri:  src-tauri/src/inject/custom.js');