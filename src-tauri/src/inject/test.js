(function () {
  if (window.__PKU_ART_TEST_PANEL_INITIALIZED__) {
    return;
  }
  window.__PKU_ART_TEST_PANEL_INITIALIZED__ = true;

  const SETTINGS_URL_PATTERN =
    /^https:\/\/course\.pku\.edu\.cn\/webapps\/blackboard\/execute\/personalInfo/;
  const PANEL_ID = "pku-art-tauri-test-card";
  const STYLE_ID = "pku-art-tauri-test-style";

  if (!SETTINGS_URL_PATTERN.test(window.location.href)) {
    return;
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
#${PANEL_ID} .pku-art-test-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
#${PANEL_ID} .pku-art-test-header h3 {
  margin: 0;
  font-size: 1rem;
}
#${PANEL_ID} .pku-art-test-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
#${PANEL_ID} .pku-art-test-btn {
  border: none;
  padding: 6px 12px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 0.9rem;
}
#${PANEL_ID} .pku-art-test-btn:hover {
  background: rgba(127, 127, 127, 0.14);
}
#${PANEL_ID} .pku-art-test-list {
  display: grid;
  gap: 8px;
}
#${PANEL_ID} .pku-art-test-row {
  display: grid;
  grid-template-columns: minmax(88px, 112px) 84px 1fr;
  gap: 10px;
  align-items: start;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(127, 127, 127, 0.06);
}
#${PANEL_ID} .pku-art-test-name {
  font-weight: 600;
}
#${PANEL_ID} .pku-art-test-state {
  font-weight: 700;
}
#${PANEL_ID} .pku-art-test-row[data-state="idle"] .pku-art-test-state {
  color: inherit;
}
#${PANEL_ID} .pku-art-test-row[data-state="running"] .pku-art-test-state {
  color: #0b7fab;
}
#${PANEL_ID} .pku-art-test-row[data-state="success"] .pku-art-test-state {
  color: #2e7d32;
}
#${PANEL_ID} .pku-art-test-row[data-state="error"] .pku-art-test-state {
  color: #c62828;
}
#${PANEL_ID} .pku-art-test-message {
  word-break: break-word;
  line-height: 1.5;
}
`;
    document.head.appendChild(style);
  }

  function getTauriInvoke() {
    return window.__TAURI__?.core?.invoke || null;
  }

  function getTauriBridge() {
    return window.PkuArtTauri || null;
  }

  function setRowState(key, state, message) {
    const row = document.querySelector(`[data-test-key="${key}"]`);
    if (!row) {
      return;
    }
    row.dataset.state = state;
    const stateEl = row.querySelector(".pku-art-test-state");
    const messageEl = row.querySelector(".pku-art-test-message");
    if (stateEl) {
      stateEl.textContent =
        state === "running"
          ? "运行中"
          : state === "success"
            ? "成功"
            : state === "error"
              ? "失败"
              : "未运行";
    }
    if (messageEl) {
      messageEl.textContent = message;
    }
  }

  async function runBridgeTest() {
    const invoke = getTauriInvoke();
    if (!invoke) {
      throw new Error("window.__TAURI__.core.invoke 不可用");
    }

    return [
      "core.invoke 可用",
      `Bridge=${!!getTauriBridge()}`,
      `Notification=${typeof window.Notification === "function"}`,
      `Store=${!!getTauriBridge()?.store}`,
      `HTTP=${typeof getTauriBridge()?.http?.fetch === "function"}`,
    ].join(" | ");
  }

  async function runNotificationTest() {
    if (typeof window.Notification !== "function") {
      throw new Error("window.Notification 不可用");
    }

    if (typeof window.Notification.requestPermission === "function") {
      await window.Notification.requestPermission();
    }

    const permission = window.Notification.permission ?? "unknown";
    new window.Notification("PKU Art 测试通知", {
      body: `settingPage 测试时间 ${new Date().toLocaleString()}`,
    });
    return `已触发通知，permission=${permission}`;
  }

  async function runStoreTest() {
    const tauri = getTauriBridge();
    if (!tauri?.store?.open) {
      throw new Error("window.PkuArtTauri.store 不可用");
    }

    const payload = {
      savedAt: new Date().toISOString(),
      href: window.location.href,
      userAgent: navigator.userAgent,
    };
    const store = tauri.store.open("pku-art-test.json");
    await store.set("lastSettingPageTest", payload);
    await store.save();

    const reloadedStore = tauri.store.open("pku-art-test.json");
    const savedPayload = await reloadedStore.get("lastSettingPageTest");
    if (!savedPayload?.savedAt) {
      throw new Error("Store 已保存，但读取回来的数据为空");
    }

    return `已写入 pku-art-test.json，savedAt=${savedPayload.savedAt}`;
  }

  async function runFileSaveTest() {
    const invoke = getTauriInvoke();
    if (!invoke) {
      throw new Error("window.__TAURI__.core.invoke 不可用");
    }

    const filename = `pku-art-test-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.txt`;
    const content = [
      "PKU Art Tauri save-file test",
      `time=${new Date().toISOString()}`,
      `url=${window.location.href}`,
      `ua=${navigator.userAgent}`,
    ].join("\n");
    const binary = Array.from(new TextEncoder().encode(content));

    await invoke("download_file_by_binary", {
      params: {
        filename,
        binary,
        language: "zh",
        openAfterDownload: false,
      },
    });

    return `已请求保存到 Downloads/${filename}`;
  }

  const tests = [
    { key: "bridge", label: "Tauri Bridge", run: runBridgeTest },
    { key: "notification", label: "通知", run: runNotificationTest },
    { key: "store", label: "Store", run: runStoreTest },
    { key: "file", label: "保存文件", run: runFileSaveTest },
  ];

  async function runTest(key) {
    const test = tests.find((item) => item.key === key);
    if (!test) {
      return;
    }

    setRowState(key, "running", "正在运行...");
    try {
      const message = await test.run();
      setRowState(key, "success", message);
      window.pakeToast?.(`${test.label} 测试成功`);
    } catch (error) {
      console.error("[PKU Art] Tauri test failed", key, error);
      setRowState(
        key,
        "error",
        error instanceof Error ? error.message : String(error),
      );
      window.pakeToast?.(`${test.label} 测试失败`);
    }
  }

  async function runAllTests() {
    for (const test of tests) {
      await runTest(test.key);
    }
  }

  function buildPanel() {
    const card = document.createElement("div");
    card.className = "card";
    card.id = PANEL_ID;
    card.innerHTML = `
