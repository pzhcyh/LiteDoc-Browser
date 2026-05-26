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

type ViewMode = "preview" | "edit";
type Theme = "light" | "dark";

let currentFile: FileDocument | null = null;
let mode: ViewMode = "preview";
let theme: Theme = (localStorage.getItem("theme") as Theme) || "dark";
let dirty = false;
let mermaidRenderer: typeof import("mermaid").default | null = null;
let htmlObjectUrl: string | null = null;

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App root was not found.");
}

app.innerHTML = `
  <main class="shell">
    <header class="toolbar">
      <div class="toolbar-group">
        <button id="open-button" type="button">Open</button>
        <button id="save-button" type="button" disabled>Save</button>
        <button id="mode-button" type="button" disabled>Edit</button>
      </div>
      <div id="file-title" class="file-title">No file open</div>
      <div class="toolbar-group">
        <button id="theme-button" type="button">Dark</button>
      </div>
    </header>
    <section id="drop-zone" class="workspace">
      <div id="empty-state" class="empty-state">
        <strong>Open a local HTML or Markdown file</strong>
        <span>Use Open, drag a file here, or launch LiteDoc with a file path.</span>
      </div>
      <div id="viewer" class="viewer" hidden></div>
      <textarea id="editor" class="editor" spellcheck="false" hidden></textarea>
    </section>
    <footer class="statusbar">
      <span id="status">Ready</span>
    </footer>
  </main>
`;

const openButton = getElement<HTMLButtonElement>("open-button");
const saveButton = getElement<HTMLButtonElement>("save-button");
const modeButton = getElement<HTMLButtonElement>("mode-button");
const themeButton = getElement<HTMLButtonElement>("theme-button");
const fileTitle = getElement<HTMLDivElement>("file-title");
const dropZone = getElement<HTMLElement>("drop-zone");
const emptyState = getElement<HTMLDivElement>("empty-state");
const viewer = getElement<HTMLDivElement>("viewer");
const editor = getElement<HTMLTextAreaElement>("editor");
const status = getElement<HTMLSpanElement>("status");

applyTheme();

openButton.addEventListener("click", openFile);
saveButton.addEventListener("click", saveFile);
modeButton.addEventListener("click", toggleMode);
themeButton.addEventListener("click", toggleTheme);

editor.addEventListener("input", () => {
  if (!currentFile) return;
  currentFile.content = editor.value;
  dirty = true;
  updateChrome();
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

  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  if (!["html", "htm", "md", "markdown"].includes(extension)) {
    setStatus("Only HTML and Markdown files are supported.");
    return;
  }

  const content = await file.text();
  await loadFile({
    path: "",
    name: file.name,
    extension,
    content,
    base_url: "",
  });
  setStatus("Opened dropped file. Use Open for save-back support.");
});

window.addEventListener("keydown", async (event) => {
  if (event.ctrlKey && event.key.toLowerCase() === "o") {
    event.preventDefault();
    await openFile();
  }

  if (event.ctrlKey && event.key.toLowerCase() === "s") {
    event.preventDefault();
    await saveFile();
  }

  if (event.ctrlKey && event.key.toLowerCase() === "e") {
    event.preventDefault();
    toggleMode();
  }
});

void openStartupFile();

async function openStartupFile() {
  try {
    const file = await invoke<FileDocument | null>("open_startup_file");
    if (file) {
      await loadFile(file);
    }
  } catch (error) {
    setStatus(toMessage(error));
  }
}

async function openFile() {
  try {
    const file = await invoke<FileDocument | null>("open_file_dialog");
    if (file) {
      await loadFile(file);
    }
  } catch (error) {
    setStatus(toMessage(error));
  }
}

async function loadFile(file: FileDocument) {
  currentFile = file;
  mode = "preview";
  dirty = false;
  editor.value = file.content;
  await render();
  updateChrome();
  setStatus(file.path || file.name);
}

