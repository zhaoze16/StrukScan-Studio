# StrukScan OCR & Thermal Print Studio

Aplikasi ekstraksi teks struk transaksi dan bukti pembayaran (Transfer Bank, BRImo, BCA, Mandiri, BPJS Kesehatan, QRIS, Minimarket) menjadi format data terstruktur yang rapi, dapat diedit, dan siap dicetak ke **Printer Thermal Bluetooth (ESC/POS 58mm & 80mm)**.

---

## 📱 Panduan: Menjadikan Aplikasi Android

Aplikasi ini telah dirancang dengan standar **Progressive Web App (PWA / WebAPK)** dan siap diubah menjadi aplikasi Android dengan beberapa metode berikut:

---

### Cara 1: Pasang Langsung di HP Android (PWA / WebAPK)
> **Paling Cepat, Praktis & Tanpa Perlu Download File APK**

Aplikasi akan otomatis terpasang sebagai aplikasi mandiri di sistem operasi Android (memiliki ikon sendiri di layar utama & app drawer, berjalan fullscreen tanpa bilah alamat browser, serta memiliki izin akses kamera dan Bluetooth printer).

**Langkah-langkah:**
1. Buka browser **Google Chrome** atau **Samsung Internet** di HP Android Anda.
2. Akses tautan web aplikasi ini.
3. Di dalam aplikasi, klik tombol **"Jadikan App Android"** di bagian atas menu bar.
4. Atau klik ikon **titik tiga (`⋮`)** di pojok kanan atas browser Google Chrome.
5. Pilih menu **"Instal Aplikasi"** atau **"Tambahkan ke Layar Utama" (Add to Home screen)**.
6. Ketuk **Instal**.
7. Aplikasi **StrukScan** akan langsung terpasang di HP Android Anda seperti aplikasi dari Play Store.

---

### Cara 2: Membuat File Installer APK Asli (`.apk`) via PWABuilder
> **Cocok jika ingin membagikan file .apk ke pengguna lain secara offline atau upload ke Google Play Store**

Layanan resmi buatan Microsoft ini dapat mengubah URL PWA menjadi paket installer APK secara otomatis dan gratis:

1. Buka situs resmi: **[https://www.pwabuilder.com](https://www.pwabuilder.com)**
2. Masukkan URL web aplikasi Anda pada kolom input, lalu klik **Start**.
3. PWABuilder akan memverifikasi manifest PWA (ikon 192px, 512px, dan maskable sudah terpasang lengkap).
4. Klik tombol **"Package for Android"**.
5. Pilih opsi **"Generate APK"** (atau file `.aab` jika ingin diunggah ke Google Play Console).
6. Unduh file `.apk` dan langsung instal di perangkat Android.

---

### Cara 3: Build APK Menggunakan Capacitor & Android Studio
> **Untuk Developer yang ingin mengompilasi kode sumber native Android (Java/Kotlin)**

Jika Anda ingin membuka proyek ini langsung di Android Studio:

```bash
# 1. Install library Capacitor (Menggunakan Bun - Utama)
bun add @capacitor/core @capacitor/cli @capacitor/android

# 2. Inisialisasi proyek Capacitor
bunx cap init "StrukScan" "com.strukscan.studio"

# 3. Build aset web production
bun run build

# 4. Tambahkan platform Android
bunx cap add android

# 5. Buka project di Android Studio
bunx cap open android
```
*(Alternatif menggunakan npm: ganti `bun add` dengan `npm install`, `bunx` dengan `npx`, dan `bun run` dengan `npm run`)*

**Di Android Studio:**
- Hubungkan HP Android via kabel USB dengan opsi *USB Debugging* aktif, atau buka Emulator.
- Klik tombol **Run (▶)** untuk memasang langsung ke HP.
- Untuk menghasilkan file mentah installer: Buka menu **Build > Build Bundle(s) / APK(s) > Build APK(s)**. File `app-debug.apk` akan dibuat di folder `android/app/build/outputs/apk/debug/`.

---

### Cara 4: Menggunakan Bubblewrap CLI (Google Official TWA)
> **Alat resmi Google untuk mem-package PWA ke format APK/AAB**

```bash
# 1. Install Bubblewrap CLI
bun add -g @bubblewrap/cli
# (atau: npm install -g @bubblewrap/cli)

# 2. Inisialisasi dari manifest PWA
bubblewrap init --manifest="https://<URL_APLIKASI_ANDA>/manifest.webmanifest"

# 3. Build APK
bubblewrap build
```

---

## 🚀 Fitur Utama Aplikasi

1. **Pemindaian OCR Dokumen & Bukti Bayar**
   - Menggunakan OCR Tesseract berbasis sisi klien (*client-side*), memproses gambar langsung di perangkat tanpa mengirim data sensitif ke server luar.
   - Mendukung foto struk kasir fisik, nota belanja, bukti transfer bank, tagihan BPJS, PLN, dan QRIS.

2. **Editor Data Terstruktur Lengkap**
   - **Toko & Kasir**: Pengaturan nama toko, cabang, alamat, telepon, nomor invoice, tanggal, dan kasir.
   - **Daftar Item Barang**: Penambahan, pengurangan, pengubahan kuantitas, harga satuan, diskon per item, dan subtotal otomatis.
   - **Info Lain (Metadata Transaksi)**: Menyimpan kolom dinamis seperti Nomor Pembayaran, Nama Pelanggan, Institusi, Sumber Dana, ID Transaksi, dan Keterangan.
   - **Finansial & Pembayaran**: Pajak (PPN), diskon total, biaya layanan/admin, grand total, uang dibayar, dan uang kembalian.

3. **Pratinjau Kertas Thermal Real-time**
   - Mendukung format lebar kertas thermal **58 mm** (32 karakter) dan **80 mm** (48 karakter).
   - Mode tampilan visual kertas struk maupun format monospaced ASCII ESC/POS.
   - Pilihan banner header hitam (*inverted*), barcode Code 128, dan QR code verifikasi.
   - Tombol hapus/kosongkan cepat langsung pada pratinjau.

4. **Pengaturan Profil Toko & Logo Tersentralisasi**
   - Unggah logo toko sendiri atau pilih template logo retail/kafe/minimarket/bank.
   - Data profil toko disimpan otomatis di penyimpanan lokal (*localStorage*) dan dapat diterapkan ke struk baru kapan saja.

5. **Koneksi Printer Bluetooth Thermal (ESC/POS)**
   - Terintegrasi dengan Web Bluetooth API untuk memindai dan mencetak langsung ke printer thermal portabel Bluetooth (seperti GOOJPRT, Panda, Eppos, Iware, Sunmi, dll.).
   - Pratinjau kode byte hex ESC/POS (Inisialisasi `ESC @`, Rata tengah `ESC a 1`, Potong kertas `GS V`).

---

## 💻 Menjalankan Proyek Secara Lokal

### Prasyarat
- **Bun** (Utama / Direkomendasikan) — install: `curl -fsSL https://bun.sh/install | bash`
- Atau **Node.js** (v18 ke atas) & npm

### Instalasi & Menjalankan Dev Server

#### Menggunakan Bun (Utama):
```bash
# 1. Install dependencies
bun install

# 2. Jalankan development server
bun run dev
```

#### Alternatif menggunakan npm:
```bash
# 1. Install dependencies
npm install

# 2. Jalankan development server
npm run dev
```

Buka browser di `http://localhost:3000`.

### Build untuk Produksi
```bash
# Menggunakan Bun (Utama):
bun run build

# Atau menggunakan npm:
npm run build
```
File hasil build akan berada di direktori `dist/`.
