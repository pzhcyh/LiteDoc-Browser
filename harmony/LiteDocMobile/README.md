# LiteDoc Browser HarmonyOS Mobile

This is the HarmonyOS mobile version of LiteDoc Browser. It is a native ArkUI shell that renders local HTML and Markdown documents with ArkWeb.

## First Release Scope

- Open local `.html`, `.htm`, `.md`, and `.markdown` files
- Render HTML through ArkWeb
- Render Markdown as mobile-friendly HTML
- Responsive phone and tablet layout
- Dark mode by default
- Light and dark mode toggle

Not included yet:

- Editing
- Saving
- Favorites
- Sync
- AI provider configuration

## Open in DevEco Studio

1. Install DevEco Studio from Huawei Developer:

   https://developer.huawei.com/consumer/cn/develop/

2. Open this folder in DevEco Studio:

   ```text
   D:\LiteDocMobile
   ```

   DevEco Studio requires a path made from ASCII letters, numbers, dots, underscores, and hyphens. If the repository path contains spaces or Chinese characters, copy `harmony/LiteDocMobile` to `D:\LiteDocMobile` first.

3. Let DevEco Studio install or sync the matching HarmonyOS SDK and build tools.

4. Run the `entry` module on a HarmonyOS phone, tablet, or simulator.

## Package for Phone Testing

See [PACKAGE.md](PACKAGE.md) for the current packaging notes. A real phone package requires DevEco Studio, HarmonyOS SDK tools, and signing/debug configuration.

## Manual Test Cases

Prepare two local files on the device:

- `sample.html`
- `sample.md`

Then test:

1. Launch LiteDoc Browser.
2. Confirm the app opens in dark mode.
3. Tap `Open File`.
4. Select `sample.html`.
5. Confirm the HTML page is readable and adapts to screen width.
6. Tap `Light`.
7. Confirm the app chrome and injected document styles switch to light mode.
8. Tap `Open`.
9. Select `sample.md`.
10. Confirm headings, paragraphs, lists, blockquotes, code blocks, links, and images render in a readable mobile layout.

## Notes

This folder is intentionally separate from the Windows Tauri app. The shared product behavior is documented in the root README, but the mobile app uses native HarmonyOS APIs for file picking and ArkWeb rendering.
