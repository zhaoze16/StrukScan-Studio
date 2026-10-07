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
  Save,
  Sparkles,
  AlignLeft,
  AlignCenter,
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


// --- METADATA TEMPLATE SYSTEM & INTELLIGENT MATCHING ---
interface MetadataTemplate {
  id: string;
  name: string;
  fields: { label: string; value: string; align?: 'split' | 'center' }[];
  isDefault?: boolean;
}

const DEFAULT_METADATA_TEMPLATES: MetadataTemplate[] = [];

const matchValueForLabel = (label: string, currentReceipt: ReceiptData): string => {
  const normLabel = label.toLowerCase().trim();
  
  // 1. Look in existing extraFields first
  if (currentReceipt.extraFields) {
    const existing = currentReceipt.extraFields.find(f => 
      f.label.toLowerCase().trim() === normLabel
    );
    if (existing && existing.value) return existing.value;
  }

  // 2. Look in common fields of ReceiptData
  if (normLabel.includes('invoice') || normLabel.includes('nomor') || normLabel.includes('no') || normLabel.includes('ref') || normLabel.includes('kode')) {
    if (currentReceipt.transaction.invoiceNumber) return currentReceipt.transaction.invoiceNumber;
  }
  if (normLabel.includes('kasir') || normLabel.includes('cashier')) {
    if (currentReceipt.transaction.cashier) return currentReceipt.transaction.cashier;
  }
  if (normLabel.includes('meja') || normLabel.includes('antrian') || normLabel.includes('table') || normLabel.includes('queue')) {
    if (currentReceipt.transaction.queueOrTable) return currentReceipt.transaction.queueOrTable;
  }
  
  // 3. Look in transferDetails
  if (currentReceipt.transferDetails) {
    const td = currentReceipt.transferDetails;
    if (normLabel.includes('bank asal') || normLabel.includes('pengirim') || normLabel.includes('asal')) {
      if (td.sourceBankOrWallet) return td.sourceBankOrWallet;
      if (td.senderName) return td.senderName;
    }
    if (normLabel.includes('bank tujuan') || normLabel.includes('penerima') || normLabel.includes('tujuan')) {
      if (td.targetBankOrWallet) return td.targetBankOrWallet;
      if (td.recipientName) return td.recipientName;
    }
    if (normLabel.includes('rekening') || normLabel.includes('account')) {
      if (td.recipientAccount) return td.recipientAccount;
    }
    if (normLabel.includes('status')) {
      if (td.transferStatus) return td.transferStatus;
    }
    if (normLabel.includes('ref') || normLabel.includes('referensi')) {
      if (td.referenceNumber) return td.referenceNumber;
    }
  }

  // 4. Try parsing from raw text if possible
  if (currentReceipt.rawExtractedText) {
    const lines = currentReceipt.rawExtractedText.split('\n');
    for (const line of lines) {
      if (line.toLowerCase().includes(normLabel)) {
        // Try to split on colon, equals or pipe
        const parts = line.split(/[:|=]/);
        if (parts.length > 1) {
          const val = parts.slice(1).join(':').trim();
          if (val && val.length < 50) {
            return val;
          }
        }
      }
    }
  }

  return '';
};


// --- SUB-COMPONENT 2: CLEAN STRUCTURED PANEL ---
interface CleanStructuredPanelProps {
  receipt: ReceiptData;
  onChange?: (updated: ReceiptData) => void;
}

