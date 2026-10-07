# Panduan Instalasi & Build Linux Desktop (Tauri)

Panduan ini berisi langkah-langkah untuk membangun aplikasi ini menjadi aplikasi desktop Linux (`.AppImage` dan `.deb`) menggunakan Tauri.

---

### 🖥️ BAGIAN 1: Panduan Instalasi & Build di Linux Desktop (Arch / CachyOS / Ubuntu)

#### 1. Pasang Dependensi Sistem

**A. Untuk Distro Berbasis Arch Linux (CachyOS, EndeavourOS, Manjaro, Arch):**

Buka terminal dan jalankan:
```bash
# 1. Update sistem
sudo pacman -Syu

# 2. Pasang Bun (Utama), Rust, Cargo, dan WebKitGTK
sudo pacman -S base-devel git bun rust cargo webkit2gtk-4.1 libappindicator-gtk3 openssl libsoup3
```

**B. Untuk Distro Berbasis Debian / Ubuntu:**

```bash
sudo apt update
sudo apt install build-essential git curl rustc cargo libssl-dev libgtk-3-dev libwebkit2gtk-4.1-dev libappindicator3-dev

# Pasang Bun (Utama):
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
```

#### 2. Atur Izin Port Printer USB Thermal Linux (/dev/usb/lp0)

Agar aplikasi dapat menulis biner ESC/POS langsung ke printer tanpa perlu sudo:

```bash
# 1. Tambahkan akun pengguna Anda ke grup printer Linux (lp & dialout)
sudo usermod -a -G lp,dialout $USER

# 2. Pastikan modul kernel usblp aktif
sudo modprobe usblp

# 3. (Opsional) Tambahkan aturan udev untuk akses permanen
echo 'SUBSYSTEM=="usb", ATTRS{idVendor}=="28e9", ATTRS{idProduct}=="0289", MODE="0666", GROUP="lp"' | sudo tee /etc/udev/rules.d/99-thermal-printer.rules
sudo udevadm control --reload-rules && sudo udevadm trigger
```

> ⚠️ **PENTING**: Lakukan Logout lalu Login kembali (atau restart komputer) agar penambahan grup `lp` aktif di sesi pengguna Anda.

Periksa status port printer USB:
```bash
ls -l /dev/usb/lp*
# Output normal: crw-rw---- 1 root lp ... /dev/usb/lp0
```

#### 3. Clone Repositori & Pasang Dependensi

```bash
# 1. Clone repository project
git clone https://github.com/USERNAME/kasirpro-58mm.git

# 2. Masuk ke folder project
cd kasirpro-58mm

# 3. Instal semua paket dependensi
bun install
```

#### 4. Menjalankan di Linux Desktop

**⚡ A. Mode Desktop Native Tauri (Rekomendasi Utama):**
```bash
bun run tauri:dev
# Atau menggunakan Bunx CLI:
bunx @tauri-apps/cli dev
```

**🌐 B. Mode Web Browser Lokal (PWA / Chrome):**
```bash
bun run dev
# Akses di browser: http://localhost:3000
```

#### 5. Build File Aplikasi Siap Pakai Linux (.AppImage)

```bash
bun run tauri:build
```
Hasil file biner rilis siap pakai akan dibuat di:
*   AppImage: `src-tauri/target/release/bundle/appimage/KasirPro 58mm POS_0.1.0_amd64.AppImage`
*   Biner Executable: `src-tauri/target/release/kasirpro-58mm-pos`

Cukup beri izin eksekusi (`chmod +x *.AppImage`) dan jalankan aplikasi secara langsung!

---

### 🎨 Cara Mengganti Ikon Aplikasi Desktop

**Cara 1: Otomatis via Tauri Icon Generator (Paling Praktis)**
1. Siapkan 1 file logo toko Anda format PNG (minimal 512x512 px).
2. Jalankan: `bunx @tauri-apps/cli icon logo-toko.png`

**Cara 2: Manual (Timpa Langsung)**
Ganti file gambar di dalam folder `src-tauri/icons/`:
*   `32x32.png`, `128x128.png`, `128x128@2x.png`, `icon.png` (512×512), `icon.ico`, `icon.icns`.

---

### 🖨️ Integrasi Printer USB Thermal di Backend Rust (Tauri)

Agar fitur "Cetak Langsung" melalui `/dev/usb/lp0` berfungsi saat aplikasi di-*build* menggunakan Tauri, tambahkan kode berikut ke backend Rust Anda.

1. Buka file: `src-tauri/src/main.rs`
2. Tambahkan fungsi perintah (`command`) dan daftarkan ke dalam `tauri::Builder`:

```rust
use std::fs::OpenOptions;
use std::io::Write;

#[tauri::command]
fn print_raw_bytes(bytes: Vec<u8>) -> Result<(), String> {
    // Membuka perangkat printer secara langsung
    let mut printer = OpenOptions::new()
        .write(true)
        .open("/dev/usb/lp0")
        .map_err(|e| format!("Gagal membuka printer: {}", e))?;

    // Menulis data biner langsung ke device
    printer.write_all(&bytes)
        .map_err(|e| format!("Gagal mengirim data ke printer: {}", e))?;
    
    Ok(())
}

fn main() {
    tauri::Builder::default()
        // Daftarkan fungsi perintah di sini
        .invoke_handler(tauri::generate_handler![print_raw_bytes])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

Aplikasi React Anda sudah dikonfigurasi untuk mendeteksi lingkungan Tauri dan memanggil fungsi `print_raw_bytes` ini secara otomatis jika aplikasi dijalankan sebagai *desktop app*.


---

### 💡 Catatan Penting Agar Panduan Berhasil

1.  **Integrasi `package.json`**:
    Setelah menjalankan `npx tauri init`, pastikan skrip Tauri sudah terdaftar di `package.json` Anda:
    ```json
    "scripts": {
      "tauri": "tauri",
      "tauri:dev": "tauri dev",
      "tauri:build": "tauri build"
    }
    ```
2.  **Struktur Proyek**:
    Pastikan direktori `src-tauri` terbentuk dengan benar dan file `tauri.conf.json` sudah merujuk pada direktori hasil *build* Vite Anda (biasanya `../dist`).
3.  **Akses Printer**:
    Langkah `udev` sangat krusial untuk akses printer yang konsisten setelah komputer di-*reboot*. Pastikan langkah `logout/login` dilakukan.
