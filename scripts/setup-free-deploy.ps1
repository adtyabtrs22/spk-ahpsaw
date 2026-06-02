# ============================================================
# setup-free-deploy.ps1
# Deploy otomatis SPK AHP-SAW ke:
#   Database : Supabase (PostgreSQL gratis)
#   Backend  : Render.com (FastAPI gratis)
#   Frontend : Vercel (React/Vite gratis)
#
# CARA PAKAI:
#   powershell -ExecutionPolicy Bypass -File scripts/setup-free-deploy.ps1
# ============================================================

$ErrorActionPreference = "Continue"

# ─────────────────────────────────────────────
# Helper functions
# ─────────────────────────────────────────────
function Write-Step($num, $msg) {
    Write-Host ""
    Write-Host "[$num] $msg" -ForegroundColor Cyan
    Write-Host ("--------------------------------------------------") -ForegroundColor DarkGray
}
function Write-OK($msg)   { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  [!]  $msg" -ForegroundColor Yellow }
function Write-Info($msg) { Write-Host "  --> $msg" -ForegroundColor White }
function Write-Fail($msg) { Write-Host "  [X]  $msg" -ForegroundColor Red }

function Open-Browser($url) {
    try { Start-Process $url } catch {}
}

function Wait-ForUser($msg) {
    Write-Host ""
    Write-Host "  $msg" -ForegroundColor Magenta
    Write-Host "  Tekan Enter jika sudah siap..." -ForegroundColor DarkGray
    Read-Host | Out-Null
}

# ─────────────────────────────────────────────
# Generate SECRET_KEY
# ─────────────────────────────────────────────
function New-SecretKey {
    $chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    return -join (1..48 | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] })
}

# ─────────────────────────────────────────────
# Banner
# ─────────────────────────────────────────────
Write-Host ""
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host "  SPK AHP-SAW -- Deploy Gratis (Supabase + Render + Vercel) " -ForegroundColor Magenta
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "  Platform yang dipakai (semua GRATIS, tidak ada peak hours):" -ForegroundColor White
Write-Host "  - Supabase  : Database PostgreSQL gratis 500MB" -ForegroundColor DarkGray
Write-Host "  - Render    : Backend FastAPI gratis" -ForegroundColor DarkGray
Write-Host "  - Vercel    : Frontend React/Vite gratis unlimited" -ForegroundColor DarkGray
Write-Host ""


# ─────────────────────────────────────────────
# Cek Git
# ─────────────────────────────────────────────
Write-Step "PRE" "Mengecek prasyarat..."

$gitInstalled = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitInstalled) {
    Write-Fail "Git tidak ditemukan! Install dari https://git-scm.com lalu jalankan ulang script ini."
    exit 1
}
Write-OK "Git tersedia."

# Cek apakah sudah ada git remote (project di GitHub)
$remoteUrl = (git -C "$PSScriptRoot\.." remote get-url origin 2>$null)
if (-not $remoteUrl) {
    Write-Fail "Project belum terhubung ke GitHub!"
    Write-Host ""
    Write-Info "Lakukan langkah berikut:"
    Write-Info "1. Buat repository di https://github.com/new"
    Write-Info "2. Jalankan:"
    Write-Info "     git remote add origin https://github.com/USERNAME/REPO.git"
    Write-Info "     git push -u origin main"
    Write-Info "3. Jalankan script ini lagi."
    Wait-ForUser "Sudah push ke GitHub?"
    $remoteUrl = (git -C "$PSScriptRoot\.." remote get-url origin 2>$null)
    if (-not $remoteUrl) {
        Write-Fail "Masih belum ada remote. Aborting."
        exit 1
    }
}
Write-OK "GitHub remote: $remoteUrl"

# Pastikan semua perubahan sudah di-push
Write-Warn "Memastikan semua perubahan sudah di-push ke GitHub..."
Push-Location "$PSScriptRoot\.."
git add -A
$commitMsg = "chore: persiapan deploy ke Render + Vercel"
git commit -m $commitMsg 2>$null | Out-Null
git push origin main 2>&1 | Out-Null
Pop-Location
Write-OK "Kode sudah di-push ke GitHub!"


# ═══════════════════════════════════════════
# STEP 1: SUPABASE — DATABASE POSTGRESQL
# ═══════════════════════════════════════════
Write-Step 1 "Setup Database di Supabase..."

