# Scripts

Folder ini berisi script otomasi untuk kebutuhan operasional project SPK AHP-SAW.

---

## `setup-free-deploy.ps1` — Deploy Gratis (Supabase + Render + Vercel) ⭐ REKOMENDASI

Script ini deploy project ke **3 platform gratis** tanpa peak hours dan tanpa kartu kredit:

| Komponen | Platform | Gratis |
|----------|----------|--------|
| Database (PostgreSQL) | Supabase | ✅ 500MB |
| Backend (FastAPI)     | Render   | ✅ 750 jam/bulan |
| Frontend (React/Vite) | Vercel   | ✅ Unlimited |

### Cara Pakai

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-free-deploy.ps1
```

### Yang Perlu Disiapkan

- Node.js terinstall (untuk Vercel CLI)
- Git terinstall dan project sudah di-push ke GitHub
- Akun GitHub (untuk login ke semua platform)

### Auto-Redeploy Setelah Deploy Pertama

Cukup push ke GitHub:
```bash
git add -A
git commit -m "pesan perubahan"
git push origin main
```
Render & Vercel otomatis build & deploy ulang dalam ~3 menit.

---

## `setup-railway.ps1` — Deploy ke Railway (alternatif)

> ⚠️ Railway free-tier punya **peak hours** (8 AM–8 PM Asia/Singapore) — deploy bisa gagal.

Script deploy ke Railway (backend + frontend + PostgreSQL dalam 1 platform).

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-railway.ps1
```

---

## `deploy-info.txt` — Info URL Deploy

File ini dibuat otomatis oleh script setelah deploy selesai, berisi URL backend & frontend.
