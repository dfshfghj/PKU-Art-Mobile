use serde::{Deserialize, Serialize};
use tauri::{
    plugin::{Builder, PluginHandle, TauriPlugin},
    AppHandle, Runtime,
};
#[cfg(target_os = "android")]
use tauri::Manager;

#[cfg(target_os = "android")]
const PLUGIN_IDENTIFIER: &str = "com.pku.course";

pub struct AndroidFileOpener<R: Runtime>(PluginHandle<R>);

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct AndroidWebViewInfo {
    #[serde(rename = "packageName")]
    pub package_name: Option<String>,
    #[serde(rename = "versionName")]
    pub version_name: Option<String>,
    #[serde(rename = "versionCode")]
    pub version_code: Option<String>,
}

impl<R: Runtime> AndroidFileOpener<R> {
    #[cfg(target_os = "android")]
    fn open_downloaded_file(&self, path: impl Into<String>) -> Result<(), String> {
        self.0
            .run_mobile_plugin::<serde_json::Value>(
                "openDownloadedFile",
                serde_json::json!({ "path": path.into() }),
            )
            .map(|_| ())
            .map_err(|error| error.to_string())
    }

    #[cfg(target_os = "android")]
    fn get_webview_info(&self) -> Result<AndroidWebViewInfo, String> {
        self.0
            .run_mobile_plugin::<AndroidWebViewInfo>("getWebViewInfo", ())
            .map_err(|error| error.to_string())
    }
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::<R, ()>::new("android-file-opener")
        .setup(|_app, _api| {
            #[cfg(target_os = "android")]
            {
                let handle = _api
                    .register_android_plugin(PLUGIN_IDENTIFIER, "OpenDownloadedFilePlugin")
                    .map_err(|error| -> Box<dyn std::error::Error> { Box::new(error) })?;
                _app.manage(AndroidFileOpener(handle));
            }

            Ok(())
        })
        .build()
}

#[tauri::command]
pub fn open_downloaded_file<R: Runtime>(app: AppHandle<R>, path: String) -> Result<(), String> {
    #[cfg(target_os = "android")]
    {
        let opener = app.state::<AndroidFileOpener<R>>();
        return opener.open_downloaded_file(path);
    }

    #[cfg(not(target_os = "android"))]
    {
        let _ = app;
        let _ = path;
        Err("open_downloaded_file is only supported on Android".to_string())
    }
}

pub fn get_webview_info<R: Runtime>(app: &AppHandle<R>) -> Result<Option<AndroidWebViewInfo>, String> {
    #[cfg(target_os = "android")]
    {
        let opener = app.state::<AndroidFileOpener<R>>();
        return opener.get_webview_info().map(Some);
    }

    #[cfg(not(target_os = "android"))]
    {
        let _ = app;
        Ok(None)
    }
}