Write-Info "Supabase memberikan PostgreSQL gratis 500MB tanpa batas waktu."
Write-Host ""
Write-Host "  Ikuti langkah ini:" -ForegroundColor Yellow
Write-Host "  1. Daftar / Login di https://supabase.com" -ForegroundColor White
Write-Host "  2. Klik 'New Project'" -ForegroundColor White
Write-Host "  3. Isi nama project: spk-ahpsaw" -ForegroundColor White
Write-Host "  4. Buat password database (catat!)" -ForegroundColor White
Write-Host "  5. Pilih region: Southeast Asia (Singapore)" -ForegroundColor White
Write-Host "  6. Klik 'Create new project' dan tunggu ~2 menit" -ForegroundColor White
Write-Host "  7. Buka: Settings -> Database -> Connection string -> URI" -ForegroundColor White
Write-Host "  8. Copy URI tersebut (format: postgresql://postgres:...)" -ForegroundColor White
Write-Host ""

Open-Browser "https://supabase.com/dashboard/new"
Wait-ForUser "Sudah copy DATABASE_URL dari Supabase?"

$DATABASE_URL = Read-Host "  Paste DATABASE_URL Supabase di sini"
$DATABASE_URL = $DATABASE_URL.Trim()

# Validasi format URL
if ($DATABASE_URL -notmatch "^postgresql://|^postgres://") {
    Write-Warn "Format DATABASE_URL tidak dikenali. Pastikan dimulai dengan postgresql:// atau postgres://"
    $DATABASE_URL = Read-Host "  Paste ulang DATABASE_URL"
    $DATABASE_URL = $DATABASE_URL.Trim()
}

# Supabase pakai format postgres://, tapi SQLAlchemy butuh postgresql://
if ($DATABASE_URL -match "^postgres://") {
    $DATABASE_URL = $DATABASE_URL -replace "^postgres://", "postgresql://"
    Write-Info "URL dikonversi: postgres:// -> postgresql:// (untuk SQLAlchemy)"
}

Write-OK "DATABASE_URL siap!"


# ═══════════════════════════════════════════
# STEP 2: SECRET KEY
# ═══════════════════════════════════════════
Write-Step 2 "Membuat SECRET_KEY..."

Write-Warn "Tekan Enter untuk auto-generate, atau ketik sendiri (min 32 karakter):"
$input_key = Read-Host "  SECRET_KEY"

if ($input_key.Length -ge 32) {
    $SECRET_KEY = $input_key.Trim()
    Write-OK "SECRET_KEY dari input pengguna."
} else {
    $SECRET_KEY = New-SecretKey
    Write-OK "SECRET_KEY di-generate: $SECRET_KEY"
    Write-Warn "SIMPAN SECRET_KEY ini! Akan dibutuhkan jika setup ulang."
}


# ═══════════════════════════════════════════
# STEP 3: RENDER — BACKEND FASTAPI
# ═══════════════════════════════════════════
Write-Step 3 "Deploy Backend ke Render.com..."

Write-Info "Render.com adalah platform hosting gratis untuk FastAPI."
Write-Info "Tidak ada peak hours, 750 jam/bulan gratis (cukup untuk 1 service)."
Write-Host ""
Write-Host "  Ikuti langkah ini:" -ForegroundColor Yellow
Write-Host "  1. Buka https://render.com dan Login dengan GitHub" -ForegroundColor White
Write-Host "  2. Klik 'New +' -> 'Web Service'" -ForegroundColor White
Write-Host "  3. Pilih repository: $(($remoteUrl -split '/')[-1] -replace '\.git','')" -ForegroundColor Cyan
Write-Host "  4. Isi pengaturan:" -ForegroundColor White
Write-Host "       Name      : spk-ahpsaw-backend" -ForegroundColor Gray
Write-Host "       Root Dir  : backend" -ForegroundColor Gray
Write-Host "       Runtime   : Python 3" -ForegroundColor Gray
Write-Host "       Build Cmd : pip install -r requirements.txt" -ForegroundColor Gray
Write-Host "       Start Cmd : uvicorn app.main:app --host 0.0.0.0 --port `$PORT" -ForegroundColor Gray
Write-Host "       Instance  : Free" -ForegroundColor Gray
Write-Host ""
Write-Host "  5. Scroll ke bawah -> 'Advanced' -> 'Add Environment Variable':" -ForegroundColor White
Write-Host "       DATABASE_URL = $DATABASE_URL" -ForegroundColor Cyan
Write-Host "       SECRET_KEY   = $SECRET_KEY" -ForegroundColor Cyan
Write-Host "       CORS_ORIGINS = http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "  6. Klik 'Create Web Service'" -ForegroundColor White
Write-Host "  7. Tunggu build selesai (~3-5 menit)" -ForegroundColor White
Write-Host "  8. Copy URL service yang muncul (contoh: https://spk-ahpsaw-backend.onrender.com)" -ForegroundColor White
Write-Host ""

