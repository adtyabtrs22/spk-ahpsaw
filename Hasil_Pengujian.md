# Hasil Pengujian Sistem SPK Prioritas Perbaikan Jalan (AHP-SAW)

Dokumen ini memuat laporan hasil pengujian sistem untuk aplikasi Pendukung Keputusan Prioritas Perbaikan Jalan Kabupaten menggunakan kombinasi metode *Analytical Hierarchy Process* (AHP) dan *Simple Additive Weighting* (SAW). Pengujian dilakukan untuk memverifikasi kualitas sistem dari aspek fungsional dan non-fungsional.

---

## 1. Pengujian Fungsional

### A. Pengujian Fitur dengan Metode Black Box
Pengujian ini bertujuan memverifikasi kesesuaian fungsionalitas antarmuka dan proses bisnis dengan masukan (input) dan keluaran (output) yang diharapkan.

| No | Skenario Pengujian | Langkah Pengujian | Hasil yang Diharapkan | Hasil Aktual | Bukti Uji | Status |
|----|--------------------|-------------------|-----------------------|--------------|-----------|--------|
| 1  | Autentikasi Pengguna (Login Valid) | Memasukkan username `admin` dan password `admin123` lalu menekan tombol "Masuk ke Sistem". | Sistem memverifikasi kredensial, menyimpan token sesi, dan mengarahkan ke halaman Dashboard. | Sesuai harapan, pengguna masuk ke Dashboard utama. | `Screenshot (402).png` | **Berhasil** |
| 2  | Autentikasi Pengguna (Login Tidak Valid) | Memasukkan username `admin` dan password salah lalu menekan tombol "Masuk ke Sistem". | Sistem menampilkan pesan kesalahan "Login gagal. Periksa username dan password." dan menolak masuk. | Sesuai harapan, form login menampilkan pesan error. | `Screenshot (402).png` | **Berhasil** |
| 3  | Edit Nama Kriteria/Sub-Kriteria | Mengklik ikon pensil pada kriteria/sub-kriteria, mengubah nama, lalu mengklik tombol ceklist (Simpan). | Sistem memperbarui nama di database secara *inline* tanpa memuat ulang seluruh halaman. | Sesuai harapan, nama terupdate di database & antarmuka. | `Screenshot (404).png` | **Berhasil** |
| 4  | Pengisian Matriks Perbandingan | Memilih skala Saaty (1-9) untuk membandingkan kriteria utama pada tab "Kriteria Utama" dan menekan "Simpan & Hitung". | Sistem menyimpan nilai perbandingan, otomatis mengisi nilai resiprokal (kebalikan) pada sel seberang, dan menghitung bobot. | Sesuai harapan, matriks terisi penuh dan nilai bobot terhitung. | `Screenshot (407).png` | **Berhasil** |
| 5  | Evaluasi Uji Konsistensi AHP | Mengisi matriks perbandingan dengan nilai logis hingga nilai CR <= 0.1. | Sistem menampilkan status "✔ KONSISTEN" dengan rincian nilai Lambda Max, CI, RI, dan CR. | Sesuai harapan, status konsistensi berwarna hijau ditampilkan. | `Screenshot (407).png` | **Berhasil** |
| 6  | Tambah Alternatif (Ruas Jalan) Baru | Membuka modal "Tambah Alternatif Baru", mengisi nama jalan dan deskripsi, lalu mengklik "Tambah". | Jalan baru tersimpan di database dan muncul pada tabel baris matriks keputusan. | Sesuai harapan, alternatif baru bertambah ke dalam daftar. | `Screenshot (411).png` | **Berhasil** |
| 7  | Input Skor Alternatif secara Manual | Mengisi skor penilaian ruas jalan (skala 1-10) untuk seluruh sub-kriteria pada tabel, lalu menekan "Simpan Skor". | Nilai skor tersimpan di database dan siap digunakan untuk normalisasi SAW. | Sesuai harapan, data skor berhasil tersimpan. | `Screenshot (411).png` | **Berhasil** |
| 8  | Import Data Alternatif via Excel | Membuka modal "Import Data", memilih berkas Excel (.xlsx) dengan header sub-kriteria yang cocok, lalu menekan "Import". | Sistem membaca file Excel, memetakan data ruas jalan beserta skornya, lalu menyimpannya ke database. | Sesuai harapan, data terisi otomatis dari berkas Excel. | `Screenshot (412).png` | **Berhasil** |
| 9  | Eksekusi Kalkulasi AHP-SAW | Menekan tombol "Jalankan Perhitungan" pada halaman Hasil Perhitungan. | Sistem memproses perhitungan bobot AHP, uji konsistensi, normalisasi SAW (matriks R), dan nilai preferensi (Vi). | Sesuai harapan, data perhitungan terhitung secara *real-time*. | `Screenshot (413).png` | **Berhasil** |
| 10 | Visualisasi Grafik Preferensi | Membuka halaman Perangkingan setelah perhitungan selesai dijalankan. | Sistem menampilkan diagram batang preferensi yang diurutkan dari nilai Vi terbesar ke terkecil. | Sesuai harapan, diagram batang dan grafik tersaji dengan urutan. | `Screenshot (416).png` | **Berhasil** |
| 11 | Tambah Pengguna Baru (Admin) | Membuka modal "Tambah Pengguna Baru", mengisi data akun lengkap dengan pilihan role, lalu menekan "Tambah". | Akun pengguna baru terdaftar dan dapat digunakan untuk masuk ke sistem sesuai level otorisasi. | Sesuai harapan, pengguna baru tersimpan dan dapat login. | `Screenshot (420).png` | **Berhasil** |
| 12 | Aktivasi/Deaktivasi Status Pengguna | Mengklik tombol "Nonaktifkan" pada salah satu pengguna aktif di tabel Kelola Pengguna. | Status pengguna berubah menjadi "Nonaktif" dan pengguna tersebut tidak dapat masuk ke sistem. | Sesuai harapan, status aktif berubah dan hak akses diblokir. | `Screenshot (419).png` | **Berhasil** |

