# 📦 Kantor Inventory Manager

Sistem manajemen inventaris kantor yang modern dan responsif untuk pelacakan perangkat keras (Monitor, Keyboard, Mouse) dilengkapi dengan fitur QR Code dan ekspor data profesional.

## 🚀 Fitur Utama

- **Dashboard Real-time**: Ringkasan total aset dan aktivitas terbaru.
- **Manajemen Inventaris**: CRUD (Create, Read, Update, Delete) aset kantor.
- **QR Code Generator**: Otomatis menghasilkan QR Code untuk setiap aset yang diinput.
- **Ekspor Data**: Mendukung ekspor ke format **Excel (.xlsx)** dan **PDF** yang rapi dan bermerek.
- **Desain Modern**: Antarmuka gelap (Dark Mode) yang premium dan sepenuhnya responsif (Mobile Friendly).
- **History Tracking**: Mencatat setiap perubahan data untuk audit.

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Frontend**: HTML5, CSS3 (Vanilla), JavaScript (ES6+)
- **Libraries**: 
  - [JsBarcode](https://lindell.me/JsBarcode/) & [QRCode.js](https://davidshimjs.github.io/qrcodejs/)
  - [SheetJS](https://sheetjs.com/) (Excel Export)
  - [jsPDF](https://github.com/parallax/jsPDF) & [AutoTable](https://github.com/simonbengtsson/jsPDF-autotable) (PDF Export)

## 📋 Prasyarat

- [Node.js](https://nodejs.org/) (Versi terbaru disarankan)
- [PostgreSQL](https://www.postgresql.org/)
- Akun GitHub

## ⚙️ Cara Instalasi

1. **Clone Repository**
   ```bash
   git clone https://github.com/imam-ngh/Iventaris_Iconnet.git
   cd Iventaris_Iconnet
   ```

2. **Instal Dependensi**
   ```bash
   npm install
   ```

3. **Konfigurasi Database**
   - Buat database baru di PostgreSQL bernama `iventaris_db`.
   - Impor skema dari file `iventaris_db.sql`.
   - Sesuaikan file `.env` dengan kredensial PostgreSQL Anda:
     ```env
     DB_USER=postgres
     DB_HOST=localhost
     DB_DATABASE=iventaris_db
     DB_PASSWORD=admin
     DB_PORT=5432
     ```

4. **Jalankan Aplikasi**
   ```bash
   npm start
   ```
   Aplikasi akan berjalan di [http://localhost:3000](http://localhost:3000).

## 📂 Struktur Folder

- `css/` - File styling CSS.
- `img/` - Aset gambar dan logo.
- `docs/` - Dokumentasi teknis dan spesifikasi.
- `tools/` - Skrip pembantu/utility.
- `app.js` - Logika frontend utama.
- `server.js` - Entry point server Express.
- `db.js` - Konfigurasi koneksi database.

---
Dikembangkan dengan ❤️ oleh **Imam**