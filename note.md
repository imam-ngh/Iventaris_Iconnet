# 📝 Catatan Pembaruan Sistem (Changelog)

## Pembaruan Terbaru (30 April 2026)

### 🗺️ Fitur Denah & Mapping (Major Update)
- **Interactive Map Designer**: Modul baru untuk menyusun tata letak kubikel secara visual.
- **Bulk Selection & Addition**: Memilih banyak kubikel sekaligus (klik pada kotak) dan menambahkannya ke kanvas secara bersamaan dalam formasi grid otomatis.
- **Text Labels**: Kemampuan untuk menambahkan label teks kustom (misal: "Area A", "Ruang Meeting") untuk memberikan konteks pada denah.
- **Canvas Enlargement**: Ukuran kanvas diperbesar menjadi 1500px untuk menampung denah kantor yang panjang.
- **Real-time Dashboard Map**: Tampilan denah di dashboard kini lebih cerdas dengan ikon perangkat (Laptop/PC) dan label teks yang akurat yang sinkron di semua perangkat.

### 🛠️ Perbaikan Bug & Optimasi UI
- **Modal Layering Fix**: Memperbaiki masalah tampilan blur/blank saat membuka modal aksi (edit, lihat, print).
- **Professional Printing**: Sistem cetak label kini menggunakan popup window terisolasi untuk hasil cetak yang bersih dan profesional.
- **Sidebar Scrollability**: Memperbaiki menu sidebar agar bisa di-scroll dengan lancar saat banyak item terbuka.
- **Pagination Stability**: Memperbaiki posisi penomoran halaman tabel agar tetap konsisten saat tabel di-geser.

### 🔌 Backend & Database
- **Schema Update**: Penambahan kolom `type` dan `text` pada tabel `cubicle_positions`.
- **JSON Fallback Support**: Mendukung fitur mapping baru bahkan dalam mode database JSON.
- **Robust Detection**: Sistem deteksi label yang lebih kuat berdasarkan prefix ID (`LABEL_`).

---
*Dikembangkan oleh Antigravity AI untuk Iconnet Inventory System.*
