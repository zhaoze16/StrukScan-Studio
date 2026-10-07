import React, { useState, useEffect } from 'react';
import {
  Scan,
  Printer,
  FileSpreadsheet,
  FileCode,
  History,
  Sparkles,
  Download,
  Upload,
  RotateCcw,
  Plus,
  AlertCircle,
  CheckCircle2,
  Receipt,
  Bluetooth,
  ArrowRight,
  Layers,
  HelpCircle,
  FileText,
  Store,
  Smartphone,
  Settings,
  Trash2,
} from 'lucide-react';
import { ReceiptData, StoreProfile } from './types/receipt';
import { SAMPLE_RECEIPTS, SamplePreset } from './utils/sampleReceipts';
import { ImageUploader } from './components/ImageUploader';
import { ReceiptEditor } from './components/ReceiptEditor';
import { ThermalReceiptPreview } from './components/ThermalReceiptPreview';
import { RawTextCompare, RawOcrPanel, CleanStructuredPanel } from './components/RawTextCompare';
import { BluetoothEscPosModal } from './components/BluetoothEscPosModal';
import { StoreSettingsModal, STORE_PROFILE_STORAGE_KEY } from './components/StoreSettingsModal';
import { AndroidInstallModal } from './components/AndroidInstallModal';
import { useBluetoothPrinter } from './context/BluetoothPrinterContext';

const STORAGE_KEY = 'strukscan_history_v1';

