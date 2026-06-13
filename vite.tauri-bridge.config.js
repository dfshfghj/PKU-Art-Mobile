import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        emptyOutDir: false,
        outDir: 'dist-tauri-inject',
        lib: {
            entry: 'src/tauriBridge.js',
            name: 'PkuArtTauriBridgeBundle',
            formats: ['iife'],
            fileName: () => 'tauri-bridge.js',
        },
        rollupOptions: {
            output: {
                inlineDynamicImports: true,
            },
        },
    },
});
