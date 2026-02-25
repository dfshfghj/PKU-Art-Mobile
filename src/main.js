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

insertNav();
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
initializeSettingButton();
initializeMenuToggleButton();
initializePageTitleText();
convertBlankLinksToTop();
setViewportMeta();
persistUserInfo();
autoLogin();
insertGradesHeader();
initializeSettingPage();
// insertHTMLForDebug();
