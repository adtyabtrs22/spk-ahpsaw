# ============================================================
# setup-railway.ps1
# Script otomasi deploy SPK AHP-SAW ke Railway
#
# CARA PAKAI — jalankan di terminal VS Code (bukan lewat Antigravity):
#   powershell -ExecutionPolicy Bypass -File scripts/setup-railway.ps1
# ============================================================

$ErrorActionPreference = "Stop"

function Write-Step($num, $msg) {
    Write-Host ""
    Write-Host "[$num] $msg" -ForegroundColor Cyan
    Write-Host ("--------------------------------------------------") -ForegroundColor DarkGray
}
function Write-OK($msg)   { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  [!]  $msg" -ForegroundColor Yellow }
function Write-Fail($msg) { Write-Host "  [X]  $msg" -ForegroundColor Red }

Write-Host ""
Write-Host "=======================================" -ForegroundColor Magenta
Write-Host "  SPK AHP-SAW -- Railway Auto Setup   " -ForegroundColor Magenta
Write-Host "=======================================" -ForegroundColor Magenta
Write-Host ""


# ─────────────────────────────────────────────
# STEP 1: Cek & Install Railway CLI
# ─────────────────────────────────────────────
Write-Step 1 "Mengecek Railway CLI..."

$railwayInstalled = Get-Command railway -ErrorAction SilentlyContinue
if (-not $railwayInstalled) {
    Write-Warn "Railway CLI belum ada. Menginstall..."
    npm install -g @railway/cli
    Write-OK "Railway CLI terinstall!"
} else {
    Write-OK "Railway CLI sudah ada."
}


# ─────────────────────────────────────────────
# STEP 2: Login ke Railway
# ─────────────────────────────────────────────
Write-Step 2 "Login ke Railway..."
Write-Warn "Browser akan terbuka. Login dengan GitHub lalu kembali ke sini."
Write-Host "  Tekan Enter setelah login di browser..." -ForegroundColor White
railway login --browserless
Write-OK "Login selesai!"


# ─────────────────────────────────────────────
# STEP 3: Pilih atau buat project
# ─────────────────────────────────────────────
Write-Step 3 "Menghubungkan ke project Railway..."
Write-Warn "Pilih project yang sudah ada atau buat baru di prompt berikut:"
railway link
Write-OK "Project terhubung!"


# ─────────────────────────────────────────────
# STEP 4: Tambah PostgreSQL
# ─────────────────────────────────────────────
Write-Step 4 "Menambahkan database PostgreSQL..."
railway add --database postgres
Write-OK "PostgreSQL ditambahkan!"

Write-Warn "Menunggu 15 detik agar database siap..."
Start-Sleep -Seconds 15

# Ambil DATABASE_URL
$DATABASE_URL = ""
try {
    $DATABASE_URL = (railway variables get DATABASE_URL 2>$null).Trim()
} catch {}

if (-not $DATABASE_URL -or $DATABASE_URL -like "*error*") {
    Write-Warn "DATABASE_URL tidak bisa diambil otomatis."
    Write-Host ""
    Write-Host "  Lakukan ini:" -ForegroundColor White
    Write-Host "  1. Buka https://railway.app/dashboard di browser" -ForegroundColor White
    Write-Host "  2. Klik project kamu" -ForegroundColor White
    Write-Host "  3. Klik service 'Postgres'" -ForegroundColor White
    Write-Host "  4. Klik tab 'Variables'" -ForegroundColor White
    Write-Host "  5. Copy nilai 'DATABASE_URL'" -ForegroundColor White
    Write-Host ""
    $DATABASE_URL = Read-Host "  Paste DATABASE_URL di sini"
}
Write-OK "DATABASE_URL siap!"


# ─────────────────────────────────────────────
# STEP 5: Generate SECRET_KEY
# ─────────────────────────────────────────────
Write-Step 5 "Membuat SECRET_KEY..."
Write-Warn "Tekan Enter untuk auto-generate, atau ketik sendiri (min 32 karakter):"
$input_key = Read-Host "  SECRET_KEY"

if ($input_key.Length -ge 32) {
    $SECRET_KEY = $input_key
} else {
    $chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    $SECRET_KEY = -join (1..48 | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] })
    Write-OK "SECRET_KEY di-generate: $SECRET_KEY"
    Write-Warn "Simpan SECRET_KEY ini di tempat aman!"
}


# ─────────────────────────────────────────────
# STEP 6: Buat & Deploy Service Backend
# ─────────────────────────────────────────────
Write-Step 6 "Membuat service Backend (FastAPI)..."

# Buat service baru bernama 'backend'
railway add --service backend

# Set environment variables untuk backend
Write-Warn "Menyimpan environment variables backend..."
railway variables --service backend set DATABASE_URL="$DATABASE_URL"
railway variables --service backend set SECRET_KEY="$SECRET_KEY"
railway variables --service backend set CORS_ORIGINS="http://localhost:5173"

# Set root directory ke backend dan deploy
Write-Warn "Deploy backend dari subfolder /backend ..."
Push-Location "$PSScriptRoot\..\backend"
railway up --service backend --detach
Pop-Location

Write-OK "Backend di-deploy (background)!"
Write-Warn "Menunggu 90 detik agar backend selesai build..."
Start-Sleep -Seconds 90


