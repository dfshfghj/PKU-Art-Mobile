import '@saurl/tauri-plugin-safe-area-insets-css-api';
import { trace, debug, info, warn, error } from '@tauri-apps/plugin-log';
import { readDir, truncate, copyFile, BaseDirectory } from '@tauri-apps/plugin-fs';
import {
    isPermissionGranted,
    requestPermission,
    sendNotification,
} from '@tauri-apps/plugin-notification';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { Store } from '@tauri-apps/plugin-store';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

if (!window.PkuArtTauri) {
    const originalConsole = {
        log: console.log.bind(console),
        info: console.info.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console),
        debug: console.debug.bind(console),
        trace: console.trace.bind(console),
    };

    const storeCache = new Map();

    function formatLogArg(arg) {
        if (arg instanceof Error) {
            return arg.stack || `${arg.name}: ${arg.message}`;
        }

        if (typeof arg === 'string') {
            return arg;
        }

        if (typeof arg === 'undefined') {
            return 'undefined';
        }

        try {
            return JSON.stringify(arg);
        } catch (_error) {
            return String(arg);
        }
    }

    function formatLogArgs(args) {
        return args.map(formatLogArg).join(' ');
    }

    function forwardConsole(method, logFn) {
        return (...args) => {
            originalConsole[method](...args);
            void logFn(formatLogArgs(args));
        };
    }

    console.log = forwardConsole('log', info);
    console.info = forwardConsole('info', info);
    console.warn = forwardConsole('warn', warn);
    console.error = forwardConsole('error', error);
    console.debug = forwardConsole('debug', debug);
    console.trace = forwardConsole('trace', trace);

    async function notify(title) {
        let permissionGranted = await isPermissionGranted();
        if (!permissionGranted) {
            const permission = await requestPermission();
            permissionGranted = permission === 'granted';
        }
        if (permissionGranted) {
            await sendNotification({ title });
        }
    }

    async function saveLogs() {
        console.log('Saving logs...');
        try {
            await copyFile('logs.log', 'logs.log', {
                fromPathBaseDir: BaseDirectory.AppLog,
                toPathBaseDir: BaseDirectory.Download,
            });
        } catch (error) {
            await notify(`${error}`);
            return;
        }

        await notify('Saved logs to Downloads/logs.log');
    }

    async function clearLogs() {
        console.log('Clearing logs...');
        try {
            const entries = await readDir('', {
                baseDir: BaseDirectory.AppLog,
            });

            for (const entry of entries) {
                if (!entry.name) {
                    continue;
                }
                await truncate(entry.name, 0, {
                    baseDir: BaseDirectory.AppLog,
                });
                console.log(`Removed ${entry.name}`);
            }
        } catch (error) {
            await notify(`${error}`);
            return;
        }

        await notify('Cleared logs');
    }

    async function loadStore(path) {
        let store = storeCache.get(path);
        if (!store) {
            store = await Store.load(path);
            storeCache.set(path, store);
        }
        return store;
    }

    function openStore(path) {
        return {
            get: async (key) => (await loadStore(path)).get(key),
            set: async (key, value) => (await loadStore(path)).set(key, value),
            save: async () => (await loadStore(path)).save(),
            delete: async (key) => (await loadStore(path)).delete(key),
            clear: async () => (await loadStore(path)).clear(),
        };
    }

    async function getRuntimeInfo() {
        return invoke('get_runtime_info');
    }

    window.PkuArtTauri = {
        isAvailable: true,
        invoke,
        app: {
            getRuntimeInfo,
        },
        http: {
            fetch: tauriFetch,
        },
        shell: {
            openUrl,
        },
        logs: {
            saveLogs,
            clearLogs,
        },
        store: {
            open: openStore,
        },
    };
}
