(function () {
  if (!/chrome-error:\/\/chromewebdata/.test(window.location.href)) {
    return;
  }

  const escapeHtml = (value) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const bodyHasChromiumErrorCopy = () => {
    const text = document.body?.innerText || "";
    return /Webpage not available/i.test(text) && /net::ERR_[A-Z0-9_]+/i.test(text);
  };

  const findErrorDetail = () => {
    const text = document.body?.innerText || "";
    return text.match(/net::ERR_[A-Z0-9_]+/i)?.[0] || "网络错误";
  };

  const findFailedUrl = () => {
    const text = document.body?.innerText || "";
    return text.match(/https?:\/\/[^\s<>"']+/i)?.[0] || "https://course.pku.edu.cn/";
  };

  const replaceErrorPage = () => {
    if (
      !document.body ||
      document.body.dataset.pkuArtNetworkErrorReplaced === "true" ||
      !bodyHasChromiumErrorCopy()
    ) {
      return false;
    }

    const detail = escapeHtml(findErrorDetail());
    const failedUrl = findFailedUrl();
    const escapedFailedUrl = escapeHtml(failedUrl);
    document.body.dataset.pkuArtNetworkErrorReplaced = "true";
    document.documentElement.style.background = "#f6f8fa";
    document.body.style.margin = "0";
    document.body.style.minHeight = "100vh";
    document.body.style.background = "#f6f8fa";
    document.body.innerHTML = `
      <style>
        :root {
          color-scheme: light dark;
          --pku-art-error-bg: #f6f8fa;
          --pku-art-error-card: #ffffff;
          --pku-art-error-title: #212121;
          --pku-art-error-text: #666666;
          --pku-art-error-border: #d0d7de;
          --pku-art-error-accent: #9b0000;
          --pku-art-error-shadow: rgba(0, 0, 0, 0.1) 0px 10px 50px;
          --pku-art-error-accent-soft: rgba(155, 0, 0, 0.08);
        }

        @media (prefers-color-scheme: dark) {
          :root {
            --pku-art-error-bg: #14110f;
            --pku-art-error-card: #1d1916;
            --pku-art-error-title: #f4efe8;
            --pku-art-error-text: #c6beb5;
            --pku-art-error-border: #3a322d;
            --pku-art-error-accent: #d65a5a;
            --pku-art-error-shadow: rgba(0, 0, 0, 0.45) 0px 10px 40px;
            --pku-art-error-accent-soft: rgba(214, 90, 90, 0.14);
          }
        }
      </style>
      <main id="pku-art-network-error-page" style="
        min-height:100vh;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:24px;
        box-sizing:border-box;
        background:var(--pku-art-error-bg);
        color:var(--pku-art-error-title);
        font-family:system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      ">
        <section style="
          width:min(100%, 420px);
          text-align:center;
          padding:32px 24px;
          border-radius:20px;
        ">
          <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;">网络连接失败</h1>
          <p style="margin:0;color:var(--pku-art-error-text);line-height:1.7;">当前页面无法加载，请检查网络后重试。</p>
          <p style="margin:12px 0 0;color:var(--pku-art-error-text);font-size:14px;line-height:1.6;word-break:break-word;">${detail}</p>
          <p style="margin:12px 0 0;color:var(--pku-art-error-text);font-size:13px;line-height:1.6;word-break:break-all;">${escapedFailedUrl}</p>
          <div style="display:flex;gap:12px;justify-content:center;margin-top:24px;flex-wrap:wrap;">
            <a href="${escapedFailedUrl}" data-pku-art-error-action="reload" style="
              display:inline-flex;
              align-items:center;
              justify-content:center;
              text-decoration:none;
              border:1px solid var(--pku-art-error-border);
              border-radius:999px;
              padding:12px 22px;
              background:var(--pku-art-error-card);
              color:var(--pku-art-error-title);
              font:inherit;
            ">刷新</a>
            <a href="https://course.pku.edu.cn/" data-pku-art-error-action="home" style="
              display:inline-flex;
              align-items:center;
              justify-content:center;
              text-decoration:none;
              border:1px solid var(--pku-art-error-border);
              border-radius:999px;
              padding:12px 22px;
              background:var(--pku-art-error-card);
              color:var(--pku-art-error-title);
              font:inherit;
            ">回到主页</a>
          </div>
        </section>
      </main>
    `;

    return true;
  };

  const startWatching = () => {
    if (replaceErrorPage()) {
      return;
    }

    const observer = new MutationObserver(() => {
      if (replaceErrorPage()) {
        observer.disconnect();
      }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener("pagehide", () => observer.disconnect(), { once: true });
    setTimeout(() => observer.disconnect(), 15000);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startWatching, { once: true });
  } else {
    startWatching();
  }
})();
