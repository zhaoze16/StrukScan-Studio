import React, { useState, useRef } from 'react';
import {
  Store,
  Upload,
  X,
  Check,
  Image as ImageIcon,
  Trash2,
  Save,
  Building,
  Phone,
  MapPin,
  FileText,
  User,
  Coffee,
  ShoppingBag,
  Sparkles,
  CreditCard,
  Pill,
  Wrench,
  UtensilsCrossed,
  Settings,
  Bluetooth,
  Printer,
} from 'lucide-react';
import { StoreProfile, MerchantInfo, ReceiptData } from '../types/receipt';
import { useBluetoothPrinter } from '../context/BluetoothPrinterContext';

interface StoreSettingsModalProps {
  currentReceipt: ReceiptData;
  onSaveProfile: (profile: StoreProfile, applyToCurrent: boolean) => void;
  onOpenBluetoothModal?: () => void;
  onClose: () => void;
}

export const STORE_PROFILE_STORAGE_KEY = 'strukscan_store_profile_v1';

// Preset icon logos that look great on thermal printers
const PRESET_LOGOS = [
  { id: 'store', name: 'Toko Retail', icon: '🏪', svgUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></svg>' },
  { id: 'cafe', name: 'Kafe & Kopi', icon: '☕', svgUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>' },
  { id: 'resto', name: 'Restoran', icon: '🍴', svgUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2"><path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"/><path d="M15 11v11"/><path d="M5 2v8a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2V2"/><path d="M8 12v10"/></svg>' },
  { id: 'minimarket', name: 'Minimarket', icon: '🛒', svgUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>' },
  { id: 'bank', name: 'Bank / Loket', icon: '🏛️', svgUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2"><path d="M3 21h18"/><path d="M3 10h18"/><path d="m12 2 10 5H2l10-5Z"/><path d="M6 10v11"/><path d="M10 10v11"/><path d="M14 10v11"/><path d="M18 10v11"/></svg>' },
  { id: 'pharmacy', name: 'Apotek', icon: '💊', svgUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2"><path d="M12 2v20"/><path d="M2 12h20"/></svg>' },
];

export const StoreSettingsModal: React.FC<StoreSettingsModalProps> = ({
  currentReceipt,
  onSaveProfile,
  onOpenBluetoothModal,
  onClose,
}) => {
  const {
    isConnected: isBluetoothConnected,
    connectedDeviceName,
  } = useBluetoothPrinter();
  // Load saved profile or initialize from current receipt
  const [profile, setProfile] = useState<StoreProfile>(() => {
    try {
      const saved = localStorage.getItem(STORE_PROFILE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.branch === '1005 SUKABUMI' || parsed?.branch === '1005') {
          parsed.branch = '';
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to load store profile', e);
    }
    const cleanBranch = currentReceipt.merchant.branch === '1005 SUKABUMI' || currentReceipt.merchant.branch === '1005'
      ? ''
      : (currentReceipt.merchant.branch || '');

    return {
      name: currentReceipt.merchant.name || 'TOKO SAYA',
      branch: cleanBranch,
      address: currentReceipt.merchant.address || '',
      phone: currentReceipt.merchant.phone || '',
      websiteOrTaxId: currentReceipt.merchant.websiteOrTaxId || '',
      defaultCashier: currentReceipt.transaction.cashier || 'Kasir 01',
      defaultFooterNotes: currentReceipt.footer.notes || 'Terima kasih atas kunjungan Anda!',
      defaultPolicy: currentReceipt.footer.policy || 'Barang yang dibeli tidak dapat ditukar.',
      logoUrl: currentReceipt.merchant.logoUrl || PRESET_LOGOS[0].svgUrl,
      showLogo: currentReceipt.merchant.showLogo !== false,
    };
  });

  const [applyToCurrent, setApplyToCurrent] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setProfile((prev) => ({
        ...prev,
        logoUrl: result,
        showLogo: true,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPresetLogo = (svgUrl: string) => {
    setProfile((prev) => ({
      ...prev,
      logoUrl: svgUrl,
      showLogo: true,
    }));
  };

  const handleRemoveLogo = () => {
    setProfile((prev) => ({
      ...prev,
      logoUrl: undefined,
      showLogo: false,
    }));
  };

  const handleSave = () => {
    try {
      localStorage.setItem(STORE_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.warn('LocalStorage save failed', e);
    }
    onSaveProfile(profile, applyToCurrent);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4.5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">
                Pengaturan Toko, Logo & Printer
              </h3>
              <p className="text-[11px] text-slate-400">
                Atur profil toko, logo header struk, serta koneksi printer Bluetooth thermal
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

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {/* SECTION: BLUETOOTH PRINTER MANAGEMENT */}
          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bluetooth className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-slate-200 text-xs block">
                  Koneksi Printer Bluetooth Thermal (ESC/POS)
                </span>
              </div>
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                  isBluetoothConnected
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {isBluetoothConnected ? `Terhubung: ${connectedDeviceName}` : 'Belum Terhubung'}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Hubungkan aplikasi dengan printer Bluetooth thermal (58mm/80mm) untuk cetak struk otomatis tanpa kabel.
            </p>

            {onOpenBluetoothModal && (
              <div className="pt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenBluetoothModal();
                  }}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all active:scale-95 shadow-sm"
                >
                  <Bluetooth className="w-4 h-4" />
                  <span>
                    {isBluetoothConnected ? 'Kelola / Ganti Printer Bluetooth' : 'Hubungkan Printer Bluetooth'}
                  </span>
                </button>
              </div>
            )}
          </div>
          {/* SECTION 1: LOGO UPLOAD & PREVIEW */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-200 text-xs block">
                  1. Logo Header Struk (Di Atas Nama Toko)
                </span>
                <span className="text-[11px] text-slate-400">
                  Logo akan dicetak di bagian tengah atas sebelum nama toko pada kertas thermal
                </span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={profile.showLogo}
                  onChange={(e) => setProfile({ ...profile, showLogo: e.target.checked })}
                  className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
                />
                <span className="text-[11px] text-slate-300 font-medium">Tampilkan Logo</span>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
              {/* Logo Preview Box */}
              <div className="w-28 h-28 rounded-xl bg-white border-2 border-dashed border-slate-700 flex flex-col items-center justify-center p-2 relative group shrink-0 shadow-inner">
                {profile.logoUrl && profile.showLogo ? (
                  <>
                    <img
                      src={profile.logoUrl}
                      alt="Logo Toko"
                      className="max-h-20 max-w-20 object-contain filter grayscale contrast-150"
                    />
                    <span className="text-[9px] text-zinc-500 mt-1 font-mono">Thermal B/W</span>
                  </>
                ) : (
                  <div className="text-center text-zinc-400">
                    <ImageIcon className="w-7 h-7 mx-auto mb-1 text-zinc-300" />
                    <span className="text-[10px]">Tanpa Logo</span>
                  </div>
                )}
              </div>

              {/* Upload Controls & Presets */}
              <div className="flex-1 space-y-2.5 w-full">
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all active:scale-95"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Unggah Logo Baru (PNG/JPG)</span>
                  </button>

                  {profile.logoUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-slate-700 transition-all text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Logo</span>
                    </button>
                  )}
                </div>

                {/* Preset icons */}
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1.5">
                    Atau pilih template ikon toko siap pakai:
                  </span>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {PRESET_LOGOS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPresetLogo(preset.svgUrl)}
                        className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${
                          profile.logoUrl === preset.svgUrl
                            ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <span className="text-base">{preset.icon}</span>
                        <span className="text-[10px] truncate max-w-full">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: IDENTITAS TOKO */}
          <div className="space-y-3">
            <span className="font-bold text-slate-200 text-xs block">
              2. Data Toko & Kontak
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-slate-400 block mb-1">
                  Nama Toko / Badan Usaha <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  placeholder="Misal: TOKO BERKAH JAYA"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-bold focus:outline-none focus:border-emerald-500 uppercase"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 block">Cabang / Baris di Atas Alamat</label>
                  {profile.branch && (
                    <button
                      type="button"
                      onClick={() => setProfile({ ...profile, branch: '' })}
                      className="text-[11px] text-red-400 hover:text-red-300 font-medium hover:underline"
                    >
                      Kosongkan / Hilangkan
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={profile.branch || ''}
                    onChange={(e) => setProfile({ ...profile, branch: e.target.value })}
                    placeholder="Kosongkan jika tidak ada cabang"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 pr-8"
                  />
                  {profile.branch && (
                    <button
                      type="button"
                      onClick={() => setProfile({ ...profile, branch: '' })}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-red-400 p-1 transition-colors"
                      title="Kosongkan cabang"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Dicetak di atas alamat toko. Biarkan kosong jika tidak ingin ditampilkan pada struk.
                </span>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">No. Telepon / WhatsApp</label>
                <input
                  type="text"
                  value={profile.phone || ''}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="Misal: 0812-3456-7890"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-slate-400 block mb-1">Alamat Lengkap Toko</label>
                <input
                  type="text"
                  value={profile.address || ''}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  placeholder="Misal: Jl. Raya Sukabumi No. 42"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">NPWP / Website / Slogan</label>
                <input
                  type="text"
                  value={profile.websiteOrTaxId || ''}
                  onChange={(e) => setProfile({ ...profile, websiteOrTaxId: e.target.value })}
                  placeholder="NPWP: 01.xxx atau Slogan toko"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Nama Kasir Default</label>
                <input
                  type="text"
                  value={profile.defaultCashier || ''}
                  onChange={(e) => setProfile({ ...profile, defaultCashier: e.target.value })}
                  placeholder="Misal: Kasir 01"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: PESAN PENUTUP & FOOTER DEFAULT */}
          <div className="space-y-3">
            <span className="font-bold text-slate-200 text-xs block">
              3. Pesan Penutup & Footer Default
            </span>

            <div className="space-y-2.5">
              <div>
                <label className="text-slate-400 block mb-1">Pesan Ucapan Terima Kasih (Footer)</label>
                <input
                  type="text"
                  value={profile.defaultFooterNotes || ''}
                  onChange={(e) => setProfile({ ...profile, defaultFooterNotes: e.target.value })}
                  placeholder="Terima kasih atas kunjungan Anda!"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Informasi Kebijakan / Wi-Fi</label>
                <input
                  type="text"
                  value={profile.defaultPolicy || ''}
                  onChange={(e) => setProfile({ ...profile, defaultPolicy: e.target.value })}
                  placeholder="Barang yang dibeli tidak dapat ditukar."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Checkbox: Terapkan ke struk aktif saat ini */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={applyToCurrent}
                onChange={(e) => setApplyToCurrent(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0"
              />
              <span className="text-xs text-slate-200 font-medium">
                Terapkan profil toko & logo ini ke struk yang sedang dibuka saat ini
              </span>
            </label>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
          >
            Batal
          </button>

          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md active:scale-95 transition-all"
          >
            {saveSuccess ? <Check className="w-4 h-4 text-white" /> : <Save className="w-4 h-4" />}
            <span>{saveSuccess ? 'Tersimpan!' : 'Simpan Profil Toko & Logo'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
