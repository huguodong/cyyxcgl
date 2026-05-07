@echo off
setlocal EnableExtensions

set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"
set "PUBLISH_DIR=%ROOT_DIR%\publish"

echo [1/4] Building project...
pushd "%ROOT_DIR%"
call npm run build
if errorlevel 1 (
  echo Build failed.
  popd
  exit /b 1
)
popd

echo [2/4] Recreating publish directory...
if exist "%PUBLISH_DIR%" rmdir /s /q "%PUBLISH_DIR%"
mkdir "%PUBLISH_DIR%"
mkdir "%PUBLISH_DIR%\data"

echo [3/4] Copying runtime files...
xcopy "%ROOT_DIR%\dist" "%PUBLISH_DIR%\dist\" /E /I /Y >nul
if errorlevel 1 (
  echo Failed to copy dist directory.
  exit /b 1
)

if exist "%ROOT_DIR%\data" (
  xcopy "%ROOT_DIR%\data" "%PUBLISH_DIR%\data\" /E /I /Y >nul
  if errorlevel 1 (
    echo Failed to copy data directory.
    exit /b 1
  )
)

copy /Y "%ROOT_DIR%\package.json" "%PUBLISH_DIR%\package.json" >nul
copy /Y "%ROOT_DIR%\package-lock.json" "%PUBLISH_DIR%\package-lock.json" >nul
copy /Y "%ROOT_DIR%\ecosystem.config.cjs" "%PUBLISH_DIR%\ecosystem.config.cjs" >nul

echo @echo off>"%PUBLISH_DIR%\start-pm2.bat"
echo setlocal EnableExtensions>>"%PUBLISH_DIR%\start-pm2.bat"
echo cd /d %%~dp0>>"%PUBLISH_DIR%\start-pm2.bat"
echo call npm install --omit=dev>>"%PUBLISH_DIR%\start-pm2.bat"
echo if errorlevel 1 exit /b ^1>>"%PUBLISH_DIR%\start-pm2.bat"
echo pm2 start ecosystem.config.cjs --update-env>>"%PUBLISH_DIR%\start-pm2.bat"
echo if errorlevel 1 exit /b ^1>>"%PUBLISH_DIR%\start-pm2.bat"
echo pm2 save>>"%PUBLISH_DIR%\start-pm2.bat"
echo pm2 list>>"%PUBLISH_DIR%\start-pm2.bat"

echo @echo off>"%PUBLISH_DIR%\stop-pm2.bat"
echo setlocal EnableExtensions>>"%PUBLISH_DIR%\stop-pm2.bat"
echo cd /d %%~dp0>>"%PUBLISH_DIR%\stop-pm2.bat"
echo pm2 stop ecosystem.config.cjs>>"%PUBLISH_DIR%\stop-pm2.bat"
echo if errorlevel 1 exit /b ^1>>"%PUBLISH_DIR%\stop-pm2.bat"
echo pm2 delete ecosystem.config.cjs>>"%PUBLISH_DIR%\stop-pm2.bat"
echo pm2 save>>"%PUBLISH_DIR%\stop-pm2.bat"
echo pm2 list>>"%PUBLISH_DIR%\stop-pm2.bat"

echo Internal SQLite deploy package>"%PUBLISH_DIR%\DEPLOY.txt"
echo.>>"%PUBLISH_DIR%\DEPLOY.txt"
echo 1. Upload everything under this publish folder to the server target directory.>>"%PUBLISH_DIR%\DEPLOY.txt"
echo 2. On the server, open PowerShell or CMD in that directory.>>"%PUBLISH_DIR%\DEPLOY.txt"
echo 3. Run start-pm2.bat, or manually run: npm install --omit=dev ^&^& pm2 start ecosystem.config.cjs --update-env>>"%PUBLISH_DIR%\DEPLOY.txt"
echo 4. Run stop-pm2.bat when you want to stop and remove the PM2 app from this directory.>>"%PUBLISH_DIR%\DEPLOY.txt"
echo 5. Default login: admin / admin123456. Change ADMIN_PASSWORD and SESSION_SECRET in ecosystem.config.cjs before first production start.>>"%PUBLISH_DIR%\DEPLOY.txt"

echo [4/4] Publish package ready:
echo %PUBLISH_DIR%
echo.
echo Upload the contents of publish to your Windows server, then run start-pm2.bat there.

exit /b 0