# Salin env vars ke clipboard agar mudah di-paste
$envVarText = "DATABASE_URL=$DATABASE_URL`nSECRET_KEY=$SECRET_KEY`nCORS_ORIGINS=http://localhost:5173"
try {
    $envVarText | Set-Clipboard
    Write-OK "Environment variables disalin ke clipboard! Langsung paste di Render."
} catch {
    Write-Info "Copy manual env vars di atas."
}

Open-Browser "https://dashboard.render.com/new/web-service"
Wait-ForUser "Sudah deploy backend di Render dan copy URL-nya?"

$BACKEND_URL = Read-Host "  Paste URL backend Render (contoh: https://spk-ahpsaw-backend.onrender.com)"
$BACKEND_URL = $BACKEND_URL.Trim().TrimEnd('/')

# Pastikan ada https://
if ($BACKEND_URL -notmatch "^https://") {
    $BACKEND_URL = "https://$BACKEND_URL"
}

Write-OK "Backend URL: $BACKEND_URL"


# ═══════════════════════════════════════════
# STEP 4: VERCEL — FRONTEND REACT/VITE
# ═══════════════════════════════════════════
Write-Step 4 "Deploy Frontend ke Vercel..."

# Cek apakah Vercel CLI sudah ada
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercelInstalled) {
    Write-Warn "Vercel CLI belum terinstall. Menginstall..."
    npm install -g vercel
    $vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue
    if (-not $vercelInstalled) {
        Write-Fail "Gagal install Vercel CLI. Pastikan Node.js sudah terinstall."
        Write-Info "Download Node.js di: https://nodejs.org"
        exit 1
    }
    Write-OK "Vercel CLI terinstall!"
} else {
    Write-OK "Vercel CLI sudah ada."
}

# Deploy frontend ke Vercel
Write-Warn "Login ke Vercel dan deploy frontend..."
Write-Info "Browser akan terbuka untuk login. Gunakan akun GitHub."
Write-Host ""

Push-Location "$PSScriptRoot\..\frontend"

# Login Vercel
vercel login

Write-Host ""
Write-Warn "Menjalankan deploy frontend..."
Write-Info "Jawab pertanyaan Vercel seperti ini:"
Write-Info "  - Set up and deploy? : Y"
Write-Info "  - Which scope?       : (pilih akun kamu)"
Write-Info "  - Link to existing?  : N (project baru)"
Write-Info "  - Project name?      : spk-ahpsaw-frontend"
Write-Info "  - In which directory? : ./ (tekan Enter)"
Write-Host ""

# Deploy ke Vercel production (akan ada interactive prompt)
$vercelOutput = vercel --prod 2>&1

Pop-Location

Write-Host ""
Write-Host $vercelOutput

# Ekstrak URL dari output Vercel
$FRONTEND_URL = ""
foreach ($line in $vercelOutput) {
    if ($line -match "(https://[\w\-\.]+\.vercel\.app)") {
        $FRONTEND_URL = $Matches[1].Trim()
        break
    }
}

if (-not $FRONTEND_URL) {
    Write-Warn "URL frontend tidak bisa diambil otomatis."
    $FRONTEND_URL = Read-Host "  Paste URL frontend Vercel (contoh: https://spk-ahpsaw-frontend.vercel.app)"
    $FRONTEND_URL = $FRONTEND_URL.Trim().TrimEnd('/')
}

if ($FRONTEND_URL -notmatch "^https://") {
    $FRONTEND_URL = "https://$FRONTEND_URL"
}
Write-OK "Frontend URL: $FRONTEND_URL"


