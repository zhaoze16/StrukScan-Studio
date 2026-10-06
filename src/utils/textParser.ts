import { ReceiptData, ReceiptItem, DocumentType } from '../types/receipt';

/**
 * High-accuracy intelligent parser for Indonesian receipts & transaction proofs
 * Handles physical thermal receipts, digital payments, bank transfers, e-wallets (DANA, BCA, Mandiri, BRImo, GoPay, OVO, ShopeePay), QRIS, BPJS, PLN, etc.
 * NOTE: Merchant / Store Profile is NOT extracted from Raw OCR, keeping the user's configured Store Profile intact.
 */
export function parseReceiptText(text: string): Partial<ReceiptData> {
  const rawLines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Clean lines: strip obvious phone status bar artifacts like clock-only lines "18:50", "4G", "LTE", etc.
  const lines = rawLines.filter((line) => {
    if (/^(?:[0-2]?[0-9]:[0-5][0-9]\s*(?:am|pm)?|\d+[%]|\d+\s*(?:kb|mb)\/s|4g\+?|5g|lte|volte)$/i.test(line)) {
      return false;
    }
    return true;
  });

  const fullText = lines.join('\n');

  // 1. Detect Document Type
  let documentType: DocumentType = 'receipt';
  if (/kirim\s*uang|transfer|detail\s*penerima|rekening\s*tujuan|akun\s*dana|bank|bi-fast|realtime\s*online/i.test(fullText)) {
    documentType = 'bank_transfer';
  } else if (/qris|nmid|payment\s*gateway|quick\s*response/i.test(fullText)) {
    documentType = 'qris';
  } else if (/bpjs|pln|pdam|pbb|tagihan|idpel|pasca\s*bayar|prabayar/i.test(fullText)) {
    documentType = 'bill_payment';
  }

  // 2. Date & Time Parsing
  let date = new Date().toLocaleDateString('id-ID');
  let time = '';

  // Match Indonesian formatted date e.g. "06 Okt 2026", "06 Oktober 2026", "06/10/2026", "2026-10-06"
  const dateMatch = fullText.match(
    /(\b\d{1,2}[\s\/\-\.](?:Jan(?:uari)?|Feb(?:ruari)?|Mar(?:et)?|Apr(?:il)?|Mei|May|Jun(?:i)?|Jul(?:i)?|Agu(?:stus)?|Ags|Aug|Sep(?:tember)?|Okt(?:ober)?|Oct|Nov(?:ember)?|Des(?:ember)?|Dec|\d{1,2})[\s\/\-\.]\d{2,4}\b)/i
  );
  if (dateMatch) {
    date = dateMatch[1].trim();
  }

  // Match time e.g. "17:32", "17:32:45", "17.32"
  const timeMatch = fullText.match(/\b([0-2][0-9][:|\.][0-5][0-9](?:[:|\.][0-5][0-9])?)\b/);
  if (timeMatch) {
    time = timeMatch[1].replace('.', ':').trim();
  }

  // 3. Financials (Total, Subtotal, Admin, Discount)
  let subtotal = 0;
  let serviceCharge = 0;
  let grandTotal = 0;
  let discount = 0;

  // Function to safely parse rupiah strings e.g. "Rp150.000", "Rp 150.000,00", "150.000", "150000"
  const parseRupiah = (valStr: string): number => {
    if (!valStr) return 0;
    let clean = valStr.replace(/rp\.?|idr/gi, '').trim();
    if (clean.includes(',') && clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
      clean = clean.substring(0, clean.lastIndexOf(','));
    }
    clean = clean.replace(/[^0-9]/g, '');
    return parseInt(clean, 10) || 0;
  };

  // Search for Total Bayar / Total Tagihan / Grand Total / Total Transaksi / Total
  const totalMatch = fullText.match(
    /(?:Total\s*Bayar|Total\s*Tagihan|Grand\s*Total|Total\s*Transaksi|Total\s*Belanja|Total\s*Pembayaran|Jumlah\s*Bayar|Jumlah\s*Total|Total)[:\s]+(?:Rp\.?\s*)?([0-9.,]+)/i
  );
  if (totalMatch) {
    grandTotal = parseRupiah(totalMatch[1]);
  }

  // Search for Nominal / Subtotal / Jumlah Transfer
  const nominalMatch = fullText.match(
    /(?:Nominal\s*Transfer|Jumlah\s*Transfer|Nominal|Subtotal|Harga\s*Total|Sub\s*Total)[:\s]+(?:Rp\.?\s*)?([0-9.,]+)/i
  );
  if (nominalMatch) {
    subtotal = parseRupiah(nominalMatch[1]);
  }

  // Search for Biaya Admin / Layanan
  const adminMatch = fullText.match(
    /(?:Biaya\s*Admin(?:istrasi)?|Admin\s*Fee|Biaya\s*Layanan|Biaya\s*Transaksi)[:\s]+(?:Rp\.?\s*)?([0-9.,]+)/i
  );
  if (adminMatch) {
    serviceCharge = parseRupiah(adminMatch[1]);
  }

  // Search for Diskon / Potongan
  const discountMatch = fullText.match(
    /(?:Diskon|Potongan|Hemat|Voucher)[:\s]+(?:Rp\.?\s*)?([0-9.,]+)/i
  );
  if (discountMatch) {
    discount = parseRupiah(discountMatch[1]);
  }

  // Fallback if "Kirim Uang Rp150.000 ke Ani" pattern exists
  if (grandTotal === 0) {
    const kirimMatch = fullText.match(/Kirim\s*Uang\s*(?:Rp\.?\s*)?([0-9.,]+)/i);
    if (kirimMatch) {
      grandTotal = parseRupiah(kirimMatch[1]);
    }
  }

  // Fallback: If grandTotal is still 0, find any prominent "Rp..." in the text
  if (grandTotal === 0) {
    const allRp = [...fullText.matchAll(/Rp\.?\s*([0-9]{1,3}(?:\.[0-9]{3})+)/gi)];
    if (allRp.length > 0) {
      const amounts = allRp.map((m) => parseRupiah(m[1])).filter((a) => a > 0);
      if (amounts.length > 0) {
        grandTotal = Math.max(...amounts);
      }
    }
  }

  if (grandTotal === 0 && subtotal > 0) {
    grandTotal = subtotal + serviceCharge - discount;
  } else if (subtotal === 0 && grandTotal > 0) {
    subtotal = Math.max(0, grandTotal - serviceCharge + discount);
  }

  // 4. Invoice Number / Ref ID / ID Transaksi
  let invoiceNumber = '';
  const refPatterns = [
    /(?:ID\s*Transaksi|Transaction\s*ID)[:\s=]+([A-Za-z0-9-_]+)/i,
    /(?:ID\s*Order\s*Merchant|Order\s*ID)[:\s=]+([A-Za-z0-9-_]+)/i,
    /(?:Nomor\s*Referensi|No\.?\s*Ref(?:erensi)?|Ref\s*ID)[:\s=]+([A-Za-z0-9-_]+)/i,
    /(?:No\.?\s*Faktur|No\.?\s*Struk|No\.?\s*Invoice|Invoice\s*No)[:\s=]+([A-Za-z0-9-_/]+)/i,
    /(?:Kode\s*Transaksi|NMID|No\.?\s*Pesanan)[:\s=]+([A-Za-z0-9-_]+)/i,
  ];

  for (const pattern of refPatterns) {
    const m = fullText.match(pattern);
    if (m && m[1]) {
      invoiceNumber = m[1].trim();
      break;
    }
  }

  if (!invoiceNumber) {
    const longIdMatch = fullText.match(/\b(\d{16,36}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i);
    if (longIdMatch) {
      invoiceNumber = longIdMatch[1].trim();
    } else {
      invoiceNumber = 'REF-' + Date.now().toString().slice(-8);
    }
  }

  // 5. Payment Method Detection
  let paymentMethod = 'TRANSFER';
  const methodMatch = fullText.match(/(?:Metode\s*Pembayaran|Metode\s*Bayar|Bayar\s*Dengan|Sumber\s*Dana)[:\s]+([^\n\r]+)/i);
  if (methodMatch && methodMatch[1]) {
    paymentMethod = methodMatch[1].trim();
  } else if (/saldo\s*dana/i.test(fullText)) {
    paymentMethod = 'SALDO DANA';
  } else if (/qris/i.test(fullText)) {
    paymentMethod = 'QRIS';
  } else if (/gopay/i.test(fullText)) {
    paymentMethod = 'GOPAY';
  } else if (/shopeepay/i.test(fullText)) {
    paymentMethod = 'SHOPEEPAY';
  } else if (/ovo/i.test(fullText)) {
    paymentMethod = 'OVO';
  } else if (/bca/i.test(fullText)) {
    paymentMethod = 'BCA';
  } else if (/mandiri/i.test(fullText)) {
    paymentMethod = 'MANDIRI';
  } else if (/brimo|bri/i.test(fullText)) {
    paymentMethod = 'BRI';
  } else if (/tunai|cash/i.test(fullText)) {
    paymentMethod = 'TUNAI';
  }

  // 6. Extra Metadata Fields (Info Lain)
  const extraFields: { label: string; value: string }[] = [];

  const addExtraField = (label: string, value: string) => {
    const cleanLabel = label.trim().replace(/^[:\s\-]+|[:\s\-]+$/g, '');
    const cleanVal = value.trim().replace(/^[:\s\-]+|[:\s\-]+$/g, '');
    if (!cleanLabel || !cleanVal) return;

    if (/^(total|grand total|subtotal|jumlah bayar|total bayar|total tagihan|total belanja)$/i.test(cleanLabel)) return;
    if (/^(aman pakai|butuh bantuan|detail transaksi|detail penerima|detail pengirim|rincian)$/i.test(cleanLabel)) return;
    if (/^(aman pakai|butuh bantuan)$/i.test(cleanVal)) return;

    const exists = extraFields.some(
      (f) => f.label.toLowerCase() === cleanLabel.toLowerCase() && f.value.toLowerCase() === cleanVal.toLowerCase()
    );
    if (!exists) {
      extraFields.push({ label: cleanLabel, value: cleanVal });
    }
  };

  // Known target keys in Indonesian transaction flows
  const targetedKeyRules = [
    { label: 'Nama Penerima', regex: /(?:Detail\s*Penerima\s*\n\s*)?Nama\s*[:\s=]+([^\n\r]+)/i },
    { label: 'Akun DANA', regex: /Akun\s*DANA\s*[:\s=]+([0-9+]+)/i },
    { label: 'No. Handphone', regex: /(?:No\.?\s*HP|No\.?\s*Handphone|Nomor\s*HP|No\.?\s*Telepon)\s*[:\s=]+([0-9+]+)/i },
    { label: 'ID Transaksi', regex: /ID\s*Transaksi\s*[:\s=]+([A-Za-z0-9-_]+)/i },
    { label: 'ID Order Merchant', regex: /ID\s*Order\s*Merchant\s*[:\s=]+([A-Za-z0-9-_]+)/i },
    { label: 'Nomor Referensi', regex: /(?:Nomor\s*Referensi|No\.?\s*Referensi|No\.?\s*Ref)\s*[:\s=]+([A-Za-z0-9-_]+)/i },
    { label: 'Nomor Pembayaran', regex: /(?:Nomor\s*Pembayaran|No\.?\s*Pembayaran|No\.?\s*VA|Virtual\s*Account)\s*[:\s=]+([A-Za-z0-9-_]+)/i },
    { label: 'ID Pelanggan', regex: /(?:ID\s*Pelanggan|Nomor\s*Pelanggan|IDPEL|No\.?\s*Meter)\s*[:\s=]+([A-Za-z0-9-_]+)/i },
    { label: 'Nama Pelanggan', regex: /(?:Nama\s*Pelanggan|Nama\s*Customer)\s*[:\s=]+([^\n\r]+)/i },
    { label: 'Catatan', regex: /(?:Catatan|Berita|Keterangan|Pesan)\s*[:\s=]+([^\n\r]+)/i },
    { label: 'Metode Pembayaran', regex: /(?:Metode\s*Pembayaran|Sumber\s*Dana)\s*[:\s=]+([^\n\r]+)/i },
    { label: 'Rekening Tujuan', regex: /(?:Ke\s*Rekening|Rekening\s*Tujuan|Bank\s*Tujuan)\s*[:\s=]+([^\n\r]+)/i },
    { label: 'Rekening Asal', regex: /(?:Dari\s*Rekening|Rekening\s*Asal|Bank\s*Asal)\s*[:\s=]+([^\n\r]+)/i },
    { label: 'Nama Pengirim', regex: /(?:Nama\s*Pengirim|Pengirim)\s*[:\s=]+([^\n\r]+)/i },
    { label: 'Institusi', regex: /(?:Institusi|Penyedia\s*Jasa|Biller|Layanan)\s*[:\s=]+([^\n\r]+)/i },
    { label: 'Status Transaksi', regex: /(?:Status\s*Transaksi|Status)\s*[:\s=]+([^\n\r]+)/i },
  ];

  for (const rule of targetedKeyRules) {
    const m = fullText.match(rule.regex);
    if (m && m[1]) {
      const val = m[1].trim();
      if (val && !/^(detail|rincian|total|aman pakai|butuh)/i.test(val)) {
        addExtraField(rule.label, val);
      }
    }
  }

  const ignoredLineKeywords = [
    'detail transaksi',
    'detail penerima',
    'detail pengirim',
    'rincian pembayaran',
    'aman pakai dana',
    'butuh bantuan',
    'transaksi berhasil',
    'bagikan bukti',
    'unduh',
    'kembali',
    'lihat detail',
    'selesai',
    'tutup',
    'struk transaksi',
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();

    if (ignoredLineKeywords.some((kw) => lowerLine === kw || lowerLine === `${kw}!` || lowerLine === `${kw}?`)) {
      continue;
    }
    if (/^(total|grand total|subtotal|jumlah|bayar|kembali|cash|tunai)/i.test(line)) {
      continue;
    }

    if (line.includes(':') || line.includes(' = ') || (line.includes(' - ') && !/^\d/.test(line))) {
      const separator = line.includes(':') ? ':' : line.includes(' = ') ? ' = ' : ' - ';
      const parts = line.split(separator);
      const label = parts[0].trim();
      const value = parts.slice(1).join(separator).trim();

      if (label.length >= 2 && label.length <= 30 && value.length > 0) {
        if (!ignoredLineKeywords.includes(label.toLowerCase()) && !label.toLowerCase().includes('total')) {
          addExtraField(label, value);
        }
      }
    } else if (/\s{2,}/.test(line)) {
      const parts = line.split(/\s{2,}/);
      if (parts.length >= 2) {
        const label = parts[0].trim();
        const value = parts.slice(1).join(' ').trim();
        if (label.length >= 2 && label.length <= 30 && value.length > 0 && !label.toLowerCase().includes('total')) {
          addExtraField(label, value);
        }
      }
    } else if (i < lines.length - 1) {
      const nextLine = lines[i + 1];
      const isKnownLabel = /^(nama|nama penerima|akun dana|id transaksi|id order merchant|catatan|nomor referensi|nomor pembayaran|id pelanggan|status|institusi)$/i.test(
        line
      );
      if (isKnownLabel && nextLine && nextLine.length > 0) {
        if (!ignoredLineKeywords.includes(nextLine.toLowerCase()) && !/^(total|nama|catatan|id)/i.test(nextLine)) {
          addExtraField(line, nextLine);
        }
      }
    }
  }

  if (!extraFields.some((f) => f.label.toLowerCase().includes('status'))) {
    if (/transaksi\s*berhasil|success|lunas|berhasil|approved|settled/i.test(fullText)) {
      addExtraField('Status Transaksi', 'BERHASIL');
    }
  }

  const kirimDetailMatch = fullText.match(/Kirim\s*Uang\s*(?:Rp[0-9.,\s]+)?ke\s+([^-\n\r]+)(?:-\s*([0-9+]+))?/i);
  if (kirimDetailMatch) {
    const destName = kirimDetailMatch[1]?.trim();
    const destPhone = kirimDetailMatch[2]?.trim();
    if (destName && !extraFields.some((f) => f.label.toLowerCase().includes('penerima') || f.label.toLowerCase() === 'nama')) {
      addExtraField('Nama Penerima', destName);
    }
    if (destPhone && !extraFields.some((f) => f.label.toLowerCase().includes('dana') || f.label.toLowerCase().includes('hp'))) {
      addExtraField('Akun DANA / No. HP', destPhone);
    }
  }

  // 7. Meaningful Items List Construction
  const items: ReceiptItem[] = [];

  let itemIdx = 1;
  for (const line of lines) {
    const qtyPriceMatch = line.match(/(\d+)\s*[xX]\s*(?:Rp\.?\s*)?([0-9.,]+)/);
    if (qtyPriceMatch) {
      const qty = parseInt(qtyPriceMatch[1], 10) || 1;
      const price = parseRupiah(qtyPriceMatch[2]);
      if (price > 0) {
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
  }

  if (items.length === 0) {
    const catatanField = extraFields.find((f) => f.label.toLowerCase() === 'catatan' || f.label.toLowerCase() === 'keterangan');
    const penerimaField = extraFields.find((f) => f.label.toLowerCase().includes('penerima') || f.label.toLowerCase() === 'nama');
    const institusiField = extraFields.find((f) => f.label.toLowerCase() === 'institusi' || f.label.toLowerCase() === 'layanan');

    let itemName = 'TRANSAKSI PEMBAYARAN';
    if (documentType === 'bank_transfer') {
      if (catatanField?.value && penerimaField?.value) {
        itemName = `TRANSFER (${catatanField.value.toUpperCase()}) - ${penerimaField.value.toUpperCase()}`;
      } else if (penerimaField?.value) {
        itemName = `KIRIM UANG KE ${penerimaField.value.toUpperCase()}`;
      } else if (catatanField?.value) {
        itemName = `TRANSFER - ${catatanField.value.toUpperCase()}`;
      } else {
        itemName = 'TRANSFER DANA / UANG';
      }
    } else if (documentType === 'bill_payment') {
      itemName = institusiField ? `PEMBAYARAN ${institusiField.value.toUpperCase()}` : 'PEMBAYARAN TAGIHAN';
    } else if (documentType === 'qris') {
      itemName = 'PEMBAYARAN QRIS';
    }

    const itemPrice = subtotal || grandTotal || 0;
    items.push({
      id: 'item-1',
      name: itemName,
      quantity: 1,
      unitPrice: itemPrice,
      discount: 0,
      subtotal: itemPrice,
      unit: 'transaksi',
    });
  }

  // 8. Populate Transfer Details
  let transferDetails = undefined;
  if (documentType === 'bank_transfer') {
    const penerimaField = extraFields.find((f) => f.label.toLowerCase().includes('penerima') || f.label.toLowerCase() === 'nama');
    const akunField = extraFields.find((f) => f.label.toLowerCase().includes('dana') || f.label.toLowerCase().includes('rekening') || f.label.toLowerCase().includes('hp'));
    const catatanField = extraFields.find((f) => f.label.toLowerCase() === 'catatan' || f.label.toLowerCase() === 'keterangan');

    transferDetails = {
      sourceBankOrWallet: paymentMethod || 'DANA',
      senderName: 'Pengirim',
      targetBankOrWallet: paymentMethod || 'DANA',
      recipientName: penerimaField?.value || '',
      recipientAccount: akunField?.value || '',
      transferStatus: 'BERHASIL',
      referenceNumber: invoiceNumber,
      notes: catatanField?.value || '',
    };
  }

  return {
    documentType,
    transaction: {
      date,
      time,
      invoiceNumber,
      cashier: 'Sistem',
    },
    transferDetails,
    extraFields,
    items,
    financials: {
      subtotal: subtotal || grandTotal,
      taxPercent: 0,
      taxAmount: 0,
      serviceCharge,
      discount,
      rounding: 0,
      grandTotal: grandTotal || subtotal,
      currency: 'IDR',
    },
    payment: {
      method: paymentMethod,
      amountPaid: grandTotal || subtotal,
      change: 0,
    },
    footer: {
      notes: '',
      policy: '',
      barcodeValue: invoiceNumber,
    },
    rawExtractedText: text,
    confidenceScore: 92,
  };
}