export const CleanStructuredPanel: React.FC<CleanStructuredPanelProps> = ({ receipt, onChange }) => {
  const [draggedExtraFieldIdx, setDraggedExtraFieldIdx] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  
  // Custom Metadata Templates state
  const [customTemplates, setCustomTemplates] = useState<MetadataTemplate[]>(() => {
    try {
      const stored = localStorage.getItem('strukscan_metadata_templates_v1');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  const saveCustomTemplates = (templates: MetadataTemplate[]) => {
    setCustomTemplates(templates);
    localStorage.setItem('strukscan_metadata_templates_v1', JSON.stringify(templates));
  };

  const handleApplyTemplate = (templateId: string) => {
    if (!onChange) return;
    setSelectedTemplateId(templateId);
    
    const allTemplates = [...DEFAULT_METADATA_TEMPLATES, ...customTemplates];
    const found = allTemplates.find((t) => t.id === templateId);
    if (!found) return;

    // Apply template fields
    // Match values intelligently from current receipt data or OCR text, but KEEP all labels as-is (data kiri tetap)
    const matchedFields = found.fields.map((f) => {
      const matchedValue = matchValueForLabel(f.label, receipt);
      return {
        label: f.label,
        value: matchedValue || '', // even if unmatched, show empty instead of omitting it (tetap tampilkan!)
        align: f.align || 'split',
      };
    });

    onChange({
      ...receipt,
      extraFields: matchedFields,
    });

    showToast(`Berhasil menerapkan template: ${found.name}! ✨`);
  };

  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [templateError, setTemplateError] = useState<string | null>(null);

  const handleSaveAsTemplate = () => {
    const fields = receipt.extraFields || [];
    if (fields.length === 0) {
      showToast('⚠️ Tambahkan setidaknya satu baris info tambahan terlebih dahulu!');
      return;
    }
    setTemplateError(null);
    setIsSavingTemplate(true);
    setNewTemplateName('');
  };

  const handleConfirmSaveTemplate = () => {
    const trimmed = newTemplateName.trim();
    if (!trimmed) {
      setTemplateError('Nama template tidak boleh kosong!');
      return;
    }
    const fields = receipt.extraFields || [];
    const newTemplate: MetadataTemplate = {
      id: 'custom_' + Date.now(),
      name: trimmed,
      fields: fields.map(f => ({
        label: f.label,
        value: f.value,
        align: f.align || 'split'
      }))
    };

    const updated = [...customTemplates, newTemplate];
    saveCustomTemplates(updated);
    setSelectedTemplateId(newTemplate.id);
    setIsSavingTemplate(false);
    setNewTemplateName('');
    showToast(`Template "${trimmed}" berhasil disimpan! 💾`);
  };

  const handleDeleteCustomTemplate = () => {
    if (!selectedTemplateId) {
      showToast('⚠️ Silakan pilih template yang ingin dihapus.');
      return;
    }
    const updated = customTemplates.filter(t => t.id !== selectedTemplateId);
    saveCustomTemplates(updated);
    setSelectedTemplateId('');
    showToast('Template kustom berhasil dihapus! 🗑️');
  };

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

  const handleExtraFieldChange = (index: number, field: 'label' | 'value' | 'align', val: any) => {
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

        {/* Info Tambahan / Metadata with Drag & Drop & Templates */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3 text-xs shadow-md">
          {/* Metadata Templates Selector Block */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Pilih / Simpan Template Metadata</span>
              </span>
              <span className="text-[9px] text-slate-500 font-normal">Satu Klik Menyesuaikan Struk</span>
            </div>
            
            {isSavingTemplate ? (
              <div className="p-2.5 bg-slate-950 border border-emerald-500/30 rounded-xl space-y-2 text-xs">
                <div className="font-semibold text-emerald-400 text-[10px] uppercase">Beri Nama Template Baru:</div>
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => {
                    setNewTemplateName(e.target.value);
                    setTemplateError(null);
                  }}
                  placeholder="Mis: Struk PLN Pasca, SPBU Shell..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
                {templateError && (
                  <div className="text-[10px] text-red-400 font-medium">{templateError}</div>
                )}
                <div className="flex gap-1.5 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSavingTemplate(false);
                      setNewTemplateName('');
                      setTemplateError(null);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSaveTemplate}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold transition-all"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => handleApplyTemplate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="" disabled>-- Pilih Template Metadata --</option>
                    {customTemplates.length > 0 ? (
                      <optgroup label="Template Kustom Anda">
                        {customTemplates.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </optgroup>
                    ) : (
                      <option value="" disabled>Belum ada template kustom</option>
                    )}
                  </select>
                </div>
                
                <div className="flex items-center gap-1.5 justify-end">
                  <button
                    type="button"
                    onClick={handleSaveAsTemplate}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold transition-all active:scale-95 shadow-sm"
                    title="Simpan susunan label saat ini sebagai template baru"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Baru</span>
                  </button>
                  
                  {selectedTemplateId && (
                    <button
                      type="button"
                      onClick={handleDeleteCustomTemplate}
                      className="inline-flex items-center justify-center p-1.5 rounded-lg bg-red-600/15 hover:bg-red-600/25 text-red-400 border border-red-500/20 text-xs transition-all"
                      title="Hapus template kustom terpilih"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-300 block">
                Rincian Info Tambahan ({receipt.extraFields?.length || 0})
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

          <div className="space-y-1.5 max-h-72 overflow-y-auto no-scrollbar">
            {receipt.extraFields && receipt.extraFields.length > 0 ? (
              receipt.extraFields.map((field, idx) => (
                <div
                  key={idx}
                  draggable
                  onDragStart={(e) => handleDragExtraFieldStart(e, idx)}
                  onDragOver={handleDragExtraFieldOver}
                  onDrop={(e) => handleDropExtraField(e, idx)}
                  className={`flex items-center gap-1.5 p-1.5 rounded-xl border transition-all ${
                    draggedExtraFieldIdx === idx
                      ? 'bg-emerald-950/40 border-emerald-500/60 opacity-60'
                      : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="cursor-grab active:cursor-grabbing p-1 text-slate-500 hover:text-emerald-400 shrink-0">
                    <GripVertical className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] font-mono text-slate-500 w-3 text-center shrink-0">
                    {idx + 1}
                  </span>
                  
                  {/* Label Input */}
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => handleExtraFieldChange(idx, 'label', e.target.value)}
                    placeholder="Label (Kiri)"
                    className="w-1/3 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300 font-medium focus:outline-none focus:border-emerald-500"
                  />
                  
                  {/* Swap Button */}
                  <button
                    type="button"
                    onClick={() => handleSwapExtraField(idx)}
                    className="p-1 rounded-lg text-blue-400 hover:bg-blue-500/10 shrink-0"
                    title="Tukar Label ⇄ Nilai"
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                  </button>
                  
                  {/* Value Input */}
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) => handleExtraFieldChange(idx, 'value', e.target.value)}
                    placeholder="Nilai (Kanan/Tengah)"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                  />
                  
                  {/* Alignment Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const nextAlign = field.align === 'center' ? 'split' : 'center';
                      handleExtraFieldChange(idx, 'align', nextAlign);
                      showToast(`Format baris ${idx + 1} diubah ke: ${nextAlign === 'center' ? 'Teks Tengah' : 'Kiri-Kanan'}`);
                    }}
                    className={`p-1.5 rounded-lg border transition-all shrink-0 ${
                      field.align === 'center'
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-300'
                    }`}
                    title={field.align === 'center' ? 'Format: Teks Tengah' : 'Format: Kiri-Kanan'}
                  >
                    {field.align === 'center' ? (
                      <AlignCenter className="w-3 h-3" />
                    ) : (
                      <AlignLeft className="w-3 h-3" />
                    )}
                  </button>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteExtraField(idx)}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg shrink-0 transition-all"
                    title="Hapus baris"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
