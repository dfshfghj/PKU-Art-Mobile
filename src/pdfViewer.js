import viewerHtml from './pdfjs-official/web/viewer.html?raw';
import viewerCss from './pdfjs-official/web/viewer.css?raw';
import viewerModule from './pdfjs-official/web/viewer.mjs?raw';
import pdfModule from './pdfjs-official/build/pdf.mjs?raw';
import pdfWorkerModule from './pdfjs-official/build/pdf.worker.mjs?raw';
import pdfSandboxModule from './pdfjs-official/build/pdf.sandbox.mjs?raw';
import pdfjsRuntimeCompat from './pdfjsRuntimeCompat.js?raw';

const viewerImages = import.meta.glob('./pdfjs-official/web/images/*', {
    query: '?inline',
    import: 'default',
    eager: true,
});

const viewerResourceUrls = {
    ...import.meta.glob('./pdfjs-official/web/cmaps/*.bcmap', {
        query: '?url&inline',
        import: 'default',
        eager: true,
    }),
    ...import.meta.glob('./pdfjs-official/web/iccs/*.icc', {
        query: '?url&inline',
        import: 'default',
        eager: true,
    }),
    ...import.meta.glob('./pdfjs-official/web/locale/**/*.json', {
        query: '?url&inline',
        import: 'default',
        eager: true,
    }),
    ...import.meta.glob('./pdfjs-official/web/locale/**/*.ftl', {
        query: '?url&inline',
        import: 'default',
        eager: true,
    }),
    ...import.meta.glob('./pdfjs-official/web/standard_fonts/*.{pfb,ttf}', {
        query: '?url&inline',
        import: 'default',
        eager: true,
    }),
    ...import.meta.glob('./pdfjs-official/web/wasm/*.wasm', {
        query: '?url&inline',
        import: 'default',
        eager: true,
    }),
};

const FILE_VIEW_URL_PATTERN = /^https:\/\/course\.pku\.edu\.cn\/webapps\/\S*content\/file\?cmd=view\S*$/;
const PDF_VIEWER_ROOT_CLASS = 'pku-art-pdf-viewer';
const PDF_TARGET_SELECTOR = 'embed, iframe, object';
const PDFJS_RESOURCE_ROOT = 'https://course.pku.edu.cn/pku-art-pdfjs-resource/web/';

const OFFICIAL_VIEWER_URLS = {
    pdf: null,
    worker: null,
    sandbox: null,
};

function createScriptUrl(source, options = {}) {
    const prelude = [];
    if (options.withPdfJsPolyfills) {
        prelude.push(pdfjsRuntimeCompat);
    }
    if (options.withPdfJsResourceProxy) {
        prelude.push(createPdfJsResourceRuntime());
    }
    const script = prelude.length > 0 ? `${prelude.join('\n')}\n${source}` : source;
    return URL.createObjectURL(new Blob([script], { type: 'text/javascript' }));
}

function getOfficialViewerUrls() {
    if (OFFICIAL_VIEWER_URLS.pdf) {
        return OFFICIAL_VIEWER_URLS;
    }

    OFFICIAL_VIEWER_URLS.pdf = createScriptUrl(pdfModule, {
        withPdfJsPolyfills: true,
        withPdfJsResourceProxy: true,
    });
    OFFICIAL_VIEWER_URLS.worker = createScriptUrl(pdfWorkerModule, {
        withPdfJsPolyfills: true,
        withPdfJsResourceProxy: true,
    });
    OFFICIAL_VIEWER_URLS.sandbox = createScriptUrl(pdfSandboxModule, {
        withPdfJsPolyfills: true,
        withPdfJsResourceProxy: true,
    });
    return OFFICIAL_VIEWER_URLS;
}