<div class="pku-art-test-header">
  <h2>测试</h2>
  <div class="pku-art-test-actions">
    <button type="button" class="pku-art-test-btn" data-run-all>全部测试</button>
  </div>
</div>
<div class="pku-art-test-list">
  ${tests
    .map(
      (test) => `
    <div class="pku-art-test-row" data-test-key="${test.key}" data-state="idle">
      <div class="pku-art-test-name">${test.label}</div>
      <div class="pku-art-test-state">未运行</div>
      <div class="pku-art-test-message">
        <button type="button" class="pku-art-test-btn" data-run-test="${test.key}">运行测试</button>
      </div>
    </div>`,
    )
    .join("")}
</div>`;

    card
      .querySelector("[data-run-all]")
      ?.addEventListener("click", () => void runAllTests());

    card.querySelectorAll("[data-run-test]").forEach((button) => {
      button.addEventListener("click", () => {
        const key = button.getAttribute("data-run-test");
        if (key) {
          void runTest(key);
        }
      });
    });

    window.__PKU_ART_RUN_TAURI_TESTS__ = runAllTests;
    return card;
  }

  function insertPanel() {
    ensureStyle();

    const container = document.querySelector(".pku-art-container");
    if (!container || document.getElementById(PANEL_ID)) {
      return Boolean(container);
    }

    const logoutButton = container.querySelector("#logoutBtn");
    const card = buildPanel();

    if (logoutButton) {
      container.insertBefore(card, logoutButton);
    } else {
      container.appendChild(card);
    }

    return true;
  }

  const observer = new MutationObserver(() => {
    if (document.head && document.querySelector(".pku-art-container")) {
      console.log("insert")
      insertPanel();
      observer.disconnect();
    }
  });

  observer.observe(document, { childList: true, subtree: true });
})();
