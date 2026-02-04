import applyStylesForCurrentPage from './style.js';
import { initializeThemeManager, initializeThemeToggleButton } from './theme.js';
import {
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
    initializeMenuToggleButton,
    initializePageTitleText,
    convertBlankLinksToTop,
    setViewportMeta,
    removeBootstrap,
    persistUserInfo,
    autoLogin,
} from './utils.js';

applyStylesForCurrentPage();
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
initializeMenuToggleButton();
initializePageTitleText();
convertBlankLinksToTop();
setViewportMeta();
persistUserInfo();
autoLogin();
// insertHTMLForDebug();
