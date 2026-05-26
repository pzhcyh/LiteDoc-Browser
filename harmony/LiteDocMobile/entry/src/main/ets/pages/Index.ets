import { webview } from '@kit.ArkWeb';
import { picker, fileIo } from '@kit.CoreFileKit';
import { util } from '@kit.ArkTS';

type AppTheme = 'dark' | 'light';
type DocumentKind = 'html' | 'markdown';

interface LoadedDocument {
  uri: string;
  name: string;
  extension: string;
  kind: DocumentKind;
  content: string;
}

const SUPPORTED_EXTENSIONS: string[] = ['html', 'htm', 'md', 'markdown'];

@Entry
@Component
struct Index {
  private webController: webview.WebviewController = new webview.WebviewController();

  @State private theme: AppTheme = 'dark';
  @State private currentDocument: LoadedDocument | null = null;
  @State private status: string = 'Ready';
  @State private isOpening: boolean = false;

  build() {
    Column() {
      this.Toolbar()

      Stack() {
        if (this.currentDocument) {
          Web({
            src: '',
            controller: this.webController
          })
            .width('100%')
            .height('100%')
            .backgroundColor(this.documentBackground())
        } else {
          this.EmptyState()
        }
      }
      .layoutWeight(1)
      .width('100%')
      .backgroundColor(this.backgroundColor())

      Text(this.status)
        .width('100%')
        .height(30)
        .padding({ left: 14, right: 14 })
        .fontSize(12)
        .fontColor(this.secondaryTextColor())
        .backgroundColor(this.surfaceColor())
        .textOverflow({ overflow: TextOverflow.Ellipsis })
        .maxLines(1)
    }
    .width('100%')
    .height('100%')
    .backgroundColor(this.backgroundColor())
  }

  @Builder
  private Toolbar() {
    Row() {
      Button(this.isOpening ? 'Opening' : 'Open')
        .enabled(!this.isOpening)
        .height(36)
        .fontSize(14)
        .backgroundColor(this.buttonColor())
        .fontColor(this.primaryTextColor())
        .borderRadius(8)
        .onClick(() => {
          this.openDocument();
        })

      Text(this.currentDocument ? this.currentDocument.name : 'LiteDoc Browser')
        .layoutWeight(1)
        .fontSize(15)
        .fontWeight(FontWeight.Medium)
        .fontColor(this.primaryTextColor())
        .textAlign(TextAlign.Center)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
        .maxLines(1)
        .padding({ left: 12, right: 12 })

      Button(this.theme === 'dark' ? 'Light' : 'Dark')
        .height(36)
        .fontSize(14)
        .backgroundColor(this.buttonColor())
        .fontColor(this.primaryTextColor())
        .borderRadius(8)
        .onClick(() => {
          this.toggleTheme();
        })
    }
    .width('100%')
    .height(56)
    .padding({ left: 12, right: 12 })
    .backgroundColor(this.surfaceColor())
  }