function createOfficialViewerUrl(pdfObjectUrl) {
    const urls = getOfficialViewerUrls();
    const css = inlineViewerCssImages(viewerCss);
    const module = patchOfficialViewerModule(viewerModule)
        .replace('value: "compressed.tracemonkey-pldi-09.pdf"', `value: ${JSON.stringify(pdfObjectUrl)}`)
        .replace('value: "../build/pdf.worker.mjs"', `value: ${JSON.stringify(urls.worker)}`)
        .replace('value: "../build/pdf.sandbox.mjs"', `value: ${JSON.stringify(urls.sandbox)}`)
        .replace('value: "../web/cmaps/"', `value: ${JSON.stringify(`${PDFJS_RESOURCE_ROOT}cmaps/`)}`)
        .replace('value: "../web/iccs/"', `value: ${JSON.stringify(`${PDFJS_RESOURCE_ROOT}iccs/`)}`)
        .replace('value: "../web/standard_fonts/"', `value: ${JSON.stringify(`${PDFJS_RESOURCE_ROOT}standard_fonts/`)}`)
        .replace('value: "../web/wasm/"', `value: ${JSON.stringify(`${PDFJS_RESOURCE_ROOT}wasm/`)}`);

    const viewerModuleUrl = createScriptUrl(module, {
        withPdfJsPolyfills: true,
        withPdfJsResourceProxy: true,
    });
    const resourceScript = createPdfJsResourceScript();
    const html = viewerHtml
        .replace(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*>\s*/i, '')
        .replace(
            /<link rel="resource" type="application\/l10n" href="locale\/locale\.json" \/>\s*/i,
            `<link rel="resource" type="application/l10n" href="${PDFJS_RESOURCE_ROOT}locale/locale.json" />`
        )
        .replace('<script src="../build/pdf.mjs" type="module"></script>', '')
        .replace('<link rel="stylesheet" href="viewer.css" />', `<style>${css}</style>`)
        .replace(
            '<script src="viewer.mjs" type="module"></script>',
            `${resourceScript}<script type="module">import ${JSON.stringify(urls.pdf)}; await import(${JSON.stringify(viewerModuleUrl)});</script>`
        );

    return URL.createObjectURL(new Blob([html], { type: 'text/html' }));
}