export default function App() {
  const { isConnected: isBluetoothConnected, connectedDeviceName } = useBluetoothPrinter();

  // Current active receipt
  const [receipt, setReceipt] = useState<ReceiptData>(SAMPLE_RECEIPTS[0].data);
  const [history, setHistory] = useState<ReceiptData[]>([]);

  // UI state
  const [activeTab, setActiveTab] = useState<'editor' | 'scanner' | 'history'>('editor');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isBluetoothModalOpen, setIsBluetoothModalOpen] = useState(false);
  const [isStoreSettingsOpen, setIsStoreSettingsOpen] = useState(false);
  const [isAndroidModalOpen, setIsAndroidModalOpen] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  // Load history from localStorage on initial render
  useEffect(() => {
    try {
      // Helper to clean legacy unwanted text from receipt
      const sanitizeReceipt = (item: ReceiptData): ReceiptData => {
        let updated = { ...item };
        // Clean legacy branch
        if (updated?.merchant?.branch === '1005 SUKABUMI' || updated?.merchant?.branch === '1005') {
          updated = { ...updated, merchant: { ...updated.merchant, branch: '' } };
        }
        // Clean legacy footer policy containing 'resmi' or 'tercetak'
        if (updated?.footer?.policy) {
          const p = updated.footer.policy.toLowerCase();
          if (p.includes('resmi') || p.includes('tercetak') || p.includes('care center 165')) {
            updated = { ...updated, footer: { ...updated.footer, policy: '' } };
          }
        }
        // Clean legacy footer notes containing 'sah' or 'resmi'
        if (updated?.footer?.notes) {
          const n = updated.footer.notes.toLowerCase();
          if (n.includes('bukti bayar sah') || n.includes('resmi')) {
            updated = { ...updated, footer: { ...updated.footer, notes: 'Transaksi Berhasil' } };
          }
        }
        return updated;
      };

      // Clean initial receipt state
      setReceipt((prev) => sanitizeReceipt(prev));

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleanedList = parsed.map(sanitizeReceipt);
          setHistory(cleanedList);
          // Make sure active receipt reflects clean data
          if (cleanedList[0]) {
            setReceipt(cleanedList[0]);
          }
        }
      } else {
        // Seed initial sample to history
        setHistory([sanitizeReceipt(SAMPLE_RECEIPTS[0].data), sanitizeReceipt(SAMPLE_RECEIPTS[1].data)]);
      }
    } catch (e) {
      console.error('Failed to load history', e);
    }
  }, []);

  // Save history to localStorage
  const saveToHistory = (newReceipt: ReceiptData) => {
    setHistory((prev) => {
      const filtered = prev.filter((item) => item.id !== newReceipt.id);
      const updated = [newReceipt, ...filtered].slice(0, 30); // keep up to 30
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('LocalStorage quota warning', e);
      }
      return updated;
    });
  };

  // Delete single receipt item from history
  const handleDeleteHistoryItem = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      try {
        if (updated.length === 0) {
          localStorage.removeItem(STORAGE_KEY);
        } else {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        }
      } catch (err) {
        console.warn('LocalStorage save error', err);
      }

      // If active receipt is the one deleted, switch to next or reset
      if (receipt.id === id) {
        if (updated.length > 0) {
          setReceipt(updated[0]);
        } else {
          // Get saved store profile to keep store name
          let storeName = 'TOKO SAYA';
          let storeProfile: any = {};
          try {
            const saved = localStorage.getItem('strukscan_store_profile_v1');
            if (saved) {
              storeProfile = JSON.parse(saved);
              if (storeProfile.name) storeName = storeProfile.name;
            }
          } catch (e) {
            console.warn('Failed to parse saved profile', e);
          }

          setReceipt({
            id: `receipt-${Date.now()}`,
            createdAt: new Date().toISOString(),
            confidenceScore: 100,
            documentType: 'receipt',
            merchant: {
              name: storeName,
              branch: storeProfile.branch || '',
              address: storeProfile.address || '',
              phone: storeProfile.phone || '',
              websiteOrTaxId: storeProfile.websiteOrTaxId || '',
              logoUrl: storeProfile.logoUrl,
              showLogo: storeProfile.showLogo !== false,
            },
            transaction: {
              invoiceNumber: '',
              date: new Date().toLocaleDateString('id-ID'),
              time: new Date().toLocaleTimeString('id-ID', { hour12: false }).substring(0, 8),
              cashier: storeProfile.defaultCashier || 'Kasir 01',
              queueOrTable: '',
            },
            items: [],
            financials: {
              subtotal: 0,
              taxPercent: 0,
              taxAmount: 0,
              serviceCharge: 0,
              discount: 0,
              rounding: 0,
              grandTotal: 0,
              currency: 'IDR',
            },
            payment: {
              method: 'TUNAI',
              amountPaid: 0,
              change: 0,
            },
            footer: {
              notes: storeProfile.defaultFooterNotes || 'Terima kasih atas kunjungan Anda!',
              policy: storeProfile.defaultPolicy || 'Barang yang dibeli tidak dapat ditukar.',
              barcodeValue: '',
            },
            rawExtractedText: 'Belum ada data hasil pindai OCR. Silakan unggah foto baru pada tab "Unggah Foto Baru" di atas.',
          });
        }
      }

      return updated;
    });

    setSuccessMessage('Struk berhasil dihapus dari riwayat! 🗑️');
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  // Delete all receipts from history
  const handleDeleteAllHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.warn('LocalStorage clear error', err);
    }

    // Get saved store profile to keep store name
    let storeName = 'TOKO SAYA';
    let storeProfile: any = {};
    try {
      const saved = localStorage.getItem('strukscan_store_profile_v1');
      if (saved) {
        storeProfile = JSON.parse(saved);
        if (storeProfile.name) storeName = storeProfile.name;
      }
    } catch (e) {
      console.warn('Failed to parse saved profile', e);
    }

    // reset current receipt to clean empty initial state while preserving store name & profile
    setReceipt({
      id: `receipt-${Date.now()}`,
      createdAt: new Date().toISOString(),
      confidenceScore: 100,
      documentType: 'receipt',
      merchant: {
        name: storeName,
        branch: storeProfile.branch || '',
        address: storeProfile.address || '',
        phone: storeProfile.phone || '',
        websiteOrTaxId: storeProfile.websiteOrTaxId || '',
        logoUrl: storeProfile.logoUrl,
        showLogo: storeProfile.showLogo !== false,
      },
      transaction: {
        invoiceNumber: '',
        date: new Date().toLocaleDateString('id-ID'),
        time: new Date().toLocaleTimeString('id-ID', { hour12: false }).substring(0, 8),
        cashier: storeProfile.defaultCashier || 'Kasir 01',
        queueOrTable: '',
      },
      items: [],
      financials: {
        subtotal: 0,
        taxPercent: 0,
        taxAmount: 0,
        serviceCharge: 0,
        discount: 0,
        rounding: 0,
        grandTotal: 0,
        currency: 'IDR',
      },
      payment: {
        method: 'TUNAI',
        amountPaid: 0,
        change: 0,
      },
      footer: {
        notes: storeProfile.defaultFooterNotes || 'Terima kasih atas kunjungan Anda!',
        policy: storeProfile.defaultPolicy || 'Barang yang dibeli tidak dapat ditukar.',
        barcodeValue: '',
      },
      rawExtractedText: 'Belum ada data hasil pindai OCR. Silakan unggah foto baru pada tab "Unggah Foto Baru" di atas.',
    });

    setShowDeleteAllConfirm(false);
    setSuccessMessage('Seluruh riwayat struk & dokumen berhasil dibersihkan! 🗑️');
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  // OCR Processing handler
  const handleProcessImage = (extracted: ReceiptData) => {
    // Keep the current store / merchant profile (never take store name from raw OCR)
    let currentStore = receipt.merchant;
    try {
      const savedProfile = localStorage.getItem(STORE_PROFILE_STORAGE_KEY);
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        currentStore = {
          name: parsed.name || receipt.merchant.name,
          branch: parsed.branch !== undefined ? parsed.branch : receipt.merchant.branch,
          address: parsed.address !== undefined ? parsed.address : receipt.merchant.address,
          phone: parsed.phone !== undefined ? parsed.phone : receipt.merchant.phone,
          websiteOrTaxId: parsed.websiteOrTaxId !== undefined ? parsed.websiteOrTaxId : receipt.merchant.websiteOrTaxId,
          logoUrl: parsed.logoUrl !== undefined ? parsed.logoUrl : receipt.merchant.logoUrl,
          showLogo: parsed.showLogo !== undefined ? parsed.showLogo : receipt.merchant.showLogo,
        };
      }
    } catch {
      // fallback to current receipt.merchant
    }

    const finalReceipt: ReceiptData = {
      ...extracted,
      merchant: currentStore,
    };

    setReceipt(finalReceipt);
    saveToHistory(finalReceipt);
    setActiveTab('editor');
    setSuccessMessage('Struk berhasil dipindai dan diekstrak menjadi teks terstruktur!');
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // AI Recalculate or reformat handler
  const handleAiRecalculate = async (promptText?: string) => {
    setIsAiProcessing(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/ocr/ai-recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiptData: receipt,
          prompt: promptText,
        }),
      });

      let result: any = {};
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        result = await response.json();
      } else {
        const text = await response.text();
        throw new Error(text || `HTTP error ${response.status}`);
      }

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Gagal merevisi data struk.');
      }

      const updated: ReceiptData = {
        ...receipt,
        ...result.data,
        id: receipt.id,
      };

      setReceipt(updated);
      saveToHistory(updated);
      setSuccessMessage('Data struk berhasil diperbaiki oleh AI Gemini!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('AI recalculation error:', err);
      setErrorMessage(err.message || 'Gagal melakukan pembaruan AI.');
    } finally {
      setIsAiProcessing(false);
    }
  };

  // Sample receipt loader
  const handleSelectSample = (sample: SamplePreset) => {
    const loadedData: ReceiptData = {
      ...sample.data,
      id: `REC-SAMPLE-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setReceipt(loadedData);
    saveToHistory(loadedData);
    setActiveTab('editor');
    setSuccessMessage(`Contoh "${sample.title}" berhasil dimuat!`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Activate PPOB mode helper
  const handleActivatePpobMode = () => {
    const plnPreset = SAMPLE_RECEIPTS.find((r) => r.id === 'sample-pln');
    if (plnPreset) {
      // Get saved store profile to keep store name
      let storeName = 'LOKET PPOB MANDIRI';
      let storeProfile: any = {};
      try {
        const saved = localStorage.getItem('strukscan_store_profile_v1');
        if (saved) {
          storeProfile = JSON.parse(saved);
          if (storeProfile.name) storeName = storeProfile.name;
        }
      } catch (e) {
        console.warn('Failed to parse saved profile', e);
      }

      const loadedData: ReceiptData = {
        ...plnPreset.data,
        id: `REC-PLN-${Date.now()}`,
        createdAt: new Date().toISOString(),
        merchant: {
          ...plnPreset.data.merchant,
          name: storeName,
          branch: storeProfile.branch || plnPreset.data.merchant.branch,
          address: storeProfile.address || plnPreset.data.merchant.address,
          phone: storeProfile.phone || plnPreset.data.merchant.phone,
          logoUrl: storeProfile.logoUrl,
          showLogo: storeProfile.showLogo !== false,
        },
        transaction: {
          ...plnPreset.data.transaction,
          date: new Date().toLocaleDateString('id-ID'),
          time: new Date().toLocaleTimeString('id-ID', { hour12: false }).substring(0, 8),
        }
      };
      setReceipt(loadedData);
      saveToHistory(loadedData);
      setActiveTab('editor');
      setSuccessMessage('Mode PPOB Aktif! Template PLN Listrik Pintar berhasil dimuat! ⚡');
      setTimeout(() => setSuccessMessage(null), 3500);
    }
  };

  // Export full data backup (history + templates)
  const handleExportBackup = () => {
    const historyData = localStorage.getItem(STORAGE_KEY);
    const templatesData = localStorage.getItem('strukscan_metadata_templates_v1');
    const storeProfileData = localStorage.getItem('strukscan_store_profile_v1');

    const backup = {
      history: historyData ? JSON.parse(historyData) : [],
      templates: templatesData ? JSON.parse(templatesData) : [],
      storeProfile: storeProfileData ? JSON.parse(storeProfileData) : {},
      exportedAt: new Date().toISOString()
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `strukscan-backup-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setSuccessMessage('Backup data berhasil diekspor! 💾');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Import data backup
  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const backup = JSON.parse(e.target?.result as string);
        if (backup.history) localStorage.setItem(STORAGE_KEY, JSON.stringify(backup.history));
        if (backup.templates) localStorage.setItem('strukscan_metadata_templates_v1', JSON.stringify(backup.templates));
        if (backup.storeProfile) localStorage.setItem('strukscan_store_profile_v1', JSON.stringify(backup.storeProfile));
        
        window.location.reload(); // Refresh to apply changes
      } catch (err) {
        setErrorMessage('Gagal mengimpor file backup: format tidak valid.');
        setTimeout(() => setErrorMessage(null), 3000);
      }
    };
    reader.readAsText(file);
  };

  // Store Profile & Logo Save Handler
  const handleSaveStoreProfile = (profile: StoreProfile, applyToCurrent: boolean) => {
    if (applyToCurrent) {
      const updated: ReceiptData = {
        ...receipt,
        merchant: {
          ...receipt.merchant,
          name: profile.name || receipt.merchant.name,
          branch: profile.branch !== undefined ? profile.branch : receipt.merchant.branch,
          address: profile.address !== undefined ? profile.address : receipt.merchant.address,
          phone: profile.phone !== undefined ? profile.phone : receipt.merchant.phone,
          websiteOrTaxId: profile.websiteOrTaxId !== undefined ? profile.websiteOrTaxId : receipt.merchant.websiteOrTaxId,
          logoUrl: profile.logoUrl,
          showLogo: profile.showLogo,
        },
        transaction: {
          ...receipt.transaction,
          cashier: profile.defaultCashier || receipt.transaction.cashier,
        },
        footer: {
          ...receipt.footer,
          notes: profile.defaultFooterNotes !== undefined ? profile.defaultFooterNotes : receipt.footer.notes,
          policy: profile.defaultPolicy !== undefined ? profile.defaultPolicy : receipt.footer.policy,
        },
      };
      setReceipt(updated);
      saveToHistory(updated);
      setSuccessMessage('Profil toko dan logo berhasil diterapkan ke struk!');
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80 px-4 lg:px-8 py-3 print:hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20 font-black text-xl">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base lg:text-lg tracking-tight bg-gradient-to-r from-slate-100 via-emerald-200 to-teal-300 bg-clip-text text-transparent">
                  StrukScan Studio
                </h1>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Ekstraksi Struk Belanja & Bukti Pembayaran ke Format Printer Thermal
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAndroidModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/40 transition-all shadow-sm active:scale-95 animate-pulse"
              title="Pasang Langsung di HP Android atau Ubah Jadi File APK"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Jadikan App Android</span>
            </button>

            <button
              onClick={() => setIsStoreSettingsOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700/60 transition-all shadow-sm active:scale-95"
              title="Pengaturan Profil Toko, Logo Struk & Bluetooth Printer"
            >
              <Settings className="w-3.5 h-3.5 text-emerald-400" />
              <span>Pengaturan Toko</span>
            </button>

            <div className="flex items-center gap-1.5 ml-2">
              <label
                className="cursor-pointer p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-all active:scale-95"
                title="Impor Backup Data"
              >
                <Upload className="w-4 h-4" />
                <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
              </label>

              <button
                onClick={handleExportBackup}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-all active:scale-95"
                title="Ekspor Seluruh Backup Data"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Alert Notices */}
      {errorMessage && (
        <div className="max-w-7xl mx-auto w-full px-4 pt-3 print:hidden">
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-red-200 text-xs px-2 py-0.5"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="max-w-7xl mx-auto w-full px-4 pt-3 print:hidden">
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 shadow-lg">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 lg:px-8 py-5 print:p-0">
        {/* Sub-tabs / View switcher */}
        <div className="flex items-center justify-between gap-2 pb-4 mb-2 border-b border-slate-800/80 print:hidden">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-medium no-scrollbar">
            <button
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'editor'
                  ? 'bg-slate-800 text-emerald-400 font-semibold border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Workspace Struk & OCR</span>
            </button>

            <button
              onClick={() => setActiveTab('scanner')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'scanner'
                  ? 'bg-slate-800 text-emerald-400 font-semibold border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Scan className="w-4 h-4" />
              <span>Unggah Foto Baru</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'history'
                  ? 'bg-slate-800 text-emerald-400 font-semibold border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Riwayat Struk ({history.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 border-l border-slate-800/80 pl-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Sinkron</span>
            </div>
          </div>
        </div>

        {/* Tab 1: Workspace (Unified single page workspace!) */}
        {activeTab === 'editor' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column (6 cols): Hasil Pindai Mentah (Raw OCR) & Pratinjau Struk Thermal */}
            <div className="lg:col-span-6 space-y-6">
              {/* Hasil Pindai Mentah (Raw OCR) */}
              <RawOcrPanel
                receipt={receipt}
                onChange={(updated) => {
                  setReceipt(updated);
                  saveToHistory(updated);
                }}
              />

              {/* Pratinjau Struk Thermal */}
              <ThermalReceiptPreview
                receipt={receipt}
                onChange={(updated) => {
                  setReceipt(updated);
                  saveToHistory(updated);
                }}
                onOpenBluetoothModal={() => setIsBluetoothModalOpen(true)}
              />
            </div>

            {/* Right Column (6 cols): Hasil Ekstraksi Bersih & Terstruktur (Edit Manual Di Sini) */}
            <div className="lg:col-span-6 space-y-6">
              {/* Hasil Ekstraksi Bersih & Terstruktur */}
              <CleanStructuredPanel
                receipt={receipt}
                onChange={(updated) => {
                  setReceipt(updated);
                  saveToHistory(updated);
                }}
              />
            </div>

            {/* Bottom Section (12 cols): Editor Data Terstruktur (Edit Manual Di Sini) */}
            <div className="lg:col-span-12 pt-6 border-t border-slate-800/80">
              <div className="bg-slate-900/40 rounded-2xl p-5 lg:p-6 border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-800">
                  <Settings className="w-4.5 h-4.5 text-emerald-400" />
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-300">
                    Editor Data Terstruktur (Pengaturan Rinci & Tabular)
                  </span>
                </div>
                <ReceiptEditor
                  receipt={receipt}
                  onChange={(updated) => {
                    setReceipt(updated);
                    saveToHistory(updated);
                  }}
                  onAiRecalculate={handleAiRecalculate}
                  isAiProcessing={isAiProcessing}
                  onOpenStoreSettings={() => setIsStoreSettingsOpen(true)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Scanner & Uploader */}
        {activeTab === 'scanner' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <ImageUploader
              onProcessImage={handleProcessImage}
              onSelectSample={handleSelectSample}
              isProcessing={isProcessing}
              setIsProcessing={setIsProcessing}
            />
          </div>
        )}

        {/* Tab 4: History */}
        {activeTab === 'history' && (
          <div className="max-w-5xl mx-auto space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-400" />
                  <span>Riwayat Dokumen & Struk Terpindai</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                    {history.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Pilih struk untuk memuat kembali ke editor, atau klik tombol tong sampah untuk menghapus.
                </p>
              </div>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowDeleteAllConfirm(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/30 transition-all active:scale-95 shadow-xs"
                  title="Hapus semua riwayat struk"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Semua Riwayat</span>
                </button>
              )}
            </div>

            {history.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setReceipt(item);
                      setActiveTab('editor');
                    }}
                    className={`group relative p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] ${
                      item.id === receipt.id
                        ? 'bg-slate-900 border-emerald-500/60 shadow-lg shadow-emerald-950/30'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-bold text-sm text-slate-100 truncate flex-1">
                        {item.merchant.name || 'Struk Tanpa Nama'}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 font-mono">
                          {item.documentType}
                        </span>
                        {/* Individual Delete Button */}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                          className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/20 transition-all active:scale-90"
                          title="Hapus struk ini dari riwayat"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 mb-2 truncate">
                      {item.transaction.invoiceNumber || 'No. Faktur -'} • {item.transaction.date}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <span className="text-[11px] text-slate-500">
                        {item.items?.length || 0} Item
                      </span>
                      <span className="font-mono font-bold text-sm text-emerald-400">
                        Rp {item.financials.grandTotal?.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl text-slate-400 text-xs space-y-2">
                <p className="font-medium text-slate-300">Belum ada riwayat struk tersimpan.</p>
                <p className="text-[11px] text-slate-500">
                  Mulai dengan memindai foto atau memilih preset sampel pada tab Unggah Foto.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bluetooth Printer Modal */}
      {isBluetoothModalOpen && (
        <BluetoothEscPosModal
          receipt={receipt}
          onClose={() => setIsBluetoothModalOpen(false)}
        />
      )}

      {/* Dedicated Store Profile & Logo Settings Modal */}
      {isStoreSettingsOpen && (
        <StoreSettingsModal
          currentReceipt={receipt}
          onSaveProfile={handleSaveStoreProfile}
          onOpenBluetoothModal={() => setIsBluetoothModalOpen(true)}
          onClose={() => setIsStoreSettingsOpen(false)}
        />
      )}

      {/* Android Installation & APK Modal */}
      {isAndroidModalOpen && (
        <AndroidInstallModal
          onClose={() => setIsAndroidModalOpen(false)}
        />
      )}

      {/* Delete All History Confirmation Modal */}
      {showDeleteAllConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-100 text-sm">Hapus Semua Riwayat?</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Tindakan ini akan menghapus permanen <strong>{history.length}</strong> data struk dari penyimpanan lokal browser Anda.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowDeleteAllConfirm(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteAllHistory}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md active:scale-95 transition-all"
              >
                Ya, Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950/40 py-4 px-4 text-center text-xs text-slate-500 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>StrukScan OCR Studio — Pengolahan Dokumen & Printer Bluetooth Thermal</span>
          <span>Kompatibel format gulungan kertas 58mm & 80mm ESC/POS</span>
        </div>
      </footer>
    </div>
  );
}