  @Builder
  private EmptyState() {
    Column() {
      Text('Open a local HTML or Markdown file')
        .fontSize(20)
        .fontWeight(FontWeight.Bold)
        .fontColor(this.primaryTextColor())
        .textAlign(TextAlign.Center)

      Text('Supports .html, .htm, .md, and .markdown')
        .fontSize(14)
        .fontColor(this.secondaryTextColor())
        .textAlign(TextAlign.Center)
        .margin({ top: 8 })

      Button('Open File')
        .height(40)
        .fontSize(15)
        .backgroundColor('#4B8F77')
        .fontColor('#FFFFFF')
        .borderRadius(8)
        .margin({ top: 20 })
        .onClick(() => {
          this.openDocument();
        })
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
    .padding({ left: 28, right: 28 })
  }

  private async openDocument(): Promise<void> {
    if (this.isOpening) {
      return;
    }

    this.isOpening = true;
    this.status = 'Opening...';

    try {
      const documentPicker = new picker.DocumentViewPicker();
      const uris = await documentPicker.select({
        maxSelectNumber: 1,
        fileSuffixFilters: ['.html', '.htm', '.md', '.markdown']
      });

      if (!uris || uris.length === 0) {
        this.status = 'Ready';
        return;
      }

      const uri = uris[0];
      const name = this.fileNameFromUri(uri);
      const extension = this.extensionFromName(name);

      if (!SUPPORTED_EXTENSIONS.includes(extension)) {
        this.status = 'Only HTML and Markdown files are supported.';
        return;
      }

      const content = this.readTextFile(uri);
      const kind: DocumentKind = extension === 'md' || extension === 'markdown' ? 'markdown' : 'html';
      this.currentDocument = {
        uri,
        name,
        extension,
        kind,
        content
      };

      this.renderCurrentDocument();
      this.status = name;
    } catch (error) {
      this.status = `Unable to open file: ${this.toMessage(error)}`;
    } finally {
      this.isOpening = false;
    }
  }

  private renderCurrentDocument(): void {
    if (!this.currentDocument) {
      return;
    }

    const html = this.currentDocument.kind === 'markdown'
      ? this.renderMarkdownDocument(this.currentDocument)
      : this.renderHtmlDocument(this.currentDocument);

    this.webController.loadData(html, 'text/html', 'UTF-8');
  }

  private toggleTheme(): void {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    this.renderCurrentDocument();
  }

  private readTextFile(uri: string): string {
    const file = fileIo.openSync(uri, fileIo.OpenMode.READ_ONLY);

    try {
      const stat = fileIo.statSync(file.fd);
      const buffer = new ArrayBuffer(stat.size);
      fileIo.readSync(file.fd, buffer);
      const decoder = util.TextDecoder.create('utf-8', { ignoreBOM: true });
      return decoder.decodeWithStream(new Uint8Array(buffer), { stream: false });
    } finally {
      fileIo.closeSync(file);
    }
  }

  private renderHtmlDocument(document: LoadedDocument): string {
    const styles = this.documentCss();
    const viewport = '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">';
    const styleTag = `<style>${styles}</style>`;
    let html = document.content;

    if (!/<meta[^>]+name=["']viewport["']/i.test(html)) {
      html = /<head[\s>]/i.test(html)
        ? html.replace(/<head([^>]*)>/i, `<head$1>${viewport}`)
        : `${viewport}${html}`;
    }

    if (/<head[\s>]/i.test(html)) {
      return html.replace(/<head([^>]*)>/i, `<head$1>${styleTag}`);
    }

    return `<!doctype html><html><head>${viewport}${styleTag}</head><body>${html}</body></html>`;
  }

  private renderMarkdownDocument(document: LoadedDocument): string {
    const body = this.markdownToHtml(document.content);
    const title = this.escapeHtml(document.name);

    return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${title}</title>
  <style>${this.documentCss()}</style>
</head>
<body>
  <main class="markdown-body">${body}</main>
</body>
</html>`;
  }

  private markdownToHtml(markdown: string): string {
    const normalized = markdown.replace(/\r\n/g, '\n');
    const lines = normalized.split('\n');
    const html: string[] = [];
    let inCode = false;
    let codeLanguage = '';
    let codeLines: string[] = [];
    let inList = false;
    let paragraph: string[] = [];

    const flushParagraph = () => {
      if (paragraph.length === 0) {
        return;
      }

      html.push(`<p>${this.inlineMarkdown(paragraph.join(' '))}</p>`);
      paragraph = [];
    };

    const closeList = () => {
      if (!inList) {
        return;
      }

      html.push('</ul>');
      inList = false;
    };

    const flushCode = () => {
      const languageClass = codeLanguage ? ` class="language-${this.escapeAttribute(codeLanguage)}"` : '';
      html.push(`<pre><code${languageClass}>${this.escapeHtml(codeLines.join('\n'))}</code></pre>`);
      codeLanguage = '';
      codeLines = [];
    };

    for (const line of lines) {
      const fence = line.match(/^```([A-Za-z0-9_-]*)\s*$/);

      if (fence) {
        if (inCode) {
          flushCode();
          inCode = false;
        } else {
          flushParagraph();
          closeList();
          inCode = true;
          codeLanguage = fence[1] || '';
          codeLines = [];
        }

        continue;
      }

      if (inCode) {
        codeLines.push(line);
        continue;
      }

      if (!line.trim()) {
        flushParagraph();
        closeList();
        continue;
      }

      const heading = line.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        flushParagraph();
        closeList();
        const level = heading[1].length;
        html.push(`<h${level}>${this.inlineMarkdown(heading[2])}</h${level}>`);
        continue;
      }

      const quote = line.match(/^>\s*(.+)$/);
      if (quote) {
        flushParagraph();
        closeList();
        html.push(`<blockquote>${this.inlineMarkdown(quote[1])}</blockquote>`);
        continue;
      }

      const listItem = line.match(/^[-*]\s+(.+)$/);
      if (listItem) {
        flushParagraph();
        if (!inList) {
          html.push('<ul>');
          inList = true;
        }

        html.push(`<li>${this.inlineMarkdown(listItem[1])}</li>`);
        continue;
      }

      paragraph.push(line.trim());
    }