---

### B. Pengecekan Eror pada Perhitungan Sistem
Bagian ini memverifikasi bahwa kode komputasi backend menghasilkan angka yang konsisten dan akurat tanpa eror matematis bila dibandingkan dengan perhitungan manual menggunakan spreadsheet Excel.

#### 1. Verifikasi Konsistensi & Pembobotan AHP
Berdasarkan data yang diinput ke sistem, berikut perbandingan hasil perhitungan bobot kriteria utama (AHP):

*   **Faktor Kondisi Jalan (C1):** $W_1 = 0.6479468599$ (64.8%)
*   **Faktor Volume Lalu Lintas (C2):** $W_2 = 0.2298711755$ (23.0%)
*   **Faktor Tata Guna Lahan (C3):** $W_3 = 0.1221819646$ (12.2%)
*   **Total Bobot:** $0.6479 + 0.2298 + 0.1221 = 1.0000$ (100% - Memenuhi syarat AHP)

Hasil Uji Konsistensi Matriks Kriteria Utama:
*   **Nilai $\lambda_{max}$:** $3.003697$
*   **Consistency Index (CI):** $0.001848$
*   **Random Index (RI):** $0.58$ (untuk orde matriks $n = 3$)
*   **Consistency Ratio (CR):** $CR = \frac{CI}{RI} = \frac{0.001848}{0.58} = 0.003187$
*   **Kesimpulan:** $0.003187 \le 0.1$, sehingga matriks perbandingan dinyatakan **KONSISTEN** (0% kesalahan logika matematis).

#### 2. Verifikasi Perangkingan SAW
Sebagai contoh pengujian normalisasi, digunakan kriteria **Lubang-Lubang** (Sub-kriteria benefit, tipe pemaksimalan nilai):
*   Nilai maksimal ($X_{max}$) untuk kolom Lubang-Lubang di antara semua alternatif adalah **8** (dimiliki oleh *Jalan Projakal*).
*   Alternatif **Jalan Inpres** memiliki nilai aktual **7**.
*   **Perhitungan Normalisasi:** $R_{inpres, lubang} = \frac{X_{inpres}}{X_{max}} = \frac{7}{8} = 0.875$.
*   **Hasil Sistem:** Sistem mencatat skor normalisasi Jalan Inpres untuk sub-kriteria ini sebesar **0.8750000000** (Presisi 100% akurat).

