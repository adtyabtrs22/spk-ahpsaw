# ============================================================
# setup-railway.ps1
# Script otomatis deploy SPK AHP-SAW ke Railway
# Jalankan SEKALI SAJA dari terminal VS Code:
#   powershell -ExecutionPolicy Bypass -File scripts/setup-railway.ps1
# ============================================================

$ErrorActionPreference = "Stop"

function Write-Step($num, $msg) {
    Write-Host ""
    Write-Host "[$num] $msg" -ForegroundColor Cyan
    Write-Host ("-" * 50) -ForegroundColor DarkGray
}

function Write-OK($msg)   { Write-Host "  ✓ $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  ! $msg" -ForegroundColor Yellow }
function Write-Fail($msg) { Write-Host "  ✗ $msg" -ForegroundColor Red }

Write-Host ""
Write-Host "=======================================" -ForegroundColor Magenta
Write-Host "  SPK AHP-SAW — Railway Auto Setup" -ForegroundColor Magenta
Write-Host "=======================================" -ForegroundColor Magenta


# ─────────────────────────────────────────────
# STEP 1: Cek & Install Railway CLI
# ─────────────────────────────────────────────
Write-Step 1 "Mengecek Railway CLI..."

$railwayInstalled = Get-Command railway -ErrorAction SilentlyContinue
if (-not $railwayInstalled) {
    Write-Warn "Railway CLI belum terinstall. Menginstall sekarang..."
    npm install -g @railway/cli
    Write-OK "Railway CLI berhasil diinstall!"
} else {
    Write-OK "Railway CLI sudah terinstall: $(railway --version)"
}


# ─────────────────────────────────────────────
# STEP 2: Login ke Railway
# ─────────────────────────────────────────────
Write-Step 2 "Login ke Railway..."
Write-Warn "Browser akan terbuka untuk login dengan GitHub."
Write-Warn "Setelah login di browser, kembali ke sini."
Write-Host ""
railway login
Write-OK "Login berhasil!"


# ─────────────────────────────────────────────
# STEP 3: Buat Project baru di Railway
# ─────────────────────────────────────────────
Write-Step 3 "Membuat project Railway baru..."
railway init --name "spk-ahpsaw"
Write-OK "Project 'spk-ahpsaw' dibuat!"


# ─────────────────────────────────────────────
# STEP 4: Tambah PostgreSQL
# ─────────────────────────────────────────────
Write-Step 4 "Menambahkan database PostgreSQL..."
railway add --database postgresql
Write-OK "PostgreSQL berhasil ditambahkan!"
Start-Sleep -Seconds 5  # tunggu DB siap

# Ambil DATABASE_URL otomatis
Write-Warn "Mengambil DATABASE_URL dari Railway..."
$DATABASE_URL = (railway variables get DATABASE_URL 2>$null)
if (-not $DATABASE_URL) {
    Write-Fail "Gagal ambil DATABASE_URL otomatis."
    $DATABASE_URL = Read-Host "  Paste DATABASE_URL dari Railway dashboard"
}
Write-OK "DATABASE_URL berhasil diambil!"


# ─────────────────────────────────────────────
# STEP 5: Input SECRET_KEY
# ─────────────────────────────────────────────
Write-Step 5 "Mengatur SECRET_KEY..."
Write-Warn "Masukkan SECRET_KEY (minimal 32 karakter acak)."
Write-Warn "Contoh: spkahpsaw2026kementerianbinax9k2p7"
$SECRET_KEY = Read-Host "  SECRET_KEY"
if ($SECRET_KEY.Length -lt 32) {
    # Auto-generate jika terlalu pendek
    Write-Warn "Terlalu pendek. Membuat SECRET_KEY otomatis..."
    $SECRET_KEY = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object {[char]$_})
    Write-OK "SECRET_KEY dibuat: $SECRET_KEY"
    Write-Warn "CATAT SECRET_KEY ini di tempat aman!"
}


