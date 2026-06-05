import './logger.js';
import applyStylesForCurrentPage from './style.js';
import { initializeThemeManager, initializeThemeToggleButton } from './theme.js';
import {
    insertNav,
    initializeLogoNavigation,
    ensureSidebarVisible,
    overrideSiteIcons,
    initializeCustomSelects,
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
    initializeMobileCourseHeaderLayout,
    initializeMenuToggleButton,
    initializePageTitleText,
    convertBlankLinksToTop,
    setViewportMeta,
    removeBootstrap,
    persistUserInfo,
    autoLogin,
    insertGradesHeader,
    initializeSettingButton,
    initializeSettingPage,
} from './utils.js';

const PDF_FILE_VIEW_URL_PATTERN = /^https:\/\/course\.pku\.edu\.cn\/webapps\/\S*content\/file\?cmd=view\S*$/;
function isInjectedPdfViewerFrame() {
    return window.location.protocol === 'blob:' || window.frameElement?.classList?.contains('pku-art-pdf-frame');
}

function initializePdfViewerFallbackOnDemand() {
    if (!PDF_FILE_VIEW_URL_PATTERN.test(window.location.href)) {
        return;
    }

    if (typeof window.__PKU_ART_LOAD_PDF_VIEWER__ !== 'function') {
        return;
    }

    window.__PKU_ART_LOAD_PDF_VIEWER__();
}

if (!isInjectedPdfViewerFrame()) {
insertNav();
applyStylesForCurrentPage();
initializeMenuToggleButton();
initializeMobileCourseHeaderLayout();
initializePdfViewerFallbackOnDemand();
initializeThemeManager();
initializeThemeToggleButton();
initializeLogoNavigation();
ensureSidebarVisible();
overrideSiteIcons();
initializeCustomSelects();
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
initializePageTitleText();
convertBlankLinksToTop();
setViewportMeta();
persistUserInfo();
autoLogin();
insertGradesHeader();
initializeSettingButton();
initializeSettingPage();
}
// insertHTMLForDebug();