Hasil 3 Alternatif Teratas (Ranking Prioritas):
1.  **Jalan Inpres (Rank 1):** Nilai Preferensi ($V_i$) = **0.8407040196** (Prioritas Utama Perbaikan Jalan)
2.  **Jalan Projakal (Rank 2):** Nilai Preferensi ($V_i$) = **0.7858099693**
3.  **Jalan Jenderal Sudirman (Rank 3):** Nilai Preferensi ($V_i$) = **0.7483341591**

*Catatan: Seluruh perhitungan preferensi dan perangkingan di database memiliki deviasi 0.00% terhadap perhitungan lembar manual Excel.*

---

## 2. Pengujian Non-Fungsional

### A. Pengujian Performa Waktu Muat Data (Response Time)
Pengujian performa diukur menggunakan Developer Tools pada peramban Chrome untuk mencatat waktu respons API (Application Programming Interface) backend saat memuat komponen atau memproses data.

| No | Endpoints / Aksi | Deskripsi Beban Kerja | Rata-rata Waktu Muat (ms) | Status Kelayakan |
|----|------------------|----------------------|---------------------------|------------------|
| 1  | POST `/api/auth/login` | Verifikasi akun dan enkripsi password JWT | 150 ms | Sangat Cepat (< 500 ms) |
| 2  | GET `/api/projects/` | Memuat profil proyek dan statistik dashboard | 180 ms | Sangat Cepat (< 500 ms) |
| 3  | GET `/api/projects/1/criteria/` | Memuat data pohon kriteria dan sub-kriteria | 220 ms | Sangat Cepat (< 500 ms) |
| 4  | GET `/api/projects/1/pairwise/criteria` | Memuat data matriks perbandingan kriteria | 140 ms | Sangat Cepat (< 500 ms) |
| 5  | GET `/api/projects/1/alternatives/` | Memuat matriks keputusan ruas jalan & skor | 310 ms | Cepat (< 1000 ms) |
| 6  | POST `/api/projects/1/calculate/` | Memproses kalkulasi matriks AHP & SAW | 420 ms | Cepat (< 1000 ms) |
| 7  | GET `/api/projects/1/calculate/results` | Mengambil hasil akhir dan status konsistensi | 190 ms | Sangat Cepat (< 500 ms) |
| 8  | GET `/api/auth/users` | Memuat data seluruh pengguna sistem | 110 ms | Sangat Cepat (< 500 ms) |

---

### B. Evaluasi Penerimaan Pengguna (User Acceptance Testing)
Evaluasi ini mengukur tingkat kepuasan dan penerimaan pengguna akhir (Staff Teknis, Pimpinan Bina Marga, dan Administrator) terhadap sistem berdasarkan 5 parameter utama menggunakan skala Likert.

| No | Parameter Evaluasi | Uraian Parameter | Persentase Kelayakan (%) | Kategori Kelayakan |
|----|--------------------|------------------|--------------------------|-------------------|
| 1  | **Usability** (Kemudahan) | Kemudahan pemahaman antarmuka dan alur navigasi menu utama. | 88.0% | Sangat Baik |
| 2  | **Accuracy** (Akurasi) | Keakuratan hasil kalkulasi pembobotan dan perangkingan jalan prioritas. | 100.0% | Sangat Baik |
| 3  | **Performance** (Kecepatan) | Respons sistem saat mengolah data dan mengunggah berkas Excel. | 92.0% | Sangat Baik |
| 4  | **Suitability** (Kesesuaian) | Fitur-fitur sistem telah sesuai dengan standar Dinas PU/Bina Marga. | 90.0% | Sangat Baik |
| 5  | **Aesthetics** (Estetika UI) | Kerapian tampilan visual, kecocokan warna, serta keterbacaan grafik. | 94.0% | Sangat Baik |

**Rata-rata Skor Kelayakan Keseluruhan:** **92.8%**
**Kesimpulan:** Sistem Pendukung Keputusan Perbaikan Jalan Kabupaten (AHP-SAW) dinilai **sangat layak** dan siap diimplementasikan untuk mendukung proses pengambilan keputusan di Dinas Pekerjaan Umum/Bina Marga.
