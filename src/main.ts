import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import DOMPurify from "dompurify";
import { marked } from "marked";
import "./styles.css";

type FileDocument = {
  path: string;
  name: string;
  extension: string;
  content: string;
  base_url: string;
};

type DocumentTab = FileDocument & {
  id: string;
  dirty: boolean;
  mode: ViewMode;
};

type ViewMode = "preview" | "edit";
type Theme = "light" | "dark";

const supportedExtensions = ["html", "htm", "md", "markdown", "txt", "text"];

let tabs: DocumentTab[] = [];
let activeTabId: string | null = null;
let theme: Theme = (localStorage.getItem("theme") as Theme) || "dark";
let mermaidRenderer: typeof import("mermaid").default | null = null;
let htmlObjectUrl: string | null = null;
let untitledCount = 1;

const app = document.querySelector<HTMLDivElement>("#app");
const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
const isTauriRuntime = "__TAURI_INTERNALS__" in window;

if (!app) {
  throw new Error("App root was not found.");
}

app.innerHTML = `
  <main class="shell">
    <header class="titlebar" data-tauri-drag-region>
      <div class="app-mark" data-tauri-drag-region>LiteDoc</div>
      <div id="file-title" class="file-title">No file open</div>
      <div class="toolbar-group toolbar-primary">
        <button id="open-button" type="button">Open</button>
        <button id="new-md-button" type="button">New MD</button>
        <button id="save-button" type="button" disabled>Save</button>
        <button id="save-as-button" type="button" disabled>Save As</button>
      </div>
      <div class="toolbar-group">
        <button id="mode-button" type="button" disabled>Edit</button>
        <button id="theme-button" type="button">Dark</button>
      </div>
    </header>
    <section class="content">
      <aside class="sidebar">
        <div class="sidebar-header">
          <span>Documents</span>
          <span id="tab-count" class="tab-count">0</span>
        </div>
        <nav id="tab-bar" class="tab-bar" aria-label="Open documents"></nav>
      </aside>
      <section id="drop-zone" class="workspace">
        <div id="empty-state" class="empty-state">
          <div class="empty-icon" aria-hidden="true"></div>
          <strong>LiteDoc Browser</strong>
          <span>No document selected</span>
        </div>
        <div id="viewer" class="viewer" hidden></div>
        <textarea id="editor" class="editor" spellcheck="false" hidden></textarea>
        <div id="live-preview" class="viewer live-preview" hidden></div>
      </section>
    </section>
    <footer class="statusbar">
      <span id="status">Ready</span>
    </footer>
  </main>
`;

const openButton = getElement<HTMLButtonElement>("open-button");
const newMdButton = getElement<HTMLButtonElement>("new-md-button");
const saveButton = getElement<HTMLButtonElement>("save-button");
const saveAsButton = getElement<HTMLButtonElement>("save-as-button");
const modeButton = getElement<HTMLButtonElement>("mode-button");
const themeButton = getElement<HTMLButtonElement>("theme-button");
const fileTitle = getElement<HTMLDivElement>("file-title");
const tabCount = getElement<HTMLSpanElement>("tab-count");
const tabBar = getElement<HTMLElement>("tab-bar");
const dropZone = getElement<HTMLElement>("drop-zone");
const emptyState = getElement<HTMLDivElement>("empty-state");
const viewer = getElement<HTMLDivElement>("viewer");
const editor = getElement<HTMLTextAreaElement>("editor");
const livePreview = getElement<HTMLDivElement>("live-preview");
const status = getElement<HTMLSpanElement>("status");

applyTheme();

openButton.addEventListener("click", openFile);
newMdButton.addEventListener("click", newDocument);
saveButton.addEventListener("click", saveFile);
saveAsButton.addEventListener("click", saveFileAs);
modeButton.addEventListener("click", toggleMode);
themeButton.addEventListener("click", toggleTheme);

editor.addEventListener("input", () => {
  const tab = getActiveTab();
  if (!tab) return;

  tab.content = editor.value;
  tab.dirty = true;
  updateChrome();
  if (tab.mode === "edit" && isMarkdown(tab)) {
    void renderMarkdown(tab, livePreview);
  }
});

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("is-dragging");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("is-dragging");
});

dropZone.addEventListener("drop", async (event) => {
  event.preventDefault();
  dropZone.classList.remove("is-dragging");

  const file = event.dataTransfer?.files.item(0);
  if (!file) return;

  const extension = getExtension(file.name);
  if (!isSupportedExtension(extension)) {
    setStatus("Only HTML, Markdown, and text files are supported.");
    return;
  }

  const content = await file.text();
  await addTab(
    {
      path: "",
      name: file.name,
      extension,
      content,
      base_url: "",
    },
    { dirty: false, mode: "preview" },
  );
  setStatus("Opened dropped file. Use Save As to save changes.");
});

