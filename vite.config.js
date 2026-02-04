import { defineConfig } from 'vite';
import monkey, { util } from 'vite-plugin-monkey';
import mkcert from 'vite-plugin-mkcert';
import fs from 'fs';
import dotenv from 'dotenv';
import AutoImport from 'unplugin-auto-import/vite';

const envConfig = dotenv.parse(fs.readFileSync('.env'));

const date = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

// https://vitejs.dev/config/
export default defineConfig({
    define: {
        'import.meta.env.BUILD_TARGET': JSON.stringify(process.env.BUILD_TARGET || envConfig.BUILD_TARGET || 'userscript'),
    },
    plugins: [
        AutoImport({
            imports: [util.unimportPreset],
        }),
        mkcert(),
        monkey({
            entry: 'src/main.js',
            userscript: {
                icon: 'http://cdn.arthals.ink/Arthals-mcskin.png',
                namespace: 'arthals/pku-art',
                name: 'PKU-Art-Mobile',
                description: '给你一个足够好看的教学网。',
                match: ['*://*.pku.edu.cn/*', '*://course.huh.moe/*'],
                // local development
                // match: ['*://*.pku.edu.cn/*', 'http://localhost:8000/*'],
                'run-at': 'document-start',
                'inject-into': 'page',
                version: envConfig.VERSION,
                updateURL: 'https://cdn.arthals.ink/release/PKU-Art.user.js',
                downloadURL: 'https://cdn.arthals.ink/release/PKU-Art.user.js',
                supportURL: 'https://github.com/zhuozhiyongde/PKU-Art/issues',
                connect: ['pku.edu.cn'],
                license: 'GPL-3.0 license',
                author: 'Arthals',
                $extra: {
                    'author-blog': 'https://arthals.ink',
                    date,
                },
            },
            server: { mountGmApi: true },
        }),
    ],
});
