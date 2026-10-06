import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Calculator,
  Sparkles,
  Building2,
  FileSpreadsheet,
  Wallet,
  Receipt,
  MessageSquare,
  ArrowRightLeft,
  Store,
  X,
  RotateCcw,
} from 'lucide-react';
import { ReceiptData, ReceiptItem } from '../types/receipt';
import { formatCurrency } from '../utils/thermalFormatter';

interface ReceiptEditorProps {
  receipt: ReceiptData;
  onChange: (updatedReceipt: ReceiptData) => void;
  onAiRecalculate: (promptText?: string) => Promise<void>;
  isAiProcessing: boolean;
  onOpenStoreSettings?: () => void;
}

export const ReceiptEditor: React.FC<ReceiptEditorProps> = ({
  receipt,
  onChange,
  onAiRecalculate,
  isAiProcessing,
  onOpenStoreSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'items' | 'merchant' | 'financials' | 'payment' | 'transfer' | 'footer'>('items');
  const [aiCustomPrompt, setAiCustomPrompt] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);

  // Auto calculate total financials from items
  const recalculateFromItems = (
    items: ReceiptItem[],
    taxPercent = receipt.financials.taxPercent,
    discount = receipt.financials.discount,
    serviceCharge = receipt.financials.serviceCharge
  ) => {
    const rawSubtotal = items.reduce(
      (sum, item) => sum + (item.subtotal || item.quantity * item.unitPrice),
      0
    );
    const calculatedTax = Math.round((rawSubtotal - discount) * (taxPercent / 100));
    const grandTotal = Math.max(0, rawSubtotal - discount + calculatedTax + serviceCharge);
    const amountPaid = receipt.payment.amountPaid || grandTotal;
    const change = Math.max(0, amountPaid - grandTotal);

    return {
      financials: {
        ...receipt.financials,
        subtotal: rawSubtotal,
        taxPercent,
        taxAmount: calculatedTax,
        serviceCharge,
        discount,
        grandTotal,
      },
      payment: {
        ...receipt.payment,
        change,
      },
    };
  };

  // Item modifications
  const handleItemChange = (index: number, field: keyof ReceiptItem, value: any) => {
    const updatedItems = [...receipt.items];
    const item = { ...updatedItems[index], [field]: value };

    // Auto-update item subtotal when qty, unitPrice, or discount changes
    if (field === 'quantity' || field === 'unitPrice' || field === 'discount') {
      const q = field === 'quantity' ? Number(value) || 0 : item.quantity;
      const p = field === 'unitPrice' ? Number(value) || 0 : item.unitPrice;
      const d = field === 'discount' ? Number(value) || 0 : item.discount;
      item.subtotal = Math.max(0, q * p - d);
    }

    updatedItems[index] = item;
    const { financials, payment } = recalculateFromItems(updatedItems);
    onChange({
      ...receipt,
      items: updatedItems,
      financials,
      payment,
    });
  };

  const handleAddItem = () => {
    const newItem: ReceiptItem = {
      id: `item-${Date.now()}`,
      name: 'ITEM BARU',
      quantity: 1,
      unitPrice: 10000,
      discount: 0,
      subtotal: 10000,
      unit: 'pcs',
    };
    const updatedItems = [...receipt.items, newItem];
    const { financials, payment } = recalculateFromItems(updatedItems);
    onChange({
      ...receipt,
      items: updatedItems,
      financials,
      payment,
    });
  };

  const handleDeleteItem = (index: number) => {
    const updatedItems = receipt.items.filter((_, i) => i !== index);
    const { financials, payment } = recalculateFromItems(updatedItems);
    onChange({
      ...receipt,
      items: updatedItems,
      financials,
      payment,
    });
  };

  // Merchant changes
  const handleMerchantChange = (field: string, value: string) => {
    onChange({
      ...receipt,
      merchant: {
        ...receipt.merchant,
        [field]: value,
      },
    });
  };

  // Transaction changes
  const handleTransactionChange = (field: string, value: string) => {
    onChange({
      ...receipt,
      transaction: {
        ...receipt.transaction,
        [field]: value,
      },
    });
  };

  // Financial changes
  const handleTaxPercentChange = (val: number) => {
    const { financials, payment } = recalculateFromItems(
      receipt.items,
      val,
      receipt.financials.discount,
      receipt.financials.serviceCharge
    );
    onChange({ ...receipt, financials, payment });
  };

  const handleDiscountChange = (val: number) => {
    const { financials, payment } = recalculateFromItems(
      receipt.items,
      receipt.financials.taxPercent,
      val,
      receipt.financials.serviceCharge
    );
    onChange({ ...receipt, financials, payment });
  };

  const handleServiceChargeChange = (val: number) => {
    const { financials, payment } = recalculateFromItems(
      receipt.items,
      receipt.financials.taxPercent,
      receipt.financials.discount,
      val
    );
    onChange({ ...receipt, financials, payment });
  };

  const handlePaymentAmountChange = (amount: number) => {
    const change = Math.max(0, amount - receipt.financials.grandTotal);
    onChange({
      ...receipt,
      payment: {
        ...receipt.payment,
        amountPaid: amount,
        change,
      },
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/60 rounded-2xl border border-slate-800 p-4 lg:p-6 shadow-xl backdrop-blur-md">
      {/* Editor Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h3 className="font-semibold text-slate-100 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-400" />
            Editor Data Terstruktur
          </h3>
          <p className="text-xs text-slate-400">
            Edit detail toko, rincian item belanja, hitungan pajak & pembayaran
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Buat struk baru yang kosong? Data yang belum tersimpan akan di-reset.')) {
                onChange({
                  ...receipt,
                  id: `receipt-${Date.now()}`,
                  documentType: 'receipt',
                  transaction: {
                    invoiceNumber: `INV/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`,
                    date: new Date().toLocaleDateString('id-ID'),
                    time: new Date().toLocaleTimeString('id-ID', { hour12: false }),
                    cashier: receipt.merchant.name ? 'Kasir 01' : '',
                  },
                  items: [
                    { id: '1', name: 'ITEM BARU', quantity: 1, unitPrice: 10000, discount: 0, subtotal: 10000 },
                  ],
                  extraFields: [],
                  financials: {
                    subtotal: 10000,
                    taxPercent: 0,
                    taxAmount: 0,
                    discount: 0,
                    serviceCharge: 0,
                    rounding: 0,
                    grandTotal: 10000,
                    currency: 'IDR',
                  },
                  payment: {
                    method: 'TUNAI',
                    amountPaid: 10000,
                    change: 0,
                  },
                  footer: {
                    notes: '',
                    policy: '',
                    barcodeValue: '',
                  },
                });
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-all active:scale-95"
            title="Reset dan buat struk baru"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Struk Baru</span>
          </button>

          <button
            onClick={() => {
              const { financials, payment } = recalculateFromItems(receipt.items);
              onChange({ ...receipt, financials, payment });
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all active:scale-95"
            title="Sinkronkan Subtotal & Grand Total"
          >
            <Calculator className="w-3.5 h-3.5 text-emerald-400" />
            <span>Hitung Ulang</span>
          </button>

          <button
            onClick={() => setShowAiModal(true)}
            disabled={isAiProcessing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>{isAiProcessing ? 'Memproses...' : 'AI Assistant'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 py-3 border-b border-slate-800 overflow-x-auto text-xs font-medium no-scrollbar">
        <button
          onClick={() => setActiveTab('items')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'items'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Daftar Item ({receipt.items?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('merchant')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'merchant'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Toko & Header</span>
        </button>

        <button
          onClick={() => setActiveTab('financials')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'financials'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>Pajak & Total</span>
        </button>

        <button
          onClick={() => setActiveTab('payment')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'payment'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Metode Bayar</span>
        </button>

        {receipt.documentType === 'bank_transfer' && (
          <button
            onClick={() => setActiveTab('transfer')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'transfer'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Bukti Transfer</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('footer')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'footer'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Catatan & Barcode</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {/* TAB 1: ITEMS TABLE */}
        {activeTab === 'items' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Ubah nama barang, kuantitas, harga, dan potongan diskon baris:
              </span>
              <button
                onClick={handleAddItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-semibold border border-emerald-500/30 transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Item</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {receipt.items && receipt.items.length > 0 ? (
                receipt.items.map((item, index) => (
                  <div
                    key={item.id || index}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700/80 transition-all space-y-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-500 w-5">
                        #{index + 1}
                      </span>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                        placeholder="Nama Item / Produk"
                        className="flex-1 bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 uppercase font-medium"
                      />
                      <button
                        onClick={() => handleDeleteItem(index)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Hapus baris item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Kuantitas (Qty)</label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Harga Satuan (Rp)</label>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Diskon Item (Rp)</label>
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={item.discount || 0}
                          onChange={(e) => handleItemChange(index, 'discount', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Subtotal Baris</label>
                        <div className="w-full bg-slate-800/60 border border-slate-700/50 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-mono font-semibold">
                          {formatCurrency(item.subtotal, false)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 border border-dashed border-slate-800 rounded-xl text-slate-400 text-xs">
                  Tidak ada item barang. Klik "Tambah Item" di atas.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: MERCHANT & CASHIER */}
        {activeTab === 'merchant' && (
          <div className="space-y-4 text-xs">
            {/* Quick Link to Dedicated Store Profile & Logo Settings */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {receipt.merchant.showLogo !== false && receipt.merchant.logoUrl ? (
                  <div className="w-12 h-12 bg-white rounded-lg p-1 border border-slate-700 flex items-center justify-center shrink-0 shadow">
                    <img
                      src={receipt.merchant.logoUrl}
                      alt="Logo Toko"
                      className="max-h-10 max-w-10 object-contain filter grayscale contrast-150"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-slate-100 text-xs flex items-center gap-1.5">
                    Halaman Pengaturan Profil Toko & Logo
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium">Tersentralisasi</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Atur logo di atas nama struk, nama toko, cabang, dan kontak permanen
                  </p>
                </div>
              </div>

              {onOpenStoreSettings && (
                <button
                  type="button"
                  onClick={onOpenStoreSettings}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-sm active:scale-95 shrink-0"
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Buka Pengaturan Toko & Logo</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="text-slate-400 block mb-1">Nama Toko / Merchant / Badan Usaha</label>
                <input
                  type="text"
                  value={receipt.merchant.name}
                  onChange={(e) => handleMerchantChange('name', e.target.value)}
                  placeholder="Misal: INDOMARET POINT"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-semibold focus:outline-none focus:border-emerald-500 uppercase"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 block">Cabang / Baris di Atas Alamat</label>
                  {receipt.merchant.branch && (
                    <button
                      type="button"
                      onClick={() => handleMerchantChange('branch', '')}
                      className="text-[11px] text-red-400 hover:text-red-300 font-medium hover:underline"
                    >
                      Kosongkan / Hilangkan
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={receipt.merchant.branch || ''}
                    onChange={(e) => handleMerchantChange('branch', e.target.value)}
                    placeholder="Kosongkan jika tidak ada cabang"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 pr-8"
                  />
                  {receipt.merchant.branch && (
                    <button
                      type="button"
                      onClick={() => handleMerchantChange('branch', '')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-red-400 p-1 transition-colors"
                      title="Kosongkan cabang"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Dicetak tepat di atas alamat toko. Biarkan kosong jika tidak ingin ditampilkan pada struk.
                </p>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">No. Telepon / Kontak</label>
                <input
                  type="text"
                  value={receipt.merchant.phone || ''}
                  onChange={(e) => handleMerchantChange('phone', e.target.value)}
                  placeholder="Misal: 021-7654321 / 0812-xxx"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-slate-400 block mb-1">Alamat Toko</label>
                <input
                  type="text"
                  value={receipt.merchant.address || ''}
                  onChange={(e) => handleMerchantChange('address', e.target.value)}
                  placeholder="Misal: Jl. RS Fatmawati Raya No. 42B"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">NPWP / Web / Legalitas</label>
                <input
                  type="text"
                  value={receipt.merchant.websiteOrTaxId || ''}
                  onChange={(e) => handleMerchantChange('websiteOrTaxId', e.target.value)}
                  placeholder="Misal: NPWP: 01.309.283.4-092.000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">No. Struk / Invoice / Faktur</label>
                <input
                  type="text"
                  value={receipt.transaction.invoiceNumber}
                  onChange={(e) => handleTransactionChange('invoiceNumber', e.target.value)}
                  placeholder="No Faktur"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Tanggal Transaksi</label>
                <input
                  type="text"
                  value={receipt.transaction.date}
                  onChange={(e) => handleTransactionChange('date', e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Waktu Transaksi</label>
                <input
                  type="text"
                  value={receipt.transaction.time}
                  onChange={(e) => handleTransactionChange('time', e.target.value)}
                  placeholder="HH:mm:ss"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Nama Kasir / ID Operator</label>
                <input
                  type="text"
                  value={receipt.transaction.cashier || ''}
                  onChange={(e) => handleTransactionChange('cashier', e.target.value)}
                  placeholder="Nama Kasir"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">No. Meja / Antrian (Jika ada)</label>
                <input
                  type="text"
                  value={receipt.transaction.queueOrTable || ''}
                  onChange={(e) => handleTransactionChange('queueOrTable', e.target.value)}
                  placeholder="Meja 04"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: FINANCIALS & TAXES */}
        {activeTab === 'financials' && (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex justify-between items-center text-slate-300">
                <span>Subtotal Barang:</span>
                <span className="font-mono text-sm font-semibold text-slate-100">
                  {formatCurrency(receipt.financials.subtotal)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="text-slate-400 block mb-1">Pajak / PPN / PB1 (%)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={receipt.financials.taxPercent || 0}
                      onChange={(e) => handleTaxPercentChange(Number(e.target.value) || 0)}
                      className="w-24 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-slate-400">
                      = {formatCurrency(receipt.financials.taxAmount)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Total Diskon / Potongan (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={receipt.financials.discount || 0}
                    onChange={(e) => handleDiscountChange(Number(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Service Charge / Biaya Layanan (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={receipt.financials.serviceCharge || 0}
                    onChange={(e) => handleServiceChargeChange(Number(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Pembulatan (Rounding)</label>
                  <input
                    type="number"
                    step="100"
                    value={receipt.financials.rounding || 0}
                    onChange={(e) =>
                      onChange({
                        ...receipt,
                        financials: {
                          ...receipt.financials,
                          rounding: Number(e.target.value) || 0,
                          grandTotal:
                            receipt.financials.subtotal -
                            receipt.financials.discount +
                            receipt.financials.taxAmount +
                            receipt.financials.serviceCharge +
                            (Number(e.target.value) || 0),
                        },
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Grand Total Box */}
              <div className="pt-3 border-t border-slate-800 flex justify-between items-center bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                <div>
                  <span className="font-bold text-slate-100 text-sm block">GRAND TOTAL</span>
                  <span className="text-[11px] text-emerald-400">Total nominal wajib dibayar</span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-lg text-emerald-300">
                    {formatCurrency(receipt.financials.grandTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PAYMENT */}
        {activeTab === 'payment' && (
          <div className="space-y-3.5 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Metode Pembayaran</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                {['TUNAI', 'QRIS', 'DEBIT', 'TRANSFER'].map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() =>
                      onChange({
                        ...receipt,
                        payment: { ...receipt.payment, method },
                      })
                    }
                    className={`py-2 px-3 rounded-xl border font-semibold text-xs transition-all ${
                      receipt.payment.method?.toUpperCase().includes(method)
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={receipt.payment.method || ''}
                onChange={(e) =>
                  onChange({
                    ...receipt,
                    payment: { ...receipt.payment, method: e.target.value },
                  })
                }
                placeholder="Ketik metode pembayaran custom (misal: SHOPEEPAY / BCA KARTU DEBIT)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">Uang Diterima / Dibayar (Rp)</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={receipt.payment.amountPaid || receipt.financials.grandTotal}
                  onChange={(e) => handlePaymentAmountChange(Number(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-emerald-500 font-semibold"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Uang Kembalian (Rp)</label>
                <input
                  type="number"
                  value={receipt.payment.change || 0}
                  onChange={(e) =>
                    onChange({
                      ...receipt,
                      payment: { ...receipt.payment, change: Number(e.target.value) || 0 },
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-emerald-400 font-mono font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Approval Code / Trace No (Jika non-tunai)</label>
                <input
                  type="text"
                  value={receipt.payment.approvalCode || ''}
                  onChange={(e) =>
                    onChange({
                      ...receipt,
                      payment: { ...receipt.payment, approvalCode: e.target.value },
                    })
                  }
                  placeholder="Contoh: APPR-889102"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">4 Digit Terakhir Kartu</label>
                <input
                  type="text"
                  maxLength={4}
                  value={receipt.payment.cardLastDigits || ''}
                  onChange={(e) =>
                    onChange({
                      ...receipt,
                      payment: { ...receipt.payment, cardLastDigits: e.target.value },
                    })
                  }
                  placeholder="Contoh: 4091"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: TRANSFER DETAILS (IF BANK TRANSFER) */}
        {activeTab === 'transfer' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Bank / Dompet Asal</label>
              <input
                type="text"
                value={receipt.transferDetails?.sourceBankOrWallet || ''}
                onChange={(e) =>
                  onChange({
                    ...receipt,
                    transferDetails: { ...receipt.transferDetails, sourceBankOrWallet: e.target.value },
                  })
                }
                placeholder="BCA / Mandiri / Dana"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Nama Pengirim</label>
              <input
                type="text"
                value={receipt.transferDetails?.senderName || ''}
                onChange={(e) =>
                  onChange({
                    ...receipt,
                    transferDetails: { ...receipt.transferDetails, senderName: e.target.value },
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Bank / Dompet Tujuan</label>
              <input
                type="text"
                value={receipt.transferDetails?.targetBankOrWallet || ''}
                onChange={(e) =>
                  onChange({
                    ...receipt,
                    transferDetails: { ...receipt.transferDetails, targetBankOrWallet: e.target.value },
                  })
                }
                placeholder="BRI / GoPay / BCA"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Nama Penerima</label>
              <input
                type="text"
                value={receipt.transferDetails?.recipientName || ''}
                onChange={(e) =>
                  onChange({
                    ...receipt,
                    transferDetails: { ...receipt.transferDetails, recipientName: e.target.value },
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">No. Rekening Penerima</label>
              <input
                type="text"
                value={receipt.transferDetails?.recipientAccount || ''}
                onChange={(e) =>
                  onChange({
                    ...receipt,
                    transferDetails: { ...receipt.transferDetails, recipientAccount: e.target.value },
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Nomor Referensi Bank</label>
              <input
                type="text"
                value={receipt.transferDetails?.referenceNumber || ''}
                onChange={(e) =>
                  onChange({
                    ...receipt,
                    transferDetails: { ...receipt.transferDetails, referenceNumber: e.target.value },
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-slate-400 block mb-1">Berita / Catatan Transfer</label>
              <input
                type="text"
                value={receipt.transferDetails?.notes || ''}
                onChange={(e) =>
                  onChange({
                    ...receipt,
                    transferDetails: { ...receipt.transferDetails, notes: e.target.value },
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        )}

        {/* TAB 6: FOOTER & BARCODE */}
        {activeTab === 'footer' && (
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
              <span className="font-semibold text-slate-200 block text-xs">Bagian Footer & Catatan Penutup Struk:</span>
              <p className="text-[11px] text-slate-400">
                Kosongkan kolom di bawah jika tidak ingin mencetak teks penutup agar struk lebih pendek dan hemat kertas rol thermal.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-400 block font-medium">Pesan Penutup / Ucapan Terima Kasih</label>
                {receipt.footer.notes && (
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        ...receipt,
                        footer: { ...receipt.footer, notes: '' },
                      })
                    }
                    className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 hover:underline"
                  >
                    <X className="w-3 h-3" />
                    <span>Kosongkan</span>
                  </button>
                )}
              </div>
              <textarea
                rows={2}
                value={receipt.footer.notes || ''}
                onChange={(e) =>
                  onChange({
                    ...receipt,
                    footer: { ...receipt.footer, notes: e.target.value },
                  })
                }
                placeholder="Biarkan kosong atau isi ucapan terima kasih..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-400 block font-medium">Kebijakan Retur / Informasi Wi-Fi</label>
                {receipt.footer.policy && (
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        ...receipt,
                        footer: { ...receipt.footer, policy: '' },
                      })
                    }
                    className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 hover:underline"
                  >
                    <X className="w-3 h-3" />
                    <span>Kosongkan</span>
                  </button>
                )}
              </div>
              <textarea
                rows={2}
                value={receipt.footer.policy || ''}
                onChange={(e) =>
                  onChange({
                    ...receipt,
                    footer: { ...receipt.footer, policy: e.target.value },
                  })
                }
                placeholder="Biarkan kosong jika tidak diperlukan..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-400 block font-medium">Nilai Barcode Struk (Angka / Huruf)</label>
                {receipt.footer.barcodeValue && (
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        ...receipt,
                        footer: { ...receipt.footer, barcodeValue: '' },
                      })
                    }
                    className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 hover:underline"
                  >
                    <X className="w-3 h-3" />
                    <span>Kosongkan Barcode</span>
                  </button>
                )}
              </div>
              <input
                type="text"
                value={receipt.footer.barcodeValue || ''}
                onChange={(e) =>
                  onChange({
                    ...receipt,
                    footer: { ...receipt.footer, barcodeValue: e.target.value },
                  })
                }
                placeholder="8991209384721 (atau kosongkan)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Akan otomatis dirender sebagai barcode batang (Code 128) di bagian bawah struk printer thermal jika diisi.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* AI Assistant Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <h4 className="font-semibold text-slate-100 text-sm">AI Assistant Struk</h4>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="text-slate-400 hover:text-slate-200 text-xs px-2 py-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Minta AI Gemini untuk memperbaiki atau menyesuaikan data struk secara otomatis:
            </p>

            <div className="space-y-1.5">
              {[
                'Periksa dan cocokkan kembali hitungan subtotal, diskon, PPN, dan grand total.',
                'Ubah semua nama barang menjadi huruf kapital dan hapus singkatan yang aneh.',
                'Bulatkan total belanja ke ribuan rupiah terdekat dan sesuaikan kembalian.',
              ].map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => setAiCustomPrompt(suggestion)}
                  className="w-full text-left p-2 rounded-lg bg-slate-950 hover:bg-slate-800 text-[11px] text-slate-300 border border-slate-800 transition-all"
                >
                  💡 {suggestion}
                </button>
              ))}
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Atau tulis instruksi khusus:</label>
              <textarea
                rows={3}
                value={aiCustomPrompt}
                onChange={(e) => setAiCustomPrompt(e.target.value)}
                placeholder="Contoh: Tambahkan diskon member 10% untuk semua item makanan..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAiModal(false)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  setShowAiModal(false);
                  await onAiRecalculate(aiCustomPrompt);
                }}
                disabled={isAiProcessing}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md disabled:opacity-50"
              >
                Terapkan dengan AI
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
