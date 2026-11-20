@echo off
setlocal
cd /d "%~dp0"
title StudyBuddy AI - Menjalankan Website
color 0B
echo =============================================
echo       STUDYBUDDY AI - WEBSITE BELAJAR
 echo =============================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo [PERLU NODE.JS] Node.js belum terpasang.
  echo Buka https://nodejs.org dan instal Node.js versi LTS.
  echo Setelah instalasi, tutup jendela ini dan klik file ini lagi.
  start "" "https://nodejs.org/"
  pause
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo npm belum ditemukan. Instal ulang Node.js LTS dari https://nodejs.org/
  pause
  exit /b 1
)
if not exist ".env" (
  copy /y ".env.example" ".env" >nul
  echo [INFO] File .env dibuat. Tanpa Gemini API key, website berjalan dalam mode DEMO.
)
if not exist "node_modules\express" (
  echo [1/2] Menginstal paket website. Pastikan internet aktif.
  call npm install
  if errorlevel 1 (
    echo.
    echo [GAGAL] Instalasi paket gagal. Periksa internet dan pesan kesalahan di atas.
    pause
    exit /b 1
  )
)
echo.
echo [2/2] Menjalankan server...
echo Website akan dibuka pada http://localhost:3000
 echo JANGAN tutup jendela hitam ini selama menggunakan website.
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 4; Start-Process 'http://localhost:3000'"
call npm start
if errorlevel 1 echo [GAGAL] Server berhenti karena kesalahan di atas.
pause
