import { downloadIcon, linkIcon, sparkIcon, refreshIcon, closeIcon, homeIcon, gradeIcon, notificationIcon, announcementIcon, menuIcon } from './icon.js';
import '@saurl/tauri-plugin-safe-area-insets-css-api';
import { Store } from '@tauri-apps/plugin-store';
import { fetch as fetch_rs } from '@tauri-apps/plugin-http';
import { saveLogs, clearLogs } from './logger.js';

let store = null;
async function getStore() {
  if (!store) {
    store = await Store.load('user.json');
  }
  return store;
}

if (import.meta.env.MODE == 'tauri') {
    window.fetch_rs = fetch_rs;
    window.Store = Store;
}
// Other utilities
function initializeLogoNavigation() {
    if (!/^https:\/\/course\.pku\.edu\.cn\//.test(window.location.href)) {
        return;
    }

    const handleLogoClick = (event) => {
        const navArea = event.currentTarget;
        const clickOffsetX = event.clientX - navArea.getBoundingClientRect().left;
        if (clickOffsetX <= 150) {
            window.location.href = 'https://course.pku.edu.cn';
        }
    };

    const bindLogoNavigation = () => {
        const navArea = document.getElementById('globalNavPageNavArea');
        if (navArea && !navArea.dataset.pkuArtLogoBound) {
            navArea.addEventListener('click', handleLogoClick);
            navArea.dataset.pkuArtLogoBound = 'true';
        }
    };

    bindLogoNavigation();
    document.addEventListener('DOMContentLoaded', bindLogoNavigation);
}

function ensureSidebarVisible() {
    if (!/^https:\/\/course\.pku\.edu\.cn\//.test(window.location.href)) {
        return;
    }

    const resetNavigationPane = () => {
        const navigationPane = document.getElementById('navigationPane');
        if (navigationPane && navigationPane.classList.contains('navcollapsed')) {
            const puller = document.getElementById('menuPuller');
            if (puller) {
                puller.click();
                console.log('[PKU Art] sidebar reseted by auto click at ' + new Date().toLocaleString());
            }
        }
    };

    resetNavigationPane();
    window.addEventListener('resize', resetNavigationPane);
}

function overrideSiteIcons() {
    if (!/^https:\/\/(course|autolab|disk|elective)\.pku\.edu\.cn\//.test(window.location.href)) {
        return;
    }

    console.log('[PKU Art] overrideSiteIcons() has been used at ' + new Date().toLocaleString());

    const replaceIcons = () => {
        const all_icons = document.querySelectorAll('link[rel="icon" i], link[rel="shortcut icon" i]');
        const not_custom_icons = document.querySelectorAll(
            'link[rel="icon" i]:not([href^="https://cdn.arthals.ink/"]), link[rel="shortcut icon" i]:not([href^="https://cdn.arthals.ink/"])'
        );
        if (all_icons.length == 0 || not_custom_icons.length > 0) {
            not_custom_icons.forEach((icon) => {
                icon.parentNode.removeChild(icon);
            });
            const newIcon = document.createElement('link');
            newIcon.rel = 'SHORTCUT ICON';
            newIcon.href = 'https://cdn.arthals.ink/css/src/PKU.svg';
            document.head.appendChild(newIcon);

            const appleIcon16 = document.createElement('link');
            appleIcon16.rel = 'icon';
            appleIcon16.type = 'image/png';
            appleIcon16.sizes = '16x16';
            appleIcon16.href = 'https://cdn.arthals.ink/css/src/pku_16x16.png';
            document.head.appendChild(appleIcon16);

            const appleIcon32 = document.createElement('link');
            appleIcon32.rel = 'icon';
            appleIcon32.type = 'image/png';
            appleIcon32.sizes = '32x32';
            appleIcon32.href = 'https://cdn.arthals.ink/css/src/pku_32x32.png';
            document.head.appendChild(appleIcon32);

            const appleIconTouch = document.createElement('link');
            appleIconTouch.rel = 'apple-touch-icon';
            appleIconTouch.sizes = '180x180';
            appleIconTouch.href = 'https://cdn.arthals.ink/css/src/pku_180x180.png';
            document.head.appendChild(appleIconTouch);
        }
    };

    replaceIcons();
    document.addEventListener('DOMContentLoaded', replaceIcons);

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                replaceIcons();
            }
        });
    });

    const observeHead = () => {
        if (document.head) {
            observer.observe(document.head, { childList: true, subtree: true });
        }
    };

    observeHead();
    document.addEventListener('DOMContentLoaded', observeHead);
}

