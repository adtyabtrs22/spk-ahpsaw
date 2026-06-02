# Scripts

Folder ini berisi script otomasi untuk kebutuhan operasional project SPK AHP-SAW.

## `setup-railway.ps1` — Deploy Otomatis ke Railway (Windows)

Script ini melakukan **semua langkah deploy Railway secara otomatis**:
1. Install Railway CLI (jika belum ada)
2. Login ke Railway via browser
3. Buat project Railway
4. Tambah PostgreSQL database
5. Deploy backend (FastAPI) + set semua env variable
6. Deploy frontend (React/Vite) + set VITE_API_URL
7. Update CORS backend dengan URL frontend
8. Tampilkan URL hasil deploy

### Cara Pakai (SEKALI SAJA)

Buka terminal VS Code (`Ctrl + \``) lalu jalankan:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-railway.ps1
```

### Yang Perlu Disiapkan

- Sudah login GitHub di browser
- Project sudah di-push ke GitHub (`git push origin main`)
- Node.js sudah terinstall (untuk Railway CLI)

### Setelah Script Selesai

Cukup `git push` untuk auto-deploy:
```bash
git add -A
git commit -m "pesan perubahan"
git push origin main
```
Railway otomatis build & deploy ulang dalam ~3-5 menit.
