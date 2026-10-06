import React, { useState, useRef } from 'react';
import {
  Printer,
  Copy,
  Download,
  Check,
  Bluetooth,
  Maximize2,
  FileText,
  QrCode,
  Tag,
  Store,
  Calendar,
  Clock,
  User,
  Hash,
  X,
} from 'lucide-react';
import { ReceiptData } from '../types/receipt';
import { formatCurrency, formatReceiptToThermalText } from '../utils/thermalFormatter';
import { BarcodeRenderer, QrCodeRenderer } from './BarcodeRenderer';

interface ThermalReceiptPreviewProps {
  receipt: ReceiptData;
  onChange?: (updatedReceipt: ReceiptData) => void;
  onOpenBluetoothModal: () => void;
}

export const ThermalReceiptPreview: React.FC<ThermalReceiptPreviewProps> = ({
  receipt,
  onChange,
  onOpenBluetoothModal,
}) => {
  const [paperWidth, setPaperWidth] = useState<58 | 80>(58);
  const [viewMode, setViewMode] = useState<'paper' | 'text'>('paper');
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [showBarcode, setShowBarcode] = useState(true);
  const [showQrCode, setShowQrCode] = useState(true);
  const [invertHeader, setInvertHeader] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloadingImg, setDownloadingImg] = useState(false);

  const receiptPaperRef = useRef<HTMLDivElement>(null);

  const thermalText = formatReceiptToThermalText(receipt, paperWidth === 58 ? 32 : 48);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(thermalText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = thermalText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadImage = async () => {
    if (!receiptPaperRef.current) return;
    setDownloadingImg(true);

    try {
      const element = receiptPaperRef.current;
      // We can use a canvas to draw the formatted thermal receipt
      const canvas = document.createElement('canvas');
      const scale = 2; // high resolution
      const width = paperWidth === 58 ? 384 : 576;
      const height = Math.max(element.scrollHeight * scale, 600);
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        // Draw crisp receipt paper background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Draw thermal text line by line
        ctx.fillStyle = '#0f172a';
        ctx.font = `bold ${14 * scale}px 'Chivo Mono', 'Courier New', monospace`;
        ctx.textBaseline = 'top';

        const lines = thermalText.split('\n');
        let currentY = 24 * scale;
        const lineHeight = 18 * scale;

        for (const line of lines) {
          ctx.fillText(line, 20 * scale, currentY);
          currentY += lineHeight;
        }

        // Adjust canvas height to actual content
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = width;
        finalCanvas.height = currentY + 30 * scale;
        const finalCtx = finalCanvas.getContext('2d');
        if (finalCtx) {
          finalCtx.drawImage(canvas, 0, 0);
          const dataUrl = finalCanvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = `struk-${receipt.transaction.invoiceNumber || 'thermal'}.png`;
          link.href = dataUrl;
          link.click();
        }
      }
    } catch (e) {
      console.error('Failed to generate image', e);
    } finally {
      setDownloadingImg(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/60 rounded-2xl border border-slate-800 p-4 lg:p-6 shadow-xl backdrop-blur-md">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 flex items-center gap-2">
              Pratinjau Struk Thermal
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-mono font-medium border border-emerald-500/30">
                {paperWidth}mm ({paperWidth === 58 ? '32 Col' : '48 Col'})
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Format siap cetak printer kasir Bluetooth (ESC/POS)
            </p>
          </div>
        </div>

        {/* Paper width & View switches */}
        <div className="flex items-center gap-2">
          {/* 58mm / 80mm toggle */}
          <div className="inline-flex p-1 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs font-medium">
            <button
              onClick={() => setPaperWidth(58)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                paperWidth === 58
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              58 mm
            </button>
            <button
              onClick={() => setPaperWidth(80)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                paperWidth === 80
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              80 mm
            </button>
          </div>

          {/* Paper vs Text view */}
          <div className="inline-flex p-1 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs font-medium">
            <button
              onClick={() => setViewMode('paper')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'paper'
                  ? 'bg-slate-700 text-slate-100 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Visual Struk
            </button>
            <button
              onClick={() => setViewMode('text')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'text'
                  ? 'bg-slate-700 text-slate-100 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Teks ESC/POS
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Customization Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 py-3 px-1 text-xs text-slate-300">
        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={invertHeader}
              onChange={(e) => setInvertHeader(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
            />
            <span>Banner Header Hitam</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showBarcode}
              onChange={(e) => setShowBarcode(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
            />
            <span>Barcode</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showQrCode}
              onChange={(e) => setShowQrCode(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0"
            />
            <span>QR Verifikasi</span>
          </label>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">Ukuran Teks:</span>
          <button
            onClick={() => setFontSize('sm')}
            className={`px-2 py-1 rounded text-[11px] ${
              fontSize === 'sm' ? 'bg-slate-700 text-emerald-400 font-bold' : 'text-slate-400'
            }`}
          >
            A-
          </button>
          <button
            onClick={() => setFontSize('base')}
            className={`px-2 py-1 rounded text-[11px] ${
              fontSize === 'base' ? 'bg-slate-700 text-emerald-400 font-bold' : 'text-slate-400'
            }`}
          >
            Standar
          </button>
          <button
            onClick={() => setFontSize('lg')}
            className={`px-2 py-1 rounded text-[11px] ${
              fontSize === 'lg' ? 'bg-slate-700 text-emerald-400 font-bold' : 'text-slate-400'
            }`}
          >
            A+
          </button>
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="flex-1 overflow-y-auto py-4 px-2 flex justify-center items-start min-h-[460px]">
        {viewMode === 'paper' ? (
          /* Realistic Thermal Receipt Paper */
          <div
            ref={receiptPaperRef}
            id="printable-thermal-receipt"
            style={{
              width: paperWidth === 58 ? '340px' : '440px',
            }}
            className={`relative bg-[#fcfdfa] text-zinc-900 shadow-2xl transition-all duration-300 font-mono select-text print:w-full print:shadow-none print:m-0 print:p-0 ${
              fontSize === 'sm' ? 'text-[11px]' : fontSize === 'lg' ? 'text-[14px]' : 'text-[12.5px]'
            }`}
          >
            {/* Serrated Top Edge (Paper Tear Effect) */}
            <div className="w-full h-3 bg-[#fcfdfa] [mask-image:radial-gradient(circle_at_bottom,transparent_4px,#000_4px)] [mask-size:12px_12px] [mask-repeat:repeat-x] -mt-1.5 opacity-90 print:hidden" />

            <div className="p-5 space-y-3">
              {/* Header / Merchant */}
              {invertHeader ? (
                <div className="bg-zinc-950 text-white p-3 text-center rounded -mx-2 mb-2">
                  {receipt.merchant.showLogo !== false && receipt.merchant.logoUrl && (
                    <div className="flex justify-center mb-1.5">
                      <div className="bg-white p-1 rounded">
                        <img
                          src={receipt.merchant.logoUrl}
                          alt="Logo Toko"
                          className="max-h-12 max-w-[100px] object-contain filter grayscale contrast-150"
                        />
                      </div>
                    </div>
                  )}
                  <h2 className="font-bold text-base tracking-wider uppercase">
                    {receipt.merchant.name || 'NAMA TOKO'}
                  </h2>
                  {receipt.merchant.branch && (
                    <div className="flex items-center justify-center gap-1 group/branch">
                      <p className="text-[11px] text-zinc-300 font-medium">{receipt.merchant.branch}</p>
                      {onChange && (
                        <button
                          type="button"
                          onClick={() =>
                            onChange({
                              ...receipt,
                              merchant: { ...receipt.merchant, branch: '' },
                            })
                          }
                          className="opacity-0 group-hover/branch:opacity-100 p-0.5 rounded text-zinc-400 hover:text-red-400 transition-opacity print:hidden"
                          title="Hapus baris di atas alamat ini"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center space-y-1">
                  {receipt.merchant.showLogo !== false && receipt.merchant.logoUrl ? (
                    <div className="flex justify-center mb-1.5">
                      <img
                        src={receipt.merchant.logoUrl}
                        alt="Logo Toko"
                        className="max-h-14 max-w-[120px] object-contain filter grayscale contrast-150"
                      />
                    </div>
                  ) : (
                    <div className="inline-flex items-center justify-center p-1.5 rounded-full bg-zinc-100 text-zinc-800 mb-1">
                      <Store className="w-5 h-5" />
                    </div>
                  )}
                  <h2 className="font-bold text-base tracking-wider uppercase text-zinc-950">
                    {receipt.merchant.name || 'NAMA TOKO'}
                  </h2>
                  {receipt.merchant.branch && (
                    <div className="flex items-center justify-center gap-1 group/branch">
                      <p className="text-[11px] text-zinc-700 font-medium">{receipt.merchant.branch}</p>
                      {onChange && (
                        <button
                          type="button"
                          onClick={() =>
                            onChange({
                              ...receipt,
                              merchant: { ...receipt.merchant, branch: '' },
                            })
                          }
                          className="opacity-0 group-hover/branch:opacity-100 p-0.5 rounded text-zinc-400 hover:text-red-600 hover:bg-zinc-200 transition-all print:hidden"
                          title="Hapus baris di atas alamat ini"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Address & Phone */}
              {(receipt.merchant.address || receipt.merchant.phone || receipt.merchant.websiteOrTaxId) && (
                <div className="text-center text-[11px] text-zinc-600 leading-tight space-y-0.5">
                  {receipt.merchant.address && <p>{receipt.merchant.address}</p>}
                  {receipt.merchant.phone && <p>Telp: {receipt.merchant.phone}</p>}
                  {receipt.merchant.websiteOrTaxId && (
                    <p className="text-[10px] text-zinc-500">{receipt.merchant.websiteOrTaxId}</p>
                  )}
                </div>
              )}

              {/* Dotted Separator */}
              <div className="border-b border-dashed border-zinc-400 my-2" />

              {/* Transaction Metadata */}
              <div className="text-[11px] text-zinc-700 space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-500">No. Struk</span>
                  <span className="font-semibold">{receipt.transaction.invoiceNumber || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Tanggal/Waktu</span>
                  <span>
                    {receipt.transaction.date} {receipt.transaction.time}
                  </span>
                </div>
                {receipt.transaction.cashier && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Kasir</span>
                    <span>{receipt.transaction.cashier}</span>
                  </div>
                )}
                {receipt.transaction.queueOrTable && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Meja/Antrian</span>
                    <span>{receipt.transaction.queueOrTable}</span>
                  </div>
                )}
              </div>

              {/* Bank Transfer Badge if applicable */}
              {receipt.documentType === 'bank_transfer' && receipt.transferDetails && (
                <div className="my-2 p-2 bg-emerald-50 rounded border border-emerald-200 text-xs">
                  <div className="font-bold text-emerald-800 text-center uppercase tracking-wider mb-1">
                    BUKTI TRANSFER {receipt.transferDetails.transferStatus || 'BERHASIL'}
                  </div>
                  <div className="space-y-1 text-[11px]">
                    {receipt.transferDetails.sourceBankOrWallet && (
                      <div className="flex justify-between">
                        <span className="text-zinc-600">Dari:</span>
                        <span className="font-medium">{receipt.transferDetails.sourceBankOrWallet} - {receipt.transferDetails.senderName}</span>
                      </div>
                    )}
                    {receipt.transferDetails.targetBankOrWallet && (
                      <div className="flex justify-between">
                        <span className="text-zinc-600">Ke:</span>
                        <span className="font-medium">{receipt.transferDetails.targetBankOrWallet} - {receipt.transferDetails.recipientName}</span>
                      </div>
                    )}
                    {receipt.transferDetails.recipientAccount && (
                      <div className="flex justify-between">
                        <span className="text-zinc-600">No. Rekening:</span>
                        <span className="font-mono">{receipt.transferDetails.recipientAccount}</span>
                      </div>
                    )}
                    {receipt.transferDetails.referenceNumber && (
                      <div className="flex justify-between">
                        <span className="text-zinc-600">Ref ID:</span>
                        <span className="font-mono">{receipt.transferDetails.referenceNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Extra Fields Section */}
              {receipt.extraFields && receipt.extraFields.length > 0 && (
                <div className="text-[11px] text-zinc-700 space-y-1 py-1 border-t border-dashed border-zinc-300">
                  {receipt.extraFields.map((field, idx) => (
                    <div key={idx} className="flex justify-between items-start gap-2">
                      <span className="text-zinc-500 shrink-0">{field.label}:</span>
                      <span className="font-semibold text-right break-words">{field.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Solid Double Line */}
              <div className="border-b-2 border-zinc-900 my-2" />

              {/* Items List */}
              <div className="space-y-2 py-1">
                {receipt.items && receipt.items.length > 0 ? (
                  receipt.items.map((item, idx) => (
                    <div key={item.id || idx} className="space-y-0.5">
                      <div className="font-semibold text-zinc-900 uppercase">
                        {item.name}
                      </div>
                      <div className="flex justify-between text-zinc-700 text-[11.5px]">
                        <span>
                          {item.quantity} x {formatCurrency(item.unitPrice, false)}
                        </span>
                        <span className="font-medium">{formatCurrency(item.subtotal, false)}</span>
                      </div>
                      {item.discount > 0 && (
                        <div className="flex justify-between text-[11px] text-red-600">
                          <span>(Diskon)</span>
                          <span>-{formatCurrency(item.discount, false)}</span>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-center text-zinc-500 py-2">(Belum ada item barang)</p>
                )}
              </div>

              {/* Dotted Separator */}
              <div className="border-b border-dashed border-zinc-400 my-2" />

              {/* Financials Breakdown */}
              <div className="space-y-1 text-zinc-800 text-[11.5px]">
                {receipt.financials.subtotal !== undefined &&
                  receipt.financials.subtotal !== receipt.financials.grandTotal && (
                    <div className="flex justify-between">
                      <span className="text-zinc-600">Subtotal</span>
                      <span>{formatCurrency(receipt.financials.subtotal, false)}</span>
                    </div>
                  )}

                {receipt.financials.discount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Total Diskon</span>
                    <span>-{formatCurrency(receipt.financials.discount, false)}</span>
                  </div>
                )}

                {receipt.financials.taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-zinc-600">
                      PPN {receipt.financials.taxPercent ? `(${receipt.financials.taxPercent}%)` : ''}
                    </span>
                    <span>{formatCurrency(receipt.financials.taxAmount, false)}</span>
                  </div>
                )}

                {receipt.financials.serviceCharge > 0 && (
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Service Charge</span>
                    <span>{formatCurrency(receipt.financials.serviceCharge, false)}</span>
                  </div>
                )}

                {receipt.financials.rounding !== 0 && (
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Pembulatan</span>
                    <span>{formatCurrency(receipt.financials.rounding, false)}</span>
                  </div>
                )}

                {/* Grand Total */}
                <div className="flex justify-between items-baseline pt-1.5 border-t border-zinc-900 font-bold text-sm text-zinc-950">
                  <span>TOTAL</span>
                  <span className="text-base">{formatCurrency(receipt.financials.grandTotal, true)}</span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="border-t border-dashed border-zinc-400 pt-2 space-y-1 text-[11.5px] text-zinc-700">
                <div className="flex justify-between">
                  <span>Bayar ({receipt.payment.method || 'TUNAI'})</span>
                  <span>{formatCurrency(receipt.payment.amountPaid || receipt.financials.grandTotal, false)}</span>
                </div>
                {receipt.payment.change > 0 && (
                  <div className="flex justify-between font-medium text-zinc-900">
                    <span>Kembalian</span>
                    <span>{formatCurrency(receipt.payment.change, false)}</span>
                  </div>
                )}
                {receipt.payment.approvalCode && (
                  <div className="flex justify-between text-[10px] text-zinc-500">
                    <span>Appr Code</span>
                    <span>{receipt.payment.approvalCode}</span>
                  </div>
                )}
              </div>

              {/* Footer / QR / Barcode */}
              <div className="border-t border-zinc-900 pt-3 text-center space-y-3">
                {receipt.footer.notes && (
                  <p className="text-[11px] text-zinc-700 leading-tight">
                    {receipt.footer.notes}
                  </p>
                )}
                {receipt.footer.policy && (
                  <p className="text-[10px] text-zinc-500 leading-tight">
                    {receipt.footer.policy}
                  </p>
                )}

                {/* QR Code and Barcode */}
                <div className="flex flex-col items-center justify-center gap-2 pt-1">
                  {showQrCode && (
                    <div className="flex flex-col items-center">
                      <QrCodeRenderer
                        value={receipt.transaction.invoiceNumber || receipt.footer.barcodeValue || 'STRUK-VERIFIED'}
                        size={84}
                      />
                      <span className="text-[9px] text-zinc-500 mt-1">Pindai untuk verifikasi struk</span>
                    </div>
                  )}

                  {showBarcode && (
                    <BarcodeRenderer
                      value={receipt.footer.barcodeValue || receipt.transaction.invoiceNumber || '899120938472'}
                    />
                  )}
                </div>

                <div className="text-[10px] font-bold text-zinc-400 tracking-wider">
                  *** STRUK RESMI TERCETAK ***
                </div>
              </div>
            </div>

            {/* Serrated Bottom Edge (Paper Tear Effect) */}
            <div className="w-full h-3 bg-[#fcfdfa] [mask-image:radial-gradient(circle_at_top,transparent_4px,#000_4px)] [mask-size:12px_12px] [mask-repeat:repeat-x] -mb-1.5 opacity-90 print:hidden" />
          </div>
        ) : (
          /* Pure ESC/POS Monospace Text View */
          <div className="w-full max-w-xl bg-slate-950 rounded-xl p-4 border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto shadow-inner">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] text-slate-400">
              <span>Grid Kolom ({paperWidth === 58 ? '32 Karakter' : '48 Karakter'})</span>
              <span className="text-emerald-500 font-semibold">Siap dikirim ke Buffer ESC/POS</span>
            </div>
            <pre className="whitespace-pre leading-relaxed select-all">
              {thermalText}
            </pre>
          </div>
        )}
      </div>

      {/* Action Footer Buttons */}
      <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleCopyText}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all shadow-sm active:scale-95"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Tersalin!' : 'Salin Teks Struk'}</span>
          </button>

          <button
            onClick={handleDownloadImage}
            disabled={downloadingImg}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{downloadingImg ? 'Membuat Gambar...' : 'Unduh Gambar (PNG)'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenBluetoothModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-md active:scale-95"
          >
            <Bluetooth className="w-4 h-4" />
            <span>Koneksi Bluetooth Printer</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-md active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Langsung</span>
          </button>
        </div>
      </div>
    </div>
  );
};