function removeCourseSerialNumbers() {
    const url = window.location.href;

    const isPortalPage =
        /^https:\/\/course\.pku\.edu\.cn\/webapps\/?$|^https:\/\/course\.pku\.edu\.cn\/webapps\/portal\/\S*$/.test(url);
    const isAlertsStreamPage =
        /^https:\/\/course\.pku\.edu\.cn\/webapps\/streamViewer\/streamViewer\S*streamName=alerts\S*$/.test(url);

    if (isPortalPage) {
        const stripPortalSerials = () => {
            const courseLinks = document.querySelectorAll(
                '.containerPortal > div:not(:first-child) .portlet .portletList-img > li > a'
            );
            courseLinks.forEach((courseLink) => {
                courseLink.innerHTML = courseLink.innerHTML
                    .replace(/^.*?: /, '')
                    .replace(/\(\d+-\d+学年第\d学期.*?\)/, '');
            });
            console.log('[PKU Art] course serial deleted: ' + courseLinks.length + ' courses');
        };

        stripPortalSerials();
        document.addEventListener('DOMContentLoaded', stripPortalSerials);
    }

    if (isAlertsStreamPage) {
        let alertCleanupTimer;
        const stripAlertSerials = () => {
            const courseLinks = document.querySelectorAll('#streamHeader_alerts a');
            courseLinks.forEach((courseLink) => {
                courseLink.innerHTML = courseLink.innerHTML.replace(/\(\d+-\d+学年第\d学期\)/, '');
            });
            if (courseLinks.length !== 0 && alertCleanupTimer) {
                clearInterval(alertCleanupTimer);
            }
        };

        stripAlertSerials();
        alertCleanupTimer = setInterval(() => {
            const courseLinks = document.querySelectorAll('#streamHeader_alerts a');
            if (courseLinks.length !== 0) {
                stripAlertSerials();
            }
        }, 50);
    }

    let alertCleanupTimer;
    const stripAlertSerials = () => {
        const courseLinks = document.querySelectorAll('#streamDetailHeaderRightClickable a , .stream_area_name, .coursePath a , a#courseMenu_link, .announcementInfo p');
        courseLinks.forEach((courseLink) => {
            courseLink.innerHTML = courseLink.innerHTML.replace(/\(\d+-\d+学年第\d学期\)/, '');
        });
        if (courseLinks.length !== 0 && alertCleanupTimer) {
            clearInterval(alertCleanupTimer);
        }
    };

    stripAlertSerials();
    alertCleanupTimer = setInterval(() => {
        const courseLinks = document.querySelectorAll('#streamDetailHeaderRightClickable a , .stream_area_name, .coursePath a , a#courseMenu_link, .announcementInfo p');
        if (courseLinks.length !== 0) {
            stripAlertSerials();
        }
    }, 50);

    const removeContextMenuSerials = () => {
        const contextMenuOpenLink = document.querySelector("#breadcrumbs .coursePath .courseArrow a")
        const doRemoveContextMenuSerials = () => {
            contextMenuOpenLink.removeEventListener('mouseover', doRemoveContextMenuSerials)
            contextMenuOpenLink.removeEventListener('click', doRemoveContextMenuSerials)
            const waitForContextMenuReadyInterval = setInterval(() => {
                console.log("[PKU Art] Waiting for context menu ready...")
                if (contextMenuOpenLink.savedDiv.querySelector('li[id^="最近访问"]')) {
                    clearInterval(waitForContextMenuReadyInterval)
                    contextMenuOpenLink.savedDiv.innerHTML = contextMenuOpenLink.savedDiv.innerHTML.replace(/\(\d+-\d+学年第\d学期\)/g, '')
                    const emptyMenu = contextMenuOpenLink.savedDiv.querySelector('ul[role="presentation"]:has(.contextmenu_empty)')
                    if (emptyMenu) {
                        contextMenuOpenLink.savedDiv.removeChild(emptyMenu)
                        console.log("[PKU Art] Removed empty context menu")
                    } 
                }
            }, 100)
        }
        if (contextMenuOpenLink) {
            contextMenuOpenLink.addEventListener('mouseover', doRemoveContextMenuSerials)
            // if somehow the user clicks before mouseover :(
            contextMenuOpenLink.addEventListener('click', doRemoveContextMenuSerials)
            contextMenuOpenLink.addEventListener('click', registerCloseContextMenuOnPage)
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', removeContextMenuSerials);
    }
    else { 
        removeContextMenuSerials();
    }
}

async function initializeDirectDownload() {
    const url = window.location.href;

    // 检查当前URL是否匹配特定格式
    if (!/^https:\/\/onlineroomse\.pku\.edu\.cn\/player\?course_id\S*$/.test(url)) return;

    console.log('[PKU Art] Injected directDownload() at ' + new Date().toLocaleString());

    // 下载链接、课程名、录播时间
    let downloadUrl = '';
    let downloadJson = '';
    let courseName = '';
    let subTitle = '';
    let lecturerName = '';
    let fileName = '';

    let JWT = '';

    const RELOAD_ATTEMPTS_KEY = 'PKU_ART_DIRECT_DOWNLOAD_RELOAD_ATTEMPTS';
    const MAX_RELOAD_ATTEMPTS = 3;

    const originalSend = XMLHttpRequest.prototype.send;
    const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

    XMLHttpRequest.prototype.setRequestHeader = function (header, value) {
        if (!this._headers) {
            this._headers = {};
        }
        this._headers[header] = value;
        originalSetRequestHeader.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function () {
        this.addEventListener('load', function () {
            if (this.responseURL.includes('get-sub-info-by-auth-data')) {
                downloadJson = JSON.parse(this.response);
                try {
                    sessionStorage.removeItem(RELOAD_ATTEMPTS_KEY);
                } catch (error) {
                    console.warn('[PKU Art] 无法清除重载计数', error);
                }

                if (this._headers) {
                    for (const headerName in this._headers) {
                        if (headerName.toLowerCase() === 'authorization') {
                            JWT = this._headers[headerName].split(' ')[1];
                            break;
                        }
                    }
                }

                if (JWT) {
                    console.log('[PKU Art] 成功捕获到 JWT:\n', JWT);
                } else {
                    console.log('[PKU Art] 未在此请求中找到 JWT。');
                }

                console.log('[PKU Art] XHR 响应结果：\n', downloadJson);
                courseName = downloadJson.list[0].title;
                subTitle = downloadJson.list[0].sub_title;
                lecturerName = downloadJson.list[0].lecturer_name;
                fileName = `${courseName} - ${subTitle} - ${lecturerName}.mp4`;
                const filmContent = JSON.parse(downloadJson.list[0].sub_content);
                const isM3u8 = filmContent.save_playback.is_m3u8;
                let resolvedDownloadUrl = '';
                if (isM3u8 == 'yes') {
                    const m3u8 = filmContent.save_playback.contents;
                    const m3u8Pattern =
                        /https:\/\/resourcese\.pku\.edu\.cn\/play\/0\/harpocrates\/\d+\/\d+\/\d+\/([a-zA-Z0-9]+)(\/.+)\/playlist\.m3u8.*/;
                    const hash = m3u8.match(m3u8Pattern)[1];
                    resolvedDownloadUrl = `https://course.pku.edu.cn/webapps/bb-streammedia-hqy-BBLEARN/downloadVideo.action?resourceId=${hash}`;
                    console.log('[PKU Art] m3u8 下载链接转换成功：\n', resolvedDownloadUrl);
                } else {
                    resolvedDownloadUrl = filmContent.save_playback.contents;
                }
                downloadUrl = resolvedDownloadUrl;
                console.log('[PKU Art] 下载链接解析成功：\n', downloadUrl);
            }
        });
        originalSend.apply(this, arguments);
    };

    // 等待页面加载完成
    const INJECTION_OBSERVATION_MS = 3000;
    const didCaptureDownloadInfo = await new Promise((resolve) => {
        const injectionStartTime = Date.now();
        const checkExist = setInterval(() => {
            const footer = document.querySelector('.course-info__wrap .course-info__footer');
            if (downloadJson && footer) {
                console.log('[PKU Art] 页面加载完成，下载链接解析成功\n', downloadJson);
                clearInterval(checkExist);
                resolve(true);
                return;
            }

            if (footer && !downloadJson && Date.now() - injectionStartTime >= INJECTION_OBSERVATION_MS) {
                clearInterval(checkExist);
                let shouldContinue = true;
                try {
                    let currentAttempts = Number(sessionStorage.getItem(RELOAD_ATTEMPTS_KEY) || '0');
                    if (Number.isNaN(currentAttempts) || currentAttempts < 0) {
                        currentAttempts = 0;
                    }
                    if (currentAttempts >= MAX_RELOAD_ATTEMPTS) {
                        console.warn(`[PKU Art] 已尝试强制重载 ${currentAttempts} 次，停止自动重载`);
                    } else {
                        sessionStorage.setItem(RELOAD_ATTEMPTS_KEY, String(currentAttempts + 1));
                        console.warn('[PKU Art] 未能及时截获课程数据，即将刷新页面重试');
                        shouldContinue = false;
                        window.location.reload();
                    }
                } catch (error) {
                    console.warn('[PKU Art] 记录重载次数失败，尝试通过刷新页面恢复', error);
                    shouldContinue = false;
                    window.location.reload();
                }
                resolve(shouldContinue);
            }
        }, 500);
    });
    if (!didCaptureDownloadInfo || !downloadJson) {
        return;
    }

    const downloadAreaFooter = document.querySelector('.course-info__wrap .course-info__footer');
    if (!downloadAreaFooter) {
        console.warn('[PKU Art] 未找到 course-info__footer，无法注入下载功能');
        return;
    }

    const replayTitle = document.querySelector('.course-info__wrap .course-info__header > span');
    if (replayTitle) {
        replayTitle.innerText = `${courseName} - ${subTitle} - ${lecturerName}`;
    }

    while (downloadAreaFooter.firstChild) {
        downloadAreaFooter.removeChild(downloadAreaFooter.firstChild);
    }

    const createFooterButton = (id, label, icon) => {
        const button = document.createElement('button');
        button.id = id;
        button.type = 'button';
        button.className = 'PKU-Art';
        button.innerHTML = `<span class="PKU-Art">${icon}</span><span class="PKU-Art">${label}</span>`;
        return button;
    };

    const downloadButton = createFooterButton('injectDownloadButton', '下载视频', downloadIcon);
    const copyDownloadUrlButton = createFooterButton('injectCopyDownloadUrlButton', '复制链接地址', linkIcon);
    const magicLink = createFooterButton('injectMagicLink', '妙妙小工具', sparkIcon);

    const downloadSwitchArea = document.createElement('div');
    downloadSwitchArea.id = 'injectDownloadSwitchArea';
    downloadSwitchArea.className = 'PKU-Art';
    downloadSwitchArea.innerHTML = `
<input type="checkbox" id="injectDownloadSwitch" class="PKU-Art" checked>
<label for="injectDownloadSwitch"></label>
<span id="injectDownloadSwitchDesc" class="PKU-Art"> 重命名文件</span>
`;

    // 点击整个区域切换 checkbox 状态
    downloadSwitchArea.addEventListener('click', (e) => {
        // 如果点击的是 checkbox 或关联的 label，浏览器会自动处理切换
        const isCheckboxOrLabel = e.target.id === 'injectDownloadSwitch' || e.target.htmlFor === 'injectDownloadSwitch';
        if (!isCheckboxOrLabel) {
            const checkbox = downloadSwitchArea.querySelector('#injectDownloadSwitch');
            checkbox.checked = !checkbox.checked;
        }
    });

    downloadAreaFooter.appendChild(downloadButton);
    downloadAreaFooter.appendChild(copyDownloadUrlButton);
    downloadAreaFooter.appendChild(downloadSwitchArea);
    downloadAreaFooter.appendChild(magicLink);

    magicLink.addEventListener('click', async () => {
        // alert(JWT);
        try {
            if (typeof GM_setClipboard === 'function') {
                GM_setClipboard(JWT);
            } else if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(JWT);
            } else {
                throw new Error('clipboard unsupported');
            }
        } catch (error) {
            console.warn('[PKU Art] 复制 JWT 失败，仅在控制台输出', error);
            console.log('[PKU Art] JWT:', JWT);
        }
        window.open('https://course.huh.moe', '_blank');
    });

    const switchInput = downloadSwitchArea.querySelector('#injectDownloadSwitch');
    const isSafari = navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome');
    const renameSupported = typeof GM_download === 'function';
    if (!renameSupported) {
        // 删除原有的 switchArea，创建新的提示元素追加到末尾，并切换为 3 列布局
        downloadSwitchArea.remove();
        downloadAreaFooter.classList.add('rename-unsupported');
        const renameUnsupportedTip = document.createElement('div');
        renameUnsupportedTip.id = 'injectDownloadRenameUnsupported';
        renameUnsupportedTip.className = 'PKU-Art';
        const warningIcon = isSafari ? '<span class="PKU-Art i-warning"></span>' : '';
        const tipText = isSafari ? 'Safari + UserScripts 不支持重命名文件' : '当前环境不支持自动重命名文件';
        renameUnsupportedTip.innerHTML = `${warningIcon}<span class="PKU-Art">${tipText}</span>`;
        downloadAreaFooter.appendChild(renameUnsupportedTip);
    }

    const copySupported =
        typeof GM_setClipboard === 'function' || (navigator.clipboard && navigator.clipboard.writeText);
    if (!copySupported) {
        copyDownloadUrlButton.disabled = true;
        copyDownloadUrlButton.querySelector('span').textContent = '复制链接不可用';
    }

    // 下载状态管理
    let currentDownload = null;
    let isDownloading = false;

    const startDownload = (renameEnabled) => {
        const downloadTipText = document.getElementById('injectDownloadTipText');
        const cancelBtn = document.getElementById('injectCancelDownload');
        const restartBtn = document.getElementById('injectRestartDownload');

        let downloadInfo = `下载文件名：${fileName}<br/>下载地址：<a target="_blank" href="${downloadUrl}">文件源地址</a>`;
        if (!renameEnabled) {
            downloadInfo = `正常文件名：${fileName}<br/>下载地址：<a target="_blank" href="${downloadUrl}">文件源地址</a>`;
        }

        if (!renameEnabled) {
            window.open(downloadUrl, '_blank');
            downloadTipText.innerHTML = `已在新窗口启动下载<br/>${downloadInfo}`;
            cancelBtn.disabled = true;
            restartBtn.disabled = false;
            isDownloading = false;
            return;
        }

        isDownloading = true;
        cancelBtn.disabled = false;
        restartBtn.disabled = true;
        downloadTipText.innerHTML = `已在后台启动下载，请勿刷新页面<br/>${downloadInfo}`;

        try {
            let lastPrintTime = 0;
            let lastBytesLoaded = 0;
            let averageSpeed = 0;
            const SMOOTHING_FACTOR = 0.02;

            currentDownload = GM_download({
                url: downloadUrl,
                name: fileName,
                saveAs: true,
                onerror(event) {
                    console.error('[PKU Art] 下载失败：', event);
                    isDownloading = false;
                    cancelBtn.disabled = true;
                    restartBtn.disabled = false;
                    downloadTipText.innerHTML = `下载失败：${event.error}<br/>${downloadInfo}`;
                },
                onprogress(event) {
                    const currentTime = Date.now();
                    if (event.total && currentTime - lastPrintTime >= 100) {
                        const percentComplete = (event.loaded / event.total) * 100;
                        const currentProgress = percentComplete.toFixed(2);

                        const bytesDownloadedInLast100ms = event.loaded - lastBytesLoaded;
                        const lastSpeed = bytesDownloadedInLast100ms / (currentTime - lastPrintTime);
                        averageSpeed = SMOOTHING_FACTOR * lastSpeed + (1 - SMOOTHING_FACTOR) * averageSpeed;

                        const bytesRemaining = event.total - event.loaded;
                        const estimatedTimeRemaining = bytesRemaining / averageSpeed;
                        let estimatedTimeRemainingSeconds = Math.round(estimatedTimeRemaining / 1000);
                        if (Number.isNaN(estimatedTimeRemainingSeconds) || estimatedTimeRemainingSeconds > 9999) {
                            estimatedTimeRemainingSeconds = 'inf';
                        }

                        downloadTipText.innerHTML = `已在后台启动下载，请勿刷新页面。<br/>下载进度：${currentProgress}%，预计剩余时间：${estimatedTimeRemainingSeconds}秒<br/>${downloadInfo}`;
                        lastPrintTime = currentTime;
                        lastBytesLoaded = event.loaded;
                    }
                },
                onload() {
                    isDownloading = false;
                    cancelBtn.disabled = true;
                    restartBtn.disabled = false;
                    downloadTipText.innerHTML = `下载完成<br/>${downloadInfo}`;
                },
            });

            window.addEventListener(
                'beforeunload',
                () => {
                    if (currentDownload) {
                        currentDownload.abort();
                    }
                },
                { once: true }
            );
        } catch (error) {
            console.warn('[PKU Art] GM_download 调用失败，回退到新窗口下载', error);
            window.open(downloadUrl, '_blank');
            isDownloading = false;
            cancelBtn.disabled = true;
            restartBtn.disabled = false;
            downloadTipText.innerHTML = `已在新窗口启动下载<br/>正常文件名：${fileName}<br/>下载地址：<a target="_blank" href="${downloadUrl}">文件源地址</a>`;
            alert('看上去当前环境不支持自动重命名功能，已尝试使用新标签页下载');
        }
    };

    downloadButton.addEventListener('click', async () => {
        console.log(`[PKU Art] 已启动下载：\n文件名：${fileName}\n源地址：${downloadUrl}`);
        const renameEnabled = renameSupported && switchInput && switchInput.checked;

        const existingTip = document.getElementById('injectDownloadTip');
        if (existingTip) {
            if (isDownloading) {
                alert('正在下载中，请先取消当前下载');
                return;
            }
            // 已有提示框但不在下载中，直接开始新下载
            startDownload(renameEnabled);
            return;
        }

        // 创建下载提示框
        const downloadTip = document.createElement('div');
        downloadTip.id = 'injectDownloadTip';
        downloadTip.className = 'PKU-Art';

        const downloadTipText = document.createElement('div');
        downloadTipText.id = 'injectDownloadTipText';
        downloadTipText.className = 'PKU-Art';

        const downloadTipActions = document.createElement('div');
        downloadTipActions.id = 'injectDownloadTipActions';
        downloadTipActions.className = 'PKU-Art';

        const cancelBtn = document.createElement('button');
        cancelBtn.id = 'injectCancelDownload';
        cancelBtn.className = 'PKU-Art';
        cancelBtn.innerHTML = `${closeIcon}<span>取消下载</span>`;
        cancelBtn.disabled = true;

        const restartBtn = document.createElement('button');
        restartBtn.id = 'injectRestartDownload';
        restartBtn.className = 'PKU-Art';
        restartBtn.innerHTML = `${refreshIcon}<span>重新下载</span>`;
        restartBtn.disabled = true;

        cancelBtn.addEventListener('click', () => {
            if (currentDownload && isDownloading) {
                currentDownload.abort();
                currentDownload = null;
                isDownloading = false;
                cancelBtn.disabled = true;
                restartBtn.disabled = false;
                downloadTipText.innerHTML = `下载已取消<br/>下载文件名：${fileName}<br/>下载地址：<a target="_blank" href="${downloadUrl}">文件源地址</a>`;
            }
        });

        restartBtn.addEventListener('click', () => {
            const renameEnabled = renameSupported && switchInput && switchInput.checked;
            startDownload(renameEnabled);
        });

        downloadTipActions.appendChild(cancelBtn);
        downloadTipActions.appendChild(restartBtn);
        downloadTip.appendChild(downloadTipText);
        downloadTip.appendChild(downloadTipActions);
        downloadAreaFooter.insertBefore(downloadTip, downloadAreaFooter.firstElementChild);

        startDownload(renameEnabled);
    });

    copyDownloadUrlButton.addEventListener('click', async () => {
        if (copyDownloadUrlButton.disabled) {
            return;
        }
        console.log(`[PKU Art] 已复制下载链接：\n${downloadUrl}`);
        try {
            if (typeof GM_setClipboard === 'function') {
                GM_setClipboard(downloadUrl);
            } else if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(downloadUrl);
            } else {
                throw new Error('clipboard unsupported');
            }
            alert('下载链接已复制到剪贴板，但是因为存在鉴权，仍可能无法直接使用外部工具下载');
        } catch (error) {
            console.warn('[PKU Art] 复制下载链接失败，将提供备用方案', error);
            const manualCopy = prompt('复制下载链接失败，请手动复制下面的链接', downloadUrl);
            if (manualCopy === null) {
                alert('未能复制下载链接，请尝试手动选中复制');
            }
        }
    });
}

