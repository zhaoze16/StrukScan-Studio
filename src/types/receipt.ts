export type DocumentType = 'receipt' | 'bank_transfer' | 'qris' | 'invoice' | 'bill_payment' | 'other';

export interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
  unit?: string;
}

export interface MerchantInfo {
  name: string;
  branch?: string;
  address?: string;
  phone?: string;
  websiteOrTaxId?: string;
  logoUrl?: string;
  showLogo?: boolean;
}

export interface StoreProfile {
  name: string;
  branch?: string;
  address?: string;
  phone?: string;
  websiteOrTaxId?: string;
  defaultCashier?: string;
  defaultFooterNotes?: string;
  defaultPolicy?: string;
  logoUrl?: string;
  showLogo: boolean;
}

export interface TransactionInfo {
  date: string;
  time: string;
  invoiceNumber: string;
  cashier?: string;
  queueOrTable?: string;
}

export interface TransferDetails {
  sourceBankOrWallet?: string;
  senderName?: string;
  senderAccount?: string;
  targetBankOrWallet?: string;
  recipientName?: string;
  recipientAccount?: string;
  transferStatus?: string;
  referenceNumber?: string;
  notes?: string;
}

export interface ReceiptFinancials {
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  serviceCharge: number;
  discount: number;
  rounding: number;
  grandTotal: number;
  currency: string;
}

export interface PaymentInfo {
  method: string;
  amountPaid: number;
  change: number;
  cardLastDigits?: string;
  approvalCode?: string;
}

export interface ReceiptFooter {
  notes?: string;
  policy?: string;
  barcodeValue?: string;
}

export interface ReceiptData {
  id: string;
  createdAt: string;
  documentType: DocumentType;
  confidenceScore: number;
  merchant: MerchantInfo;
  transaction: TransactionInfo;
  transferDetails?: TransferDetails;
  items: ReceiptItem[];
  financials: ReceiptFinancials;
  payment: PaymentInfo;
  footer: ReceiptFooter;
  rawExtractedText?: string;
  originalImage?: string;
  extraFields?: { label: string; value: string }[];
}
