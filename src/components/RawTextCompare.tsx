import React, { useState } from 'react';
import { Copy, Check, FileCode, CheckCircle2, AlertTriangle, Eye } from 'lucide-react';
import { ReceiptData } from '../types/receipt';

interface RawTextCompareProps {
  receipt: ReceiptData;
}

export const RawTextCompare: React.FC<RawTextCompareProps> = ({ receipt }) => {
  const [copied, setCopied] = useState(false);

  const rawText = receipt.rawExtractedText || 'Tidak ada data teks mentah.';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4 lg:p-6 shadow-xl backdrop-blur-md space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="font-semibold text-slate-100 flex items-center gap-2 text-sm">
            <FileCode className="w-5 h-5 text-emerald-400" />
            Teks Mentah OCR vs Data Terstruktur
          </h3>
          <p className="text-xs text-slate-400">
            Perbandingan teks yang dibaca langsung dari gambar sebelum diformat ulang
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Skor Akurasi: {receipt.confidenceScore || 95}%</span>
          </div>

          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all active:scale-95"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Tersalin' : 'Salin Teks Mentah'}</span>
          </button>
        </div>
      </div>

      {/* Grid Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Raw OCR Output */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300">1. Hasil Pindai Mentah (Raw OCR):</span>
            <span className="text-[11px] text-slate-500">Persis sesuai fisik foto</span>
          </div>
          <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-800 font-mono text-xs text-slate-300 max-h-[380px] overflow-y-auto leading-relaxed shadow-inner select-all">
            <pre className="whitespace-pre-wrap">{rawText}</pre>
          </div>
        </div>

        {/* Right: Parsed JSON summary */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-emerald-400">2. Hasil Ekstraksi Bersih & Terstruktur:</span>
            <span className="text-[11px] text-slate-500">Siap diedit & dicetak</span>
          </div>
          <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-800 text-xs text-slate-300 max-h-[380px] overflow-y-auto space-y-3 shadow-inner">
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500">Toko / Merchant</span>
              <p className="font-bold text-slate-100">{receipt.merchant.name}</p>
              {receipt.merchant.address && <p className="text-slate-400 text-[11px]">{receipt.merchant.address}</p>}
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500">Transaksi</span>
              <p className="text-slate-200">No. Faktur: <span className="font-mono text-emerald-400">{receipt.transaction.invoiceNumber}</span></p>
              <p className="text-slate-400 text-[11px]">Waktu: {receipt.transaction.date} {receipt.transaction.time}</p>
            </div>

            {receipt.extraFields && receipt.extraFields.length > 0 && (
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500">Info Tambahan / Metadata ({receipt.extraFields.length})</span>
                <div className="space-y-1">
                  {receipt.extraFields.map((field, idx) => (
                    <div key={idx} className="flex justify-between text-[11px]">
                      <span className="text-slate-400">{field.label}:</span>
                      <span className="font-mono text-slate-200 font-medium">{field.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-500">Rincian Item ({receipt.items?.length || 0})</span>
              <div className="space-y-1">
                {receipt.items?.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-[11px]">
                    <span className="truncate max-w-[200px] text-slate-300">{it.quantity}x {it.name}</span>
                    <span className="font-mono text-slate-200">Rp {it.subtotal.toLocaleString('id-ID')}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex justify-between items-center">
              <span className="font-bold text-slate-200">Total Belanja:</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                Rp {receipt.financials.grandTotal.toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