async function initializeSparkDownloadRename() {
    if (!/^https:\/\/course\.huh\.moe\/course\/\d+$/.test(window.location.href)) {
        return;
    }

    const updateDownloadLinks = () => {
        // 找到所有带有 download 属性且 href 以 http://resourcese.pku.edu.cn 开头的 a 标签
        const downloadLinks = document.querySelectorAll('a[download][href^="http://resourcese.pku.edu.cn"]');
        downloadLinks.forEach((link) => {
            const href = link.getAttribute('href');
            const downloadUrl = href.replace('http://resourcese.pku.edu.cn', 'https://resourcese.pku.edu.cn');
            const fileName = link.getAttribute('data-filename');
            link.setAttribute('href', downloadUrl);
            link.addEventListener('click', (event) => {
                event.preventDefault();
                alert('即将下载文件：' + fileName);
                GM_download({
                    url: downloadUrl,
                    name: fileName,
                    saveAs: true,
                });
            });
        });
    };
    updateDownloadLinks();
    document.addEventListener('DOMContentLoaded', updateDownloadLinks);
}

function redirectGlobalMoreLink() {
    if (!/^https:\/\/course\.pku\.edu\.cn\//.test(window.location.href)) {
        return;
    }

    let intervalId;

    const updateMoreLink = () => {
        const moreLink = document.querySelector('#global-more-link > a');
        if (moreLink) {
            console.log('[PKU Art] replaceMore() has been used at ' + new Date().toLocaleString());
            moreLink.href =
                '/webapps/bb-social-learning-BBLEARN/execute/mybb?cmd=display&toolId=MyGradesOnMyBb_____MyGradesTool';
            if (intervalId) {
                clearInterval(intervalId);
            }
        }
    };

    intervalId = setInterval(updateMoreLink, 50);
    document.addEventListener('DOMContentLoaded', updateMoreLink);
}