function inlineViewerCssImages(css) {
    return css.replace(/url\((['"]?)(images\/[^)'"]+)\1\)/g, (match, _quote, imagePath) => {
        const imageUrl = viewerImages[`./pdfjs-official/web/${imagePath}`];
        return imageUrl ? `url("${imageUrl}")` : match;
    });
}

function createPdfJsResourceScript() {
    return `<script>${createPdfJsResourceRuntime()}</script>`;
}

function createPdfJsResourceRuntime() {
    const resources = {};
    for (const [path, url] of Object.entries(viewerResourceUrls)) {
        resources[path.replace('./pdfjs-official/web/', '')] = url;
    }

    return `
(() => {
  if (globalThis.__PKU_ART_PDFJS_RESOURCE_PROXY_READY__) {
    return;
  }
  globalThis.__PKU_ART_PDFJS_RESOURCE_PROXY_READY__ = true;
  const resources = ${JSON.stringify(resources)};
  const root = ${JSON.stringify(PDFJS_RESOURCE_ROOT)};
  const getUrlString = (input) => {
    if (typeof input === "string") {
      return input;
    }
    if (input instanceof URL) {
      return input.href;
    }
    if (input && typeof input.url === "string") {
      return input.url;
    }
    if (input && typeof input.href === "string") {
      return input.href;
    }
    return null;
  };
  const resolveResourceUrl = (input) => {
    const url = getUrlString(input);
    if (typeof url !== "string" || !url.startsWith(root)) {
      return null;
    }
    const key = decodeURIComponent(url.slice(root.length));
    const dataUrl = resources[key];
    if (!dataUrl) {
      console.warn("[PKU Art] Missing PDF.js resource", { url, key });
      return "";
    }
    return dataUrl;
  };
  if (typeof globalThis.fetch === "function") {
    const nativeFetch = globalThis.fetch.bind(globalThis);
    globalThis.fetch = (input, init) => {
      const resourceUrl = resolveResourceUrl(input);
      if (resourceUrl !== null) {
        return resourceUrl
          ? nativeFetch(resourceUrl, init)
          : Promise.resolve(new Response("", {
              status: 404,
              statusText: "PDF.js resource not found"
            }));
      }
      return nativeFetch(input, init);
    };
  }
  if (typeof globalThis.XMLHttpRequest === "function") {
    const originalOpen = globalThis.XMLHttpRequest.prototype.open;
    globalThis.XMLHttpRequest.prototype.open = function patchedOpen(method, url, ...rest) {
      const resourceUrl = resolveResourceUrl(url);
      if (resourceUrl !== null) {
        return originalOpen.call(this, method, resourceUrl || "data:text/plain,", ...rest);
      }
      return originalOpen.call(this, method, url, ...rest);
    };
  }
})();
`;
}

function patchOfficialViewerModule(moduleSource) {
    return moduleSource.replace(
        `firstPagePromise.then(() => {
        this.eventBus.dispatch("documentloaded", {
          source: this
        });
      });`,
        `Promise.resolve()
        .then(() => this.pdfViewer.firstPagePromise)
        .then(() => {
          this.eventBus.dispatch("documentloaded", {
            source: this
          });
        });`
    );
}

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

    const frame = document.createElement('iframe');
    frame.className = 'pku-art-pdf-frame';
    frame.title = 'PDF 预览';
    frame.referrerPolicy = 'no-referrer';

    root.appendChild(frame);

    return { root, status, frame };
}

function bytesToHex(bytes) {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(' ');
}

function bytesToAscii(bytes) {
    return Array.from(bytes, (byte) => {
        if (byte >= 32 && byte <= 126) {
            return String.fromCharCode(byte);
        }

        return '.';
    }).join('');
}

async function createPdfObjectUrl(pdfUrl) {
    console.debug('[PKU Art] PDF viewer request', { pdfUrl });

    const response = await fetch(pdfUrl, {
        credentials: 'include',
    });

    const contentType = response.headers.get('content-type') || '';
    const contentLength = response.headers.get('content-length') || '';

    console.debug('[PKU Art] PDF viewer response', {
        requestUrl: pdfUrl,
        responseUrl: response.url,
        redirected: response.redirected,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        contentType,
        contentLength,
    });

    if (!response.ok) {
        throw new Error(`PDF request failed: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const headerBytes = new Uint8Array(arrayBuffer.slice(0, 16));
    const headerAscii = bytesToAscii(headerBytes);

    console.debug('[PKU Art] PDF viewer bytes', {
        responseUrl: response.url,
        size: arrayBuffer.byteLength,
        contentType,
        headerHex: bytesToHex(headerBytes),
        headerAscii,
        isPdfHeader: headerAscii.startsWith('%PDF'),
    });

    const blob = new Blob([arrayBuffer], { type: contentType || 'application/pdf' });
    console.debug('[PKU Art] PDF viewer blob created', {
        size: blob.size,
        type: blob.type,
    });

    return URL.createObjectURL(blob);
}

function setOfficialViewerSource(frame, pdfObjectUrl) {
    const viewerUrl = createOfficialViewerUrl(pdfObjectUrl);
    frame.src = viewerUrl;
    console.debug('[PKU Art] PDF viewer iframe source set', {
        viewerUrl,
        pdfObjectUrl,
    });
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

    createPdfObjectUrl(pdfUrl)
        .then((pdfObjectUrl) => {
            viewer.root.dataset.pkuArtPdfObjectUrl = pdfObjectUrl;
            setOfficialViewerSource(viewer.frame, pdfObjectUrl);
            viewer.status.textContent = '已加载官方 PDF.js Viewer';
        })
        .catch((error) => {
            console.error('[PKU Art] Official PDF.js viewer failed to load PDF', error);
            viewer.status.textContent = 'PDF 加载失败，请尝试直接打开或下载。';
        });
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
