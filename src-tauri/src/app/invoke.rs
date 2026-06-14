use crate::util::{
    check_file_or_append, get_download_message_with_lang, show_toast, MessageType,
};
use crate::android_file_opener;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs::{self, File};
use std::io::Write;
use std::path::Path;
use std::str::FromStr;
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::http::Method;
use tauri::{command, AppHandle, Manager, State, Url, WebviewWindow};
use tauri_plugin_http::reqwest::{
    header::{
        HeaderMap, HeaderValue, ACCEPT, ACCEPT_LANGUAGE, CONNECTION, CONTENT_DISPOSITION,
        CONTENT_TYPE, COOKIE, ORIGIN, REFERER,
    },
    Certificate, Client, ClientBuilder,
};
use tauri_plugin_opener::OpenerExt;

#[derive(serde::Deserialize)]
pub struct DownloadFileParams {
    url: String,
    filename: String,
    language: Option<String>,
    cookie: Option<String>,
    referer: Option<String>,
    #[serde(rename = "openAfterDownload", default)]
    open_after_download: bool,
}

#[derive(serde::Deserialize)]
pub struct BinaryDownloadParams {
    filename: String,
    binary: Vec<u8>,
    language: Option<String>,
    #[serde(rename = "openAfterDownload", default)]
    open_after_download: bool,
}

#[derive(serde::Deserialize)]
pub struct NotificationParams {
    title: String,
    body: String,
    icon: String,
}

#[derive(serde::Serialize)]
pub struct DownloadResult {
    path: String,
}

#[derive(Serialize)]
pub struct RuntimeInfo {
    #[serde(rename = "appVersion")]
    app_version: String,
    #[serde(rename = "webviewPackageName")]
    webview_package_name: Option<String>,
    #[serde(rename = "webviewVersionName")]
    webview_version_name: Option<String>,
    #[serde(rename = "webviewVersionCode")]
    webview_version_code: Option<String>,
}

#[derive(Clone)]
struct CourseCredentials {
    user_name: String,
    password: String,
}

#[derive(Default)]
pub struct CourseNotificationState {
    credentials: Mutex<Option<CourseCredentials>>,
    client: Mutex<Option<Client>>,
    last_unread_ids: Mutex<HashSet<String>>,
    polling_started: Mutex<bool>,
}

#[derive(Deserialize)]
pub struct CourseCredentialsParams {
    #[serde(rename = "userName")]
    user_name: String,
    password: String,
}

#[derive(Serialize)]
pub struct UnreadNotificationsResponse {
    has_unread: bool,
    unread_count: usize,
    items: Vec<UnreadNotificationItem>,
}

#[derive(Clone, Serialize)]
pub struct UnreadNotificationItem {
    id: String,
    title: String,
    #[serde(rename = "courseId")]
    course_id: Option<String>,
    #[serde(rename = "sourceType")]
    source_type: Option<String>,
    timestamp: Option<i64>,
}

#[derive(Deserialize)]
struct OAuthLoginResponse {
    success: bool,
    token: Option<String>,
}

#[derive(Deserialize)]
struct StreamViewerResponse {
    #[serde(rename = "sv_streamEntries", default)]
    stream_entries: Vec<StreamEntry>,
}

#[derive(Deserialize)]
struct StreamEntry {
    #[serde(rename = "se_id")]
    se_id: Option<String>,
    #[serde(rename = "se_timestamp")]
    se_timestamp: Option<i64>,
    #[serde(rename = "itemSpecificData")]
    item_specific_data: Option<ItemSpecificData>,
}

#[derive(Deserialize)]
struct ItemSpecificData {
    title: Option<String>,
    #[serde(rename = "notificationDetails")]
    notification_details: Option<NotificationDetails>,
}

#[derive(Deserialize)]
struct NotificationDetails {
    seen: bool,
    #[serde(rename = "notificationIds", default)]
    notification_ids: Vec<String>,
    #[serde(rename = "announcementTitle")]
    announcement_title: Option<String>,
    #[serde(rename = "courseId")]
    course_id: Option<String>,
    #[serde(rename = "sourceType")]
    source_type: Option<String>,
    #[serde(rename = "sourceId")]
    source_id: Option<String>,
}

const GLOBALSIGN_GCC_R6_ALPHASSL_CA_2025_PEM: &[u8] =
    include_bytes!("../../certs/globalsign_gcc_r6_alphassl_ca_2025.pem");
const MOBILE_SAFARI_EDGE_UA: &str = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/149.0.0.0";
const ALERTS_REFERER: &str =
    "https://course.pku.edu.cn/webapps/streamViewer/streamViewer?cmd=view&streamName=alerts";
