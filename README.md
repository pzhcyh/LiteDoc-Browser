# LiteDoc Browser

LiteDoc Browser is a lightweight desktop browser for opening local HTML and Markdown files.

It is built for fast personal reading and light editing. The current desktop version focuses on Windows usage.

The HarmonyOS mobile prototype lives under:

```text
harmony/LiteDocMobile/
```

## Features

- Open local `.html`, `.htm`, `.md`, and `.markdown` files
- Preview HTML files in an isolated frame
- Render Markdown with GitHub-flavored Markdown support
- Render Mermaid code blocks in Markdown
- Toggle light and dark mode, with dark mode as the default
- Edit and save opened local files
- Drag and drop files into the window
- Register file associations when installed

## Download

Build artifacts are generated locally under:

```text
src-tauri/target/release/bundle/
```

## Development

Requirements:

- Node.js
- Rust
- Visual Studio Build Tools with the Windows SDK

Install dependencies:

```powershell
npm install
```

Run the desktop app in development mode:

```powershell
npm run desktop:dev
```

Build the Windows desktop app and installers:

```powershell
npm run desktop:build
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
