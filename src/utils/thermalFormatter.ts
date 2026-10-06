import { ReceiptData } from '../types/receipt';

export function formatCurrency(amount: number | undefined | null, showPrefix = true): string {
  if (amount === undefined || amount === null || isNaN(amount)) return showPrefix ? 'Rp 0' : '0';
  const formatted = Math.round(amount).toLocaleString('id-ID');
  return showPrefix ? `Rp ${formatted}` : formatted;
}

export function padCenter(text: string, width: number): string {
  if (text.length >= width) return text.substring(0, width);
  const leftPad = Math.floor((width - text.length) / 2);
  const rightPad = width - text.length - leftPad;
  return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
}

export function padJustify(left: string, right: string, width: number): string {
  const totalLength = left.length + right.length;
  if (totalLength >= width) {
    const availableLeft = Math.max(3, width - right.length - 1);
    const truncatedLeft = left.substring(0, availableLeft);
    const spaces = Math.max(1, width - truncatedLeft.length - right.length);
    return truncatedLeft + ' '.repeat(spaces) + right;
  }
  const spaces = width - totalLength;
  return left + ' '.repeat(spaces) + right;
}

/**
 * Format Receipt Data into pure monospaced thermal text (58mm = 32 chars, 80mm = 48 chars)
 */
export function formatReceiptToThermalText(receipt: ReceiptData, width: 32 | 48 = 32): string {
  const lineDivider = '-'.repeat(width);
  const doubleDivider = '='.repeat(width);
  const lines: string[] = [];

  // 1. Merchant Header
  if (receipt.merchant.showLogo !== false && receipt.merchant.logoUrl) {
    lines.push(padCenter('[ LOGO TOKO ]', width));
  }
  if (receipt.merchant.name) {
    lines.push(padCenter(receipt.merchant.name.toUpperCase(), width));
  }
  if (receipt.merchant.branch) {
    lines.push(padCenter(receipt.merchant.branch, width));
  }
  if (receipt.merchant.address) {
    // Split long address into multiple lines
    const words = receipt.merchant.address.split(' ');
    let currentLine = '';
    for (const word of words) {
      if ((currentLine + ' ' + word).trim().length <= width) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        if (currentLine) lines.push(padCenter(currentLine, width));
        currentLine = word;
      }
    }
    if (currentLine) lines.push(padCenter(currentLine, width));
  }
  if (receipt.merchant.phone) {
    lines.push(padCenter(`Telp: ${receipt.merchant.phone}`, width));
  }
  if (receipt.merchant.websiteOrTaxId) {
    lines.push(padCenter(receipt.merchant.websiteOrTaxId, width));
  }

  lines.push(lineDivider);

  // 2. Transaction Meta
  if (receipt.transaction.invoiceNumber) {
    lines.push(padJustify('No:', receipt.transaction.invoiceNumber, width));
  }
  const dateStr = receipt.transaction.date || '';
  const timeStr = receipt.transaction.time || '';
  if (dateStr || timeStr) {
    lines.push(padJustify('Waktu:', `${dateStr} ${timeStr}`.trim(), width));
  }
  if (receipt.transaction.cashier) {
    lines.push(padJustify('Kasir:', receipt.transaction.cashier, width));
  }
  if (receipt.transaction.queueOrTable) {
    lines.push(padJustify('Meja/Antrian:', receipt.transaction.queueOrTable, width));
  }

  // Transfer specific details if bank transfer
  if (receipt.documentType === 'bank_transfer' && receipt.transferDetails) {
    lines.push(lineDivider);
    lines.push(padCenter('BUKTI TRANSFER', width));
    if (receipt.transferDetails.sourceBankOrWallet) {
      lines.push(padJustify('Bank Asal:', receipt.transferDetails.sourceBankOrWallet, width));
    }
    if (receipt.transferDetails.senderName) {
      lines.push(padJustify('Pengirim:', receipt.transferDetails.senderName, width));
    }
    if (receipt.transferDetails.targetBankOrWallet) {
      lines.push(padJustify('Bank Tujuan:', receipt.transferDetails.targetBankOrWallet, width));
    }
    if (receipt.transferDetails.recipientName) {
      lines.push(padJustify('Penerima:', receipt.transferDetails.recipientName, width));
    }
    if (receipt.transferDetails.recipientAccount) {
      lines.push(padJustify('No Rekening:', receipt.transferDetails.recipientAccount, width));
    }
    if (receipt.transferDetails.transferStatus) {
      lines.push(padJustify('Status:', `[${receipt.transferDetails.transferStatus.toUpperCase()}]`, width));
    }
    if (receipt.transferDetails.referenceNumber) {
      lines.push(padJustify('Ref:', receipt.transferDetails.referenceNumber, width));
    }
  }

  // Extra Fields
  if (receipt.extraFields && receipt.extraFields.length > 0) {
    lines.push(lineDivider);
    for (const field of receipt.extraFields) {
      lines.push(padJustify(field.label + ':', field.value, width));
    }
  }

  lines.push(doubleDivider);

  // 3. Item List
  if (receipt.items && receipt.items.length > 0) {
    for (const item of receipt.items) {
      lines.push(item.name);
      const qtyPrice = `${item.quantity} x ${formatCurrency(item.unitPrice, false)}`;
      const subtotalStr = formatCurrency(item.subtotal, false);
      lines.push(padJustify(`  ${qtyPrice}`, subtotalStr, width));
      if (item.discount && item.discount > 0) {
        lines.push(padJustify('  (Diskon)', `-${formatCurrency(item.discount, false)}`, width));
      }
    }
  } else {
    lines.push(padCenter('(Tidak ada item belanja)', width));
  }

  lines.push(lineDivider);

  // 4. Financials
  if (receipt.financials.subtotal !== undefined && receipt.financials.subtotal !== receipt.financials.grandTotal) {
    lines.push(padJustify('Subtotal', formatCurrency(receipt.financials.subtotal, false), width));
  }
  if (receipt.financials.discount && receipt.financials.discount > 0) {
    lines.push(padJustify('Diskon', `-${formatCurrency(receipt.financials.discount, false)}`, width));
  }
  if (receipt.financials.taxAmount && receipt.financials.taxAmount > 0) {
    const taxLabel = receipt.financials.taxPercent ? `PPN (${receipt.financials.taxPercent}%)` : 'PPN / Pajak';
    lines.push(padJustify(taxLabel, formatCurrency(receipt.financials.taxAmount, false), width));
  }
  if (receipt.financials.serviceCharge && receipt.financials.serviceCharge > 0) {
    lines.push(padJustify('Biaya Layanan', formatCurrency(receipt.financials.serviceCharge, false), width));
  }
  if (receipt.financials.rounding && receipt.financials.rounding !== 0) {
    lines.push(padJustify('Pembulatan', formatCurrency(receipt.financials.rounding, false), width));
  }

  lines.push(padJustify('TOTAL', formatCurrency(receipt.financials.grandTotal, true), width));
  lines.push(lineDivider);

  // 5. Payment details
  if (receipt.payment.method) {
    lines.push(padJustify('Bayar (' + receipt.payment.method + ')', formatCurrency(receipt.payment.amountPaid || receipt.financials.grandTotal, false), width));
  }
  if (receipt.payment.change !== undefined && receipt.payment.change > 0) {
    lines.push(padJustify('Kembalian', formatCurrency(receipt.payment.change, false), width));
  }
  if (receipt.payment.approvalCode) {
    lines.push(padJustify('Approval Code:', receipt.payment.approvalCode, width));
  }

  lines.push(doubleDivider);

  // 6. Footer & Notes
  if (receipt.footer.notes) {
    lines.push(padCenter(receipt.footer.notes, width));
  }
  if (receipt.footer.policy) {
    lines.push(padCenter(receipt.footer.policy, width));
  }
  if (receipt.footer.barcodeValue) {
    lines.push(padCenter(`* ${receipt.footer.barcodeValue} *`, width));
  }

  lines.push('');
  lines.push(padCenter('=== STRUK RESMI ===', width));

  return lines.join('\n');
}

