use crate::util::{
    check_file_or_append, get_download_message_with_lang, show_toast, MessageType,
};
use std::fs::{self, File};
use std::io::Write;
use std::path::Path;
use std::str::FromStr;
use tauri::http::Method;
use tauri::{command, AppHandle, Manager, Url, WebviewWindow};
use tauri_plugin_http::reqwest::{
    header::{CONTENT_DISPOSITION, CONTENT_TYPE, COOKIE, REFERER},
    Certificate, ClientBuilder,
};

#[derive(serde::Deserialize)]
pub struct DownloadFileParams {
    url: String,
    filename: String,
    language: Option<String>,
    cookie: Option<String>,
    referer: Option<String>,
}

#[derive(serde::Deserialize)]
pub struct BinaryDownloadParams {
    filename: String,
    binary: Vec<u8>,
    language: Option<String>,
}

#[derive(serde::Deserialize)]
pub struct NotificationParams {
    title: String,
    body: String,
    icon: String,
}

const GLOBALSIGN_GCC_R6_ALPHASSL_CA_2025_PEM: &[u8] =
    include_bytes!("../../certs/globalsign_gcc_r6_alphassl_ca_2025.pem");

fn should_add_pku_intermediate(url: &Url) -> bool {
    url.host_str()
        .map(|host| host == "pku.edu.cn" || host.ends_with(".pku.edu.cn"))
        .unwrap_or(false)
}

fn build_download_client(url: &Url) -> Result<tauri_plugin_http::reqwest::Client, String> {
    let mut builder = ClientBuilder::new();

    if should_add_pku_intermediate(url) {
        let certificate = Certificate::from_pem(GLOBALSIGN_GCC_R6_ALPHASSL_CA_2025_PEM)
            .map_err(|error| error.to_string())?;
        builder = builder.add_root_certificate(certificate);
    }

    builder.build().map_err(|error| error.to_string())
}

fn extract_filename_from_content_disposition(header_value: &str) -> Option<String> {
    for part in header_value.split(';').map(str::trim) {
        if let Some(value) = part.strip_prefix("filename*=") {
            let value = value.trim_matches('"');
            let encoded = value.split("''").nth(1).unwrap_or(value);
            let decoded = percent_encoding::percent_decode_str(encoded)
                .decode_utf8()
                .ok()?;
            let filename = decoded.trim();
            if !filename.is_empty() {
                return Some(filename.to_string());
            }
        }

        if let Some(value) = part.strip_prefix("filename=") {
            let filename = value.trim_matches('"').trim();
            if !filename.is_empty() {
                return Some(filename.to_string());
            }
        }
    }

    None
}

fn filename_from_url(url: &Url) -> Option<String> {
    Path::new(url.path())
        .file_name()
        .and_then(|name| name.to_str())
        .map(str::trim)
        .filter(|name| !name.is_empty())
        .map(ToOwned::to_owned)
}

fn extension_from_content_type(content_type: &str) -> Option<&'static str> {
    let mime = content_type
        .split(';')
        .next()
        .unwrap_or_default()
        .trim()
        .to_ascii_lowercase();

    match mime.as_str() {
        "application/pdf" => Some("pdf"),
        "text/html" => Some("html"),
        "text/plain" => Some("txt"),
        "application/msword" => Some("doc"),
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" => Some("docx"),
        "application/vnd.ms-powerpoint" => Some("ppt"),
        "application/vnd.openxmlformats-officedocument.presentationml.presentation" => Some("pptx"),
        "application/vnd.ms-excel" => Some("xls"),
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" => Some("xlsx"),
        "application/zip" => Some("zip"),
        _ => None,
    }
}

fn has_extension(filename: &str) -> bool {
    Path::new(filename)
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| !ext.trim().is_empty())
        .unwrap_or(false)
}

fn resolve_download_filename(
    suggested_filename: &str,
    final_url: &Url,
    content_disposition: Option<&str>,
    content_type: Option<&str>,
) -> String {
    let mut filename = content_disposition
        .and_then(extract_filename_from_content_disposition)
        .or_else(|| filename_from_url(final_url).filter(|name| has_extension(name)))
        .unwrap_or_else(|| suggested_filename.to_string());

    if !has_extension(&filename) {
        if let Some(extension) = content_type.and_then(extension_from_content_type) {
            filename.push('.');
            filename.push_str(extension);
        }
    }

    filename
}

