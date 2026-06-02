# ============================================================
# setup-railway.ps1
# Script otomasi deploy SPK AHP-SAW ke Railway
# Jalankan SEKALI dari terminal VS Code:
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
function Write-Fail($msg) { Write-Host "  [X]  $msg" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "=======================================" -ForegroundColor Magenta
Write-Host "  SPK AHP-SAW -- Railway Auto Setup   " -ForegroundColor Magenta
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
    Write-OK "Railway CLI sudah terinstall."
}


# ─────────────────────────────────────────────
# STEP 2: Login ke Railway
# ─────────────────────────────────────────────
Write-Step 2 "Login ke Railway..."
Write-Warn "Browser akan terbuka untuk login dengan GitHub."
Write-Warn "Setelah login di browser, kembali ke terminal ini."
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

Write-Warn "Menunggu 10 detik agar database siap..."
Start-Sleep -Seconds 10

# Ambil DATABASE_URL otomatis
Write-Warn "Mengambil DATABASE_URL dari Railway..."
$DATABASE_URL = ""
try {
    $DATABASE_URL = (railway variables get DATABASE_URL 2>$null)
} catch {}

if (-not $DATABASE_URL) {
    Write-Warn "Tidak bisa ambil otomatis. Silakan buka Railway dashboard:"
    Write-Host "  -> Klik service PostgreSQL -> tab Variables -> salin DATABASE_URL" -ForegroundColor White
    $DATABASE_URL = Read-Host "  Paste DATABASE_URL di sini"
}
Write-OK "DATABASE_URL berhasil didapat!"


# ─────────────────────────────────────────────
# STEP 5: Input SECRET_KEY
# ─────────────────────────────────────────────
Write-Step 5 "Mengatur SECRET_KEY untuk JWT..."
Write-Warn "Masukkan SECRET_KEY (minimal 32 karakter). Tekan Enter untuk generate otomatis."
$SECRET_KEY = Read-Host "  SECRET_KEY (atau Enter untuk auto-generate)"

if ($SECRET_KEY.Length -lt 32) {
    $chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    $SECRET_KEY = -join (1..48 | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] })
    Write-OK "SECRET_KEY di-generate otomatis."
    Write-Host "  SECRET_KEY: $SECRET_KEY" -ForegroundColor White
    Write-Warn "CATAT SECRET_KEY di atas di tempat aman!"
}


# ─────────────────────────────────────────────
# STEP 6: Deploy Backend (FastAPI)
# ─────────────────────────────────────────────
Write-Step 6 "Menyiapkan dan deploy Backend (FastAPI)..."

# Set variable backend
Write-Warn "Menyimpan environment variables backend..."
railway variables set "DATABASE_URL=$DATABASE_URL"
railway variables set "SECRET_KEY=$SECRET_KEY"
railway variables set "CORS_ORIGINS=http://localhost:5173"

# Deploy dari subfolder backend
Write-Warn "Menjalankan deploy backend dari folder /backend ..."
Push-Location backend
railway up --detach
Pop-Location

Write-OK "Backend sedang di-deploy di background..."
Write-Warn "Menunggu 60 detik agar backend selesai build..."
Start-Sleep -Seconds 60


# ─────────────────────────────────────────────
# STEP 7: Generate & Ambil URL Backend
# ─────────────────────────────────────────────
Write-Step 7 "Membuat domain publik untuk backend..."

$BACKEND_DOMAIN = ""
try {
    $BACKEND_DOMAIN = (railway domain 2>$null)
} catch {}

if (-not $BACKEND_DOMAIN) {
    Write-Warn "Membuat domain baru untuk backend..."
    railway domain
    Start-Sleep -Seconds 5
    try { $BACKEND_DOMAIN = (railway domain 2>$null) } catch {}
}

if ($BACKEND_DOMAIN -and ($BACKEND_DOMAIN -notmatch "^https://")) {
    $BACKEND_URL = "https://$BACKEND_DOMAIN"
} elseif ($BACKEND_DOMAIN) {
    $BACKEND_URL = $BACKEND_DOMAIN
} else {
    Write-Warn "Tidak bisa ambil URL backend otomatis."
    Write-Host "  Buka Railway dashboard -> service backend -> Settings -> Networking -> Generate Domain" -ForegroundColor White
    $BACKEND_URL = Read-Host "  Paste URL backend (contoh: https://xxx.railway.app)"
}

Write-OK "Backend URL: $BACKEND_URL"


# ─────────────────────────────────────────────
# STEP 8: Deploy Frontend (React/Vite)
# ─────────────────────────────────────────────
Write-Step 8 "Menyiapkan dan deploy Frontend (React/Vite)..."

Write-Warn "Menyimpan VITE_API_URL untuk frontend..."
railway variables set "VITE_API_URL=$BACKEND_URL"

Write-Warn "Menjalankan deploy frontend dari folder /frontend ..."
Push-Location frontend
railway up --detach
Pop-Location

Write-OK "Frontend sedang di-deploy di background..."
Write-Warn "Menunggu 90 detik (npm install bisa lama)..."
Start-Sleep -Seconds 90


# ─────────────────────────────────────────────
# STEP 9: Ambil URL Frontend & Update CORS
# ─────────────────────────────────────────────
Write-Step 9 "Membuat domain publik untuk frontend & update CORS backend..."

$FRONTEND_DOMAIN = ""
try {
    Push-Location frontend
    $FRONTEND_DOMAIN = (railway domain 2>$null)
    Pop-Location
} catch { Pop-Location }

if (-not $FRONTEND_DOMAIN) {
    Write-Warn "Tidak bisa ambil URL frontend otomatis."
    Write-Host "  Buka Railway dashboard -> service frontend -> Settings -> Networking -> Generate Domain" -ForegroundColor White
    $FRONTEND_URL = Read-Host "  Paste URL frontend (contoh: https://xxx.railway.app)"
} elseif ($FRONTEND_DOMAIN -notmatch "^https://") {
    $FRONTEND_URL = "https://$FRONTEND_DOMAIN"
} else {
    $FRONTEND_URL = $FRONTEND_DOMAIN
}

Write-OK "Frontend URL: $FRONTEND_URL"

# Update CORS backend
$CORS_ORIGINS = "$FRONTEND_URL,http://localhost:5173,http://localhost:3000"
railway variables set "CORS_ORIGINS=$CORS_ORIGINS"
Write-OK "CORS backend diupdate dengan URL frontend!"


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
Write-Host "  Untuk update selanjutnya, cukup:" -ForegroundColor Yellow
Write-Host "    git add -A" -ForegroundColor Gray
Write-Host "    git commit -m 'pesan perubahan'" -ForegroundColor Gray
Write-Host "    git push origin main" -ForegroundColor Gray
Write-Host "  Railway akan otomatis redeploy!" -ForegroundColor Yellow
Write-Host ""

# Buka browser ke frontend
Start-Process $FRONTEND_URL
