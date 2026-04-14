@echo off
:: MarkdownFocusEditor Portable Launcher
:: Redirects TEMP so the runtime extracts NEXT TO the exe (persistent)
:: instead of %TEMP% (cleaned by Windows Storage Sense / Disk Cleanup)

set "TEMP=%~dp0runtime"
set "TMP=%~dp0runtime"
if not exist "%TEMP%" mkdir "%TEMP%"
start "" "%~dp0MarkdownFocusEditor.exe"