    if (inCode) {
      flushCode();
    }

    flushParagraph();
    closeList();
    return html.join('\n');
  }

  private inlineMarkdown(value: string): string {
    let html = this.escapeHtml(value);
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match: string, text: string, href: string) => {
      return `<a href="${this.escapeAttribute(href)}">${text}</a>`;
    });
    return html;
  }

  private documentCss(): string {
    const dark = this.theme === 'dark';
    const background = dark ? '#15181d' : '#f7f8fa';
    const surface = dark ? '#1b2027' : '#ffffff';
    const text = dark ? '#e6e8ec' : '#20242b';
    const muted = dark ? '#aab1bc' : '#66717f';
    const line = dark ? '#303741' : '#d7dce2';
    const code = dark ? '#20262e' : '#f3f5f7';
    const link = dark ? '#8fc7e8' : '#226d94';

    return `
html {
  color-scheme: ${dark ? 'dark' : 'light'};
  background: ${background};
}
body {
  margin: 0;
  padding: 18px;
  color: ${text};
  background: ${background};
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "HarmonyOS Sans SC", "Microsoft YaHei", sans-serif;
  font-size: 16px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}
.markdown-body {
  max-width: 820px;
  margin: 0 auto;
}
h1, h2, h3, h4, h5, h6 {
  margin: 1.35em 0 0.55em;
  line-height: 1.25;
}
h1 {
  font-size: 1.72rem;
}
h2 {
  font-size: 1.42rem;
}
h3 {
  font-size: 1.22rem;
}
p, ul, ol, blockquote, pre {
  margin: 0 0 1em;
}
a {
  color: ${link};
}
img, svg, video, canvas, iframe, table {
  max-width: 100%;
}
table {
  display: block;
  overflow-x: auto;
  border-collapse: collapse;
}
th, td {
  border: 1px solid ${line};
  padding: 8px 10px;
}
blockquote {
  padding: 12px 14px;
  border-left: 4px solid #4b8f77;
  border-radius: 8px;
  color: ${muted};
  background: ${surface};
}
pre {
  overflow-x: auto;
  padding: 14px;
  border: 1px solid ${line};
  border-radius: 8px;
  background: ${code};
}
code {
  font-family: "Cascadia Code", monospace;
  font-size: 0.92em;
}
:not(pre) > code {
  padding: 2px 5px;
  border-radius: 5px;
  background: ${code};
}
`;
  }

  private fileNameFromUri(uri: string): string {
    const last = uri.split('/').pop() || 'Untitled';
    try {
      return decodeURIComponent(last);
    } catch (_error) {
      return last;
    }
  }

  private extensionFromName(name: string): string {
    const dot = name.lastIndexOf('.');
    return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private escapeAttribute(value: string): string {
    return this.escapeHtml(value).replace(/`/g, '&#96;');
  }

  private toMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }

  private backgroundColor(): string {
    return this.theme === 'dark' ? '#15181D' : '#F5F7F8';
  }

  private surfaceColor(): string {
    return this.theme === 'dark' ? '#1B2027' : '#FFFFFF';
  }

  private buttonColor(): string {
    return this.theme === 'dark' ? '#20262E' : '#EEF2F4';
  }

  private documentBackground(): string {
    return this.theme === 'dark' ? '#15181D' : '#FFFFFF';
  }

  private primaryTextColor(): string {
    return this.theme === 'dark' ? '#F2F4F6' : '#20242B';
  }

  private secondaryTextColor(): string {
    return this.theme === 'dark' ? '#AAB1BC' : '#66717F';
  }
}

