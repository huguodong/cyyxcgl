@echo off
setlocal EnableExtensions

set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"
set "PUBLISH_DIR=%ROOT_DIR%\publish"
set "ZIP_PATH=%ROOT_DIR%\publish.zip"

echo [1/3] Building publish directory...
call "%ROOT_DIR%\build-publish.bat"
if errorlevel 1 (
  echo build-publish.bat failed.
  exit /b 1
)

echo [2/3] Creating zip package...
if exist "%ZIP_PATH%" del /f /q "%ZIP_PATH%"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Compress-Archive -Path '%PUBLISH_DIR%\*' -DestinationPath '%ZIP_PATH%' -Force"

if errorlevel 1 (
  echo Failed to create publish.zip.
  exit /b 1
)

echo [3/3] Zip package ready:
echo %ZIP_PATH%

exit /b 0
