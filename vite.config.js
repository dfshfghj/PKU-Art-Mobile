import { defineConfig } from 'vite';
import monkey, { util } from 'vite-plugin-monkey';
import mkcert from 'vite-plugin-mkcert';
import fs from 'fs';
import dotenv from 'dotenv';
import AutoImport from 'unplugin-auto-import/vite';

const envFilePath = '.env';
const envConfig = fs.existsSync(envFilePath)
    ? dotenv.parse(fs.readFileSync(envFilePath))
    : {};
const userscriptVersion = envConfig.VERSION ?? process.env.npm_package_version ?? '0.0.0';

const date = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

// https://vitejs.dev/config/
export default defineConfig({
    assetsInclude: ['**/*.bcmap', '**/*.pfb', '**/*.icc', '**/*.wasm', '**/*.ftl'],
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
                version: userscriptVersion,
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
