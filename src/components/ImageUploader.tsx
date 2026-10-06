import React, { useState, useRef } from 'react';
import {
  Upload,
  RotateCw,
  Sliders,
  X,
  Scan,
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [rotation, setRotation] = useState<number>(0);
  const [enhanceContrast, setEnhanceContrast] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
      setRotation(0);
    };
    reader.readAsDataURL(file);
  };

  const handleRunOcr = async () => {
    if (!selectedImage) return;
    setIsProcessing(true);

    try {
      // Rotate if necessary
      let imageToProcess = selectedImage;
      if (rotation !== 0) {
        const img = new Image();
        img.src = selectedImage;
        await new Promise((res) => (img.onload = res));

        const canvas = document.createElement('canvas');
        canvas.width = (rotation === 90 || rotation === 270) ? img.height : img.width;
        canvas.height = (rotation === 90 || rotation === 270) ? img.width : img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((rotation * Math.PI) / 180);
          ctx.drawImage(img, -img.width / 2, -img.height / 2);
          imageToProcess = canvas.toDataURL('image/jpeg', 0.95);
        }
      }

      // Tesseract OCR
      const { data: { text } } = await Tesseract.recognize(imageToProcess, 'ind', {
        logger: m => console.log(m),
      });

      console.log('Tesseract OCR Output:', text);

      // Parse with non-AI parser
      const parsedData = parseReceiptText(text);

      const finalReceipt: ReceiptData = {
        id: `REC-${Date.now()}`,
        createdAt: new Date().toISOString(),
        documentType: 'receipt',
        merchant: parsedData.merchant || { name: 'Unknown' },
        transaction: parsedData.transaction || { date: '', time: '', invoiceNumber: '' },
        extraFields: parsedData.extraFields || [],
        items: parsedData.items || [],
        financials: parsedData.financials || { subtotal: 0, taxPercent: 0, taxAmount: 0, serviceCharge: 0, discount: 0, rounding: 0, grandTotal: 0, currency: 'IDR' },
        payment: parsedData.payment || { method: 'TUNAI', amountPaid: 0, change: 0 },
        footer: parsedData.footer || {},
        rawExtractedText: text,
        confidenceScore: parsedData.confidenceScore || 50,
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
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <h3 className="font-semibold text-slate-100 flex items-center gap-2">
          <Scan className="w-5 h-5 text-emerald-400" />
          Pindai Struk (Non-AI)
        </h3>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
        >
          <Upload className="w-4 h-4" />
          <span>Pilih File</span>
        </button>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

      {selectedImage && (
        <div className="space-y-4">
          <div className="relative rounded-lg overflow-hidden border border-slate-800 p-2 flex flex-col items-center">
             <div style={{ transform: `rotate(${rotation}deg)`, filter: enhanceContrast ? 'contrast(1.4)' : 'none' }}>
                <img src={selectedImage} className="max-h-60 mx-auto" />
             </div>
             
             <div className="flex gap-2 mt-2">
                <button onClick={() => setRotation(r => (r + 90) % 360)} className="p-2 bg-slate-800 rounded-lg"><RotateCw className="w-4 h-4"/></button>
                <button onClick={() => setEnhanceContrast(!enhanceContrast)} className="p-2 bg-slate-800 rounded-lg"><Sliders className="w-4 h-4"/></button>
                <button onClick={() => setSelectedImage(null)} className="p-2 bg-slate-800 rounded-lg"><X className="w-4 h-4"/></button>
             </div>
          </div>
          <button
            onClick={handleRunOcr}
            disabled={isProcessing}
            className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold"
          >
            {isProcessing ? 'Memproses OCR...' : 'Mulai OCR'}
          </button>
        </div>
      )}
    </div>
  );
};
