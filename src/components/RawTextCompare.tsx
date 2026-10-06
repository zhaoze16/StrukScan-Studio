import React, { useState, useEffect } from 'react';
import {
  Copy,
  Check,
  FileCode,
  CheckCircle2,
  Plus,
  Trash2,
  ArrowRightLeft,
  GripVertical,
  RefreshCw,
  Edit3,
  ExternalLink,
  Store,
  Receipt,
} from 'lucide-react';
import { ReceiptData, ReceiptItem } from '../types/receipt';
import { parseReceiptText } from '../utils/textParser';
import { formatCurrency } from '../utils/thermalFormatter';

// --- SUB-COMPONENT 1: RAW OCR PANEL ---
interface RawOcrPanelProps {
  receipt: ReceiptData;
  onChange?: (updated: ReceiptData) => void;
}

export const RawOcrPanel: React.FC<RawOcrPanelProps> = ({ receipt, onChange }) => {
  const [copied, setCopied] = useState(false);
  const [editableRawText, setEditableRawText] = useState(
    receipt.rawExtractedText || 'Tidak ada data teks mentah.'
  );
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setEditableRawText(receipt.rawExtractedText || 'Tidak ada data teks mentah.');
  }, [receipt.rawExtractedText, receipt.id]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editableRawText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleReExtract = () => {
    const parsed = parseReceiptText(editableRawText);
    if (onChange) {
      const updated: ReceiptData = {
        ...receipt,
        documentType: parsed.documentType || receipt.documentType,
        transaction: {
          ...receipt.transaction,
          ...(parsed.transaction || {}),
        },
        transferDetails: parsed.transferDetails !== undefined ? parsed.transferDetails : receipt.transferDetails,
        extraFields: parsed.extraFields || [],
        items: parsed.items || receipt.items,
        financials: {
          ...receipt.financials,
          ...(parsed.financials || {}),
        },
        payment: {
          ...receipt.payment,
          ...(parsed.payment || {}),
        },
        rawExtractedText: editableRawText,
      };
      onChange(updated);
      setToast('Data berhasil diekstrak ulang dari teks mentah! 🔄');
      setTimeout(() => setToast(null), 2500);
    }
  };

  return (
    <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4 lg:p-5 shadow-xl backdrop-blur-md space-y-3.5">
      {toast && (
        <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-xs text-slate-200">Hasil Pindai Mentah (Raw OCR)</span>
        </div>

        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium border border-slate-700/60 transition-all active:scale-95"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Tersalin' : 'Salin'}</span>
        </button>
      </div>

      <div className="space-y-3">
        <textarea
          rows={11}
          value={editableRawText}
          onChange={(e) => setEditableRawText(e.target.value)}
          placeholder="Hasil teks mentah OCR..."
          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-slate-200 focus:outline-none focus:border-emerald-500 leading-relaxed resize-y"
        />

        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-slate-500">
            Edit teks jika salah huruf/angka, lalu:
          </span>
          <button
            type="button"
            onClick={handleReExtract}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-sm transition-all active:scale-95 shrink-0"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Ekstrak Ulang</span>
          </button>
        </div>
      </div>
    </div>
  );
};


// --- SUB-COMPONENT 2: CLEAN STRUCTURED PANEL ---
interface CleanStructuredPanelProps {
  receipt: ReceiptData;
  onChange?: (updated: ReceiptData) => void;
}

export const CleanStructuredPanel: React.FC<CleanStructuredPanelProps> = ({ receipt, onChange }) => {
  const [draggedExtraFieldIdx, setDraggedExtraFieldIdx] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleTransactionChange = (field: string, value: string) => {
    if (!onChange) return;
    onChange({
      ...receipt,
      transaction: {
        ...receipt.transaction,
        [field]: value,
      },
    });
  };

  const handlePaymentMethodChange = (method: string) => {
    if (!onChange) return;
    onChange({
      ...receipt,
      payment: {
        ...receipt.payment,
        method,
      },
    });
  };

  const handleGrandTotalChange = (amount: number) => {
    if (!onChange) return;
    onChange({
      ...receipt,
      financials: {
        ...receipt.financials,
        grandTotal: amount,
        subtotal: amount,
      },
      payment: {
        ...receipt.payment,
        amountPaid: amount,
      },
    });
  };

  const handleDragExtraFieldStart = (e: React.DragEvent, index: number) => {
    setDraggedExtraFieldIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragExtraFieldOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropExtraField = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedExtraFieldIdx === null || draggedExtraFieldIdx === targetIndex) return;
    if (!onChange) return;

    const fields = [...(receipt.extraFields || [])];
    const [draggedItem] = fields.splice(draggedExtraFieldIdx, 1);
    fields.splice(targetIndex, 0, draggedItem);

    setDraggedExtraFieldIdx(null);
    onChange({ ...receipt, extraFields: fields });
    showToast('Urutan baris info berhasil dipindahkan! ↕️');
  };

  const handleExtraFieldChange = (index: number, field: 'label' | 'value', val: string) => {
    if (!onChange) return;
    const newFields = [...(receipt.extraFields || [])];
    newFields[index] = { ...newFields[index], [field]: val };
    onChange({ ...receipt, extraFields: newFields });
  };

  const handleSwapExtraField = (index: number) => {
    if (!onChange) return;
    const newFields = [...(receipt.extraFields || [])];
    const current = newFields[index];
    newFields[index] = { label: current.value, value: current.label };
    onChange({ ...receipt, extraFields: newFields });
  };

  const handleDeleteExtraField = (index: number) => {
    if (!onChange) return;
    const newFields = (receipt.extraFields || []).filter((_, i) => i !== index);
    onChange({ ...receipt, extraFields: newFields });
  };

  const handleAddExtraField = () => {
    if (!onChange) return;
    const newFields = [...(receipt.extraFields || []), { label: 'Keterangan', value: '' }];
    onChange({ ...receipt, extraFields: newFields });
  };

  const handleItemChange = (index: number, field: keyof ReceiptItem, val: any) => {
    if (!onChange) return;
    const items = [...(receipt.items || [])];
    const item = { ...items[index], [field]: val };
    if (field === 'quantity' || field === 'unitPrice' || field === 'discount') {
      const q = Number(field === 'quantity' ? val : item.quantity) || 1;
      const p = Number(field === 'unitPrice' ? val : item.unitPrice) || 0;
      const d = Number(field === 'discount' ? val : item.discount) || 0;
      item.subtotal = Math.max(0, q * p - d);
    }
    items[index] = item;
    const subtotal = items.reduce((sum, it) => sum + (it.subtotal || 0), 0);
    onChange({
      ...receipt,
      items,
      financials: {
        ...receipt.financials,
        subtotal,
        grandTotal: subtotal,
      },
    });
  };

  const handleDeleteItem = (index: number) => {
    if (!onChange) return;
    const items = (receipt.items || []).filter((_, i) => i !== index);
    const subtotal = items.reduce((sum, it) => sum + (it.subtotal || 0), 0);
    onChange({
      ...receipt,
      items,
      financials: {
        ...receipt.financials,
        subtotal,
        grandTotal: subtotal,
      },
    });
  };

  const handleAddItem = () => {
    if (!onChange) return;
    const newItem: ReceiptItem = {
      id: `item-${Date.now()}`,
      name: 'ITEM TRANSAKSI BARU',
      quantity: 1,
      unitPrice: 10000,
      discount: 0,
      subtotal: 10000,
    };
    const items = [...(receipt.items || []), newItem];
    const subtotal = items.reduce((sum, it) => sum + (it.subtotal || 0), 0);
    onChange({
      ...receipt,
      items,
      financials: {
        ...receipt.financials,
        subtotal,
        grandTotal: subtotal,
      },
    });
  };

  return (
    <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4 lg:p-5 shadow-xl backdrop-blur-md space-y-4">
      {toast && (
        <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Edit3 className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-xs text-slate-200">Hasil Ekstraksi Bersih & Terstruktur (Edit Manual Di Sini)</span>
        </div>
        <span className="text-[10px] text-emerald-400 font-mono">Real-time Sync</span>
      </div>

      <div className="space-y-4">
        {/* Identitas Toko / Merchant */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-emerald-400" />
              Identitas Toko / Merchant
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30">
              Sesuai Profil Toko
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-slate-500 block mb-0.5">Nama Toko:</label>
              <p className="font-bold text-slate-100 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800/60">
                {receipt.merchant.name || 'TOKO SAYA'}
              </p>
            </div>
            <div>
              <label className="text-[9px] text-slate-500 block mb-0.5">Kasir / Operator:</label>
              <input
                type="text"
                value={receipt.transaction.cashier || ''}
                onChange={(e) => handleTransactionChange('cashier', e.target.value)}
                placeholder="Nama Kasir"
                className="w-full bg-slate-900 border border-slate-800/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Detail Transaksi */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2 text-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Detail Transaksi</span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="text-[9px] text-slate-400 block mb-0.5">No. Faktur / Ref:</label>
              <input
                type="text"
                value={receipt.transaction.invoiceNumber || ''}
                onChange={(e) => handleTransactionChange('invoiceNumber', e.target.value)}
                placeholder="No. Faktur"
                className="w-full bg-slate-900 border border-slate-800/60 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-[9px] text-slate-400 block mb-0.5">Tanggal:</label>
              <input
                type="text"
                value={receipt.transaction.date || ''}
                onChange={(e) => handleTransactionChange('date', e.target.value)}
                placeholder="DD/MM/YYYY"
                className="w-full bg-slate-900 border border-slate-800/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-[9px] text-slate-400 block mb-0.5">Waktu:</label>
              <input
                type="text"
                value={receipt.transaction.time || ''}
                onChange={(e) => handleTransactionChange('time', e.target.value)}
                placeholder="HH:mm:ss"
                className="w-full bg-slate-900 border border-slate-800/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
          <div>
            <label className="text-[9px] text-slate-400 block mb-0.5">Metode Pembayaran:</label>
            <input
              type="text"
              value={receipt.payment.method || ''}
              onChange={(e) => handlePaymentMethodChange(e.target.value)}
              placeholder="Mis: QRIS / TUNAI"
              className="w-full bg-slate-900 border border-slate-800/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Info Tambahan / Metadata with Drag & Drop */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Info Tambahan / Metadata ({receipt.extraFields?.length || 0})
              </span>
              <span className="text-[9px] text-slate-500">
                Tarik ⠿ untuk memindahkan urutan baris
              </span>
            </div>
            <button
              type="button"
              onClick={handleAddExtraField}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all active:scale-95"
            >
              <Plus className="w-3 h-3" />
              <span>Tambah</span>
            </button>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto no-scrollbar">
            {receipt.extraFields && receipt.extraFields.length > 0 ? (
              receipt.extraFields.map((field, idx) => (
                <div
                  key={idx}
                  draggable
                  onDragStart={(e) => handleDragExtraFieldStart(e, idx)}
                  onDragOver={handleDragExtraFieldOver}
                  onDrop={(e) => handleDropExtraField(e, idx)}
                  className={`flex items-center gap-1.5 p-1.5 rounded-lg border transition-all ${
                    draggedExtraFieldIdx === idx
                      ? 'bg-emerald-950/40 border-emerald-500/60 opacity-60'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="cursor-grab active:cursor-grabbing p-1 text-slate-500 hover:text-emerald-400 shrink-0">
                    <GripVertical className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] font-mono text-slate-500 w-3 text-center shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => handleExtraFieldChange(idx, 'label', e.target.value)}
                    placeholder="Label"
                    className="w-1/3 bg-slate-950 border border-slate-800/80 rounded-lg px-2 py-1 text-xs text-slate-300 font-medium focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleSwapExtraField(idx)}
                    className="p-1 rounded-lg text-blue-400 hover:bg-blue-500/10 shrink-0"
                    title="Tukar Label ⇄ Nilai"
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                  </button>
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) => handleExtraFieldChange(idx, 'value', e.target.value)}
                    placeholder="Nilai data..."
                    className="flex-1 bg-slate-950 border border-slate-800/80 rounded-lg px-2 py-1 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteExtraField(idx)}
                    className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            ) : (
              <div className="p-3 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                Belum ada baris info tambahan.
              </div>
            )}
          </div>
        </div>

        {/* Item Belanja */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Rincian Item Belanja ({receipt.items?.length || 0})</span>
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all active:scale-95"
            >
              <Plus className="w-3 h-3" />
              <span>Tambah</span>
            </button>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto no-scrollbar">
            {receipt.items && receipt.items.length > 0 ? (
              receipt.items.map((it, idx) => (
                <div key={it.id || idx} className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-900/60 border border-slate-800">
                  <input
                    type="text"
                    value={it.name}
                    onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                    placeholder="Nama Item..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-100 uppercase font-medium focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      min="1"
                      value={it.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value) || 1)}
                      className="w-10 bg-slate-950 border border-slate-800 rounded-lg px-1 py-1 text-xs text-slate-200 font-mono text-center"
                    />
                    <span className="text-slate-500 text-[10px]">x</span>
                    <input
                      type="number"
                      min="0"
                      value={it.unitPrice}
                      onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value) || 0)}
                      className="w-20 bg-slate-950 border border-slate-800 rounded-lg px-1.5 py-1 text-xs text-slate-200 font-mono text-right"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(idx)}
                      className="p-1 text-slate-500 hover:text-red-400 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-3 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                Tidak ada item belanja.
              </div>
            )}
          </div>
        </div>

        {/* Grand Total */}
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-bold text-slate-100 block">TOTAL BELANJA</span>
            <span className="text-[9px] text-emerald-400">Nominal wajib bayar</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-emerald-400">Rp</span>
            <input
              type="number"
              min="0"
              value={receipt.financials.grandTotal || 0}
              onChange={(e) => handleGrandTotalChange(Number(e.target.value) || 0)}
              className="w-28 bg-slate-950 border border-emerald-500/40 rounded-xl px-2.5 py-1 text-right font-mono font-bold text-xs text-emerald-300 focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};


// --- WRAPPER (BACKWARD COMPATIBILITY) ---
interface RawTextCompareProps {
  receipt: ReceiptData;
  onChange?: (updated: ReceiptData) => void;
  onNavigateToEditor?: () => void;
}

export const RawTextCompare: React.FC<RawTextCompareProps> = ({
  receipt,
  onChange,
  onNavigateToEditor,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div className="lg:col-span-5">
        <RawOcrPanel receipt={receipt} onChange={onChange} />
      </div>
      <div className="lg:col-span-7">
        <CleanStructuredPanel receipt={receipt} onChange={onChange} />
      </div>
    </div>
  );
};
