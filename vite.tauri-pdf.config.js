import { defineConfig } from 'vite';

export default defineConfig({
    assetsInclude: ['**/*.bcmap', '**/*.pfb', '**/*.icc', '**/*.wasm', '**/*.ftl'],
    build: {
        emptyOutDir: false,
        outDir: 'dist-tauri-inject',
        lib: {
            entry: 'src/pdfViewer.tauri.js',
            name: 'PkuArtPdfViewerBundle',
            formats: ['iife'],
            fileName: () => 'pdf-viewer.js',
        },
        rollupOptions: {
            output: {
                inlineDynamicImports: true,
            },
        },
    },
});