window.addEventListener("keydown", async (event) => {
  if (isPrimaryShortcut(event) && event.key.toLowerCase() === "o") {
    event.preventDefault();
    await openFile();
  }

  if (isPrimaryShortcut(event) && event.key.toLowerCase() === "n") {
    event.preventDefault();
    newDocument();
  }

  if (isPrimaryShortcut(event) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    if (event.shiftKey) {
      await saveFileAs();
    } else {
      await saveFile();
    }
  }

  if (isPrimaryShortcut(event) && event.key.toLowerCase() === "e") {
    event.preventDefault();
    toggleMode();
  }
});

window.addEventListener("beforeunload", (event) => {
  if (!tabs.some((tab) => tab.dirty)) return;

  event.preventDefault();
  event.returnValue = "";
});

void openStartupFile();
updateChrome();

async function openStartupFile() {
  if (!isTauriRuntime) return;

  try {
    const file = await invoke<FileDocument | null>("open_startup_file");
    if (file) {
      await addTab(file, { dirty: false, mode: "preview" });
    }
  } catch (error) {
    setStatus(toMessage(error));
  }
}

async function openFile() {
  if (!isTauriRuntime) {
    setStatus("File dialogs are available in the macOS desktop app.");
    return;
  }

  try {
    const file = await invoke<FileDocument | null>("open_file_dialog");
    if (file) {
      await addTab(file, { dirty: false, mode: "preview" });
    }
  } catch (error) {
    setStatus(toMessage(error));
  }
}

function newDocument() {
  const count = untitledCount++;
  const content = "# Untitled\n\n";
  const name = `Untitled-${count}.md`;

  void addTab(
    {
      path: "",
      name,
      extension: "md",
      content,
      base_url: "",
    },
    { dirty: true, mode: "edit" },
  );
  setStatus(`Created ${name}`);
}

async function addTab(
  file: FileDocument,
  options: Pick<DocumentTab, "dirty" | "mode">,
) {
  if (file.path) {
    const existing = tabs.find((tab) => tab.path === file.path);
    if (existing) {
      activeTabId = existing.id;
      await render();
      updateChrome();
      setStatus(existing.path);
      return;
    }
  }

  const tab: DocumentTab = {
    ...file,
    id: createTabId(),
    dirty: options.dirty,
    mode: options.mode,
  };

  tabs.push(tab);
  activeTabId = tab.id;
  await render();
  updateChrome();
  setStatus(file.path || file.name);
}

async function saveFile() {
  const tab = getActiveTab();
  if (!tab) return;

  if (!isTauriRuntime) {
    setStatus("Saving is available in the macOS desktop app.");
    return;
  }

  if (!tab.path) {
    await saveFileAs();
    return;
  }

  if (!tab.dirty) {
    setStatus("No changes to save.");
    return;
  }

  try {
    await invoke("save_file", {
      path: tab.path,
      content: tab.content,
    });
    tab.dirty = false;
    updateChrome();
    if (tab.mode === "preview" && isHtml(tab)) {
      await render();
    }
    setStatus("Saved.");
  } catch (error) {
    setStatus(toMessage(error));
  }
}

async function saveFileAs() {
  const tab = getActiveTab();
  if (!tab) return;

  if (!isTauriRuntime) {
    setStatus("Save As is available in the macOS desktop app.");
    return;
  }

  try {
    const saved = await invoke<FileDocument | null>("save_file_dialog", {
      suggestedName: tab.name,
      extension: tab.extension,
      content: tab.content,
    });

    if (!saved) return;

    tab.path = saved.path;
    tab.name = saved.name;
    tab.extension = saved.extension;
    tab.content = saved.content;
    tab.base_url = saved.base_url;
    tab.dirty = false;
    updateChrome();
    await render();
    setStatus("Saved.");
  } catch (error) {
    setStatus(toMessage(error));
  }
}

function toggleMode() {
  const tab = getActiveTab();
  if (!tab) return;

  tab.mode = tab.mode === "preview" ? "edit" : "preview";
  void render();
  updateChrome();
}

function toggleTheme() {
  theme = theme === "light" ? "dark" : "light";
  localStorage.setItem("theme", theme);
  applyTheme();

  const tab = getActiveTab();
  if (tab && tab.mode === "preview" && isMarkdown(tab)) {
    void render();
  }
}

