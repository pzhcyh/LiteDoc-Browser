# LiteDoc Browser

LiteDoc Browser is a lightweight desktop browser for opening local HTML and Markdown files.

It is built for fast personal reading and light editing, with three platform editions:

- HarmonyOS mobile edition under `harmony/LiteDocMobile/`
- Windows desktop edition built with Tauri
- macOS desktop edition built with Tauri and redesigned for MacBook usage

## Features

- Open local `.html`, `.htm`, `.md`, `.markdown`, `.txt`, and `.text` files
- Use multiple document tabs in one window
- Create new Markdown documents
- Preview HTML files in an isolated frame
- Render Markdown with GitHub-flavored Markdown support
- Render Mermaid code blocks in Markdown
- Preview Markdown while editing
- Toggle light and dark mode, with dark mode as the default
- Edit, save, and Save As local files
- Drag and drop files into the window
- Register file associations when installed

## Platform Editions

### HarmonyOS

The HarmonyOS mobile edition lives under:

```text
harmony/LiteDocMobile/
```

Open this directory in DevEco Studio to build, run, or package the mobile app.

### Windows

The Windows desktop edition uses Tauri 2 with the same HTML, Markdown, Mermaid, and editing features as the desktop app.

Windows requirements:

- Node.js
- Rust
- Visual Studio Build Tools with the Windows SDK

Windows commands:

```powershell
npm install
npm run windows:dev
npm run windows:build
```

### macOS

The macOS desktop edition is redesigned for MacBook usage with a Mac-style titlebar, sidebar document list, native Command-key shortcuts, macOS app icon support, and local ad-hoc signing for personal use.

macOS requirements:

- Xcode Command Line Tools

Set up the local macOS development tools:

```sh
./scripts/setup-mac-dev.sh
```

macOS commands:

```sh
npm run mac:dev
npm run mac:build
```

macOS build outputs:

```text
src-tauri/target/release/bundle/macos/LiteDoc Browser.app
src-tauri/target/release/bundle/dmg/LiteDoc Browser_0.1.2_aarch64.dmg
```

## Download

Build artifacts are generated locally under:

```text
src-tauri/target/release/bundle/
```

## Development

Requirements:

- macOS: Xcode Command Line Tools
- Windows: Visual Studio Build Tools with the Windows SDK

Set up a Mac development environment:

```sh
./scripts/setup-mac-dev.sh
```

Install dependencies:

```sh
npm install
```

Run the desktop app in development mode:

```sh
npm run desktop:dev
```

Build the desktop app and installers for the current platform:

```sh
npm run desktop:build
```

macOS-specific aliases:

```sh
npm run mac:dev
npm run mac:build
```

Windows-specific aliases:

```powershell
npm run windows:dev
npm run windows:build
```

Open the HarmonyOS mobile app in DevEco Studio:

```text
harmony/LiteDocMobile
```

## Tech Stack

- Tauri 2
- Vite
- TypeScript
- Marked
- Mermaid
- DOMPurify
- HarmonyOS ArkTS / ArkUI / ArkWeb for the mobile prototype

## License

MIT
