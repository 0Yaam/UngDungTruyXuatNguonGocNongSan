@echo off
setlocal EnableExtensions EnableDelayedExpansion
title AgriTrace - Docker

set "ROOT=%~dp0"
set "COMPOSE_FILE=%ROOT%docker-compose.yml"
set "DOCKER_DESKTOP=C:\Program Files\Docker\Docker\Docker Desktop.exe"

if /i "%~1"=="stop" goto :stop
if /i "%~1"=="logs" goto :logs
if /i "%~1"=="status" goto :status

call :require_docker
if errorlevel 1 goto :fail

cd /d "%ROOT%"
echo.
echo [1/3] Kiem tra cau hinh Docker Compose...
docker compose -f "%COMPOSE_FILE%" config --quiet
if errorlevel 1 goto :fail

rem Remove containers created by the older fixed-name Compose setup.
for %%C in (agri-trace-web agri-trace-api agri-trace-mediamtx agri-trace-blockchain agri-trace-mongo) do docker rm -f "%%C" >nul 2>nul

echo [2/3] Build va khoi dong AgriTrace...
docker compose -f "%COMPOSE_FILE%" up --detach --build --wait --wait-timeout 240
if errorlevel 1 (
  echo.
  echo Lan khoi dong dau khong thanh cong. Thu lai mot lan...
  timeout /t 5 /nobreak >nul
  docker compose -f "%COMPOSE_FILE%" up --detach --build --wait --wait-timeout 240
  if errorlevel 1 goto :compose_fail
)

echo [3/3] He thong da san sang.
echo.
docker compose -f "%COMPOSE_FILE%" ps
echo.
echo Web:      http://localhost:3000
echo API:      http://localhost:5000
echo MediaMTX: http://localhost:8889
echo.
start "" http://localhost:3000
exit /b 0

:require_docker
where docker >nul 2>nul
if errorlevel 1 (
  echo Khong tim thay Docker CLI. Hay cai Docker Desktop roi chay lai.
  exit /b 1
)

docker compose version >nul 2>nul
if errorlevel 1 (
  echo Docker Compose plugin chua san sang. Hay cap nhat Docker Desktop.
  exit /b 1
)

docker info >nul 2>nul
if not errorlevel 1 exit /b 0

if not exist "%DOCKER_DESKTOP%" (
  echo Docker Desktop chua chay va khong tim thay tai:
  echo %DOCKER_DESKTOP%
  exit /b 1
)

echo Dang mo Docker Desktop...
start "" /b "%DOCKER_DESKTOP%"
set /a WAIT_COUNT=0

:wait_docker
docker info >nul 2>nul
if not errorlevel 1 (
  echo Docker da san sang.
  exit /b 0
)
set /a WAIT_COUNT+=1
if !WAIT_COUNT! GEQ 60 (
  echo Docker Desktop khong san sang sau 120 giay.
  echo Hay mo Docker Desktop va kiem tra WSL 2 truoc khi chay lai.
  exit /b 1
)
timeout /t 2 /nobreak >nul
goto :wait_docker

:compose_fail
echo.
echo Docker Compose khoi dong that bai. Trang thai hien tai:
docker compose -f "%COMPOSE_FILE%" ps -a
echo.
echo Log 120 dong gan nhat:
docker compose -f "%COMPOSE_FILE%" logs --tail 120
exit /b 1

:stop
call :require_docker
if errorlevel 1 goto :fail
cd /d "%ROOT%"
docker compose -f "%COMPOSE_FILE%" down
exit /b %ERRORLEVEL%

:logs
call :require_docker
if errorlevel 1 goto :fail
cd /d "%ROOT%"
docker compose -f "%COMPOSE_FILE%" logs --tail 200 --follow
exit /b %ERRORLEVEL%

:status
call :require_docker
if errorlevel 1 goto :fail
cd /d "%ROOT%"
docker compose -f "%COMPOSE_FILE%" ps -a
exit /b %ERRORLEVEL%

:fail
echo.
echo Khong the khoi dong AgriTrace. Xem thong bao loi phia tren.
exit /b 1