function enableDirectOpenLinks() {
    if (!/^https:\/\/course\.pku\.edu\.cn\//.test(window.location.href)) {
        return;
    }

    const stripOnclickHandlers = () => {
        const links = document.querySelectorAll('a[onclick][href]');

        links.forEach((link) => {
            if (link.dataset.pkuArtProcessed) return;

            const href = link.getAttribute('href');
            // 只打开外链，不打开内链
            if (href && !href.startsWith('/') && !href.startsWith('#')) {
                link.removeAttribute('onclick');
                console.log('[PKU Art] 直接打开链接:', href);
            }
            link.dataset.pkuArtProcessed = 'true';
        });
    };

    stripOnclickHandlers();

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                stripOnclickHandlers();
            }
        });
    });

    const observeBody = () => {
        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true,
            });
        }
    };

    observeBody();

    if (!document.body) {
        document.addEventListener('DOMContentLoaded', observeBody);
    }

    document.addEventListener('DOMContentLoaded', stripOnclickHandlers);
}

function restoreCourseQueryValues() {
    // https://elective.pku.edu.cn/elective2008/edu/pku/stu/elective/controller/courseQuery/getCurriculmByForm.do
    if (
        !/^https:\/\/elective\.pku\.edu\.cn\/elective2008\/edu\/pku\/stu\/elective\/controller\/courseQuery\/\S*$/.test(
            window.location.href
        )
    ) {
        return;
    }

    console.log('[PKU Art] restoreCourseQueryValues() has been used at ' + new Date().toLocaleString());

    const courseID = document.querySelector('#courseID');
    const courseName = document.querySelector('#courseName');

    if (!courseID || !courseName) return;

    let savedID = courseID.value;
    let savedName = courseName.value;

    // 监听 #kcfl 的点击事件来更新保存的值
    document.querySelector('#kcfl')?.addEventListener(
        'click',
        function (e) {
            if (e.target.matches('input[type=radio]')) {
                savedID = courseID.value;
                savedName = courseName.value;

                // 立即恢复
                requestAnimationFrame(() => {
                    if (courseID.value === '') courseID.value = savedID;
                    if (courseName.value === '') courseName.value = savedName;
                });
            }
        },
        true
    );

    // 使用 MutationObserver 作为双重保险
    const observer = new MutationObserver(() => {
        if (courseID.value === '' && savedID) courseID.value = savedID;
        if (courseName.value === '' && savedName) courseName.value = savedName;
    });

    observer.observe(courseID, { attributes: true, attributeFilter: ['value'] });
    observer.observe(courseName, { attributes: true, attributeFilter: ['value'] });
}

function refactorCourseQueryPagination() {
    if (
        !/^https:\/\/elective\.pku\.edu\.cn\/elective2008\/edu\/pku\/stu\/elective\/controller\/courseQuery\/(getCurriculmByForm\.do|queryCurriculum\.jsp)/.test(
            window.location.href
        )
    ) {
        return;
    }
    const refactor = () => {
        const lastTd = [...document.querySelectorAll('td[align="right"]')].pop();
        console.log('[PKU Art] refactorCourseQueryPagination() has been used at ' + new Date().toLocaleString());
        // console.log('[PKU Art] lastTd:', lastTd);

        if (lastTd && !document.querySelector('.navigation-area')) {
            const table = lastTd.closest('table');
            if (table) {
                const div = document.createElement('div');
                div.innerHTML = lastTd.innerHTML;
                div.style.textAlign = 'right';
                table.insertAdjacentElement('afterend', div);
                div.classList.add('navigation-area');
                lastTd.remove();
            }
        }
    };
    refactor();
    document.addEventListener('DOMContentLoaded', refactor);
}

function formValueStorage() {
    // 检查URL是否匹配
    if (
        !/^https:\/\/elective\.pku\.edu\.cn\/elective2008\/edu\/pku\/stu\/elective\/controller\/courseQuery\/\S*$/.test(
            window.location.href
        )
    ) {
        return;
    }

    const STORAGE_KEY = 'pku_elective_form_values';
    const form = document.getElementById('qyForm');

    if (!form) {
        console.warn('未找到 id="qyForm" 的表单');
        return;
    }

    // 获取所有需要监听的 input 元素
    function getTargetInputs() {
        const allInputs = form.querySelectorAll('input');
        return Array.from(allInputs).filter((input) => input.id !== 'b_cancel' && input.id !== 'b_query');
    }

    // 保存表单值到 localStorage
    function saveFormValues() {
        const inputs = getTargetInputs();
        const formData = {};

        inputs.forEach((input) => {
            const key = input.id || input.name || input.getAttribute('data-key');
            if (key) {
                if (input.type === 'checkbox' || input.type === 'radio') {
                    formData[key] = input.checked;
                } else {
                    formData[key] = input.value;
                }
            }
        });

        localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
    }

    // 从 localStorage 还原表单值
    function restoreFormValues() {
        const savedData = localStorage.getItem(STORAGE_KEY);

        if (!savedData) {
            return;
        }

        try {
            const formData = JSON.parse(savedData);
            const inputs = getTargetInputs();

            inputs.forEach((input) => {
                const key = input.id || input.name || input.getAttribute('data-key');

                if (key && formData.hasOwnProperty(key)) {
                    if (input.type === 'checkbox' || input.type === 'radio') {
                        input.checked = formData[key];
                    } else {
                        input.value = formData[key];
                    }
                }
            });
        } catch (e) {
            console.error('还原表单值失败:', e);
        }
    }

    // 清空存储
    function clearFormValues() {
        localStorage.removeItem(STORAGE_KEY);
    }

    // 页面加载时还原表单值
    restoreFormValues();

    // 监听所有目标 input 的变化
    const inputs = getTargetInputs();
    inputs.forEach((input) => {
        // 监听 input 事件（实时输入）
        input.addEventListener('input', saveFormValues);
        // 监听 change 事件（checkbox、radio、select 等）
        input.addEventListener('change', saveFormValues);
    });

    // 监听取消按钮
    const cancelBtn = document.getElementById('b_cancel');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function () {
            clearFormValues();
            // 可选：同时清空表单
            const inputs = getTargetInputs();
            inputs.forEach((input) => {
                if (input.type === 'checkbox' || input.type === 'radio') {
                    input.checked = false;
                } else {
                    input.value = '';
                }
            });
        });
    }
}