# ─────────────────────────────────────────────
# STEP 6: Deploy Backend (FastAPI)
# ─────────────────────────────────────────────
Write-Step 6 "Deploy Backend (FastAPI)..."

# Tambah service backend
railway add --service backend

# Set root directory ke backend
railway service backend

# Set environment variables backend
railway variables set DATABASE_URL="$DATABASE_URL" --service backend
railway variables set SECRET_KEY="$SECRET_KEY" --service backend
railway variables set CORS_ORIGINS="http://localhost:5173" --service backend

# Deploy backend dari folder backend
Push-Location backend
railway up --service backend --detach
Pop-Location

Write-OK "Backend sedang di-deploy (berjalan di background)..."
Write-Warn "Menunggu 60 detik agar backend siap..."
Start-Sleep -Seconds 60


# ─────────────────────────────────────────────
# STEP 7: Ambil URL Backend
# ─────────────────────────────────────────────
Write-Step 7 "Mengambil URL backend..."
$BACKEND_URL = (railway domain --service backend 2>$null)
if (-not $BACKEND_URL) {
    Write-Warn "Membuat domain untuk backend..."
    railway domain --service backend
    Start-Sleep -Seconds 5
    $BACKEND_URL = (railway domain --service backend 2>$null)
}
if ($BACKEND_URL -notmatch "^https://") {
    $BACKEND_URL = "https://$BACKEND_URL"
}
Write-OK "Backend URL: $BACKEND_URL"


# ─────────────────────────────────────────────
# STEP 8: Deploy Frontend (React/Vite)
# ─────────────────────────────────────────────
Write-Step 8 "Deploy Frontend (React/Vite)..."

# Tambah service frontend
railway add --service frontend

# Set VITE_API_URL ke URL backend
railway variables set VITE_API_URL="$BACKEND_URL" --service frontend

# Deploy frontend dari folder frontend
Push-Location frontend
railway up --service frontend --detach
Pop-Location

Write-OK "Frontend sedang di-deploy (berjalan di background)..."
Write-Warn "Menunggu 90 detik agar frontend selesai build (npm install)..."
Start-Sleep -Seconds 90


# ─────────────────────────────────────────────
# STEP 9: Ambil URL Frontend & Update CORS
# ─────────────────────────────────────────────
Write-Step 9 "Mengambil URL frontend & update CORS backend..."
$FRONTEND_URL = (railway domain --service frontend 2>$null)
if (-not $FRONTEND_URL) {
    Write-Warn "Membuat domain untuk frontend..."
    railway domain --service frontend
    Start-Sleep -Seconds 5
    $FRONTEND_URL = (railway domain --service frontend 2>$null)
}
if ($FRONTEND_URL -notmatch "^https://") {
    $FRONTEND_URL = "https://$FRONTEND_URL"
}
Write-OK "Frontend URL: $FRONTEND_URL"

# Update CORS backend dengan URL frontend
$CORS_ORIGINS = "$FRONTEND_URL,http://localhost:5173,http://localhost:3000"
railway variables set CORS_ORIGINS="$CORS_ORIGINS" --service backend
Write-OK "CORS backend diupdate dengan URL frontend!"


# ─────────────────────────────────────────────
# SELESAI — Tampilkan ringkasan
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "=======================================" -ForegroundColor Green
Write-Host "  DEPLOY SELESAI! " -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Backend  : $BACKEND_URL" -ForegroundColor White
Write-Host "  Frontend : $FRONTEND_URL" -ForegroundColor White
Write-Host "  API Docs : $BACKEND_URL/docs" -ForegroundColor White
Write-Host ""
Write-Host "  Setelah ini, cukup:" -ForegroundColor Yellow
Write-Host "    git add -A" -ForegroundColor Gray
Write-Host "    git commit -m 'pesan'" -ForegroundColor Gray
Write-Host "    git push origin main" -ForegroundColor Gray
Write-Host "  Railway akan otomatis redeploy! " -ForegroundColor Yellow
Write-Host ""

# Buka browser ke frontend
Start-Process $FRONTEND_URL
