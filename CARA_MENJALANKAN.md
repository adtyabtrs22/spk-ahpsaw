# Panduan Menjalankan Project SPK AHP-SAW

Dokumen ini berisi panduan lengkap langkah demi langkah untuk menjalankan aplikasi **Sistem Pendukung Keputusan (SPK) Prioritas Perbaikan Jalan menggunakan Metode AHP-SAW** (Direktorat Jenderal Bina Marga - Kementerian Pekerjaan Umum) baik dari sisi **Backend (FastAPI)** maupun **Frontend (React + Vite)**.

---

## 📋 Prasyarat (Prerequisites)

Sebelum memulai, pastikan perangkat Anda telah terinstall:
1. **Python** (v3.10 ke atas)
2. **Node.js** (v18 ke atas) & **npm**
3. **PostgreSQL** (sedang berjalan secara lokal di port `5432`)

---

## 🗄️ Konfigurasi Database PostgreSQL

Secara default, project ini menggunakan konfigurasi database sebagai berikut (dapat dilihat di file `backend/.env`):
- **Host**: `localhost`
- **Port**: `5432`
- **User**: `postgres`
- **Password**: `aditya221004`
- **Nama Database**: `spk_ahpsaw`

> [!NOTE]
> Jika kredensial PostgreSQL lokal Anda berbeda, silakan sesuaikan terlebih dahulu pada file [backend/.env](file:///e:/spk-ahpsaw/backend/.env).

---

## ⚡ Langkah 1: Menjalankan Backend (FastAPI)

1. Buka terminal baru dan masuk ke direktori `backend`:
   ```bash
   cd backend
   ```

2. Buat dan aktifkan Virtual Environment Python (Sangat Disarankan):
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   - **Windows (Command Prompt / CMD)**:
     ```cmd
     python -m venv venv
     .\venv\Scripts\activate.bat
     ```
   - **Linux / macOS**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. Install seluruh dependencies Python yang dibutuhkan:
   ```bash
   pip install -r requirements.txt
   ```

4. Buat Database `spk_ahpsaw` secara otomatis dengan menjalankan script berikut:
   ```bash
   python create_db.py
   ```

5. Jalankan server backend menggunakan Uvicorn:
   ```bash
   uvicorn app.main:app --reload
   ```

   * Backend akan berjalan di: **`http://localhost:8000`**
   * Dokumentasi interaktif API (Swagger UI) dapat diakses di: **`http://localhost:8000/docs`**

> [!TIP]
> Saat pertama kali backend dijalankan, sistem secara otomatis akan melakukan migrasi tabel database dan memasukkan data awal (seed data) seperti kriteria, sub-kriteria, akun default, dan beberapa proyek jalan sampel.

---

## 🖥️ Langkah 2: Menjalankan Frontend (React + Vite)

1. Buka terminal baru (biarkan terminal backend tetap berjalan) dan masuk ke direktori `frontend`:
   ```bash
   cd frontend
   ```

2. Install seluruh dependencies Node.js yang dibutuhkan:
   ```bash
   npm install
   ```

3. Jalankan server development frontend:
   ```bash
   npm run dev
   ```

   * Frontend akan berjalan di: **`http://localhost:5173`**
   * Buka browser dan akses alamat tersebut untuk masuk ke dalam aplikasi.

---

## 🔑 Informasi Akun untuk Login (Credentials)

Gunakan salah satu dari akun bawaan berikut untuk masuk ke sistem sesuai dengan peran yang diinginkan:

| No. | Username | Password | Peran (Role) | Hak Akses Utama |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **admin** | `admin123` | **ADMIN** | Mengelola seluruh proyek, kriteria, sub-kriteria, penilaian alternatif, dan user. |
| 2 | **operator** | `operator123` | **OPERATOR** | Mengelola proyek, kriteria, sub-kriteria, alternatif, dan melakukan perhitungan SPK (AHP-SAW). |
| 3 | **pimpinan** | `pimpinan123` | **PIMPINAN** | Hanya melihat hasil akhir perangkingan alternatif jalan dan laporan analisis. |

---

## 🛠️ Alur Kerja Sistem Secara Singkat
1. **Login**: Masuk menggunakan akun di atas.
2. **Kelola Proyek**: Tambahkan/pilih proyek jalan yang ingin dianalisis.
3. **Kelola Kriteria & Perbandingan Berpasangan (AHP)**: Tentukan bobot kriteria melalui perbandingan berpasangan (pastikan nilai *Consistency Ratio* (CR) < 0.1).
4. **Kelola Alternatif & Penilaian (SAW)**: Daftarkan lokasi jalan (alternatif) beserta nilai sub-kriterianya.
5. **Perhitungan & Hasil**: Lihat detail hasil normalisasi SAW dan perangkingan prioritas jalan untuk perbaikan.
