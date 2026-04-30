# 📦 Iconnet Inventory System Pro
> Solusi Manajemen Inventaris Kantor yang Modern, Cerdas, dan Profesional.

Iconnet Inventory System adalah aplikasi berbasis web yang dirancang khusus untuk mengelola aset dan inventaris kantor secara efisien. Dilengkapi dengan fitur pemantauan real-time, tanda tangan digital, dan optimasi mobile.

---

## 🚀 Fitur Utama

### 📊 Dashboard Analytics (Optimized)
- **Visualisasi Data**: Grafik distribusi inventaris dan status kondisi barang menggunakan Chart.js.
- **Statistik Real-time**: Monitoring jumlah monitor, keyboard, PC, dan perangkat lainnya secara instan.
- **Aktivitas Terbaru**: Riwayat log perubahan data yang langsung terlihat di dashboard.
- **Hero Card Stats**: Informasi total inventaris dengan tampilan premium yang responsif.

### 💎 UI/UX Premium
- **Glassmorphism Design**: Antarmuka modern dengan efek transparansi dan blur yang elegan.
- **Dark/Light Mode**: Dukungan mode gelap dan terang yang nyaman di mata.
- **Professional Login**: Halaman login futuristik dengan animasi premium dan sistem keamanan session.
- **Fully Responsive**: Tampilan optimal di berbagai perangkat mulai dari Desktop, Tablet, hingga Smartphone (Android/iOS).

### 🔍 Smart Inventory Control
- **Scan QR & Barcode**: Fitur integrasi kamera untuk pengecekan barang secara cepat.
- **Automatic Code Generation**: Generate QR Code dan Barcode (CODE128) secara otomatis untuk setiap item.
- **Cek Inventaris Massal**: Sistem checklist inventaris yang memudahkan audit aset berkala.

### 🗺️ Interactive Office Mapping (New)
- **Visual Map Designer**: Susun tata letak kubikel secara drag-and-drop pada kanvas digital yang interaktif.
- **Bulk Placement**: Fitur pilih banyak kubikel sekaligus dan pasang ke denah secara otomatis dengan formasi grid.
- **Custom Text Labels**: Tambahkan penanda teks kustom (misal: "Area A", "Ruang Meeting") untuk memperjelas pembagian wilayah kantor.
- **Live Monitoring Dashboard**: Pantau okupansi setiap kubikel secara real-time langsung dari peta interaktif di dashboard.

### ✍️ Digital Signature & Report
- **Handover Module**: Modul serah terima barang yang dilengkapi dengan **Digital Signature** (Tanda Tangan Digital).
- **Export Professional**: Ekspor data ke format **Excel** dan **PDF** (Berita Acara) dengan branding Iconnet.
- **Bulk Operations**: Fitur hapus dan kelola data dalam jumlah banyak secara sekaligus.

---

## 🛠️ Teknologi yang Digunakan

| Komponen | Teknologi |
| :--- | :--- |
| **Frontend** | HTML5, Vanilla CSS3, JavaScript (ES6+) |
| **Backend** | Node.js, Express.js |
| **Database** | PostgreSQL |
| **Analytics** | Chart.js |
| **PDF Engine** | jsPDF, jsPDF-AutoTable |
| **Excel Engine** | ExcelJS |
| **QR/Barcode** | QRCode.js, JsBarcode |
| **Signature** | SignaturePad.js |

---

## ⚙️ Cara Instalasi

1. **Clone Repositori**
   ```bash
   git clone https://github.com/imam-ngh/Iventaris_Iconnet.git
   ```

2. **Install Dependensi**
   ```bash
   npm install
   ```

3. **Konfigurasi Database**
   Buat file `.env` di direktori utama dan sesuaikan dengan database PostgreSQL Anda:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=iventaris_db
   DB_USER=postgres
   DB_PASSWORD=your_password
   PORT=3000
   ```

4. **Jalankan Aplikasi**
   ```bash
   npm start
   ```
   Akses melalui browser di: `http://localhost:3000`

---

## 📱 Akses via HP (Mobile)
Aplikasi ini mendukung akses dari perangkat lain dalam satu jaringan WiFi.
1. Jalankan `npm start`.
2. Lihat alamat **Network IP** di terminal (contoh: `http://192.168.x.xx:3000`).
3. Buka alamat tersebut di browser HP Anda.

### 🔍 Fitur Pengecekan Kamera di HP
Modern browser mewajibkan koneksi **HTTPS** untuk mengakses kamera di perangkat mobile. Kami telah menyediakan sistem SSL otomatis untuk memudahkan pengujian.

1.  **Jalankan Generate Sertifikat**:
    ```bash
    node create-cert.js
    ```
2.  **Akses via IP Network**:
    Buka alamat `https://192.168.x.xx:3000` (alamat IP Anda) di browser HP.
3.  **Loloskan Peringatan SSL**:
    Klik "Advanced/Lanjutan" -> "Proceed/Lanjutkan" pada browser HP untuk memberikan izin akses kamera.

---

## 🔐 Akun Default
- **Username**: `admin`
- **Password**: `admin`

---

## 📄 Lisensi
Proyek ini dilisensikan di bawah **MIT License**.

© 2026 Iconnet Inventory System - Developed with ❤️ by ImamN
