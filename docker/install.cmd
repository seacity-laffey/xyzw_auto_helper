@echo off
setlocal
cd /d "%~dp0.."

docker container inspect xyzw-web-helper >nul 2>&1
if not errorlevel 1 (
  echo Container xyzw-web-helper already exists; remove or rename it before redeploying.
  exit /b 1
)

call pnpm run build || exit /b 1
docker build --file docker\Dockerfile --tag xyzw-web-helper:latest . || exit /b 1
docker run --detach --restart unless-stopped --publish 8080:80 --name xyzw-web-helper xyzw-web-helper:latest
