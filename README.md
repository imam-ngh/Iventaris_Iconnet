# Kantor Inventory

Sistem manajemen inventaris kantor untuk mengelola barang-barang kantor seperti monitor, keyboard, mouse, headset, dll.

## Fitur

- **Dashboard** - Melihat statistik dan aktivitas terbaru
- **Inventory** - Mengelola data inventaris dengan fitur:
  - Tambah, edit, hapus item
  - Filter dan pencarian
  - Checkbox untuk multi-select dan hapus massal
  - Export ke Excel dan PDF
  - Import dari Excel/CSV
  - Generate QR Code dan Barcode
- **Input Inventaris** - Menambah data inventaris baru
- **Cek Inventaris** - Scan barcode/QR untuk menandai barang sudah dicek
- **History** - Melihat riwayat aktivitas (input, update, delete)
  - Checkbox untuk multi-select dan hapus massal

## Teknologi

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Library**:
  - ExcelJS (export Excel)
  - jsPDF (export PDF)
  - QRCode.js (generate QR)
  - SheetJS (import Excel)

## Cara Menjalankan

1. Install dependencies:
```bash
npm install
```

2. Konfigurasi database di `.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=iventaris_db
DB_USER=postgres
DB_PASSWORD=your_password
```

3. Jalankan server:
```bash
node server.js
```

4. Buka browser: http://localhost:3000

## Default Login

- Username: admin
- Password: admin

## Struktur Folder

```
iventaris1-main/
├── app.js           # Frontend logic
├── server.js        # Backend server
├── index.html       # Main page
├── login.html       # Login page
├── css/
│   └── style.css    # Styling
├── img/             # Images
├── barcode/        # Generated QR codes
└── package.json    # Dependencies
```

## Lisensi

MIT