function removeEmptyTableRows() {
    if (
        !/^https:\/\/elective\.pku\.edu\.cn\/elective2008\/edu\/pku\/stu\/elective\/controller\/help\/faqForUnderGrad\.jsp\S*$/.test(
            window.location.href
        )
    ) {
        return;
    }

    const removeFunc = () => {
        const rows = document.querySelectorAll('table.datagrid tr');
        rows.forEach(function (tr) {
            if (tr.children.length === 1 && tr.firstElementChild.tagName === 'TD') {
                // 将非断行空格（NBSP）替换掉，再 trim
                const text = tr.firstElementChild.textContent.replace(/\u00A0/g, '').trim();
                if (text === '') {
                    tr.remove();
                }
            }
        });
    };
    removeFunc();
    document.addEventListener('DOMContentLoaded', removeFunc);
}

function insertHTMLForDebug() {
    const html_str = `<tr><td colspan="0"><table width="100%"><tbody><tr><td width="52px" valign="middle" class="message_success"><img src="/elective2008/resources/images/success.gif"></td><td width="100%" valign="middle">添加操作成功,请查看选课计划确认,之后请继续选课或者补选。</td></tr></tbody></table></td></tr>`;
    const url = `https://elective.pku.edu.cn/elective2008/edu/pku/stu/elective/controller/courseQuery/CourseQueryController.jpf`;

    if (!window.location.href.startsWith(url)) {
        return;
    }

    const debugFunc = () => {
        const target = document.querySelector('body > table:nth-child(3) > tbody');
        if (target) {
            // 在最开始插入 html
            target.insertAdjacentHTML('afterbegin', html_str);
            console.log('[PKU Art] insertHTMLForDebug() has been used at ' + new Date().toLocaleString());
        }
    };

    debugFunc();
    document.addEventListener('DOMContentLoaded', debugFunc);
}

function customizeIaaaRememberCheckbox() {
    if (!/^https:\/\/iaaa\.pku\.edu\.cn\/iaaa\/oauth\.jsp/.test(window.location.href)) {
        return;
    }

    const checkboxSelectors = [
        '#remember',
        '#remember_checkbox',
        '#rememberMe',
        'input[type="checkbox"][name="remember"]',
        'input[type="checkbox"][name="rememberMe"]',
    ];

    const findCheckbox = () => checkboxSelectors.map((selector) => document.querySelector(selector)).find(Boolean);

    const setupRememberToggle = () => {
        const rememberText = document.getElementById('remember_text');
        if (!rememberText) {
            return false;
        }

        const getNativeIcon = () => rememberText.querySelector('i');
        const ensureCustomIcon = () => {
            if (!rememberText.querySelector('.pku-art-remember-icon')) {
                const customIcon = document.createElement('span');
                customIcon.className = 'PKU-Art pku-art-remember-icon';
                customIcon.setAttribute('aria-hidden', 'true');
                rememberText.insertBefore(customIcon, rememberText.firstChild);
            }
        };

        const getCheckedState = () => {
            const checkbox = findCheckbox();
            if (checkbox) {
                return !!checkbox.checked;
            }
            const nativeIcon = getNativeIcon();
            if (nativeIcon) {
                return nativeIcon.classList.contains('fa-check-square-o');
            }
            return rememberText.classList.contains('is-checked');
        };

        const updateAppearance = () => {
            const checked = getCheckedState();
            rememberText.classList.toggle('is-checked', checked);
            rememberText.setAttribute('aria-checked', checked ? 'true' : 'false');
        };

        if (rememberText.dataset.pkuArtRememberBound !== 'true') {
            rememberText.dataset.pkuArtRememberBound = 'true';
            rememberText.classList.add('PKU-Art', 'pku-art-remember-toggle');
            rememberText.setAttribute('role', 'checkbox');
            rememberText.setAttribute('tabindex', '0');

            ensureCustomIcon();

            rememberText.addEventListener('click', () => {
                requestAnimationFrame(updateAppearance);
            });

            rememberText.addEventListener('keydown', (event) => {
                const isActivateKey = event.key === ' ' || event.key === 'Spacebar' || event.key === 'Enter';
                if (!isActivateKey) return;
                event.preventDefault();
                const checkbox = findCheckbox();
                if (checkbox) {
                    checkbox.click();
                } else {
                    rememberText.click();
                }
            });
        } else {
            ensureCustomIcon();
        }

        const rememberCheckbox = findCheckbox();
        if (rememberCheckbox) {
            rememberCheckbox.classList.add('PKU-Art', 'pku-art-remember-checkbox');
            if (rememberCheckbox.dataset.pkuArtRememberChangeBound !== 'true') {
                rememberCheckbox.addEventListener('change', updateAppearance);
                rememberCheckbox.dataset.pkuArtRememberChangeBound = 'true';
            }
            if (!rememberCheckbox._pkuArtRememberObserver) {
                const attributeObserver = new MutationObserver(updateAppearance);
                attributeObserver.observe(rememberCheckbox, {
                    attributes: true,
                    attributeFilter: ['checked'],
                });
                rememberCheckbox._pkuArtRememberObserver = attributeObserver;
            }
        } else {
            const nativeIcon = getNativeIcon();
            if (nativeIcon && !nativeIcon._pkuArtRememberObserver) {
                const iconObserver = new MutationObserver(updateAppearance);
                iconObserver.observe(nativeIcon, {
                    attributes: true,
                    attributeFilter: ['class'],
                });
                nativeIcon._pkuArtRememberObserver = iconObserver;
            }
        }

        updateAppearance();
        return true;
    };

    const ensureToggle = () => setupRememberToggle();

    if (!ensureToggle()) {
        const observer = new MutationObserver(() => {
            if (ensureToggle()) {
                observer.disconnect();
            }
        });

        const startObserver = () => {
            if (document.body) {
                observer.observe(document.body, { childList: true, subtree: true });
            }
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                if (!ensureToggle()) {
                    startObserver();
                } else {
                    observer.disconnect();
                }
            });
        } else {
            startObserver();
        }
    }
}

function registerCloseContextMenuOnPage() {
    const closeContextMenu = () => {
        page.ContextMenu.closeAllContextMenus()
        document.removeEventListener("click", closeContextMenu)
    }
    document.addEventListener("click", closeContextMenu);
}

