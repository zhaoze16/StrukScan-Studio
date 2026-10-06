import { ReceiptData } from '../types/receipt';

export interface SamplePreset {
  id: string;
  title: string;
  subtitle: string;
  category: 'minimarket' | 'cafe' | 'transfer' | 'qris' | 'ppob';
  badge: string;
  data: ReceiptData;
}

export const SAMPLE_RECEIPTS: SamplePreset[] = [
  {
    id: 'sample-brimo',
    title: 'Bukti Bayar BRImo (BPJS Kesehatan)',
    subtitle: 'Tagihan BPJS Kesehatan & Biaya Admin',
    category: 'ppob',
    badge: 'Mobile Banking',
    data: {
      id: 'REC-BRI-8812',
      createdAt: new Date().toISOString(),
      documentType: 'bill_payment',
      confidenceScore: 99,
      merchant: {
        name: 'BRImo',
        branch: '',
        address: 'PT Bank Rakyat Indonesia (Persero) Tbk',
        phone: 'Kontak BRI 1500017',
      },
      transaction: {
        date: '06 Oct 2026',
        time: '13:14:57',
        invoiceNumber: '226595393257',
        cashier: 'Sistem BRImo',
      },
      extraFields: [
        { label: 'Nomor Pembayaran', value: '8888801665704452' },
        { label: 'Nama Pelanggan', value: 'MUHAMAD YUSUP' },
        { label: 'Sumber Dana', value: 'RIZKI PERDIAN' },
        { label: 'Institusi', value: 'BPJS Kesehatan' },
        { label: 'Keterangan', value: '1005 SUKABUMI' },
        { label: 'Lokasi', value: '1005 SUKABUMI' },
        { label: 'Jumlah Keluarga', value: '3' },
        { label: 'ID Transaksi', value: '2D5959BF10383261' },
      ],
      items: [
        {
          id: 'item-bpjs-1',
          name: 'TAGIHAN BPJS KESEHATAN (MUHAMAD YUSUP)',
          quantity: 1,
          unitPrice: 105000,
          discount: 0,
          subtotal: 105000,
          unit: 'tagihan',
        },
      ],
      financials: {
        subtotal: 105000,
        taxPercent: 0,
        taxAmount: 0,
        serviceCharge: 2500,
        discount: 0,
        rounding: 0,
        grandTotal: 107500,
        currency: 'IDR',
      },
      payment: {
        method: 'DEBIT BRI (BRIMO)',
        amountPaid: 107500,
        change: 0,
        approvalCode: '2D5959BF10383261',
      },
      footer: {
        notes: 'Transaksi Berhasil. Simpan bukti ini sebagai bukti bayar sah.',
        policy: 'Layanan BPJS Kesehatan Care Center 165',
        barcodeValue: '226595393257',
      },
      rawExtractedText: `BRImo\nTransaksi Berhasil\n\nTanggal 06 Oct 2026 | 13:14:57 WIB\nNomor Referensi 226595393257\nSumber Dana RIZKI PERDIAN\n\n4090 xxx Kxxx DG\nNama Pelanggan MUHAMAD YUSUP\nNomor Pembayaran 8888801665704452\nID Transaksi 2D5959BF10383261\nInstitusi BPJS Kesehatan\nKeterangan 1005 SUKABUMI\nLokasi 1005 SUKABUMI\nJumlah Keluarga 3\nNominal Rp105.000\nBiaya Admin Rp2.500\nTotal Tagihan Rp107.500`,
    },
  },
  {
    id: 'sample-indomaret',
    title: 'Struk Belanja Minimarket',
    subtitle: 'Indomaret Point - Belanja Harian & Minuman',
    category: 'minimarket',
    badge: 'Struk Fisik',
    data: {
      id: 'REC-IDM-8921',
      createdAt: new Date().toISOString(),
      documentType: 'receipt',
      confidenceScore: 98,
      merchant: {
        name: 'INDOMARET POINT',
        branch: 'FATMAWATI 2 - JAKARTA SELATAN',
        address: 'Jl. RS Fatmawati Raya No. 42B, Cilandak',
        phone: '1500-280',
        websiteOrTaxId: 'NPWP: 01.309.283.4-092.000',
      },
      transaction: {
        date: '2025-05-18',
        time: '14:28:10',
        invoiceNumber: 'IDM/20250518/8892',
        cashier: 'Budi Santoso (K02)',
      },
      items: [
        {
          id: 'item-1',
          name: 'INDOMILK UHT CHOCO 950ML',
          quantity: 1,
          unitPrice: 19500,
          discount: 1500,
          subtotal: 18000,
          unit: 'pcs',
        },
        {
          id: 'item-2',
          name: 'ROTI TAWAR SARI ROTI SPESIAL',
          quantity: 1,
          unitPrice: 16000,
          discount: 0,
          subtotal: 16000,
          unit: 'pcs',
        },
        {
          id: 'item-3',
          name: 'AQUA AIR MINERAL 600ML',
          quantity: 3,
          unitPrice: 3500,
          discount: 0,
          subtotal: 10500,
          unit: 'botol',
        },
        {
          id: 'item-4',
          name: 'CHITATO SAPI PANGGANG 68G',
          quantity: 2,
          unitPrice: 11200,
          discount: 2400,
          subtotal: 20000,
          unit: 'pcs',
        },
      ],
      financials: {
        subtotal: 68400,
        taxPercent: 11,
        taxAmount: 6390,
        serviceCharge: 0,
        discount: 3900,
        rounding: 0,
        grandTotal: 64500,
        currency: 'IDR',
      },
      payment: {
        method: 'TUNAI',
        amountPaid: 100000,
        change: 35500,
        approvalCode: '902188',
      },
      footer: {
        notes: 'Terima kasih telah berbelanja di Indomaret Point. Layanan konsumen SMS/WA: 0816-500-280',
        policy: 'Barang promo tidak dapat dikembalikan tanpa bukti struk fisik.',
        barcodeValue: '8991209384721',
      },
      rawExtractedText: `INDOMARET POINT
FATMAWATI 2 - JAKARTA SELATAN
JL. RS FATMAWATI RAYA NO. 42B
NPWP: 01.309.283.4-092.000
--------------------------------
NO: IDM/20250518/8892
TGL: 18-05-2025  14:28:10
KASIR: BUDI SANTOSO (K02)
================================
INDOMILK UHT CHOCO 950ML
  1 x 19.500            19.500
  (Diskon)              -1.500
ROTI TAWAR SARI ROTI SPESIAL
  1 x 16.000            16.000
AQUA AIR MINERAL 600ML
  3 x 3.500             10.500
CHITATO SAPI PANGGANG 68G
  2 x 11.200            22.400
  (Diskon)              -2.400
--------------------------------
SUBTOTAL:               68.400
TOTAL DISKON:           -3.900
PPN (11%):               6.390
TOTAL BELANJA:          64.500
TUNAI:                 100.000
KEMBALIAN:              35.500
================================
TERIMA KASIH TELAH BERBELANJA`,
    },
  },
  {
    id: 'sample-cafe',
    title: 'Nota Kafe & Restoran',
    subtitle: 'Kopi Kenangan Mantan & Toast Dine-In',
    category: 'cafe',
    badge: 'Struk Meja/Resto',
    data: {
      id: 'REC-KOP-4011',
      createdAt: new Date().toISOString(),
      documentType: 'receipt',
      confidenceScore: 99,
      merchant: {
        name: 'KOPI KENANGAN',
        branch: 'OUTLET GRAND INDONESIA LV 3A',
        address: 'Jl. M.H. Thamrin No.1, Jakarta Pusat',
        phone: '021-23580001',
        websiteOrTaxId: 'PT BUMI BERKAH BOGA',
      },
      transaction: {
        date: '2025-05-19',
        time: '16:45:22',
        invoiceNumber: 'KK-GI-2025-04192',
        cashier: 'Siti Sarah',
        queueOrTable: 'Meja 14 (Dine-In)',
      },
      items: [
        {
          id: 'item-101',
          name: 'KOPI KENANGAN MANTAN (L)',
          quantity: 2,
          unitPrice: 24000,
          discount: 0,
          subtotal: 48000,
          unit: 'cup',
        },
        {
          id: 'item-102',
          name: 'SMOKED BEEF & CHEESE TOAST',
          quantity: 1,
          unitPrice: 32000,
          discount: 0,
          subtotal: 32000,
          unit: 'porsi',
        },
        {
          id: 'item-103',
          name: 'EARL GREY TEA (REGULAR)',
          quantity: 1,
          unitPrice: 18000,
          discount: 0,
          subtotal: 18000,
          unit: 'cup',
        },
      ],
      financials: {
        subtotal: 98000,
        taxPercent: 10,
        taxAmount: 9800,
        serviceCharge: 4900,
        discount: 0,
        rounding: 0,
        grandTotal: 112700,
        currency: 'IDR',
      },
      payment: {
        method: 'QRIS BCA',
        amountPaid: 112700,
        change: 0,
        approvalCode: 'QRIS-OK-98412',
      },
      footer: {
        notes: 'Cita Rasa Kopi Kenangan yang Selalu Membekas. Follow IG @kopikenangan.id',
        policy: 'Wifi ID: KenanganFree / Pass: senyumanmu',
        barcodeValue: 'KK202504192MEJA14',
      },
      rawExtractedText: `KOPI KENANGAN
OUTLET GRAND INDONESIA LV 3A
JL. M.H. THAMRIN NO.1
--------------------------------
NO: KK-GI-2025-04192
WAKTU: 19-05-2025 16:45:22
KASIR: SITI SARAH
MEJA: 14 (DINE-IN)
================================
KOPI KENANGAN MANTAN (L)
  2 x 24.000            48.000
SMOKED BEEF & CHEESE TOAST
  1 x 32.000            32.000
EARL GREY TEA (REGULAR)
  1 x 18.000            18.000
--------------------------------
SUBTOTAL                98.000
PB1 (10%)                9.800
SERVICE CHARGE (5%)      4.900
TOTAL                  112.700
BAYAR (QRIS BCA)       112.700
KEMBALIAN                    0
================================
WIFI: KenanganFree / senyumanmu`,
    },
  },
  {
    id: 'sample-bca',
    title: 'Bukti Transfer Bank (m-BCA)',
    subtitle: 'Transfer Antar Rekening Berhasil',
    category: 'transfer',
    badge: 'Mobile Banking',
    data: {
      id: 'REC-BCA-9921',
      createdAt: new Date().toISOString(),
      documentType: 'bank_transfer',
      confidenceScore: 99,
      merchant: {
        name: 'BCA MOBILE',
        branch: 'm-Transfer BCA',
        address: 'PT Bank Central Asia Tbk',
        phone: 'Halo BCA 1500888',
      },
      transaction: {
        date: '2025-05-20',
        time: '10:14:03',
        invoiceNumber: 'TRX-82910481920',
        cashier: 'Sistem Otomatis',
      },
      transferDetails: {
        sourceBankOrWallet: 'BCA',
        senderName: 'AHMAD FAUZI',
        senderAccount: '527189****',
        targetBankOrWallet: 'BCA',
        recipientName: 'RIZKI PRADANA',
        recipientAccount: '8820491029',
        transferStatus: 'BERHASIL',
        referenceNumber: 'REF/BCA/20250520/4910',
        notes: 'Pelunasan invoice percetakan bulan Mei',
      },
      items: [
        {
          id: 'item-trx',
          name: 'TRANSFER KE RIZKI PRADANA (BCA 8820491029)',
          quantity: 1,
          unitPrice: 1500000,
          discount: 0,
          subtotal: 1500000,
          unit: 'transaksi',
        },
      ],
      financials: {
        subtotal: 1500000,
        taxPercent: 0,
        taxAmount: 0,
        serviceCharge: 0,
        discount: 0,
        rounding: 0,
        grandTotal: 1500000,
        currency: 'IDR',
      },
      payment: {
        method: 'M-TRANSFER BCA',
        amountPaid: 1500000,
        change: 0,
        approvalCode: 'AUTH-OK-55912',
      },
      footer: {
        notes: 'Simpan bukti transaksi ini sebagai bukti pembayaran yang sah.',
        policy: 'Transaksi diproses secara real-time tanpa biaya admin.',
        barcodeValue: 'REF-BCA-20250520-4910',
      },
      rawExtractedText: `m-Transfer:
BERHASIL
20/05/2025 10:14:03
Nomor Referensi: REF/BCA/20250520/4910
Jumlah: Rp 1.500.000,00
Dari Rekening: 527189**** - AHMAD FAUZI
Ke Rekening: 8820491029
Nama Penerima: RIZKI PRADANA
Berita: Pelunasan invoice percetakan bulan Mei
Biaya Admin: Rp 0,00`,
    },
  },
  {
    id: 'sample-qris',
    title: 'Bukti Pembayaran QRIS',
    subtitle: 'Warung Makan Padang Sederhana',
    category: 'qris',
    badge: 'QRIS Nasional',
    data: {
      id: 'REC-QRS-3301',
      createdAt: new Date().toISOString(),
      documentType: 'qris',
      confidenceScore: 97,
      merchant: {
        name: 'RM PADANG SALERO KITO',
        branch: 'CABANG TEBET',
        address: 'Jl. Tebet Barat Dalam Raya No. 12',
        phone: '0812-9988-7766',
        websiteOrTaxId: 'NMID: ID1020048192837',
      },
      transaction: {
        date: '2025-05-20',
        time: '12:35:48',
        invoiceNumber: 'NMID/SK/99120',
        cashier: 'Uda Hendra',
      },
      items: [
        {
          id: 'item-q1',
          name: 'PAKET NASI RENDANG DAGING',
          quantity: 2,
          unitPrice: 28000,
          discount: 0,
          subtotal: 56000,
          unit: 'porsi',
        },
        {
          id: 'item-q2',
          name: 'AYAM POP GORENG',
          quantity: 1,
          unitPrice: 22000,
          discount: 0,
          subtotal: 22000,
          unit: 'porsi',
        },
        {
          id: 'item-q3',
          name: 'ES TEH MANIS JUMBO',
          quantity: 3,
          unitPrice: 6000,
          discount: 0,
          subtotal: 18000,
          unit: 'gelas',
        },
      ],
      financials: {
        subtotal: 96000,
        taxPercent: 0,
        taxAmount: 0,
        serviceCharge: 0,
        discount: 0,
        rounding: 0,
        grandTotal: 96000,
        currency: 'IDR',
      },
      payment: {
        method: 'QRIS DANA',
        amountPaid: 96000,
        change: 0,
        approvalCode: 'RRN-99827102938',
      },
      footer: {
        notes: 'Tarimo Kasih Banyak Sanak. Salero Kito Rancak Bana!',
        policy: 'Tercetak otomatis melalui QRIS Payment Gateway',
        barcodeValue: 'ID1020048192837',
      },
      rawExtractedText: `RM PADANG SALERO KITO
CABANG TEBET
NMID: ID1020048192837
--------------------------------
NO: NMID/SK/99120
TGL: 20-05-2025 12:35:48
KASIR: UDA HENDRA
================================
PAKET NASI RENDANG DAGING
  2 x 28.000            56.000
AYAM POP GORENG
  1 x 22.000            22.000
ES TEH MANIS JUMBO
  3 x 6.000             18.000
--------------------------------
TOTAL HARGA             96.000
PEMBAYARAN QRIS         96.000
RRN: 99827102938
STATUS: BERHASIL
================================
TARIMO KASIH SANAK!`,
    },
  },
];