const CAMPUS_LOGIN_URL: &str =
    "https://course.pku.edu.cn/webapps/bb-sso-BBLEARN/execute/authValidate/campusLogin";
const IAAA_BLACKBOARD_LOGIN_URL: &str = "https://iaaa.pku.edu.cn/iaaa/oauthlogin.do";
const ALERTS_STREAM_URL: &str = "https://course.pku.edu.cn/webapps/streamViewer/streamViewer";
const ALERTS_POLL_INTERVAL: Duration = Duration::from_secs(180);

enum AlertsFetchError {
    AuthExpired(String),
    Other(String),
}

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

fn now_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}

fn build_blackboard_client() -> Result<Client, String> {
    let url = Url::from_str("https://course.pku.edu.cn").map_err(|error| error.to_string())?;
    let mut default_headers = HeaderMap::new();
    default_headers.insert(ACCEPT_LANGUAGE, HeaderValue::from_static("zh-CN,zh;q=0.9,en;q=0.8"));
    default_headers.insert(CONNECTION, HeaderValue::from_static("keep-alive"));
    default_headers.insert(
        tauri_plugin_http::reqwest::header::USER_AGENT,
        HeaderValue::from_static(MOBILE_SAFARI_EDGE_UA),
    );

    let mut builder = ClientBuilder::new()
        .cookie_store(true)
        .default_headers(default_headers)
        .redirect(tauri_plugin_http::reqwest::redirect::Policy::limited(10));

    if should_add_pku_intermediate(&url) {
        let certificate = Certificate::from_pem(GLOBALSIGN_GCC_R6_ALPHASSL_CA_2025_PEM)
            .map_err(|error| error.to_string())?;
        builder = builder.add_root_certificate(certificate);
    }

    builder.build().map_err(|error| error.to_string())
}

fn get_or_create_blackboard_client(state: &CourseNotificationState) -> Result<Client, String> {
    let mut guard = state
        .client
        .lock()
        .map_err(|error| format!("notification client lock poisoned: {error}"))?;

    if let Some(client) = guard.as_ref() {
        return Ok(client.clone());
    }

    let client = build_blackboard_client()?;
    *guard = Some(client.clone());
    Ok(client)
}

async fn login_blackboard(client: &Client, credentials: &CourseCredentials) -> Result<(), String> {
    let login_body = format!(
        "appid=blackboard&userName={}&password={}&randCode=&smsCode=&otpCode=&remTrustChk=false&redirUrl=http%3A%2F%2Fcourse.pku.edu.cn%2Fwebapps%2Fbb-sso-BBLEARN%2Fexecute%2FauthValidate%2FcampusLogin",
        percent_encoding::utf8_percent_encode(
            &credentials.user_name,
            percent_encoding::NON_ALPHANUMERIC
        ),
        percent_encoding::utf8_percent_encode(
            &credentials.password,
            percent_encoding::NON_ALPHANUMERIC
        )
    );

    let response = client
        .post(IAAA_BLACKBOARD_LOGIN_URL)
        .header(CONTENT_TYPE, "application/x-www-form-urlencoded")
        .body(login_body)
        .send()
        .await
        .map_err(|error| format!("oauthlogin request failed: {error}"))?;

    let oauth_text = response
        .text()
        .await
        .map_err(|error| format!("oauthlogin response read failed: {error}"))?;
    let oauth: OAuthLoginResponse = serde_json::from_str(&oauth_text)
        .map_err(|error| format!("oauthlogin response parse failed: {error}; body: {oauth_text}"))?;

    if !oauth.success {
        return Err("oauthlogin failed: success=false".to_string());
    }

    let token = oauth
        .token
        .ok_or_else(|| "oauthlogin failed: missing token".to_string())?;

    let campus_login_url = format!("{CAMPUS_LOGIN_URL}?_rand={}&token={token}", now_millis());
    client
        .get(campus_login_url)
        .header(REFERER, "https://iaaa.pku.edu.cn/")
        .send()
        .await
        .map_err(|error| format!("campusLogin request failed: {error}"))?;

    Ok(())
}