function formatAnnouncementTime() {
    function processTimeElements() {
        const timeSpans = document.querySelectorAll('.details > p > span');
        
        timeSpans.forEach(span => {
            const originalText = span.textContent.trim();
            if (originalText.includes('发布时间:')) {
                const formattedText = formatChineseDateTime(originalText);
                if (formattedText !== originalText) {
                    span.textContent = formattedText;
                }
            }
        });
    }

    function formatChineseDateTime(text) {
        const match = text.match(/发布时间:\s*(\d{4})年(\d{1,2})月(\d{1,2})日\s+(星期[一二三四五六日])\s+([上下]午)(\d{1,2})时(\d{1,2})分(\d{1,2})秒\s+(.+)/);
        
        if (match) {
            const [, year, month, day, weekday, period, hour, minute, second, timezone] = match;
            
            let formattedHour = parseInt(hour, 10);
            let ampm = period === '上午' ? 'AM' : 'PM';
            
            if (period === '下午' && formattedHour !== 12) {
                formattedHour += 12;
            } else if (period === '上午' && formattedHour === 12) {
                formattedHour = 0;
            }
            
            const hour24 = String(formattedHour).padStart(2, '0');
            return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${weekday} ${hour24}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')} ${ampm} ${timezone}`;
        }
        
        return text;
    }

    function initializeObserver() {
        if (!document.body) {
            document.addEventListener('DOMContentLoaded', initializeObserver);
            return;
        }

        processTimeElements();
        
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    processTimeElements();
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    initializeObserver();
}

function initializeSettingButton() {
    const addSettingButton = () => {
        if (document.querySelector('.pku-art-setting-bar')) {
            return;
        }

        const globalNavBarWrap = document.querySelector('.global-nav-bar-wrap');
        const settingButton = document.createElement('div');
        settingButton.className = 'pku-art-setting-bar global-nav-bar mobile-only';
        settingButton.innerHTML = `<a href="https://course.pku.edu.cn/webapps/blackboard/execute/personalInfo" style="background: var(--i-setting) no-repeat center; width: 100%; height: 100%;"></a>`;
        globalNavBarWrap.appendChild(settingButton);
    }

    const observer = new MutationObserver(() => {
        if (document.querySelector('.global-nav-bar-wrap')) {
            observer.disconnect();
            addSettingButton();
        }
    });

    observer.observe(document, { childList: true, subtree: true });
}

function initializeMenuToggleButton() {
    function checkMenuPullerExists() {
        return document.querySelector('#menuPuller') !== null;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (checkMenuPullerExists()) {
                addMenuToggleButton();
            }
        });
        return;
    }

    if (!checkMenuPullerExists()) {
        return;
    }

    function addMenuToggleButton() {
        if (document.querySelector('.pku-art-menu-toggle-bar')) {
            return;
        }

        const navWrap = document.querySelector('.global-nav-bar-wrap');
        if (!navWrap) {
            setTimeout(addMenuToggleButton, 100);
            return;
        }

        const spacer = document.createElement('div');
        spacer.className = 'pku-art-menu-spacer';
        spacer.style.flex = '1 1 auto';
        spacer.style.minWidth = '20px';

        const menuToggleBar = document.createElement('div');
        menuToggleBar.className = 'pku-art-menu-toggle-bar global-nav-bar mobile-only';
        menuToggleBar.title = '展开侧边栏菜单';

        const menuToggleButton = document.createElement('button');
        menuToggleButton.className = 'pku-art-menu-toggle';
        menuToggleButton.type = 'button';
        menuToggleButton.innerHTML = menuIcon;

        menuToggleButton.addEventListener('click', () => {
            const menuPuller = document.querySelector('#menuPuller');
            if (menuPuller) {
                menuPuller.click();
            }
        });

        menuToggleBar.appendChild(menuToggleButton);
        navWrap.appendChild(spacer);
        navWrap.appendChild(menuToggleBar);
    }
    addMenuToggleButton();
}

function initializePageTitleText() {
    if (window.innerWidth >= 800) {
        return;
    }

    if (!/^https:\/\/course\.pku\.edu\.cn\//.test(window.location.href)) {
        return;
    }

    const urlTitleMap = [
        {
            pattern: /webapps\/blackboard\/execute\/announcement\?method=search&context=mybb&handle=my_announcements/,
            title: '公告'
        },
        {
            pattern: /webapps\/streamViewer\/streamViewer\?cmd=view&streamName=alerts/,
            title: '通知'
        },
        {
            pattern: /webapps\/streamViewer\/streamViewer\?cmd=view&streamName=mygrades/,
            title: '成绩'
        },
        {
            pattern: /webapps\/blackboard\/execute\/personalInfo/,
            title: '设置'
        },
    ];

    let pageTitle = null;
    for (const item of urlTitleMap) {
        if (item.pattern.test(window.location.href)) {
            pageTitle = item.title;
            break;
        }
    }

    if (!pageTitle) {
        return;
    }

    const addPageTitleText = () => {
        if (document.querySelector('.pku-art-page-title-text')) {
            return;
        }
        
        const navWrap = document.querySelector('.global-nav-bar-wrap');
        const titleElement = document.createElement('span');
        titleElement.className = 'pku-art-page-title-text mobile_only';
        titleElement.textContent = pageTitle;
        titleElement.style.flex = '1 1 auto';
        titleElement.style.fontSize = '20px';
        titleElement.style.fontWeight = 'bold';
        titleElement.style.color = 'var(--c-title)';
        titleElement.style.paddingLeft = '20px';

        navWrap.appendChild(titleElement);
    }

    const observer = new MutationObserver(() => {
        if (document.querySelector('.global-nav-bar-wrap')) {
            observer.disconnect();
            addPageTitleText();
        }
    });

    observer.observe(document, { childList: true, subtree: true });
}

function removeConflictJQuery() {
    const observer = new MutationObserver((mutations) => {
        for (const mut of mutations) {
            for (const node of mut.addedNodes) {
                if (node.nodeType === 1 && node.tagName === 'SCRIPT') {
                    const src = node.src || '';
                    if (src.includes('upcdn.b0.upaiyun.com/libs/jquery/jquery-2.0.2.min.js')) {
                        console.log('[Tampermonkey] Blocked jQuery 2.0.2:', src);
                        node.remove();
                    }
                }
            }
        }
    });

    observer.observe(document, { childList: true, subtree: true });
}

function removeBootstrap() {
    const observer = new MutationObserver((mutations) => {
        for (const mut of mutations) {
            for (const node of mut.addedNodes) {
                if (node.nodeType === 1 && node.tagName === 'LINK') {
                    const href = node.href || '';
                    if (href.includes('bootstrap.min.css')) {
                        console.log('[Tampermonkey] Blocked Bootstrap:', href);
                        node.remove();
                    }
                }
            }
        }
    });

    observer.observe(document, { childList: true, subtree: true });
}

function initializeBottomNavigationBar() {
    if (!/^https:\/\/course\.pku\.edu\.cn\//.test(window.location.href)) {
        return;
    }

    if (/^https:\/\/course\.pku\.edu\.cn\/webapps\/login\//.test(window.location.href)) {
        return;
    }

    if (window.location.href === 'https://course.pku.edu.cn/' || window.location.href === 'https://course.pku.edu.cn/webapps/bb-sso-BBLEARN/login.html') {
        return;
    }

    try {
        if (window.self !== window.top) {
            return;
        }
    } catch (e) {
        return;
    }

    let bottomNav = null;

    const createBottomNav = () => {
        if (bottomNav) {
            return bottomNav;
        }

        bottomNav = document.createElement('div');
        bottomNav.id = 'pkuArtBottomNav';
        bottomNav.style.cssText = `
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 60px;
            background: var(--arco-color-bg-2, var(--c-navbar, #ffffff));
            border-top: 1px solid var(--arco-color-border-2, var(--c-border, #e5e5e5));
            display: flex;
            justify-content: space-around;
            align-items: center;
            z-index: 9999;
            box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            padding-bottom: var(--safe-area-inset-bottom);
        `;

        const navItems = [
            { name: '主页', url: 'https://course.pku.edu.cn', icon: homeIcon },
            { name: '成绩', url: 'https://course.pku.edu.cn/webapps/streamViewer/streamViewer?cmd=view&streamName=mygrades', icon: gradeIcon },
            { name: '通知', url: 'https://course.pku.edu.cn/webapps/streamViewer/streamViewer?cmd=view&streamName=alerts', icon: notificationIcon },
            { name: '公告', url: 'https://course.pku.edu.cn/webapps/blackboard/execute/announcement?method=search&context=mybb&handle=my_announcements&returnUrl=/webapps/portal/execute/tabs/tabAction?tab_tab_group_id=_1_1&tabId=_1_1&forwardUrl=index.jsp', icon: announcementIcon }
        ];

        navItems.forEach(item => {
            const navLink = document.createElement('a');
            navLink.href = item.url;
            navLink.style.cssText = `
                text-decoration: none;
                color: var(--arco-color-text-1, var(--c-text, #333333));
                font-size: 12px;
                padding: 4px 8px;
                border-radius: 4px;
                transition: all 0.2s ease;
                text-align: center;
                flex: 1;
                margin: 0 4px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                gap: 4px;
            `;
            
            const iconDiv = document.createElement('div');
            iconDiv.innerHTML = item.icon;
            iconDiv.style.fontSize = '0';

            const textDiv = document.createElement('div');
            textDiv.textContent = item.name;
            
            navLink.appendChild(iconDiv);
            navLink.appendChild(textDiv);

            navLink.addEventListener('mouseenter', () => {
                navLink.style.backgroundColor = 'var(--arco-color-fill-2, var(--c-hover, #f5f5f5))';
                navLink.style.color = 'var(--arco-color-primary, var(--c-primary, #165dff))';
                iconDiv.querySelector('svg').style.fill = 'var(--arco-color-primary, var(--c-primary, #165dff))';
            });
            
            navLink.addEventListener('mouseleave', () => {
                navLink.style.backgroundColor = 'transparent';
                navLink.style.color = 'var(--arco-color-text-1, var(--c-text, #333333))';
                iconDiv.querySelector('svg').style.fill = 'currentColor';
            });
            
            bottomNav.appendChild(navLink);
        });

        return bottomNav;
    };

    const updateBottomNavVisibility = () => {
        if (!bottomNav) {
            createBottomNav();
        }
        if (!document.getElementById('pkuArtBottomNav')) {
            document.body.appendChild(bottomNav);
        }
        bottomNav.style.display = 'flex';
    }

    const initBottomNav = () => {
        updateBottomNavVisibility();
    };

    if (document.body) {
        initBottomNav();
        return;
    }

    const observer = new MutationObserver(() => {
        if (document.body) {
        observer.disconnect();
        initBottomNav();
        }
    });
    observer.observe(document.documentElement, { childList: true });
}