# ═══════════════════════════════════════════
# STEP 5: SET VITE_API_URL di Vercel
# ═══════════════════════════════════════════
Write-Step 5 "Mengatur VITE_API_URL di Vercel..."

Push-Location "$PSScriptRoot\..\frontend"

Write-Warn "Menambahkan environment variable VITE_API_URL ke Vercel..."
vercel env add VITE_API_URL production <<< "$BACKEND_URL" 2>$null

# Cara alternatif jika <<< tidak berfungsi di PowerShell
$env:VITE_API_URL_VAL = $BACKEND_URL
echo $BACKEND_URL | vercel env add VITE_API_URL production 2>$null

Pop-Location

Write-OK "VITE_API_URL diset ke: $BACKEND_URL"


# ═══════════════════════════════════════════
# STEP 6: UPDATE CORS di Render
# ═══════════════════════════════════════════
Write-Step 6 "Update CORS backend dengan URL frontend..."

$CORS_VALUE = "$FRONTEND_URL,http://localhost:5173,http://localhost:3000"
Write-Host ""
Write-Host "  Perlu update CORS_ORIGINS di Render secara manual:" -ForegroundColor Yellow
Write-Host "  1. Buka https://dashboard.render.com" -ForegroundColor White
Write-Host "  2. Klik service 'spk-ahpsaw-backend'" -ForegroundColor White
Write-Host "  3. Klik tab 'Environment'" -ForegroundColor White
Write-Host "  4. Edit variabel CORS_ORIGINS menjadi:" -ForegroundColor White
Write-Host "     $CORS_VALUE" -ForegroundColor Cyan
Write-Host "  5. Klik 'Save Changes' (Render akan redeploy otomatis)" -ForegroundColor White
Write-Host ""

# Salin ke clipboard
try {
    $CORS_VALUE | Set-Clipboard
    Write-OK "Nilai CORS_ORIGINS disalin ke clipboard!"
} catch {}

Open-Browser "https://dashboard.render.com"
Wait-ForUser "Sudah update CORS_ORIGINS di Render?"


# ═══════════════════════════════════════════
# STEP 7: REDEPLOY FRONTEND dengan env baru
# ═══════════════════════════════════════════
Write-Step 7 "Redeploy frontend agar VITE_API_URL aktif..."

Push-Location "$PSScriptRoot\..\frontend"
Write-Warn "Redeploy frontend ke Vercel dengan env vars yang sudah diset..."
vercel --prod --yes 2>&1 | Out-Null
Pop-Location
Write-OK "Frontend redeployed!"


# ═══════════════════════════════════════════
# SELESAI
# ═══════════════════════════════════════════
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  DEPLOY SELESAI!                                           " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Database : Supabase PostgreSQL" -ForegroundColor White
Write-Host "  Backend  : $BACKEND_URL" -ForegroundColor Green
Write-Host "  Frontend : $FRONTEND_URL" -ForegroundColor Green
Write-Host "  API Docs : $BACKEND_URL/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Untuk deploy ulang setelah ada perubahan:" -ForegroundColor Yellow
Write-Host "    git add -A" -ForegroundColor Gray
Write-Host "    git commit -m 'pesan perubahan'" -ForegroundColor Gray
Write-Host "    git push origin main" -ForegroundColor Gray
Write-Host ""
Write-Host "  Render & Vercel otomatis redeploy setelah git push!" -ForegroundColor Yellow
Write-Host ""

# Simpan URL ke file untuk referensi
$deployInfo = @"
# Deploy Info - SPK AHP-SAW
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

BACKEND_URL=$BACKEND_URL
FRONTEND_URL=$FRONTEND_URL
API_DOCS=$BACKEND_URL/docs
DATABASE=Supabase PostgreSQL
"@
$deployInfo | Out-File -FilePath "$PSScriptRoot\deploy-info.txt" -Encoding UTF8
Write-OK "Info deploy disimpan di scripts/deploy-info.txt"

# Buka browser
if ($FRONTEND_URL -match "^https://") {
    Write-Host "  Membuka aplikasi di browser..." -ForegroundColor Cyan
    try { Start-Process $FRONTEND_URL } catch {}
    try { Start-Process "$BACKEND_URL/docs" } catch {}
}