#[command]
pub async fn download_file(app: AppHandle, params: DownloadFileParams) -> Result<(), String> {
    let window: WebviewWindow = app.get_webview_window("pake").unwrap();
    show_toast(
        &window,
        &get_download_message_with_lang(MessageType::Start, params.language.clone()),
    );

    let request_url = Url::from_str(&params.url).map_err(|error| error.to_string())?;
    let client = build_download_client(&request_url)?;
    let mut request = client.request(Method::GET, request_url.clone());

    if let Some(cookie) = params.cookie.as_ref().filter(|value| !value.trim().is_empty()) {
        request = request.header(COOKIE, cookie);
    }

    if let Some(referer) = params
        .referer
        .as_ref()
        .filter(|value| !value.trim().is_empty())
    {
        request = request.header(REFERER, referer);
    }

    let response = request.send().await;

    match response {
        Ok(res) => {
            let final_url = res.url().clone();
            let content_disposition = res
                .headers()
                .get(CONTENT_DISPOSITION)
                .and_then(|value| value.to_str().ok());
            let content_type = res
                .headers()
                .get(CONTENT_TYPE)
                .and_then(|value| value.to_str().ok());
            let resolved_filename = resolve_download_filename(
                &params.filename,
                &final_url,
                content_disposition,
                content_type,
            );
            let output_path = app.path().download_dir().unwrap().join(resolved_filename);
            let file_path = check_file_or_append(output_path.to_str().unwrap());
            let bytes = res.bytes().await.unwrap();

            let mut file = File::create(file_path).unwrap();
            file.write_all(&bytes).unwrap();
            show_toast(
                &window,
                &get_download_message_with_lang(MessageType::Success, params.language.clone()),
            );
            Ok(())
        }
        Err(e) => {
            show_toast(
                &window,
                &get_download_message_with_lang(MessageType::Failure, params.language),
            );
            Err(e.to_string())
        }
    }
}

#[command]
pub async fn download_file_by_binary(
    app: AppHandle,
    params: BinaryDownloadParams,
) -> Result<(), String> {
    let window: WebviewWindow = app.get_webview_window("pake").unwrap();
    show_toast(
        &window,
        &get_download_message_with_lang(MessageType::Start, params.language.clone()),
    );
    let output_path = app.path().download_dir().unwrap().join(params.filename);
    let file_path = check_file_or_append(output_path.to_str().unwrap());
    let download_file_result = fs::write(file_path, &params.binary);
    match download_file_result {
        Ok(_) => {
            show_toast(
                &window,
                &get_download_message_with_lang(MessageType::Success, params.language.clone()),
            );
            Ok(())
        }
        Err(e) => {
            show_toast(
                &window,
                &get_download_message_with_lang(MessageType::Failure, params.language),
            );
            Err(e.to_string())
        }
    }
}

#[command]
pub fn send_notification(app: AppHandle, params: NotificationParams) -> Result<(), String> {
    use tauri_plugin_notification::NotificationExt;
    app.notification()
        .builder()
        .title(&params.title)
        .body(&params.body)
        .icon(&params.icon)
        .show()
        .unwrap();
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::error::Error as _;
    use tokio::time::{timeout, Duration};

    fn error_chain_message(error: &tauri_plugin_http::reqwest::Error) -> String {
        let mut messages = vec![error.to_string()];
        let mut source = error.source();

        while let Some(current) = source {
            messages.push(current.to_string());
            source = current.source();
        }

        messages.join(" | caused by: ")
    }

    #[tokio::test]
    #[ignore = "Requires live network access to course.pku.edu.cn"]
    async fn pku_site_request_does_not_fail_with_certificate_error() {
        let url = Url::from_str("https://course.pku.edu.cn").expect("valid PKU URL");
        let client = build_download_client(&url).expect("client should build with extra PKU CA");

        let result = timeout(Duration::from_secs(20), client.get(url.as_str()).send())
            .await
            .expect("request to course.pku.edu.cn timed out");

        match result {
            Ok(_) => {}
            Err(error) => {
                let chain = error_chain_message(&error);
                let message = chain.to_ascii_lowercase();
                assert!(
                    !message.contains("certificate")
                        && !message.contains("cert")
                        && !message.contains("ssl")
                        && !message.contains("tls"),
                    "request still failed with a certificate-related error: {chain}"
                );
                panic!("request failed for a non-certificate reason: {chain}");
            }
        }
    }
}
