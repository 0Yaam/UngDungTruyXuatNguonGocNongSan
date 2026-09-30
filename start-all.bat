@echo off
setlocal EnableExtensions
call "%~dp0start-docker.bat" %*
exit /b %ERRORLEVEL%