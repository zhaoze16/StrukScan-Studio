import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  RotateCw,
  Sliders,
  X,
  Scan,
  Crop,
  Check,
  RotateCcw,
  Sparkles,
  Scissors,
  FileImage,
  Layers,
} from 'lucide-react';
import Tesseract from 'tesseract.js';
import { SAMPLE_RECEIPTS, SamplePreset } from '../utils/sampleReceipts';
import { ReceiptData } from '../types/receipt';
import { parseReceiptText } from '../utils/textParser';

interface ImageUploaderProps {
  onProcessImage: (data: ReceiptData) => void;
  onSelectSample: (sample: SamplePreset) => void;
  isProcessing: boolean;
  setIsProcessing: (val: boolean) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onProcessImage,
  onSelectSample,
  isProcessing,
  setIsProcessing,
}) => {
  // Original uploaded image URL (unmodified)
  const [rawOriginalImage, setRawOriginalImage] = useState<string | null>(null);
  // Current active image URL (after rotation/crop)
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [rotation, setRotation] = useState<number>(0);
  const [enhanceContrast, setEnhanceContrast] = useState<boolean>(false);

  // Crop Modal state
  const [isCropping, setIsCropping] = useState<boolean>(false);
  const [cropTop, setCropTop] = useState<number>(0);
  const [cropBottom, setCropBottom] = useState<number>(0);
  const [cropLeft, setCropLeft] = useState<number>(0);
  const [cropRight, setCropRight] = useState<number>(0);
  const [isCropped, setIsCropped] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const imgData = event.target?.result as string;
      setRawOriginalImage(imgData);
      setSelectedImage(imgData);
      setRotation(0);
      setCropTop(0);
      setCropBottom(0);
      setCropLeft(0);
      setCropRight(0);
      setIsCropped(false);
    };
    reader.readAsDataURL(file);
  };

  const handleOpenCropModal = () => {
    if (!selectedImage) return;
    setIsCropping(true);
  };

  // Apply Crop to Image using Canvas
  const handleApplyCrop = async () => {
    const sourceImage = rawOriginalImage || selectedImage;
    if (!sourceImage) return;

    try {
      const img = new Image();
      img.src = sourceImage;
      await new Promise((res) => (img.onload = res));

      const origWidth = img.width;
      const origHeight = img.height;

      // Calculate pixel coordinates for crop
      const startX = Math.floor((cropLeft / 100) * origWidth);
      const startY = Math.floor((cropTop / 100) * origHeight);
      const cropW = Math.max(20, Math.floor(origWidth * (1 - (cropLeft + cropRight) / 100)));
      const cropH = Math.max(20, Math.floor(origHeight * (1 - (cropTop + cropBottom) / 100)));

      const canvas = document.createElement('canvas');
      canvas.width = cropW;
      canvas.height = cropH;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, startX, startY, cropW, cropH, 0, 0, cropW, cropH);
        const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        setSelectedImage(croppedDataUrl);
        setIsCropped(true);
      }
    } catch (err) {
      console.error('Failed to crop image', err);
    } finally {
      setIsCropping(false);
    }
  };

  // Reset image to raw original upload
  const handleResetImage = () => {
    if (rawOriginalImage) {
      setSelectedImage(rawOriginalImage);
      setRotation(0);
      setCropTop(0);
      setCropBottom(0);
      setCropLeft(0);
      setCropRight(0);
      setIsCropped(false);
    }
  };

  const handleRunOcr = async () => {
    if (!selectedImage) return;
    setIsProcessing(true);

    try {
      // Apply Rotation / Contrast if active
      let imageToProcess = selectedImage;
      if (rotation !== 0 || enhanceContrast) {
        const img = new Image();
        img.src = selectedImage;
        await new Promise((res) => (img.onload = res));

        const canvas = document.createElement('canvas');
        canvas.width = rotation === 90 || rotation === 270 ? img.height : img.width;
        canvas.height = rotation === 90 || rotation === 270 ? img.width : img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (enhanceContrast) {
            ctx.filter = 'contrast(1.4) brightness(1.05)';
          }
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((rotation * Math.PI) / 180);
          ctx.drawImage(img, -img.width / 2, -img.height / 2);
          imageToProcess = canvas.toDataURL('image/jpeg', 0.95);
        }
      }

      // Tesseract OCR
      const {
        data: { text },
      } = await Tesseract.recognize(imageToProcess, 'ind', {
        logger: (m) => console.log(m),
      });

      console.log('Tesseract OCR Output:', text);

      // Parse text into structured receipt data
      const parsedData = parseReceiptText(text);

      const finalReceipt: ReceiptData = {
        id: `REC-${Date.now()}`,
        createdAt: new Date().toISOString(),
        documentType: parsedData.documentType || 'receipt',
        merchant: { name: 'TOKO SAYA' },
        transaction: parsedData.transaction || { date: '', time: '', invoiceNumber: '' },
        transferDetails: parsedData.transferDetails,
        extraFields: parsedData.extraFields || [],
        items: parsedData.items || [],
        financials: parsedData.financials || {
          subtotal: 0,
          taxPercent: 0,
          taxAmount: 0,
          serviceCharge: 0,
          discount: 0,
          rounding: 0,
          grandTotal: 0,
          currency: 'IDR',
        },
        payment: parsedData.payment || { method: 'TUNAI', amountPaid: 0, change: 0 },
        footer: parsedData.footer || { notes: '', policy: '', barcodeValue: '' },
        rawExtractedText: text,
        confidenceScore: parsedData.confidenceScore || 90,
        originalImage: imageToProcess,
      };

      onProcessImage(finalReceipt);
    } catch (err) {
      console.error('OCR Error:', err);
      alert('Gagal memproses gambar. Coba lagi.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4 lg:p-6 shadow-xl backdrop-blur-md space-y-5">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h3 className="font-semibold text-slate-100 flex items-center gap-2">
            <Scan className="w-5 h-5 text-emerald-400" />
            Pindai Struk & Potong Area Gambar
          </h3>
          <p className="text-xs text-slate-400">
            Unggah foto struk, potong area penting untuk hasil OCR yang presisi dan akurat.
          </p>
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
        >
          <Upload className="w-4 h-4" />
          <span>Pilih File Gambar</span>
        </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Upload Workspace */}
      {selectedImage ? (
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 p-3 flex flex-col items-center shadow-inner">
            {/* Image Crop Status Badge */}
            {isCropped && (
              <div className="mb-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold border border-emerald-500/40">
                <Scissors className="w-3.5 h-3.5 text-emerald-400" />
                <span>Gambar Telah Dipotong (Fokus Area)</span>
              </div>
            )}

            {/* Main Preview Frame */}
            <div
              className="transition-all duration-200"
              style={{
                transform: `rotate(${rotation}deg)`,
                filter: enhanceContrast ? 'contrast(1.4) brightness(1.05)' : 'none',
              }}
            >
              <img
                src={selectedImage}
                alt="Pratinjau Struk"
                className="max-h-80 mx-auto rounded-xl object-contain shadow-md"
              />
            </div>

            {/* Action Bar Under Image */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4 pt-3 border-t border-slate-800/80 w-full">
              {/* Crop Button */}
              <button
                type="button"
                onClick={handleOpenCropModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-all active:scale-95"
                title="Potong area gambar untuk fokus pada teks struk"
              >
                <Crop className="w-4 h-4 text-emerald-400" />
                <span>Potong Gambar (Crop)</span>
              </button>

              {/* Rotate Button */}
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-all active:scale-95"
                title="Putar gambar 90 derajat"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              {/* High Contrast Filter Button */}
              <button
                type="button"
                onClick={() => setEnhanceContrast(!enhanceContrast)}
                className={`p-2 rounded-xl border text-xs transition-all active:scale-95 ${
                  enhanceContrast
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title="Tingkatkan kontras teks untuk OCR"
              >
                <Sliders className="w-4 h-4" />
              </button>

              {/* Reset to Raw Original */}
              {isCropped && (
                <button
                  type="button"
                  onClick={handleResetImage}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition-all active:scale-95"
                  title="Kembalikan ke gambar asli sebelum dipotong"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}

              {/* Clear Selection Button */}
              <button
                type="button"
                onClick={() => {
                  setSelectedImage(null);
                  setRawOriginalImage(null);
                }}
                className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 transition-all active:scale-95"
                title="Hapus gambar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Start OCR Processing Button */}
          <button
            type="button"
            onClick={handleRunOcr}
            disabled={isProcessing}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/40 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Scan className="w-4 h-4" />
            <span>{isProcessing ? 'Memproses OCR Tesseract...' : 'Mulai Ekstraksi OCR'}</span>
          </button>
        </div>
      ) : (
        /* Empty State / Preset Samples */
        <div className="space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="p-8 border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-2xl bg-slate-950/40 hover:bg-slate-950/80 transition-all cursor-pointer text-center space-y-3 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold text-slate-200 text-sm">
                Klik untuk Memilih Foto Struk / Tangkapan Layar
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Mendukung format JPG, PNG, WEBP (Tampilan HP, QRIS, BRImo, Indomaret, dll)
              </p>
            </div>
          </div>

          {/* Preset Samples */}
          <div>
            <span className="text-xs text-slate-400 font-semibold block mb-2">
              Atau Pilih Contoh Contoh Struk / Bukti Transfer:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SAMPLE_RECEIPTS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelectSample(preset)}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-left transition-all group"
                >
                  <span className="font-bold text-xs text-slate-200 block truncate group-hover:text-emerald-300">
                    {preset.title}
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate mt-0.5">
                    {preset.category}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE CROPPER MODAL */}
      {isCropping && (selectedImage || rawOriginalImage) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/80">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Crop className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-100 text-sm">
                    Potong Area Gambar (Crop Editor)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Geser pemotong untuk fokus hanya pada data rincian transaksi struk
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCropping(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              {/* Quick Presets for Screen Cropping */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[11px] font-semibold text-slate-300">
                  Opsi Cepat Pemotongan:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCropTop(12);
                      setCropBottom(12);
                      setCropLeft(0);
                      setCropRight(0);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition-all"
                  >
                    📱 Potong Status Bar HP
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCropTop(20);
                      setCropBottom(15);
                      setCropLeft(5);
                      setCropRight(5);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition-all"
                  >
                    🧾 Fokus Area Tengah
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCropTop(0);
                      setCropBottom(0);
                      setCropLeft(0);
                      setCropRight(0);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition-all"
                  >
                    🎯 Semua (100%)
                  </button>
                </div>
              </div>

              {/* Crop Canvas Display with Darkened Mask Overlay */}
              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-black p-2 flex justify-center items-center min-h-[260px] max-h-[380px]">
                <div className="relative max-h-[340px] select-none">
                  <img
                    src={rawOriginalImage || selectedImage || ''}
                    alt="Area Crop"
                    className="max-h-[340px] object-contain mx-auto block"
                  />

                  {/* Darkened Overlay for Cropped Area */}
                  <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-[1px] pointer-events-none"
                    style={{
                      clipPath: `polygon(
                        0% 0%, 100% 0%, 100% 100%, 0% 100%,
                        0% 0%,
                        ${cropLeft}% ${cropTop}%,
                        ${cropLeft}% ${100 - cropBottom}%,
                        ${100 - cropRight}% ${100 - cropBottom}%,
                        ${100 - cropRight}% ${cropTop}%,
                        ${cropLeft}% ${cropTop}%
                      )`,
                    }}
                  />

                  {/* Highlight Crop Box */}
                  <div
                    className="absolute border-2 border-emerald-400 bg-emerald-500/10 shadow-2xl transition-all"
                    style={{
                      top: `${cropTop}%`,
                      bottom: `${cropBottom}%`,
                      left: `${cropLeft}%`,
                      right: `${cropRight}%`,
                    }}
                  >
                    {/* Grid guides inside crop box */}
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                      <div className="border-r border-b border-emerald-300/40"></div>
                      <div className="border-r border-b border-emerald-300/40"></div>
                      <div className="border-b border-emerald-300/40"></div>
                      <div className="border-r border-b border-emerald-300/40"></div>
                      <div className="border-r border-b border-emerald-300/40"></div>
                      <div className="border-b border-emerald-300/40"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sliders for Precision Control */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px]">
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Atas (Top)</span>
                    <span className="font-mono text-emerald-400">{cropTop}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="45"
                    value={cropTop}
                    onChange={(e) => setCropTop(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Bawah (Bottom)</span>
                    <span className="font-mono text-emerald-400">{cropBottom}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="45"
                    value={cropBottom}
                    onChange={(e) => setCropBottom(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Kiri (Left)</span>
                    <span className="font-mono text-emerald-400">{cropLeft}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="45"
                    value={cropLeft}
                    onChange={(e) => setCropLeft(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Kanan (Right)</span>
                    <span className="font-mono text-emerald-400">{cropRight}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="45"
                    value={cropRight}
                    onChange={(e) => setCropRight(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-950/90">
              <button
                type="button"
                onClick={() => setIsCropping(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleApplyCrop}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 active:scale-95 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Simpan & Terapkan Crop</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
