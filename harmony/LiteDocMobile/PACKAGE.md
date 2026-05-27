# Package LiteDoc Browser for HarmonyOS Testing

This project needs DevEco Studio and a HarmonyOS SDK/signing setup to generate an installable phone package.

## Why Codex Cannot Produce a HAP on This Machine Yet

The current machine does not have these HarmonyOS build tools on `PATH`:

- `hvigor`
- `ohpm`
- `hdc`
- DevEco Studio command-line build environment

HarmonyOS phone test packages also need signing. DevEco Studio can usually generate a debug signing setup after the SDK is installed and the device/emulator is configured.

After DevEco Studio is installed, the bundled tools can be used directly:

```powershell
$env:NODE_HOME='D:\01_APP\HUAWEI coding\devecostudio\DevEco Studio\tools\node'
$env:DEVECO_SDK_HOME='D:\01_APP\HUAWEI coding\devecostudio\DevEco Studio\sdk'
$env:PATH="$env:NODE_HOME;$env:PATH"
& 'D:\01_APP\HUAWEI coding\devecostudio\DevEco Studio\tools\hvigor\bin\hvigorw.bat' assembleApp --no-daemon
```

## Build a Test Package in DevEco Studio

1. Install DevEco Studio from Huawei Developer:

   ```text
   https://developer.huawei.com/consumer/cn/develop/
   ```

2. Open this folder:

   ```text
   D:\LiteDocMobile
   ```

   DevEco Studio rejects project paths that contain spaces, Chinese characters, or other unsupported characters. Do not open the project from the repository path if it contains directories such as `Coding Program`. Use a short ASCII path such as `D:\LiteDocMobile`.

3. Let DevEco Studio install or sync:

   - HarmonyOS SDK
   - Hvigor
   - Ohpm
   - ArkTS build toolchain

4. Configure signing if DevEco Studio prompts for it.

5. Connect the Huawei phone and enable developer/debugging mode, or use a HarmonyOS simulator.

6. Run the `entry` module once from DevEco Studio.

7. To create a package for manual testing, use DevEco Studio's build/package action for the `entry` module. The generated package is normally written under the module's build output directory.

Command-line build output from the path-safe copy:

```text
D:\LiteDocMobile\entry\build\default\outputs\default\app\entry-default.hap
D:\LiteDocMobile\build\outputs\default\LiteDocMobile-default-unsigned.app
```

Convenience copies:

```text
D:\LiteDocMobile\release\LiteDocMobile-entry-default.hap
D:\LiteDocMobile\release\LiteDocMobile-default-unsigned.app
D:\LiteDocMobile-build-20260527.zip
```

The current command-line build warns that no `signingConfigs` profile is configured. If a phone rejects the package, use DevEco Studio Run/Build with debug signing configured.

If `ohpm install --all` fails with `@ohos/hamock` not found, remove test-only dependencies from the root `oh-package.json5`. This prototype does not use the HarmonyOS test libraries yet, so `devDependencies` can remain empty.

## One-Command Local Build Attempt

This helper script syncs dependencies, builds the HAP, copies it to `release`, checks connected devices, and attempts installation:

```powershell
C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe -ExecutionPolicy Bypass -File D:\LiteDocMobile\build-and-install.ps1
```

If the install step fails with `no signature file`, configure debug signing in DevEco Studio and run the `entry` module from DevEco Studio.

## Manual Test Checklist

After installing the generated package on a Huawei phone:

1. Launch LiteDoc Browser.
2. Confirm it opens in dark mode.
3. Tap `Open File`.
4. Select a local `.html` file.
5. Confirm the HTML page is readable and adapts to phone width.
6. Toggle to light mode.
7. Open a `.md` file.
8. Confirm headings, paragraphs, lists, blockquotes, links, and code blocks render correctly.

## Current Source Package

If DevEco Studio is not installed on this machine, send this source package to a machine with DevEco Studio installed:

```text
D:\05_Coding\Coding Program\Codex Program\06.Tools\LiteDoc Browser\release\LiteDocMobile-HarmonyOS-source-20260527.zip
```

Path-safe working copy:

```text
D:\LiteDocMobile
```

Path-safe source package:

```text
D:\LiteDocMobile_20260527.zip
```
