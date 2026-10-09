@echo off
setlocal
pushd "%~dp0.."
call npm.cmd run host
popd
echo.
echo The game and tunnel have stopped. Press any key to close this window.
pause >nul
