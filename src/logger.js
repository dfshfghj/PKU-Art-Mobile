import { trace, debug, info, warn, error } from '@tauri-apps/plugin-log';
import { readDir, truncate, copyFile, BaseDirectory } from '@tauri-apps/plugin-fs';
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';

if (import.meta.env.MODE == 'tauri') {
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
    trace: console.trace,
  };

  console.log = (...args) => {
    originalConsole.log(...args);
    info(args.join(' '));
  };

  console.error = (...args) => {
    originalConsole.error(...args);
    error(args.join(' '));
  };

  console.warn = (...args) => {
    originalConsole.warn(...args);
    warn(args.join(' '));
  };

  console.info = (...args) => {
    originalConsole.info(...args);
    info(args.join(' '));
  };

  console.debug = (...args) => {
    originalConsole.debug(...args);
    debug(args.join(' '));
  };

  console.trace = (...args) => {
    originalConsole.trace(...args);
    trace(args.join(' '));
  };
}

async function saveLogs() {
  if (import.meta.env.MODE != 'tauri') {
    return
  }

  console.log("Saving logs...");
  try {
    await copyFile("logs.log", "logs.log", {
      fromPathBaseDir: BaseDirectory.AppLog,
      toPathBaseDir: BaseDirectory.Download,
    })
  } catch (e) {
    let permissionGranted = await isPermissionGranted();

    if (!permissionGranted) {
      const permission = await requestPermission();
      permissionGranted = permission === 'granted';
    }
    if (permissionGranted) {
      sendNotification({ title: `${e}` });
    }
  } finally {
    let permissionGranted = await isPermissionGranted();

    if (!permissionGranted) {
      const permission = await requestPermission();
      permissionGranted = permission === 'granted';
    }
    if (permissionGranted) {
      sendNotification({ title: `Saved logs to Downloads/logs.log` });
    }
  }
}

async function clearLogs() {
  if (import.meta.env.MODE != 'tauri') {
    return
  }

  console.log("Clearing logs...");
  try {
    const entries = await readDir("", {
      baseDir: BaseDirectory.AppLog,
    });

    for (const entry of entries) {
      const name = entry.name;
      await truncate(name, 0, {
        baseDir: BaseDirectory.AppLog,
      });
      console.log(`Removed ${name}`);
    }
  } catch (e) {
    let permissionGranted = await isPermissionGranted();

    if (!permissionGranted) {
      const permission = await requestPermission();
      permissionGranted = permission === 'granted';
    }
    if (permissionGranted) {
      sendNotification({ title: `${e}` });
    }
  } finally {
    let permissionGranted = await isPermissionGranted();

    if (!permissionGranted) {
      const permission = await requestPermission();
      permissionGranted = permission === 'granted';
    }
    if (permissionGranted) {
      sendNotification({ title: `Cleared logs` });
    }
  }
}

export { saveLogs, clearLogs };