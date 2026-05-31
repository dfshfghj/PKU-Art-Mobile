import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const FILE_VIEW_URL_PATTERN = /^https:\/\/course\.pku\.edu\.cn\/webapps\/\S*content\/file\?cmd=view\S*$/;
const PDF_VIEWER_ROOT_CLASS = 'pku-art-pdf-viewer';
const PDF_TARGET_SELECTOR = 'embed, iframe, object';

function isPdfFileViewPage() {
    return FILE_VIEW_URL_PATTERN.test(window.location.href);
}

function isLikelyPdfElement(element) {
    if (!(element instanceof HTMLElement)) {
        return false;
    }

    const tagName = element.tagName.toLowerCase();
    const type = (element.getAttribute('type') || '').toLowerCase();
    const source =
        element.getAttribute('src') ||
        element.getAttribute('data') ||
        element.getAttribute('originalsrc') ||
        '';
    const lowerSource = source.toLowerCase();

    return (
        type.includes('pdf') ||
        lowerSource.includes('.pdf') ||
        lowerSource.includes('application/pdf') ||
        (tagName === 'embed' && lowerSource.length > 0)
    );
}

function getPdfUrlFromElement(element) {
    const source =
        element.getAttribute('src') ||
        element.getAttribute('data') ||
        element.getAttribute('originalsrc');

    if (!source) {
        return null;
    }

    try {
        return new URL(source, window.location.href).href;
    } catch (error) {
        console.warn('[PKU Art] Failed to resolve PDF URL', error);
        return null;
    }
}

function createActionLink(label, href) {
    const link = document.createElement('a');
    link.className = 'pku-art-pdf-action';
    link.href = href;
    link.target = '_blank';
    link.rel = 'noreferrer noopener';
    link.textContent = label;
    return link;
}

function createViewerShell(pdfUrl) {
    const root = document.createElement('section');
    root.className = PDF_VIEWER_ROOT_CLASS;

    const toolbar = document.createElement('div');
    toolbar.className = 'pku-art-pdf-toolbar';

    const titleBlock = document.createElement('div');
    titleBlock.className = 'pku-art-pdf-title-block';

    const title = document.createElement('div');
    title.className = 'pku-art-pdf-title';
    title.textContent = 'PDF 预览';

    const status = document.createElement('div');
    status.className = 'pku-art-pdf-status';
    status.textContent = '正在加载文档...';

    titleBlock.appendChild(title);
    titleBlock.appendChild(status);

    const actions = document.createElement('div');
    actions.className = 'pku-art-pdf-actions';
    actions.appendChild(createActionLink('新窗口打开', pdfUrl));
    actions.appendChild(createActionLink('下载原文件', pdfUrl));

    toolbar.appendChild(titleBlock);
    toolbar.appendChild(actions);

    const pages = document.createElement('div');
    pages.className = 'pku-art-pdf-pages';

    root.appendChild(toolbar);
    root.appendChild(pages);

    return { root, status, pages };
}

function createPageShell(pageNumber) {
    const pageCard = document.createElement('div');
    pageCard.className = 'pku-art-pdf-page-card';

    const pageLabel = document.createElement('div');
    pageLabel.className = 'pku-art-pdf-page-label';
    pageLabel.textContent = `第 ${pageNumber} 页`;

    const canvas = document.createElement('canvas');
    canvas.className = 'pku-art-pdf-canvas';

    pageCard.appendChild(pageLabel);
    pageCard.appendChild(canvas);

    return { pageCard, canvas };
}

async function renderPageToCanvas(page, canvas, containerWidth) {
    const baseViewport = page.getViewport({ scale: 1 });
    const safeWidth = Math.max(containerWidth - 32, 280);
    const fitScale = safeWidth / baseViewport.width;
    const outputScale = window.devicePixelRatio || 1;
    const scale = Math.min(Math.max(fitScale, 0.6), 2.2);
    const viewport = page.getViewport({ scale });
    const context = canvas.getContext('2d', { alpha: false });

    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;

    await page.render({
        canvasContext: context,
        viewport,
        transform: outputScale === 1 ? null : [outputScale, 0, 0, outputScale, 0, 0],
    }).promise;
}

async function renderPdfPages(pdf, viewer) {
    viewer.status.textContent = `共 ${pdf.numPages} 页`;
    viewer.pages.replaceChildren();

    const containerWidth = viewer.pages.clientWidth || viewer.root.clientWidth || window.innerWidth;

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const { pageCard, canvas } = createPageShell(pageNumber);
        viewer.pages.appendChild(pageCard);
        await renderPageToCanvas(page, canvas, containerWidth);
    }

}

async function loadPdfDocument(pdfUrl) {
    const loadingTask = pdfjsLib.getDocument({
        url: pdfUrl,
        withCredentials: true,
    });

    return loadingTask.promise;
}

function mountPdfViewer(targetElement) {
    if (targetElement.dataset.pkuArtPdfMounted === 'true') {
        return;
    }

    const pdfUrl = getPdfUrlFromElement(targetElement);
    if (!pdfUrl) {
        return;
    }

    targetElement.dataset.pkuArtPdfMounted = 'true';

    const viewer = createViewerShell(pdfUrl);
    targetElement.replaceWith(viewer.root);

    let renderedPdf = null;
    let rerenderTimer = null;
    let rendering = false;

    const render = async () => {
        if (rendering) {
            return;
        }

        rendering = true;
        viewer.status.textContent = renderedPdf ? '正在调整预览尺寸...' : '正在加载文档...';

        try {
            if (!renderedPdf) {
                renderedPdf = await loadPdfDocument(pdfUrl);
            }
            await renderPdfPages(renderedPdf, viewer);
            viewer.status.textContent = `共 ${renderedPdf.numPages} 页`;
        } catch (error) {
            console.error('[PKU Art] PDF.js fallback render failed', error);
            viewer.status.textContent = 'PDF 加载失败，请尝试直接打开或下载。';
        } finally {
            rendering = false;
        }
    };

    const handleResize = () => {
        if (!renderedPdf) {
            return;
        }

        window.clearTimeout(rerenderTimer);
        rerenderTimer = window.setTimeout(() => {
            render();
        }, 180);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    render();
}

function scanAndMountPdfViewer() {
    const candidates = document.querySelectorAll(PDF_TARGET_SELECTOR);
    for (const element of candidates) {
        if (isLikelyPdfElement(element)) {
            mountPdfViewer(element);
            return true;
        }
    }

    return false;
}

function initializePdfViewerFallback() {
    if (!isPdfFileViewPage()) {
        return;
    }

    const start = () => {
        if (scanAndMountPdfViewer()) {
            return;
        }

        const observer = new MutationObserver(() => {
            if (scanAndMountPdfViewer()) {
                observer.disconnect();
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }
}

export { initializePdfViewerFallback };
