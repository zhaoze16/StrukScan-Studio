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
} from 'lucide-react';
import { ReceiptData, StoreProfile } from './types/receipt';
import { SAMPLE_RECEIPTS, SamplePreset } from './utils/sampleReceipts';
import { ImageUploader } from './components/ImageUploader';
import { ReceiptEditor } from './components/ReceiptEditor';
import { ThermalReceiptPreview } from './components/ThermalReceiptPreview';
import { RawTextCompare } from './components/RawTextCompare';
import { BluetoothEscPosModal } from './components/BluetoothEscPosModal';
import { StoreSettingsModal, STORE_PROFILE_STORAGE_KEY } from './components/StoreSettingsModal';
import { AndroidInstallModal } from './components/AndroidInstallModal';

const STORAGE_KEY = 'strukscan_history_v1';

export default function App() {
  // Current active receipt
  const [receipt, setReceipt] = useState<ReceiptData>(SAMPLE_RECEIPTS[0].data);
  const [history, setHistory] = useState<ReceiptData[]>([]);

  // UI state
  const [activeTab, setActiveTab] = useState<'editor' | 'scanner' | 'compare' | 'history'>('editor');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isBluetoothModalOpen, setIsBluetoothModalOpen] = useState(false);
  const [isStoreSettingsOpen, setIsStoreSettingsOpen] = useState(false);
  const [isAndroidModalOpen, setIsAndroidModalOpen] = useState(false);

  // Load history from localStorage on initial render
  useEffect(() => {
    try {
      // Clean any legacy '1005' or '1005 SUKABUMI' in initial receipt state
      setReceipt((prev) => {
        if (prev.merchant.branch === '1005 SUKABUMI' || prev.merchant.branch === '1005') {
          return { ...prev, merchant: { ...prev.merchant, branch: '' } };
        }
        return prev;
      });

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleanedList = parsed.map((item) => {
            if (item?.merchant?.branch === '1005 SUKABUMI' || item?.merchant?.branch === '1005') {
              return {
                ...item,
                merchant: { ...item.merchant, branch: '' },
              };
            }
            return item;
          });
          setHistory(cleanedList);
          // If first item matches, make sure active receipt reflects clean branch
          if (cleanedList[0]?.id === receipt.id || cleanedList[0]?.merchant?.name === 'BRImo') {
            setReceipt(cleanedList[0]);
          }
        }
      } else {
        // Seed initial sample to history
        setHistory([SAMPLE_RECEIPTS[0].data, SAMPLE_RECEIPTS[1].data]);
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

  // OCR Processing handler
  const handleProcessImage = (extracted: ReceiptData) => {
    setReceipt(extracted);
    saveToHistory(extracted);
    setActiveTab('editor');
    setSuccessMessage('Struk berhasil dipindai dan diekstrak menjadi teks terstruktur (Tesseract OCR)!');
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

      const result = await response.json();

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

  // Export structured JSON
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(receipt, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `struk-${receipt.transaction.invoiceNumber || 'data'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
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
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30">
                  <Sparkles className="w-3 h-3" />
                  AI OCR • Bluetooth Print
                </span>
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
              title="Atur Nama Toko, Cabang, Alamat & Logo Struk"
            >
              <Store className="w-3.5 h-3.5 text-emerald-400" />
              <span>Profil & Logo Toko</span>
            </button>

            <button
              onClick={() => setActiveTab('scanner')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-sm active:scale-95 ${
                activeTab === 'scanner'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60'
              }`}
            >
              <Scan className="w-3.5 h-3.5 text-emerald-400" />
              <span>Pindai Foto</span>
            </button>

            <button
              onClick={() => setIsBluetoothModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-semibold border border-blue-500/30 transition-all active:scale-95"
            >
              <Bluetooth className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden md:inline">Bluetooth ESC/POS</span>
            </button>

            <button
              onClick={handleExportJson}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-all active:scale-95"
              title="Ekspor Data JSON"
            >
              <Download className="w-4 h-4" />
            </button>
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
              <span>Editor & Pratinjau Struk</span>
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
              onClick={() => setActiveTab('compare')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'compare'
                  ? 'bg-slate-800 text-emerald-400 font-semibold border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <FileCode className="w-4 h-4" />
              <span>Teks Mentah OCR</span>
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

          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Pratinjau Otomatis Sinkron</span>
          </div>
        </div>

        {/* Tab 1: Workspace (Split Screen: Left Editor, Right Live Thermal Receipt) */}
        {activeTab === 'editor' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Structured Form Editor (7 cols) */}
            <div className="lg:col-span-7">
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

            {/* Right Column: Live Thermal Receipt Preview (5 cols) */}
            <div className="lg:col-span-5 sticky top-20">
              <ThermalReceiptPreview
                receipt={receipt}
                onChange={(updated) => {
                  setReceipt(updated);
                  saveToHistory(updated);
                }}
                onOpenBluetoothModal={() => setIsBluetoothModalOpen(true)}
              />
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

        {/* Tab 3: Compare Raw OCR */}
        {activeTab === 'compare' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <RawTextCompare receipt={receipt} />
          </div>
        )}

        {/* Tab 4: History */}
        {activeTab === 'history' && (
          <div className="max-w-5xl mx-auto space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h3 className="font-semibold text-slate-100 text-sm">
                  Riwayat Dokumen & Struk Terpindai
                </h3>
                <p className="text-xs text-slate-400">
                  Klik pada struk untuk memuat kembali ke editor dan mencetak ulang
                </p>
              </div>
              <button
                onClick={() => {
                  if (confirm('Bersihkan semua riwayat struk?')) {
                    setHistory([]);
                    localStorage.removeItem(STORAGE_KEY);
                  }
                }}
                className="text-xs text-slate-400 hover:text-red-400 transition-colors px-2 py-1 rounded-lg"
              >
                Hapus Semua
              </button>
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
                    className={`p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] ${
                      item.id === receipt.id
                        ? 'bg-slate-900 border-emerald-500/60 shadow-lg shadow-emerald-950/30'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-bold text-sm text-slate-100 truncate">
                        {item.merchant.name || 'Struk Tanpa Nama'}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 font-mono shrink-0">
                        {item.documentType}
                      </span>
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
              <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl text-slate-400 text-xs">
                Belum ada riwayat struk tersimpan. Mulai dengan memindai foto atau memilih preset sampel.
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
          onClose={() => setIsStoreSettingsOpen(false)}
        />
      )}

      {/* Android Installation & APK Modal */}
      {isAndroidModalOpen && (
        <AndroidInstallModal
          onClose={() => setIsAndroidModalOpen(false)}
        />
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