async function saveFile() {
  if (!currentFile || !currentFile.path) {
    setStatus("Open a file with the Open button before saving.");
    return;
  }

  try {
    await invoke("save_file", {
      path: currentFile.path,
      content: currentFile.content,
    });
    dirty = false;
    updateChrome();
    setStatus("Saved.");
  } catch (error) {
    setStatus(toMessage(error));
  }
}

function toggleMode() {
  if (!currentFile) return;

  mode = mode === "preview" ? "edit" : "preview";
  void render();
  updateChrome();
}

function toggleTheme() {
  theme = theme === "light" ? "dark" : "light";
  localStorage.setItem("theme", theme);
  applyTheme();

  if (currentFile && mode === "preview" && isMarkdown(currentFile)) {
    void render();
  }
}

async function render() {
  emptyState.hidden = Boolean(currentFile);
  viewer.hidden = !currentFile || mode !== "preview";
  editor.hidden = !currentFile || mode !== "edit";

  if (!currentFile) return;

  if (mode === "edit") {
    editor.focus();
    return;
  }

  if (isMarkdown(currentFile)) {
    await renderMarkdown(currentFile);
  } else {
    renderHtml(currentFile);
  }
}

async function renderMarkdown(file: FileDocument) {
  viewer.classList.remove("is-html");
  viewer.style.removeProperty("background");
  viewer.style.removeProperty("padding");
  const parsed = await marked.parse(file.content, {
    async: false,
    gfm: true,
  });
  viewer.innerHTML = DOMPurify.sanitize(parsed);
  rewriteRelativeUrls(viewer, file.base_url);
  await renderMermaidBlocks();
}

function renderHtml(file: FileDocument) {
  viewer.classList.add("is-html");
  viewer.style.background = "#ffffff";
  viewer.style.padding = "0";

  if (htmlObjectUrl) {
    URL.revokeObjectURL(htmlObjectUrl);
    htmlObjectUrl = null;
  }

  const iframe = document.createElement("iframe");
  iframe.className = "html-frame";
  iframe.setAttribute(
    "sandbox",
    "allow-downloads allow-forms allow-modals allow-popups allow-same-origin allow-scripts"
  );
  iframe.src = file.path ? convertFileSrc(file.path) : createHtmlObjectUrl(file);
  viewer.replaceChildren(iframe);
}

async function renderMermaidBlocks() {
  const blocks = Array.from(
    viewer.querySelectorAll<HTMLElement>("pre > code[class*='language-mermaid']")
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

function createHtmlObjectUrl(file: FileDocument) {
  htmlObjectUrl = URL.createObjectURL(
    new Blob([injectBaseUrl(file.content, file.base_url)], {
      type: "text/html;charset=utf-8",
    })
  );
  return htmlObjectUrl;
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
  const fileName = currentFile ? `${currentFile.name}${dirty ? " *" : ""}` : "No file open";
  fileTitle.textContent = fileName;
  document.title = currentFile ? `${fileName} - LiteDoc Browser` : "LiteDoc Browser";
  saveButton.disabled = !currentFile || !currentFile.path || !dirty;
  modeButton.disabled = !currentFile;
  modeButton.textContent = mode === "preview" ? "Edit" : "Preview";
}

function applyTheme() {
  document.documentElement.dataset.theme = theme;
  themeButton.textContent = theme === "light" ? "Dark" : "Light";
}

function isMarkdown(file: FileDocument) {
  return file.extension === "md" || file.extension === "markdown";
}

function isRelativeUrl(value: string) {
  return !/^(?:[a-z][a-z0-9+.-]*:|#|\/)/i.test(value);
}

function fileUrlToPath(url: URL) {
  const path = decodeURIComponent(url.pathname);
  if (url.hostname) {
    return `\\\\${url.hostname}${path.replace(/\//g, "\\")}`;
  }

  return path.replace(/^\/([a-zA-Z]:)/, "$1").replace(/\//g, "\\");
}

function escapeAttribute(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
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