# ─────────────────────────────────────────────
# STEP 7: Generate Domain Backend
# ─────────────────────────────────────────────
Write-Step 7 "Membuat domain publik backend..."

$BACKEND_URL = ""
try {
    # Coba buat domain dulu (boleh gagal kalau sudah ada)
    railway domain --service backend 2>$null | Out-Null
    Start-Sleep -Seconds 5
    # Ambil semua output Railway (termasuk baris yg sudah ada domain)
    $domainRaw = (railway domain --service backend 2>&1) -join " "
    # Ekstrak URL https:// dari manapun dalam output
    if ($domainRaw -match "(https://[\w\-\.]+\.railway\.app)") {
        $BACKEND_URL = $Matches[1].Trim()
    }
} catch {}

if (-not $BACKEND_URL) {
    Write-Warn "URL backend tidak bisa diambil otomatis."
    Write-Host ""
    Write-Host "  Lakukan ini:" -ForegroundColor White
    Write-Host "  1. Buka Railway dashboard di browser" -ForegroundColor White
    Write-Host "  2. Klik service 'backend'" -ForegroundColor White
    Write-Host "  3. Klik tab 'Settings'" -ForegroundColor White
    Write-Host "  4. Scroll ke 'Networking' atau 'Domains'" -ForegroundColor White
    Write-Host "  5. Klik 'Generate Domain'" -ForegroundColor White
    Write-Host "  6. Copy URL yang muncul" -ForegroundColor White
    Write-Host ""
    $BACKEND_URL = Read-Host "  Paste URL backend (contoh: https://xxx.railway.app)"
}
$BACKEND_URL = $BACKEND_URL.Trim().TrimEnd('/')
Write-OK "Backend URL: $BACKEND_URL"


# ─────────────────────────────────────────────
# STEP 8: Buat & Deploy Service Frontend
# ─────────────────────────────────────────────
Write-Step 8 "Membuat service Frontend (React/Vite)..."

railway add --service frontend

Write-Warn "Menyimpan VITE_API_URL untuk frontend..."
railway variables --service frontend set VITE_API_URL="$BACKEND_URL"

Write-Warn "Deploy frontend dari subfolder /frontend ..."
Push-Location "$PSScriptRoot\..\frontend"
railway up --service frontend --detach
Pop-Location

Write-OK "Frontend di-deploy (background)!"
Write-Warn "Menunggu 120 detik (npm install bisa lama)..."
Start-Sleep -Seconds 120


# ─────────────────────────────────────────────
# STEP 9: Generate Domain Frontend & Update CORS
# ─────────────────────────────────────────────
Write-Step 9 "Membuat domain frontend & update CORS backend..."

$FRONTEND_URL = ""
try {
    # Coba buat domain dulu (boleh gagal kalau sudah ada)
    railway domain --service frontend 2>$null | Out-Null
    Start-Sleep -Seconds 5
    # Ambil semua output Railway (termasuk baris yg sudah ada domain)
    $domainRaw = (railway domain --service frontend 2>&1) -join " "
    # Ekstrak URL https:// dari manapun dalam output
    if ($domainRaw -match "(https://[\w\-\.]+\.railway\.app)") {
        $FRONTEND_URL = $Matches[1].Trim()
    }
} catch {}

if (-not $FRONTEND_URL) {
    Write-Warn "URL frontend tidak bisa diambil otomatis."
    Write-Host ""
    Write-Host "  Lakukan ini:" -ForegroundColor White
    Write-Host "  1. Klik service 'frontend' di Railway" -ForegroundColor White
    Write-Host "  2. Settings -> Networking -> Generate Domain" -ForegroundColor White
    Write-Host "  3. Copy URL yang muncul" -ForegroundColor White
    Write-Host ""
    $FRONTEND_URL = Read-Host "  Paste URL frontend (contoh: https://xxx.railway.app)"
}
$FRONTEND_URL = $FRONTEND_URL.Trim().TrimEnd('/')

# Update CORS backend dengan URL frontend
$CORS = "$FRONTEND_URL,http://localhost:5173,http://localhost:3000"
railway variables --service backend set CORS_ORIGINS="$CORS"
Write-OK "CORS backend diupdate!"


# ─────────────────────────────────────────────
# SELESAI
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "=======================================" -ForegroundColor Green
Write-Host "  DEPLOY SELESAI!                     " -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Backend  : $BACKEND_URL" -ForegroundColor White
Write-Host "  Frontend : $FRONTEND_URL" -ForegroundColor White
Write-Host "  API Docs : $BACKEND_URL/docs" -ForegroundColor White
Write-Host ""
Write-Host "  Untuk deploy ulang setelah ada perubahan:" -ForegroundColor Yellow
Write-Host "    git add -A" -ForegroundColor Gray
Write-Host "    git commit -m 'pesan'" -ForegroundColor Gray
Write-Host "    git push origin main" -ForegroundColor Gray
Write-Host "  Railway otomatis redeploy!" -ForegroundColor Yellow
Write-Host ""

# Buka browser jika URL tersedia
if ($FRONTEND_URL -and $FRONTEND_URL -match "^https://") {
    Write-Host "  Membuka browser ke $FRONTEND_URL ..." -ForegroundColor Cyan
    Start-Process $FRONTEND_URL
} else {
    Write-Warn "URL frontend tidak valid, buka manual di browser."
}
