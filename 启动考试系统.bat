@echo off
chcp 65001 > nul
cd /d "%~dp0exam-system"

REM 启动Node.js服务器在新窗口中运行
start "环境监测考试系统" cmd /k "node src/server.js"

REM 等待服务器启动
timeout /t 2 /nobreak > nul

REM 打开浏览器
start http://localhost:3000