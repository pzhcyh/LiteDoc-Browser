@echo off
setlocal
set "ORIGINAL_PATH=%PATH%"

set "VSDEVCMD=C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat"

if not exist "%VSDEVCMD%" (
  echo Visual Studio Build Tools were not found.
  exit /b 1
)

call "%VSDEVCMD%" -arch=x64 -host_arch=x64 >nul
if errorlevel 1 exit /b %errorlevel%
set "PATH=%PATH%;%ORIGINAL_PATH%"

set "MSVC_TOOLS=C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC\14.44.35207"
set "WINSDK=C:\Program Files (x86)\Windows Kits\10"
set "WINSDK_VERSION=10.0.26100.0"

if exist "%MSVC_TOOLS%\bin\HostX64\x64\link.exe" (
  set "PATH=%MSVC_TOOLS%\bin\HostX64\x64;C:\Windows\System32;C:\Windows;%PATH%"
)

if exist "%WINSDK%\Lib\%WINSDK_VERSION%\um\x64\kernel32.lib" (
  set "LIB=%MSVC_TOOLS%\lib\x64;%WINSDK%\Lib\%WINSDK_VERSION%\ucrt\x64;%WINSDK%\Lib\%WINSDK_VERSION%\um\x64"
  set "LIBPATH=%MSVC_TOOLS%\lib\x64;%WINSDK%\UnionMetadata\%WINSDK_VERSION%;%WINSDK%\References\%WINSDK_VERSION%;C:\Windows\Microsoft.NET\Framework64\v4.0.30319"
  set "INCLUDE=%MSVC_TOOLS%\include;%WINSDK%\Include\%WINSDK_VERSION%\ucrt;%WINSDK%\Include\%WINSDK_VERSION%\um;%WINSDK%\Include\%WINSDK_VERSION%\shared;%WINSDK%\Include\%WINSDK_VERSION%\winrt;%WINSDK%\Include\%WINSDK_VERSION%\cppwinrt"
)

if exist "D:\05_Coding\Node.js\npm.cmd" (
  set "PATH=D:\05_Coding\Node.js;%PATH%"
)

if exist "%USERPROFILE%\.cargo\bin\cargo.exe" (
  set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
)

%*