function convertBlankLinksToTop() {
    function processLinks() {
        const links = document.querySelectorAll('a[target="_blank"]');
        links.forEach(link => {
            link.target = '_top';
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', processLinks);
    } else {
        processLinks();
    }
}

function setViewportMeta() {
    const existingViewport = document.querySelector('meta[name="viewport"]');
    if (existingViewport) {
        existingViewport.remove();
    }
    
    const viewportMeta = document.createElement('meta');
    viewportMeta.name = 'viewport';
    viewportMeta.content = 'width=device-width,initial-scale=1, user-scalable=0, viewport-fit=cover';

    if (document.head) {
        document.head.appendChild(viewportMeta);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            document.head.appendChild(viewportMeta);
        });
    }
}

async function persistUserInfo() {
    if (import.meta.env.MODE !== 'tauri') {
        return
    }

    const store = await getStore();

    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(method, url) {
        this._url = url;
        return origOpen.apply(this, arguments);
    }
    XMLHttpRequest.prototype.send = function(body) {
        if (this._url === '/iaaa/oauthlogin.do') {
            const userName = body.match(/userName=([^&]*)/)[1];
            const password = body.match(/password=([^&]*)/)[1];
            localStorage.setItem('pku-art-user-name', userName);
            localStorage.setItem('pku-art-password', password);
            store.set('user', { 'userName': userName, 'password': password });
            store.save();
            const originalOnReadyStateChange = this.onreadystatechange;

            this.onreadystatechange = function() {
                if (this.readyState === 4) {
                    try {
                        console.log(this.responseText);
                        const response = JSON.parse(this.responseText);
                        if (response.success === true) {
                            const timestamp = Date.now();
                            document.cookie = `course_login=true; domain=.pku.edu.cn; path=/`;
                            document.cookie = `course_last_login=${timestamp}; domain=.pku.edu.cn; path=/`;
                        }
                    } catch (e) {

                    }
                }

                if (originalOnReadyStateChange) {
                    originalOnReadyStateChange.apply(this, arguments);
                }
            };
        }

        return origSend.apply(this, arguments);
    }
}

async function autoLogin() {
    if (import.meta.env.MODE !== 'tauri') {
        return
    }

    console.debug(window.location.href, document.cookie);

    if (document.cookie.includes('course_login=true') && Date.now() - document.cookie.match(/course_last_login=([^;]*)/)[1] < 1000 * 60 * 60 * 3) {
        return
    }

    if (!/^https:\/\/course\.pku\.edu\.cn\/\S*$/.test(window.location.href)) {
        return
    }

    const store = await getStore();
    const user = await store.get('user');
    if (user) {
        const userName = user.userName;
        const password = user.password;
        console.debug('autoLogin', userName, password);

        const res = await fetch_rs('https://iaaa.pku.edu.cn/iaaa/oauthlogin.do', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `appid=blackboard&userName=${userName}&password=${password}&randCode=&smsCode=&otpCode=&remTrustChk=false&redirUrl=http%3A%2F%2Fcourse.pku.edu.cn%2Fwebapps%2Fbb-sso-BBLEARN%2Fexecute%2FauthValidate%2FcampusLogin`
        })
        const data = await res.json();
        if (data.success === true) {
            const token = data.token;
            const timestamp = Date.now();
            document.cookie = `course_login=true; domain=.pku.edu.cn; path=/`;
            document.cookie = `course_last_login=${timestamp}; domain=.pku.edu.cn; path=/`;
            // window.location.href = `https://course.pku.edu.cn/webapps/bb-sso-BBLEARN/execute/authValidate/campusLogin?_rand=${Math.random()}&token=${token}`;
            await fetch(`https://course.pku.edu.cn/webapps/bb-sso-BBLEARN/execute/authValidate/campusLogin?_rand=${Math.random()}&token=${token}`);
            location.replace(location.href);
            console.debug('Login Successful', JSON.stringify(data));
        } else {
            console.warn('Login Failed', JSON.stringify(data));
        }
    }
}

async function portalLogin() {
    if (import.meta.env.MODE !== 'tauri') {
        return
    }

    if (document.cookie.includes('portal_login=true') && Date.now() - document.cookie.match(/portal_last_login=([^;]*)/)[1] < 1000 * 60 * 60 * 3) {
        return
    }

    if (!/^https:\/\/course\.pku\.edu\.cn\/webapps\/streamViewer\/streamViewer\S*streamName=mygrades\S*$/.test(window.location.href)) {
        return
    }

    console.log('portalLogin');

    const store = await getStore();
    const user = await store.get('user');
    if (user) {
        const userName = user.userName;
        const password = user.password;
        console.debug('portalLogin', userName, password);

        const res = await fetch_rs('https://iaaa.pku.edu.cn/iaaa/oauthlogin.do', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `appid=portal2017&userName=${userName}&password=${password}&randCode=&smsCode=&otpCode=&remTrustChk=false&redirUrl=https%3A%2F%2Fportal.pku.edu.cn%2Fportal2017%2FssoLogin.do`
        })
        const data = await res.json();
        if (data.success === true) {
            const token = data.token;
            const timestamp = Date.now();
            document.cookie = `portal_login=true; domain=.pku.edu.cn; path=/`;
            document.cookie = `portal_last_login=${timestamp}; domain=.pku.edu.cn; path=/`;
            await fetch_rs(`https://portal.pku.edu.cn/portal2017/ssoLogin.do?_rand=${Math.random()}&token=${token}`);
            console.debug('Login Successful', JSON.stringify(data));
        } else {
            console.warn('Login Failed', JSON.stringify(data));
        }
    }
}

