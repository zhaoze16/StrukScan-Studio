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

  // 6. Footer & Notes (only render if there is actual content, to save paper)
  const hasFooterNotes = Boolean(receipt.footer.notes && receipt.footer.notes.trim());
  const hasFooterPolicy = Boolean(receipt.footer.policy && receipt.footer.policy.trim());
  const hasBarcode = Boolean(receipt.footer.barcodeValue && receipt.footer.barcodeValue.trim());

  if (hasFooterNotes || hasFooterPolicy || hasBarcode) {
    lines.push(doubleDivider);
    if (hasFooterNotes) {
      lines.push(padCenter(receipt.footer.notes!.trim(), width));
    }
    if (hasFooterPolicy) {
      lines.push(padCenter(receipt.footer.policy!.trim(), width));
    }
    if (hasBarcode) {
      lines.push(padCenter(`* ${receipt.footer.barcodeValue!.trim()} *`, width));
    }
  }

  return lines.join('\n');
}

export interface EscPosOptions {
  cutPaper?: boolean;
  feedLines?: number;
  logoBytes?: Uint8Array | null;
}

/**
 * Convert an HTMLImageElement to 1-bit bitonal ESC/POS raster bitmap command bytes
 */
export function convertImageToEscPos(img: HTMLImageElement, targetWidth = 160): Uint8Array {
  // Ensure width is a multiple of 8 (e.g. 160, 240)
  const width = Math.floor(targetWidth / 8) * 8;
  const scale = width / img.width;
  const height = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new Uint8Array(0);

  // Handle transparency by filling white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Convert pixels to bitonal bytes (8 horizontal dots per byte)
  const bytesWidth = width / 8;
  const escPosData = new Uint8Array(bytesWidth * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < bytesWidth; x++) {
      let byteVal = 0;
      for (let bit = 0; x * 8 + bit < width && bit < 8; bit++) {
        const pxIdx = (y * width + (x * 8 + bit)) * 4;
        const r = data[pxIdx];
        const g = data[pxIdx + 1];
        const b = data[pxIdx + 2];
        const a = data[pxIdx + 3];

        // Lightness / luma thresholding
        const luma = a < 128 ? 255 : 0.299 * r + 0.587 * g + 0.114 * b;
        if (luma < 128) {
          byteVal |= (1 << (7 - bit));
        }
      }
      escPosData[y * bytesWidth + x] = byteVal;
    }
  }

  // GS v 0 0 xL xH yL yH (0x1D 0x76 0x30 0x00 ...)
  const xL = bytesWidth & 0xFF;
  const xH = (bytesWidth >> 8) & 0xFF;
  const yL = height & 0xFF;
  const yH = (height >> 8) & 0xFF;

  const header = new Uint8Array([0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH]);

  // Command wrappers:
  // ESC a 1 (Align center) : 0x1B, 0x61, 0x01
  // ESC a 0 (Align left) : 0x1B, 0x61, 0x00
  // LF (line feed) : 0x0a
  const alignCenter = new Uint8Array([0x1b, 0x61, 0x01]);
  const alignLeft = new Uint8Array([0x1b, 0x61, 0x00, 0x0a]);

  const finalBytes = new Uint8Array(alignCenter.length + header.length + escPosData.length + alignLeft.length);
  finalBytes.set(alignCenter, 0);
  finalBytes.set(header, alignCenter.length);
  finalBytes.set(escPosData, alignCenter.length + header.length);
  finalBytes.set(alignLeft, alignCenter.length + header.length + escPosData.length);

  return finalBytes;
}

/**
 * Generate binary ESC/POS byte sequence for Bluetooth Thermal Printers
 * Supports paper-saving options (feedLines & cutPaper toggle).
 * Portable 58mm bluetooth printers should have cutPaper: false to avoid excessive blank feed.
 */
export function generateEscPosBytes(
  receipt: ReceiptData,
  width: 32 | 48 = 32,
  options: EscPosOptions = {}
): Uint8Array {
  const { cutPaper = false, feedLines = 2, logoBytes = null } = options;
  let text = formatReceiptToThermalText(receipt, width);

  // If we have actual graphic logo bytes, strip the text fallback "[ LOGO TOKO ]"
  if (logoBytes && logoBytes.length > 0) {
    const logoPlaceholder = padCenter('[ LOGO TOKO ]', width);
    text = text.replace(logoPlaceholder, '');
    text = text.replace(/^\n+/, ''); // strip leading empty lines
  }

  const encoder = new TextEncoder();
  const textBytes = encoder.encode(text);

  // Standard ESC/POS commands:
  // ESC @ (Initialize printer) : 0x1B, 0x40
  // ESC t 0 (Character code table PC437) : 0x1B, 0x74, 0x00
  const init = new Uint8Array([0x1b, 0x40, 0x1b, 0x74, 0x00]);

  // Construct trailing commands (feed and optional cut)
  const trailingBytes: number[] = [];
  const numFeeds = Math.max(0, Math.min(6, feedLines));
  for (let i = 0; i < numFeeds; i++) {
    trailingBytes.push(0x0a);
  }

  if (cutPaper) {
    trailingBytes.push(0x1d, 0x56, 0x41, 0x00);
  }

  const trailing = new Uint8Array(trailingBytes);

  const hasLogo = logoBytes && logoBytes.length > 0;
  const logoLen = hasLogo ? logoBytes!.length : 0;

  const totalLength = init.length + logoLen + textBytes.length + trailing.length;
  const result = new Uint8Array(totalLength);

  let offset = 0;
  result.set(init, offset);
  offset += init.length;

  if (hasLogo) {
    result.set(logoBytes!, offset);
    offset += logoBytes!.length;
  }

  result.set(textBytes, offset);
  offset += textBytes.length;

  result.set(trailing, offset);

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

/**
 * Ensure a logo URL (especially raw SVG XML data URLs) is robustly encoded in Base64
 * to avoid canvas security/loading issues in some browsers or environments.
 */
export function ensureBase64LogoUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('data:image/svg+xml')) {
    if (url.includes('utf8,') || !url.includes('base64,')) {
      try {
        const parts = url.split(',');
        if (parts.length > 1) {
          const rawContent = decodeURIComponent(parts[1]);
          // Standard web-safe base64 conversion
          const base64Content = btoa(unescape(encodeURIComponent(rawContent)));
          return `data:image/svg+xml;base64,${base64Content}`;
        }
      } catch (e) {
        console.error('Failed to convert SVG to base64:', e);
      }
    }
  }
  return url;
}

