import { ReceiptData, ReceiptItem } from '../types/receipt';

/**
 * Intelligent regex and heuristic parser for Indonesian receipts & transaction proofs
 * (Struk Kasir, BRImo, BCA, Mandiri, BPJS, PLN, QRIS, etc.)
 */
export function parseReceiptText(text: string): Partial<ReceiptData> {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // 1. Merchant / Provider Name
  let merchantName = 'Struk Transaksi';
  if (lines.length > 0) {
    // If first line is a common app name (e.g., BRImo, BCA mobile, Indomaret)
    merchantName = lines[0];
  }

  // 2. Date & Time
  let date = new Date().toISOString().split('T')[0];
  let time = '';

  const dateMatch = text.match(/(\d{1,2}(?:\s+[A-Za-z]{3}\s+|\/|-)\d{2,4}(?:\s+\d{4})?)/);
  if (dateMatch) {
    date = dateMatch[1].trim();
  }

  const timeMatch = text.match(/(\d{2}:\d{2}(?::\d{2})?)/);
  if (timeMatch) {
    time = timeMatch[1].trim();
  }

  // 3. Financials: Nominal, Admin, Grand Total
  let subtotal = 0;
  let serviceCharge = 0;
  let grandTotal = 0;

  // Search for Grand Total / Total Tagihan / Total
  const totalMatch = text.match(/(Total\s*Tagihan|Grand\s*Total|Total\s*Bayar|Total)[:\s]+(?:Rp\.?)?\s*([0-9.,]+)/i);
  if (totalMatch) {
    grandTotal = parseInt(totalMatch[2].replace(/[.,]/g, ''), 10) || 0;
  }

  // Search for Nominal / Subtotal
  const nominalMatch = text.match(/(Nominal|Subtotal|Jumlah)[:\s]+(?:Rp\.?)?\s*([0-9.,]+)/i);
  if (nominalMatch) {
    subtotal = parseInt(nominalMatch[2].replace(/[.,]/g, ''), 10) || 0;
  }

  // Search for Biaya Admin / Fee
  const adminMatch = text.match(/(Biaya\s*Admin|Admin\s*Fee|Biaya\s*Layanan)[:\s]+(?:Rp\.?)?\s*([0-9.,]+)/i);
  if (adminMatch) {
    serviceCharge = parseInt(adminMatch[2].replace(/[.,]/g, ''), 10) || 0;
  }

  // Fallback: If grandTotal is 0 but subtotal exists
  if (grandTotal === 0 && subtotal > 0) {
    grandTotal = subtotal + serviceCharge;
  } else if (subtotal === 0 && grandTotal > 0) {
    subtotal = Math.max(0, grandTotal - serviceCharge);
  }

  // 4. Invoice / Ref / Transaction ID
  let invoiceNumber = 'REF-' + Date.now().toString().slice(-6);
  const refMatch = text.match(/(Nomor\s*Referensi|No\.?\s*Ref|ID\s*Transaksi|No\.?\s*Faktur|Invoice|No\.)[:\s]+([A-Z0-9-/]+)/i);
  if (refMatch) {
    invoiceNumber = refMatch[2].trim();
  }

  // 5. Extra Metadata Fields (Key-Value pairs)
  const extraFields: { label: string; value: string }[] = [];
  const knownKeys = [
    'Nomor Pembayaran',
    'No Pembayaran',
    'ID Pelanggan',
    'Nomor Pelanggan',
    'Nama Pelanggan',
    'Pelanggan',
    'Sumber Dana',
    'Dari Rekening',
    'Ke Rekening',
    'ID Transaksi',
    'Nomor Referensi',
    'Institusi',
    'Keterangan',
    'Lokasi',
    'Jumlah Keluarga',
    'Status',
    'Kategori',
  ];

  // Search line by line for known labels or pattern "Label: Value" or "Label Value"
  for (const line of lines) {
    let matched = false;
    for (const key of knownKeys) {
      const keyRegex = new RegExp(`^${key}[:\\s]+(.+)$`, 'i');
      const m = line.match(keyRegex);
      if (m && m[1]) {
        const val = m[1].trim();
        // Skip if value is empty or looks like just currency already handled in financials
        if (val && !val.toLowerCase().startsWith('rp')) {
          extraFields.push({ label: key, value: val });
          matched = true;
          break;
        }
      }
    }

    // Also detect generic "Label : Value" with colon
    if (!matched && line.includes(':')) {
      const parts = line.split(':');
      const label = parts[0].trim();
      const value = parts.slice(1).join(':').trim();
      if (label.length > 2 && label.length < 25 && value.length > 0 && !label.toLowerCase().includes('total') && !label.toLowerCase().includes('rp')) {
        // avoid duplicate
        if (!extraFields.some((f) => f.label.toLowerCase() === label.toLowerCase())) {
          extraFields.push({ label, value });
          matched = true;
        }
      }
    }

    // Also detect standalone masked account / card number (e.g., "4090 xxx Kxxx DG", "4090 **** **** 536", "527189****")
    if (!matched) {
      const isMaskedAccount =
        /^(\d{3,6}[\s-]*[*xX]{2,6}[\s-]*[*xX\w]{2,6}[\s-]*[\w]{2,6}|\d{4}[\s-]*[*xX\s\d]{6,16}[\w\d]{2,4}|\d{4,8}[*xX]{3,8}\d{0,4})$/i.test(line);
      if (isMaskedAccount) {
        extraFields.push({ label: 'No. Rekening / Kartu', value: line });
        matched = true;
      }
    }
  }

  // 6. Build Meaningful Items
  const items: ReceiptItem[] = [];

  // Check if this is a payment / bill (e.g. BPJS, Listrik, etc.)
  const institusiField = extraFields.find((f) => f.label.toLowerCase() === 'institusi');
  const pelangganField = extraFields.find((f) => f.label.toLowerCase() === 'nama pelanggan' || f.label.toLowerCase() === 'pelanggan');
  const ketField = extraFields.find((f) => f.label.toLowerCase() === 'keterangan');

  if (institusiField || pelangganField) {
    let itemName = institusiField ? institusiField.value : 'Pembayaran Tagihan';
    if (pelangganField) {
      itemName += ` - ${pelangganField.value}`;
    }
    if (ketField) {
      itemName += ` (${ketField.value})`;
    }

    items.push({
      id: 'item-bill-1',
      name: itemName.toUpperCase(),
      quantity: 1,
      unitPrice: subtotal || grandTotal,
      discount: 0,
      subtotal: subtotal || grandTotal,
      unit: 'tagihan',
    });
  } else {
    // If not a bill, check if there are standard line items (e.g. 2 x 15.000)
    let itemIdx = 1;
    for (const line of lines) {
      const qtyPriceMatch = line.match(/(\d+)\s*[xX]\s*([0-9.,]+)/);
      if (qtyPriceMatch) {
        const qty = parseInt(qtyPriceMatch[1], 10) || 1;
        const price = parseInt(qtyPriceMatch[2].replace(/[.,]/g, ''), 10) || 0;
        items.push({
          id: `item-${itemIdx++}`,
          name: `Item ${itemIdx - 1}`,
          quantity: qty,
          unitPrice: price,
          discount: 0,
          subtotal: qty * price,
          unit: 'pcs',
        });
      }
    }

    // Default 1 item if still empty so the editor has editable content
    if (items.length === 0 && grandTotal > 0) {
      items.push({
        id: 'item-1',
        name: `${merchantName} (TRANSAKSI)`,
        quantity: 1,
        unitPrice: subtotal || grandTotal,
        discount: 0,
        subtotal: subtotal || grandTotal,
        unit: 'transaksi',
      });
    }
  }

  return {
    merchant: {
      name: merchantName,
      branch: '', // Biarkan kosong agar tidak mencetak info transaksi (mis: 1005 SUKABUMI) di atas alamat
    },
    transaction: {
      date,
      time,
      invoiceNumber,
      cashier: 'Sistem',
    },
    extraFields,
    items,
    financials: {
      subtotal: subtotal || grandTotal,
      taxPercent: 0,
      taxAmount: 0,
      serviceCharge,
      discount: 0,
      rounding: 0,
      grandTotal: grandTotal || subtotal,
      currency: 'IDR',
    },
    payment: {
      method: 'TRANSFER',
      amountPaid: grandTotal,
      change: 0,
    },
    footer: {
      notes: 'Transaksi Berhasil & Sah',
      policy: 'Simpan bukti transaksi ini sebagai bukti pembayaran resmi.',
      barcodeValue: invoiceNumber,
    },
    rawExtractedText: text,
    confidenceScore: 88,
  };
}