async function displayGrades() {
    const stream_wrapper = document.querySelector('div.left_stream_wrapper');
    stream_wrapper.style.display = 'none';
    const loadingElement = document.createElement('div');
    loadingElement.id = 'pkuArtGradesLoading';
    loadingElement.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 10000;
        color: white;
        font-size: 18px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    `;
    loadingElement.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center;">
            <div style="width: 40px; height: 40px; border: 4px solid rgba(255, 255, 255, 0.3); border-top: 4px solid white; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 10px;"></div>
            <span>正在加载成绩数据...</span>
        </div>
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
    document.body.appendChild(loadingElement);

    if (import.meta.env.MODE !== 'tauri') {
        return
    }

    try {
        await portalLogin();
        await fetch_rs('https://portal.pku.edu.cn/portal2017/util/portletRedir.do?portletId=myscores');
        const res = await fetch_rs('https://portal.pku.edu.cn/publicQuery/ctrl/topic/myScore/retrScores.do');
        const data = await res.json();
        console.log(JSON.stringify(data.cjxx[0].list));
        const container = document.querySelector('div.stream_page');

        data.cjxx.forEach(xq => {
            const xqTitleEl = document.createElement('h2');
            xqTitleEl.className = 'xq-title';
            xqTitleEl.textContent = `${xq.xnd}学年度${xq.xq}学期`;

            const list = document.createElement('div');
            list.classList.add('course-list');
            xq.list.forEach(item => {
                const itemEl = document.createElement('div');
                itemEl.className = 'course-item';

                const creditNumEl = document.createElement('div');
                creditNumEl.className = 'credit-number';
                creditNumEl.textContent = item.xf;
                itemEl.appendChild(creditNumEl);

                const creditLabelEl = document.createElement('div');
                creditLabelEl.className = 'credit-label';
                creditLabelEl.textContent = '学分';
                itemEl.appendChild(creditLabelEl);

                const nameEl = document.createElement('div');
                nameEl.className = 'course-name';
                nameEl.textContent = item.kcmc;
                itemEl.appendChild(nameEl);

                const typeEl = document.createElement('div');
                typeEl.className = 'course-type';
                typeEl.textContent = item.kclbmc;
                itemEl.appendChild(typeEl);

                const scoreEl = document.createElement('div');
                scoreEl.className = 'score';
                scoreEl.textContent = item.xqcj;

                itemEl.appendChild(scoreEl);
                list.appendChild(itemEl);
            });
            container.appendChild(xqTitleEl);
            container.appendChild(list);
        });
    } finally {
        if (loadingElement.parentNode) {
            loadingElement.parentNode.removeChild(loadingElement);
        }
    }
}

function insertNav() {
    if (!(/^https:\/\/course\.pku\.edu\.cn\/webapps\/streamViewer\/streamViewer/.test(window.location.href) && window.self == window.top)) {
        return
    }

    const insert = () => {
        if (document.querySelector('#globalNavPageNavArea')) {
            return;
        }
        const globalNavPageNavArea = document.createElement('div');
        globalNavPageNavArea.id = 'globalNavPageNavArea';
        globalNavPageNavArea.role = 'navigation';
        globalNavPageNavArea.ariaLabel = '全局导航';
        globalNavPageNavArea.style.cssText = 'margin: 0px; z-index: 500;'
        document.body.appendChild(globalNavPageNavArea);

        const globalNavBarWrap = document.createElement('div');
        globalNavBarWrap.className = 'global-nav-bar-wrap';
        globalNavBarWrap.innerHTML = `
<div class="global-nav-bar logout" role="region" aria-labelledby="topframe.logout.label">
    <a id="topframe.logout.label" href="/webapps/login/?action=logout" target="_top" class="nav-link logout-link" title="注销"> 注销</a>
</div>
<div id="global-nav" class="global-nav-bar" role="navigation" aria-label="用户导航" data-preview="false">
    <div class="hideoff">全局菜单</div>
    <button id="global-nav-link" class="nav-link u_floatThis-right" href="#global-nav-flyout" aria-haspopup="true" aria-controls="global-nav-flyout" tabindex="1" accesskey="m" title="打开全局导航菜单"></button>
</div>
`;
        document.body.appendChild(globalNavBarWrap);
    }

    const observer = new MutationObserver(() => {
        if (document.body) {
            observer.disconnect();
            insert();
        }
    });
    observer.observe(document, { childList: true, subtree: true});
}

function insertGradesHeader() {
    const initHeader = () => {
        if (document.querySelector('ul.stream_list_filter li.stream_filterlinks.mobile_only')) {
            return
        }
        const header = document.querySelector('ul.stream_list_filter');
        const li = document.createElement('li');
        li.classList.add('stream_filterlinks');
        li.classList.add('mobile_only');
        li.innerHTML = '<a> 出分进度 </a>';
        li.onclick = displayGrades;
        header.appendChild(li);
    }

    const observer = new MutationObserver(() => {
        if (document.querySelectorAll('ul.stream_list_filter li.stream_filterlinks').length >= 2) {
            observer.disconnect();
            initHeader();
        }
    })
    observer.observe(document, { childList: true, subtree: true });
}

function initializeSettingPage() {
    if (!/https:\/\/course\.pku\.edu\.cn\/webapps\/blackboard\/execute\/personalInfo/.test(window.location.href)) {
        return
    }

    const updateThemeStatusText = () => {
        const themeStatusText = document.getElementById('themeStatusText');
        if (!themeStatusText) return;
        
        const currentMode = window.PKUArtThemeManager?.getCurrentMode() || 'auto';
        const isDark = window.PKUArtThemeManager?.isDarkMode() || false;
        
        let statusText = '跟随系统';
        if (currentMode === 'light') {
            statusText = '日间模式';
        } else if (currentMode === 'dark') {
            statusText = '黑夜模式';
        } else if (currentMode === 'auto') {
            statusText = '跟随系统';
        }
        
        themeStatusText.textContent = statusText;
    };

    const cycleThemeMode = () => {
        const currentMode = window.PKUArtThemeManager?.getCurrentMode() || 'auto';
        let nextMode = 'light';
        
        if (currentMode === 'light') {
            nextMode = 'dark';
        } else if (currentMode === 'dark') {
            nextMode = 'auto';
        }

        if (window.PKUArtThemeManager) {
            window.PKUArtThemeManager.setTheme(nextMode);
            updateThemeStatusText();
        }
    };

    const insert = () => {
        if (document.querySelector('.pku-art-container')) {
            return
        }

        const locationPane = document.querySelector('.locationPane');
        const settingPanel = document.createElement('div');
        const userName = document.querySelector('#global-nav-link img').nextSibling.textContent
        settingPanel.innerHTML = `
<div class="pku-art-container">
    <div class="card user-profile">
        <div class="user-avatar">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        </div>
        <div class="user-info">
            <h2 id="display-username">${userName}</h2>
        </div>
    </div>
    <div class="card">
        <div class="setting-item" id="themeToggleRow">
            <div class="item-label">
                <span>外观模式</span>
            </div>
            <div class="item-value">
                <span id="themeStatusText">跟随系统</span>
            </div>
        </div>
        <div class="setting-item">
            <div class="item-label">
                <span>日志</span>
            </div>
            <div class="item-value">
            <span id="saveLogsText">保存日志</span>
            </div>
        </div>
        <div class="setting-item">
            <div class="item-label">
                <span></span>
            </div>
            <div class="item-value">
            <span id="clearLogsText">清除日志</span>
            </div>
        </div>
    </div>
    <button class="btn btn-danger" id="logoutBtn"><a href="/webapps/login/?action=logout">退出登录</a></button>
</div>`;
        locationPane.appendChild(settingPanel);

        updateThemeStatusText();
        
        const themeToggleRow = settingPanel.querySelector('#themeToggleRow');
        if (themeToggleRow) {
            themeToggleRow.addEventListener('click', () => {
                cycleThemeMode();
            });
        }

        const saveLogsText = document.getElementById('saveLogsText');
        if (saveLogsText) {
            saveLogsText.addEventListener('click', async () => {
                await saveLogs();
            });
        }

        const clearLogsText = document.getElementById('clearLogsText');
        if (clearLogsText) {
            clearLogsText.addEventListener('click', async () => {
                await clearLogs();
            });
        }
    };

    window.addEventListener('pku-art-theme-change', updateThemeStatusText);

    const observer = new MutationObserver(() => {
        if (document.querySelector('.locationPane')) {
            observer.disconnect();
            insert();
        }
    });

    observer.observe(document, { childList: true, subtree: true });
}


export {
    insertNav,
    initializeLogoNavigation,
    ensureSidebarVisible,
    overrideSiteIcons,
    removeCourseSerialNumbers,
    initializeDirectDownload,
    initializeSparkDownloadRename,
    redirectGlobalMoreLink,
    enableDirectOpenLinks,
    restoreCourseQueryValues,
    refactorCourseQueryPagination,
    formValueStorage,
    insertHTMLForDebug,
    removeEmptyTableRows,
    customizeIaaaRememberCheckbox,
    removeConflictJQuery,
    initializeBottomNavigationBar,
    formatAnnouncementTime,
    initializeSettingButton,
    initializeMenuToggleButton,
    convertBlankLinksToTop,
    initializePageTitleText,
    setViewportMeta,
    removeBootstrap,
    persistUserInfo,
    autoLogin,
    insertGradesHeader,
    initializeSettingPage
};