fn extract_unread_notifications(payload: StreamViewerResponse) -> UnreadNotificationsResponse {
    let items: Vec<UnreadNotificationItem> = payload
        .stream_entries
        .into_iter()
        .filter_map(|entry| {
            let item_specific_data = entry.item_specific_data?;
            let notification_details = item_specific_data.notification_details?;

            if notification_details.seen {
                return None;
            }

            let id = notification_details
                .notification_ids
                .first()
                .cloned()
                .or(notification_details.source_id.clone())
                .or(entry.se_id.clone())?;

            let title = item_specific_data
                .title
                .or(notification_details.announcement_title.clone())
                .unwrap_or_else(|| "未读通知".to_string());

            Some(UnreadNotificationItem {
                id,
                title,
                course_id: notification_details.course_id.clone(),
                source_type: notification_details.source_type.clone(),
                timestamp: entry.se_timestamp,
            })
        })
        .collect();

    UnreadNotificationsResponse {
        has_unread: !items.is_empty(),
        unread_count: items.len(),
        items,
    }
}

async fn request_alerts_payload(client: &Client) -> Result<String, AlertsFetchError> {
    let response = client
        .post(ALERTS_STREAM_URL)
        .header(ACCEPT, "text/javascript, text/html, application/xml, text/xml, */*")
        .header(
            CONTENT_TYPE,
            "application/x-www-form-urlencoded; charset=UTF-8",
        )
        .header(ORIGIN, "https://course.pku.edu.cn")
        .header(REFERER, ALERTS_REFERER)
        .header("X-Prototype-Version", "1.7")
        .header("X-Requested-With", "XMLHttpRequest")
        .body("cmd=loadStream&streamName=alerts&providers=%7B%7D&forOverview=false")
        .send()
        .await
        .map_err(|error| AlertsFetchError::Other(format!("alerts request failed: {error}")))?;

    let final_url = response.url().to_string();
    let content_type = response
        .headers()
        .get(CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default()
        .to_ascii_lowercase();

    let payload_text = response
        .text()
        .await
        .map_err(|error| AlertsFetchError::Other(format!("alerts response read failed: {error}")))?;

    let trimmed = payload_text.trim_start();
    let looks_like_login_page = final_url.contains("/webapps/login")
        || final_url.contains("/iaaa/")
        || (content_type.contains("text/html")
            && (trimmed.starts_with("<!DOCTYPE html")
                || trimmed.starts_with("<html")
                || payload_text.contains("bb-sso-BBLEARN")
                || payload_text.contains("校园卡用户")
                || payload_text.contains("统一身份认证")));

    if looks_like_login_page {
        return Err(AlertsFetchError::AuthExpired(format!(
            "course session expired; redirected to {final_url}"
        )));
    }

    Ok(payload_text)
}

async fn fetch_unread_notifications_with_credentials(
    state: &CourseNotificationState,
    credentials: &CourseCredentials,
) -> Result<UnreadNotificationsResponse, String> {
    let client = get_or_create_blackboard_client(state)?;

    let payload_text = match request_alerts_payload(&client).await {
        Ok(payload_text) => payload_text,
        Err(AlertsFetchError::AuthExpired(_)) => {
            login_blackboard(&client, credentials).await?;
            request_alerts_payload(&client)
                .await
                .map_err(|error| match error {
                    AlertsFetchError::AuthExpired(message) => message,
                    AlertsFetchError::Other(message) => message,
                })?
        }
        Err(AlertsFetchError::Other(message)) => return Err(message),
    };

    let payload: StreamViewerResponse = serde_json::from_str(&payload_text)
        .map_err(|error| format!("alerts response parse failed: {error}"))?;

    Ok(extract_unread_notifications(payload))
}

async fn poll_course_notifications_once(
    app: &AppHandle,
    state: &CourseNotificationState,
) -> Result<(), String> {
    let credentials = {
        let guard = state
            .credentials
            .lock()
            .map_err(|error| format!("notification credentials lock poisoned: {error}"))?;
        guard.clone()
    };

    let Some(credentials) = credentials else {
        return Ok(());
    };

    let unread = fetch_unread_notifications_with_credentials(state, &credentials).await?;
    let current_ids: HashSet<String> = unread.items.iter().map(|item| item.id.clone()).collect();

    let newly_unread = {
        let mut guard = state
            .last_unread_ids
            .lock()
            .map_err(|error| format!("notification unread lock poisoned: {error}"))?;
        let delta: Vec<UnreadNotificationItem> = unread
            .items
            .iter()
            .filter(|item| !guard.contains(&item.id))
            .cloned()
            .collect();
        *guard = current_ids;
        delta
    };

    if !newly_unread.is_empty() {
        use tauri_plugin_notification::NotificationExt;

        let title = if newly_unread.len() == 1 {
            "PKU Art 新通知"
        } else {
            "PKU Art 多条新通知"
        };
        let body = if newly_unread.len() == 1 {
            newly_unread[0].title.clone()
        } else {
            format!("{} 条未读通知，最新一条：{}", newly_unread.len(), newly_unread[0].title)
        };

        app.notification()
            .builder()
            .title(title)
            .body(body)
            .show()
            .map_err(|error| error.to_string())?;
    }

    Ok(())
}

fn ensure_course_notification_polling(app: &AppHandle) -> Result<(), String> {
    let state = app.state::<CourseNotificationState>();

    {
        let mut guard = state
            .polling_started
            .lock()
            .map_err(|error| format!("notification polling lock poisoned: {error}"))?;
        if *guard {
            return Ok(());
        }
        *guard = true;
    }

    let app_handle = app.clone();
    tauri::async_runtime::spawn(async move {
        loop {
            let state = app_handle.state::<CourseNotificationState>();
            if let Err(error) = poll_course_notifications_once(&app_handle, &state).await {
                eprintln!("course notification polling failed: {error}");
            }

            tokio::time::sleep(ALERTS_POLL_INTERVAL).await;
        }
    });

    Ok(())
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

fn maybe_open_downloaded_file(
    app: &AppHandle,
    file_path: &str,
    open_after_download: bool,
) -> Result<(), String> {
    if !open_after_download {
        return Ok(());
    }

    #[cfg(mobile)]
    {
        let _ = app;
        let _ = file_path;
        return Ok(());
    }

    app.opener()
        .open_path(file_path, None::<&str>)
        .map_err(|error| error.to_string())
}

#[command]
pub fn get_runtime_info<R: tauri::Runtime>(app: AppHandle<R>) -> Result<RuntimeInfo, String> {
    let webview_info = android_file_opener::get_webview_info(&app)?;

    Ok(RuntimeInfo {
        app_version: app.package_info().version.to_string(),
        webview_package_name: webview_info.as_ref().and_then(|info| info.package_name.clone()),
        webview_version_name: webview_info.as_ref().and_then(|info| info.version_name.clone()),
        webview_version_code: webview_info.and_then(|info| info.version_code),
    })
}

#[command]
pub async fn download_file(
    app: AppHandle,
    params: DownloadFileParams,
) -> Result<DownloadResult, String> {
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

            let mut file = File::create(&file_path).unwrap();
            file.write_all(&bytes).unwrap();
            maybe_open_downloaded_file(&app, &file_path, params.open_after_download)?;
            show_toast(
                &window,
                &get_download_message_with_lang(MessageType::Success, params.language.clone()),
            );
            Ok(DownloadResult { path: file_path })
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
) -> Result<DownloadResult, String> {
    let window: WebviewWindow = app.get_webview_window("pake").unwrap();
    show_toast(
        &window,
        &get_download_message_with_lang(MessageType::Start, params.language.clone()),
    );
    let output_path = app.path().download_dir().unwrap().join(params.filename);
    let file_path = check_file_or_append(output_path.to_str().unwrap());
    let download_file_result = fs::write(&file_path, &params.binary);
    match download_file_result {
        Ok(_) => {
            maybe_open_downloaded_file(&app, &file_path, params.open_after_download)?;
            show_toast(
                &window,
                &get_download_message_with_lang(MessageType::Success, params.language.clone()),
            );
            Ok(DownloadResult { path: file_path })
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

#[command]
pub async fn sync_course_credentials(
    app: AppHandle,
    state: State<'_, CourseNotificationState>,
    params: CourseCredentialsParams,
) -> Result<(), String> {
    {
        let mut guard = state
            .credentials
            .lock()
            .map_err(|error| format!("notification credentials lock poisoned: {error}"))?;
        *guard = Some(CourseCredentials {
            user_name: params.user_name,
            password: params.password,
        });
    }
    {
        let mut guard = state
            .client
            .lock()
            .map_err(|error| format!("notification client lock poisoned: {error}"))?;
        *guard = Some(build_blackboard_client()?);
    }
    {
        let mut guard = state
            .last_unread_ids
            .lock()
            .map_err(|error| format!("notification unread lock poisoned: {error}"))?;
        guard.clear();
    }

    ensure_course_notification_polling(&app)?;
    Ok(())
}

#[command]
pub async fn fetch_unread_notifications(
    app: AppHandle,
    state: State<'_, CourseNotificationState>,
) -> Result<UnreadNotificationsResponse, String> {
    ensure_course_notification_polling(&app)?;

    let credentials = {
        let guard = state
            .credentials
            .lock()
            .map_err(|error| format!("notification credentials lock poisoned: {error}"))?;
        guard
            .clone()
            .ok_or_else(|| "course credentials are not available yet".to_string())?
    };

    fetch_unread_notifications_with_credentials(&state, &credentials).await
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
