import './logger.js';
import applyStylesForCurrentPage from './style.js';
import { initializeThemeManager, initializeThemeToggleButton } from './theme.js';
import {
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
    removeEmptyTableRows,
    insertHTMLForDebug,
    customizeIaaaRememberCheckbox,
    removeConflictJQuery,
    initializeBottomNavigationBar,
    formatAnnouncementTime,
    initializeSettingButton,
    initializeMenuToggleButton,
    initializePageTitleText,
    convertBlankLinksToTop,
    setViewportMeta,
    removeBootstrap,
    persistUserInfo,
    autoLogin,
    insertGradesHeader,
    initializeSettingPage,
} from './utils.js';

const PDF_FILE_VIEW_URL_PATTERN = /^https:\/\/course\.pku\.edu\.cn\/webapps\/\S*content\/file\?cmd=view\S*$/;
const IS_TAURI_BUILD = import.meta.env.MODE === 'tauri';

function isInjectedPdfViewerFrame() {
    return window.location.protocol === 'blob:' || window.frameElement?.classList?.contains('pku-art-pdf-frame');
}

function initializePdfViewerFallbackOnDemand() {
    if (!PDF_FILE_VIEW_URL_PATTERN.test(window.location.href)) {
        return;
    }

    if (typeof window.__PKU_ART_LOAD_PDF_VIEWER__ === 'function') {
        window.__PKU_ART_LOAD_PDF_VIEWER__();
        return;
    }

    if (IS_TAURI_BUILD) {
        console.warn('[PKU Art] PDF viewer loader is unavailable in Tauri build');
        return;
    }

    import('./pdfViewer.js')
        .then(({ initializePdfViewerFallback }) => {
            initializePdfViewerFallback();
        })
        .catch((error) => {
            console.error('[PKU Art] Failed to load PDF viewer fallback', error);
        });
}

if (!isInjectedPdfViewerFrame()) {
insertNav();
applyStylesForCurrentPage();
initializePdfViewerFallbackOnDemand();
initializeThemeManager();
initializeThemeToggleButton();
initializeLogoNavigation();
ensureSidebarVisible();
overrideSiteIcons();
removeCourseSerialNumbers();
initializeDirectDownload();
initializeSparkDownloadRename();
redirectGlobalMoreLink();
enableDirectOpenLinks();
restoreCourseQueryValues();
refactorCourseQueryPagination();
formValueStorage();
removeEmptyTableRows();
customizeIaaaRememberCheckbox();
removeConflictJQuery();
removeBootstrap();
initializeBottomNavigationBar();
formatAnnouncementTime();
initializeSettingButton();
initializeMenuToggleButton();
initializePageTitleText();
convertBlankLinksToTop();
setViewportMeta();
persistUserInfo();
autoLogin();
insertGradesHeader();
initializeSettingPage();
}
// insertHTMLForDebug();