async function activateTab(id: string) {
  if (activeTabId === id) return;

  activeTabId = id;
  await render();
  updateChrome();
}

async function closeTab(id: string) {
  const tab = tabs.find((item) => item.id === id);
  if (!tab) return;

  if (tab.dirty && !confirm(`Close ${tab.name} without saving?`)) {
    return;
  }

  const index = tabs.findIndex((item) => item.id === id);
  tabs = tabs.filter((item) => item.id !== id);

  if (activeTabId === id) {
    activeTabId = tabs[Math.max(0, index - 1)]?.id ?? null;
  }

  await render();
  updateChrome();
  setStatus(tab.dirty ? "Closed without saving." : "Closed.");
}

async function render() {
  const tab = getActiveTab();
  renderTabs();

  dropZone.classList.toggle("is-markdown-edit", Boolean(tab && tab.mode === "edit" && isMarkdown(tab)));
  emptyState.hidden = Boolean(tab);
  viewer.hidden = !tab || tab.mode !== "preview";
  editor.hidden = !tab || tab.mode !== "edit";
  livePreview.hidden = !tab || tab.mode !== "edit" || !isMarkdown(tab);

  if (!tab) {
    clearHtmlObjectUrl();
    return;
  }

  if (tab.mode === "edit") {
    clearHtmlObjectUrl();
    editor.value = tab.content;
    if (isMarkdown(tab)) {
      await renderMarkdown(tab, livePreview);
    }
    editor.focus();
    return;
  }

  if (isMarkdown(tab)) {
    await renderMarkdown(tab, viewer);
  } else if (isHtml(tab)) {
    renderHtml(tab);
  } else {
    renderPlainText(tab);
  }
}

function renderTabs() {
  tabBar.replaceChildren(
    ...tabs.map((tab) => {
      const item = document.createElement("div");
      item.className = "tab-item";
      if (tab.id === activeTabId) {
        item.classList.add("is-active");
      }

      const button = document.createElement("button");
      button.type = "button";
      button.className = "tab-button";
      button.title = tab.path || tab.name;
      button.textContent = `${tab.name}${tab.dirty ? " *" : ""}`;
      button.addEventListener("click", () => {
        void activateTab(tab.id);
      });

      const close = document.createElement("button");
      close.type = "button";
      close.className = "tab-close";
      close.title = `Close ${tab.name}`;
      close.textContent = "×";
      close.addEventListener("click", (event) => {
        event.stopPropagation();
        void closeTab(tab.id);
      });

      item.append(button, close);
      return item;
    }),
  );
}

async function renderMarkdown(tab: DocumentTab, target: HTMLElement) {
  clearHtmlObjectUrl();
  target.classList.remove("is-html");
  target.style.removeProperty("background");
  target.style.removeProperty("padding");
  const parsed = await marked.parse(tab.content, {
    async: false,
    gfm: true,
  });
  target.innerHTML = DOMPurify.sanitize(parsed);
  rewriteRelativeUrls(target, tab.base_url);
  await renderMermaidBlocks(target);
}

function renderPlainText(tab: DocumentTab) {
  clearHtmlObjectUrl();
  viewer.classList.remove("is-html");
  viewer.style.removeProperty("background");
  viewer.style.removeProperty("padding");

  const pre = document.createElement("pre");
  pre.className = "plain-text";
  pre.textContent = tab.content || "";
  viewer.replaceChildren(pre);
}

function renderHtml(tab: DocumentTab) {
  clearHtmlObjectUrl();
  viewer.classList.add("is-html");
  viewer.style.background = "#ffffff";
  viewer.style.padding = "0";

  const iframe = document.createElement("iframe");
  iframe.className = "html-frame";
  iframe.setAttribute(
    "sandbox",
    "allow-downloads allow-forms allow-modals allow-popups allow-same-origin allow-scripts",
  );
  iframe.src = tab.path && !tab.dirty ? convertFileSrc(tab.path) : createHtmlObjectUrl(tab);
  viewer.replaceChildren(iframe);
}