/**
 * Generate binary ESC/POS byte sequence for Bluetooth Thermal Printers
 */
export function generateEscPosBytes(receipt: ReceiptData, width: 32 | 48 = 32): Uint8Array {
  const text = formatReceiptToThermalText(receipt, width);
  const encoder = new TextEncoder();
  const textBytes = encoder.encode(text);

  // Standard ESC/POS commands:
  // ESC @ (Initialize printer) : 0x1B, 0x40
  // ESC t 0 (Character code table PC437) : 0x1B, 0x74, 0x00
  // GS V 65 0 (Cut paper) : 0x1D, 0x56, 0x41, 0x00
  const init = new Uint8Array([0x1b, 0x40, 0x1b, 0x74, 0x00]);
  const feedAndCut = new Uint8Array([0x0a, 0x0a, 0x0a, 0x1d, 0x56, 0x41, 0x00]);

  const totalLength = init.length + textBytes.length + feedAndCut.length;
  const result = new Uint8Array(totalLength);
  result.set(init, 0);
  result.set(textBytes, init.length);
  result.set(feedAndCut, init.length + textBytes.length);

  return result;
}

/**
 * Format bytes to readable HEX stream representation (e.g., 1B 40 1B 74 ...)
 */
export function bytesToHexString(bytes: Uint8Array): string {
  const hexArray: string[] = [];
  for (let i = 0; i < Math.min(bytes.length, 128); i++) {
    hexArray.push(bytes[i].toString(16).padStart(2, '0').toUpperCase());
  }
  if (bytes.length > 128) {
    hexArray.push(`... (${bytes.length - 128} bytes more)`);
  }
  return hexArray.join(' ');
}
