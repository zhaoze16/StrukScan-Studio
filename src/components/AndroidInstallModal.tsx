import React, { useState } from 'react';
import {
  Smartphone,
  X,
  Download,
  Check,
  Copy,
  ExternalLink,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  Terminal,
  QrCode,
  Share2,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface AndroidInstallModalProps {
  onClose: () => void;
}

export const AndroidInstallModal: React.FC<AndroidInstallModalProps> = ({ onClose }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'pwa' | 'apk' | 'capacitor'>('pwa');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [installing, setInstalling] = useState(false);

  const currentUrl = window.location.href;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleDirectInstall = async () => {
    setInstalling(true);
    await install();
    setInstalling(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm sm:text-base flex items-center gap-2">
                Pasang di HP Android
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                  Resmi & Mandiri
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Jadikan aplikasi terpasang di HP dengan ikon di layar utama tanpa batas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Method Switcher Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 p-2 gap-2 text-xs">
          <button
            onClick={() => setActiveTab('pwa')}
            className={`flex-1 py-2 px-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'pwa'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-300" />
            <span>Cara 1: Pasang Langsung (PWA)</span>
          </button>

          <button
            onClick={() => setActiveTab('apk')}
            className={`flex-1 py-2 px-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'apk'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Download className="w-4 h-4 text-emerald-300" />
            <span>Cara 2: Buat File APK (.apk)</span>
          </button>

          <button
            onClick={() => setActiveTab('capacitor')}
            className={`hidden sm:flex py-2 px-3 rounded-xl font-semibold transition-all items-center justify-center gap-2 ${
              activeTab === 'capacitor'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Terminal className="w-4 h-4 text-emerald-300" />
            <span>Android Studio (Capacitor)</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed">
          {/* TAB 1: PWA (EASIEST & RECOMMENDED) */}
          {activeTab === 'pwa' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Paling Praktis: Pasang Langsung Tanpa Perlu Download APK</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Aplikasi ini sudah berstandar <strong>Progressive Web App (PWA / WebAPK)</strong>. Saat dipasang di Android, aplikasi akan otomatis menjadi aplikasi layar utama dengan ikon tersendiri, layar penuh tanpa bar browser, serta akses penuh ke kamera dan printer thermal Bluetooth.
                </p>
              </div>

              {/* Install Action Button if browser triggers prompt */}
              {isInstallable && !isInstalled && (
                <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/50 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
                  <div>
                    <h4 className="font-bold text-slate-100 text-xs">Perangkat Anda Siap Dipasang!</h4>
                    <p className="text-[11px] text-slate-400">
                      Klik tombol di samping untuk menambahkan langsung ke daftar aplikasi HP Anda.
                    </p>
                  </div>
                  <button
                    onClick={handleDirectInstall}
                    disabled={installing}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                  >
                    <Download className="w-4 h-4 text-slate-950" />
                    <span>{installing ? 'Memasang...' : 'Pasang Aplikasi Sekarang'}</span>
                  </button>
                </div>
              )}

              {isInstalled && (
                <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-center gap-2.5 text-blue-300">
                  <Check className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Aplikasi sudah terpasang di perangkat ini dan berjalan dalam mode aplikasi penuh!</span>
                </div>
              )}

              {/* Step by Step Manual Guide for Android Chrome / Samsung Browser */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <h4 className="font-bold text-slate-200 text-xs flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[11px]">
                    1
                  </span>
                  Langkah Memasang dari Google Chrome di Android:
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px]">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="font-bold text-slate-200 block">Langkah 1</span>
                    <p className="text-slate-400">
                      Buka tautan aplikasi ini di Google Chrome pada HP Android Anda.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="font-bold text-slate-200 block">Langkah 2</span>
                    <p className="text-slate-400">
                      Ketuk tanda <strong>titik tiga (⋮)</strong> di pojok kanan atas browser Chrome.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                    <span className="font-bold text-slate-200 block">Langkah 3</span>
                    <p className="text-slate-400">
                      Pilih <strong>"Instal Aplikasi"</strong> atau <strong>"Tambahkan ke Layar Utama"</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* URL Sharer / Copier */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex-1 w-full min-w-0">
                  <span className="text-[11px] text-slate-400 block mb-1">
                    Tautan Aplikasi (Buka di HP Android Anda):
                  </span>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 font-mono text-[11px] text-emerald-400 truncate">
                    {currentUrl}
                  </div>
                </div>
                <button
                  onClick={handleCopyUrl}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-all active:scale-95 shrink-0"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUrl ? 'Tersalin!' : 'Salin Tautan'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: CONVERT TO REAL APK (.apk / .aab) */}
          {activeTab === 'apk' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/30 space-y-1.5">
                <h4 className="font-bold text-blue-300 text-xs flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Mengubah PWA Menjadi File APK Standalone (.apk / Google Play Store)
                </h4>
                <p className="text-[11px] text-slate-300">
                  Jika Anda ingin mendistribusikan file installer <code>.apk</code> secara offline ke pelanggan atau mengunggah ke Google Play Store (seperti aplikasi <em>Bluetooth Print</em>), Anda bisa menggunakan layanan resmi <strong>PWABuilder</strong> buatan Microsoft yang gratis dan otomatis.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="font-bold text-slate-200 block text-xs">
                    Cara Cepat Menggunakan PWABuilder (Tanpa Koding):
                  </span>
                  <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-400">
                    <li>
                      Buka situs resmi: <strong className="text-emerald-400">pwabuilder.com</strong>
                    </li>
                    <li>
                      Tempelkan URL aplikasi Anda: <code className="bg-slate-900 px-1 py-0.5 rounded text-slate-200">{currentUrl}</code>
                    </li>
                    <li>
                      PWABuilder akan memverifikasi manifest PWA kita (sudah 100% valid dengan icon 192px & 512px).
                    </li>
                    <li>
                      Klik <strong>"Package for Android"</strong>, lalu pilih <strong>"Generate APK"</strong>.
                    </li>
                    <li>
                      Unduh file <code>.apk</code> langsung ke laptop atau HP Anda, lalu instal seperti biasa!
                    </li>
                  </ol>

                  <div className="pt-2">
                    <a
                      href="https://www.pwabuilder.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-sm"
                    >
                      <span>Buka PWABuilder.com</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="font-bold text-slate-200 block text-xs">
                    Metode 2: Menggunakan Bubblewrap CLI (Google Official)
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Google menyediakan command-line tool resmi bernama <strong>Bubblewrap</strong> untuk membuat file APK / Android App Bundle dari PWA:
                  </p>
                  <pre className="bg-slate-900 p-2.5 rounded-lg font-mono text-[11px] text-emerald-400 overflow-x-auto">
{`npm i -g @bubblewrap/cli
bubblewrap init --manifest="${currentUrl}manifest.webmanifest"
bubblewrap build`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CAPACITOR & ANDROID STUDIO */}
          {activeTab === 'capacitor' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/30 space-y-1.5">
                <h4 className="font-bold text-purple-300 text-xs flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  Build Project Asli Android Studio dengan Capacitor
                </h4>
                <p className="text-[11px] text-slate-300">
                  Untuk integrasi perangkat keras tingkat lanjut atau jika Anda ingin membuka proyek ini langsung di Android Studio:
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="font-bold text-slate-200 block text-xs">Langkah Build via Terminal (Bun Utama):</span>
                <pre className="bg-slate-900 p-3 rounded-lg font-mono text-[11px] text-emerald-400 overflow-x-auto leading-relaxed">
{`# 1. Install Capacitor (Menggunakan Bun)
bun add @capacitor/core @capacitor/cli @capacitor/android

# 2. Inisialisasi Proyek
bunx cap init "StrukScan" "com.strukscan.studio"

# 3. Build Web Assets
bun run build

# 4. Tambahkan Platform Android
bunx cap add android

# 5. Buka di Android Studio & Build APK
bunx cap open android`}
                </pre>
                <p className="text-[10px] text-slate-500">
                  Di Android Studio, pilih menu <strong>Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)</strong> untuk menghasilkan file <code>app-debug.apk</code>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400">
            Mendukung semua perangkat Android 8.0 ke atas
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all active:scale-95"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