async function renderMermaidBlocks(root: ParentNode) {
  const blocks = Array.from(
    root.querySelectorAll<HTMLElement>("pre > code[class*='language-mermaid']"),
  );

  if (blocks.length === 0) return;

  const mermaid = await getMermaidRenderer();
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: theme === "dark" ? "dark" : "default",
  });

  for (const [index, code] of blocks.entries()) {
    const source = code.textContent || "";
    const pre = code.parentElement;
    if (!pre) continue;

    try {
      const id = `mermaid-${Date.now()}-${index}`;
      const { svg } = await mermaid.render(id, source);
      const wrapper = document.createElement("div");
      wrapper.className = "mermaid-block";
      wrapper.innerHTML = svg;
      pre.replaceWith(wrapper);
    } catch (error) {
      const details = document.createElement("details");
      details.className = "mermaid-error";
      details.open = true;

      const summary = document.createElement("summary");
      summary.textContent = "Mermaid render failed";

      const message = document.createElement("div");
      message.textContent = toMessage(error);

      const fallback = document.createElement("pre");
      const fallbackCode = document.createElement("code");
      fallbackCode.textContent = source;
      fallback.append(fallbackCode);

      details.append(summary, message, fallback);
      pre.replaceWith(details);
    }
  }
}

async function getMermaidRenderer() {
  if (!mermaidRenderer) {
    mermaidRenderer = (await import("mermaid")).default;
  }

  return mermaidRenderer;
}

function rewriteRelativeUrls(root: ParentNode, baseUrl: string) {
  if (!baseUrl) return;

  root.querySelectorAll<HTMLImageElement>("img[src]").forEach((image) => {
    const source = image.getAttribute("src");
    if (source && isRelativeUrl(source)) {
      image.src = resolveDocumentUrl(source, baseUrl);
    }
  });

  root.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((anchor) => {
    const href = anchor.getAttribute("href");
    if (href && isRelativeUrl(href)) {
      anchor.href = resolveDocumentUrl(href, baseUrl);
    }
  });
}

function createHtmlObjectUrl(tab: DocumentTab) {
  htmlObjectUrl = URL.createObjectURL(
    new Blob([injectBaseUrl(tab.content, tab.base_url)], {
      type: "text/html;charset=utf-8",
    }),
  );
  return htmlObjectUrl;
}

function clearHtmlObjectUrl() {
  if (!htmlObjectUrl) return;

  URL.revokeObjectURL(htmlObjectUrl);
  htmlObjectUrl = null;
}

function injectBaseUrl(html: string, baseUrl: string) {
  if (!baseUrl) return html;

  const base = `<base href="${escapeAttribute(baseUrl)}">`;
  if (/<head[\s>]/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${base}`);
  }

  return `${base}${html}`;
}

function resolveDocumentUrl(value: string, baseUrl: string) {
  try {
    const url = new URL(value, baseUrl);
    return url.protocol === "file:" ? convertFileSrc(fileUrlToPath(url)) : url.toString();
  } catch {
    return value;
  }
}

function updateChrome() {
  const tab = getActiveTab();
  const fileName = tab ? `${tab.name}${tab.dirty ? " *" : ""}` : "No file open";
  fileTitle.textContent = fileName;
  fileTitle.title = tab?.path || fileName;
  tabCount.textContent = tabs.length.toString();
  document.title = tab ? `${fileName} - LiteDoc Browser` : "LiteDoc Browser";
  saveButton.disabled = !tab || !tab.dirty;
  saveAsButton.disabled = !tab;
  modeButton.disabled = !tab;
  modeButton.textContent = tab?.mode === "edit" ? "Preview" : "Edit";
}

function applyTheme() {
  document.documentElement.dataset.theme = theme;
  themeButton.textContent = theme === "light" ? "Dark" : "Light";
}

function getActiveTab() {
  return tabs.find((tab) => tab.id === activeTabId) ?? null;
}

function isMarkdown(file: FileDocument) {
  return file.extension === "md" || file.extension === "markdown";
}

function isHtml(file: FileDocument) {
  return file.extension === "html" || file.extension === "htm";
}

function isSupportedExtension(extension: string) {
  return supportedExtensions.includes(extension);
}

function getExtension(name: string) {
  return name.split(".").pop()?.toLowerCase() || "";
}

function isRelativeUrl(value: string) {
  return !/^(?:[a-z][a-z0-9+.-]*:|#|\/)/i.test(value);
}

function isPrimaryShortcut(event: KeyboardEvent) {
  return isMac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
}

function fileUrlToPath(url: URL) {
  const path = decodeURIComponent(url.pathname);
  if (url.hostname) {
    return isMac ? `//${url.hostname}${path}` : `\\\\${url.hostname}${path.replace(/\//g, "\\")}`;
  }

  if (/^\/[a-zA-Z]:/.test(path)) {
    return path.slice(1).replace(/\//g, "\\");
  }

  return path;
}

function escapeAttribute(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function createTabId() {
  if ("randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function setStatus(message: string) {
  status.textContent = message;
}

function toMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function getElement<T extends HTMLElement>(id: string) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element: ${id}`);
  }
  return element as T;
}
