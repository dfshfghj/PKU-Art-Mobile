use tauri::{
    plugin::{Builder, PluginHandle, TauriPlugin},
    AppHandle, Runtime,
};
#[cfg(target_os = "android")]
use tauri::Manager;

#[cfg(target_os = "android")]
const PLUGIN_IDENTIFIER: &str = "com.pku.course";

pub struct AndroidFileOpener<R: Runtime>(PluginHandle<R>);

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
