import React, { useState, useEffect } from 'react';
import {
  Bluetooth,
  X,
  Printer,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Cpu,
  RefreshCw,
  Send,
  HelpCircle,
  ExternalLink,
  AlertTriangle,
  Smartphone,
  Share2,
  PowerOff,
  Terminal,
  Download,
  Laptop,
} from 'lucide-react';
import { ReceiptData } from '../types/receipt';
import {
  generateEscPosBytes,
  bytesToHexString,
  formatReceiptToThermalText,
  convertImageToEscPos,
  ensureBase64LogoUrl,
} from '../utils/thermalFormatter';
import { useBluetoothPrinter } from '../context/BluetoothPrinterContext';

interface BluetoothEscPosModalProps {
  receipt: ReceiptData;
  onClose: () => void;
}

export const BluetoothEscPosModal: React.FC<BluetoothEscPosModalProps> = ({
  receipt,
  onClose,
}) => {
  const {
    connectedDeviceName,
    isConnected,
    isConnecting,
    isPrinting,
    statusMessage,
    isPolicyBlocked,
    paperWidth,
    setPaperWidth,
    cutPaper,
    setCutPaper,
    feedLines,
    setFeedLines,
    connect,
    disconnect,
    printReceipt,
    printViaRawBT,
  } = useBluetoothPrinter();

  const [copiedHex, setCopiedHex] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedLinuxCmd, setCopiedLinuxCmd] = useState(false);
  const [logoBytes, setLogoBytes] = useState<Uint8Array | null>(null);

  useEffect(() => {
    if (receipt.merchant.showLogo !== false && receipt.merchant.logoUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          // Downscale to 160px for 58mm or 240px for 80mm
          const bytes = convertImageToEscPos(img, paperWidth === 32 ? 160 : 240);
          setLogoBytes(bytes);
        } catch (err) {
          console.error('Failed to convert logo image to ESC/POS:', err);
          setLogoBytes(null);
        }
      };
      img.onerror = () => {
        console.warn('Failed to load logo image:', receipt.merchant.logoUrl);
        setLogoBytes(null);
      };
      // Convert raw SVG URL to Base64 to ensure it loads on canvas
      img.src = ensureBase64LogoUrl(receipt.merchant.logoUrl) || '';
    } else {
      setLogoBytes(null);
    }
  }, [receipt.merchant.logoUrl, receipt.merchant.showLogo, paperWidth]);

  const isInsideIframe = typeof window !== 'undefined' && window.self !== window.top;
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const escPosBytes = generateEscPosBytes(receipt, paperWidth, { cutPaper, feedLines, logoBytes });
  const hexDump = bytesToHexString(escPosBytes);
  const thermalText = formatReceiptToThermalText(receipt, paperWidth);

  const downloadEscPosBin = () => {
    const blob = new Blob([new Uint8Array(escPosBytes)], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `receipt_${receipt.transaction.invoiceNumber || 'print'}.bin`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyLinuxCommand = async () => {
    try {
      const base64Bytes = btoa(Array.from(escPosBytes).map((c) => String.fromCharCode(c)).join(''));
      const cmd = `echo "${base64Bytes}" | base64 -d > /dev/usb/lp0`;
      await navigator.clipboard.writeText(cmd);
      setCopiedLinuxCmd(true);
      setTimeout(() => setCopiedLinuxCmd(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleSendPrintJob = async () => {
    await printReceipt(receipt, paperWidth, logoBytes);
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(thermalText);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleCopyHex = () => {
    navigator.clipboard.writeText(hexDump);
    setCopiedHex(true);
    setTimeout(() => setCopiedHex(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${
              isConnected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
            }`}>
              <Bluetooth className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                Koneksi Printer Bluetooth Thermal
                {isConnected && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                    Aktif
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400">
                Koneksi tetap tersimpan meskipun Anda menutup halaman ini
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
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* NOTICE: IFRAME / PERMISSIONS POLICY BLOCK WARNING */}
          {(isInsideIframe || isPolicyBlocked) && (
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 space-y-2.5 text-amber-200 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-xs text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Penyebab Error "Permissions Policy" di Chrome Android:</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-300">
                Google Chrome Android membatasi akses Web Bluetooth jika halaman dibuka di dalam <strong>frame preview</strong>.
                Buka URL aplikasi langsung di tab utama Google Chrome (bukan di dalam frame) agar Bluetooth aktif bebas hambatan:
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <a
                  href={currentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md active:scale-95"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka di Tab Baru Chrome (Bebas Frame)</span>
                </a>
              </div>
            </div>
          )}

          {/* Status Box */}
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              isConnected
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : isPolicyBlocked
                ? 'bg-red-950/30 border-red-500/30 text-red-300'
                : 'bg-slate-950 border-slate-800 text-slate-300'
            }`}
          >
            <div className="mt-0.5">
              {isConnected ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : isPolicyBlocked ? (
                <AlertCircle className="w-4 h-4 text-red-400" />
              ) : (
                <Cpu className="w-4 h-4 text-blue-400" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-200">
                  {isConnected ? `Printer Terhubung: ${connectedDeviceName}` : 'Status Bluetooth'}
                </p>
                {isConnected && (
                  <button
                    onClick={disconnect}
                    className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 hover:underline"
                  >
                    <PowerOff className="w-3 h-3" />
                    <span>Putuskan</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{statusMessage}</p>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs">Lebar Kertas:</span>
              <div className="inline-flex p-0.5 rounded-lg bg-slate-950 border border-slate-800">
                <button
                  onClick={() => setPaperWidth(32)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                    paperWidth === 32 ? 'bg-blue-600 text-white' : 'text-slate-400'
                  }`}
                >
                  58mm (32 col)
                </button>
                <button
                  onClick={() => setPaperWidth(48)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                    paperWidth === 48 ? 'bg-blue-600 text-white' : 'text-slate-400'
                  }`}
                >
                  80mm (48 col)
                </button>
              </div>
            </div>

            <button
              onClick={connect}
              disabled={isConnecting}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white font-semibold transition-all active:scale-95 disabled:opacity-50 shadow-sm ${
                isConnected
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  : 'bg-blue-600 hover:bg-blue-500'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isConnecting ? 'animate-spin' : ''}`} />
              <span>
                {isConnecting
                  ? 'Menghubungkan...'
                  : isConnected
                  ? 'Ganti Printer Bluetooth'
                  : 'Hubungkan Web Bluetooth'}
              </span>
            </button>
          </div>

          {/* PENGATURAN HEMAT KERTAS & SISA KERTAS BAWAH */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pengaturan Hemat Kertas (Sisa Bawah):</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20">
                Anti Kertas Berlebih
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              {/* Jarak Kertas Bawah / Feed Lines */}
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                <label className="text-slate-400 block font-medium">Jarak Keluar Kertas (Feed):</label>
                <div className="grid grid-cols-4 gap-1">
                  <button
                    type="button"
                    onClick={() => setFeedLines(1)}
                    className={`py-1 px-1 rounded text-center transition-all ${
                      feedLines === 1
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    1 Baris
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedLines(2)}
                    className={`py-1 px-1 rounded text-center transition-all ${
                      feedLines === 2
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    2 Baris (Pas)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedLines(3)}
                    className={`py-1 px-1 rounded text-center transition-all ${
                      feedLines === 3
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    3 Baris
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedLines(4)}
                    className={`py-1 px-1 rounded text-center transition-all ${
                      feedLines === 4
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    4 Baris
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Diset ke 2 baris agar posisi sobekan pas dan tidak terlalu mepet dengan baris terakhir.
                </p>
              </div>

              {/* Toggle Auto-Cut (GS V) */}
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-400 font-medium">Perintah Potong (Auto-Cut):</label>
                  <button
                    type="button"
                    onClick={() => setCutPaper(!cutPaper)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                      cutPaper
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {cutPaper ? 'Aktif' : 'Nonaktif (Hemat)'}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  {cutPaper
                    ? 'Diaktifkan untuk mesin POS desktop yang punya pisau pemotong elektrik.'
                    : 'Disarankan NONAKTIF untuk printer Bluetooth 58mm portable agar kertas tidak keluar panjang ke bawah.'}
                </p>
              </div>
            </div>
          </div>

          {/* OPSI CETAK ALTERNATIF KHUSUS LINUX */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
            <span className="font-bold text-slate-200 block text-xs flex items-center gap-1.5">
              <Laptop className="w-3.5 h-3.5 text-emerald-400" />
              <span>Opsi Cetak Alternatif di Linux (Port Driver Desktop):</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {/* Opsi 1: Unduh File Binary ESC/POS */}
              <button
                type="button"
                onClick={downloadEscPosBin}
                className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-left transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    Unduh Binary ESC/POS
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">.bin</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Unduh file raw bytes binary ESC/POS untuk dicetak langsung menggunakan perintah <code className="text-emerald-400">cat receipt.bin &gt; /dev/usb/lp0</code>
                </p>
              </button>

              {/* Opsi 2: Salin Perintah Terminal Linux */}
              <button
                type="button"
                onClick={handleCopyLinuxCommand}
                className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/40 text-left transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-blue-400" />
                    Salin Command Terminal
                  </span>
                  <span className="text-[10px] text-blue-400 font-mono">
                    {copiedLinuxCmd ? 'Tersalin!' : 'Salin'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Salin perintah bash base64 untuk diarahkan langsung ke port USB printer <code className="text-blue-400">/dev/usb/lp0</code> di Linux Desktop
                </p>
              </button>
            </div>
          </div>

          {/* Command Inspector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300">
                Buffer Byte ESC/POS ({escPosBytes.length} bytes):
              </span>
              <button
                onClick={handleCopyHex}
                className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                {copiedHex ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedHex ? 'Tersalin' : 'Salin Hex Byte'}</span>
              </button>
            </div>

            <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 font-mono text-[11px] text-blue-400/90 break-all max-h-24 overflow-y-auto shadow-inner leading-relaxed select-all">
              {hexDump}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            Tutup (Biarkan Terhubung)
          </button>

          <button
            onClick={handleSendPrintJob}
            disabled={isPrinting || !isConnected}
            className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-white font-semibold text-xs shadow-md active:scale-95 transition-all ${
              isConnected
                ? 'bg-emerald-600 hover:bg-emerald-500'
                : 'bg-slate-800 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>{isPrinting ? 'Mencetak...' : 'Kirim Cetak ESC/POS'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
