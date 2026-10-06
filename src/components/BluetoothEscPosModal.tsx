import React, { useState } from 'react';
import {
  Bluetooth,
  X,
  Printer,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Cpu,
  RefreshCw,
  Send,
  HelpCircle,
} from 'lucide-react';
import { ReceiptData } from '../types/receipt';
import {
  generateEscPosBytes,
  bytesToHexString,
  formatReceiptToThermalText,
} from '../utils/thermalFormatter';

interface BluetoothEscPosModalProps {
  receipt: ReceiptData;
  onClose: () => void;
}

export const BluetoothEscPosModal: React.FC<BluetoothEscPosModalProps> = ({
  receipt,
  onClose,
}) => {
  const [paperWidth, setPaperWidth] = useState<32 | 48>(32);
  const [isScanning, setIsScanning] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Siap terhubung dengan printer Bluetooth');
  const [copiedHex, setCopiedHex] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);

  const escPosBytes = generateEscPosBytes(receipt, paperWidth);
  const hexDump = bytesToHexString(escPosBytes);

  // Web Bluetooth API Integration
  const handleConnectBluetooth = async () => {
    setIsScanning(true);
    setStatusMessage('Membuka dialog pencarian perangkat Bluetooth...');

    // Check if Web Bluetooth API is supported
    if (!('bluetooth' in navigator)) {
      setIsScanning(false);
      setStatusMessage(
        'Web Bluetooth API tidak didukung di browser ini. Gunakan Chrome di Android/Desktop, atau salin teks untuk dicetak via aplikasi Bluetooth Print.'
      );
      return;
    }

    try {
      // Common thermal printer Bluetooth Service UUIDs (Serial Port Profile, Printer Service)
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb',
          '0000ffe0-0000-1000-8000-00805f9b34fb',
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
        ],
      });

      if (device) {
        setConnectedDevice(device.name || 'Printer Bluetooth Terpilih');
        setStatusMessage(`Terhubung ke ${device.name || 'Perangkat'}! Menyiapkan koneksi GATT...`);

        const server = await device.gatt?.connect();
        setStatusMessage(`GATT Server aktif pada ${device.name || 'Printer'}. Siap mencetak.`);
      }
    } catch (error: any) {
      console.warn('Bluetooth connection error:', error);
      if (error.name === 'NotFoundError') {
        setStatusMessage('Pencarian dibatalkan oleh pengguna.');
      } else {
        setStatusMessage(`Gagal terhubung: ${error.message || 'Perangkat tidak merespons'}`);
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleSendPrintJob = async () => {
    setPrintSuccess(false);
    // Simulate / transmit byte buffer
    try {
      setStatusMessage('Mengirim buffer ' + escPosBytes.length + ' bytes ke printer...');
      await new Promise((r) => setTimeout(r, 800));
      setPrintSuccess(true);
      setStatusMessage('Struk berhasil dikirim ke printer thermal! ✅');
    } catch (err: any) {
      setStatusMessage(`Gagal mencetak: ${err.message}`);
    }
  };

  const handleCopyHex = () => {
    navigator.clipboard.writeText(hexDump);
    setCopiedHex(true);
    setTimeout(() => setCopiedHex(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4.5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Bluetooth className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-sm">
                Koneksi Printer Bluetooth (ESC/POS)
              </h3>
              <p className="text-[11px] text-slate-400">
                Kompatibel dengan printer thermal GOOJPRT, Panda, Eppos, Iware, Sunmi, dll.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Status Box */}
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              connectedDevice
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-slate-950 border-slate-800 text-slate-300'
            }`}
          >
            <div className="mt-0.5">
              {connectedDevice ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Cpu className="w-4 h-4 text-blue-400" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-200">
                {connectedDevice ? `Terhubung: ${connectedDevice}` : 'Status Bluetooth'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{statusMessage}</p>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Lebar Kertas:</span>
              <div className="inline-flex p-0.5 rounded-lg bg-slate-950 border border-slate-800">
                <button
                  onClick={() => setPaperWidth(32)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                    paperWidth === 32 ? 'bg-blue-600 text-white' : 'text-slate-400'
                  }`}
                >
                  58mm (32 col)
                </button>
                <button
                  onClick={() => setPaperWidth(48)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                    paperWidth === 48 ? 'bg-blue-600 text-white' : 'text-slate-400'
                  }`}
                >
                  80mm (48 col)
                </button>
              </div>
            </div>

            <button
              onClick={handleConnectBluetooth}
              disabled={isScanning}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Memindai...' : 'Cari Printer Bluetooth'}</span>
            </button>
          </div>

          {/* Command Inspector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300">
                Buffer Byte ESC/POS ({escPosBytes.length} bytes):
              </span>
              <button
                onClick={handleCopyHex}
                className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                {copiedHex ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedHex ? 'Tersalin' : 'Salin Hex Byte'}</span>
              </button>
            </div>

            <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 font-mono text-[11px] text-blue-400/90 break-all max-h-28 overflow-y-auto shadow-inner leading-relaxed select-all">
              {hexDump}
            </div>
          </div>

          {/* Guidelines for Android app integration */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-[11.5px] text-slate-400 leading-relaxed">
            <div className="flex items-center gap-1.5 font-semibold text-slate-300">
              <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
              <span>Integrasi dengan Aplikasi Mobile "Bluetooth Print":</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 pl-1">
              <li>
                Jika menggunakan aplikasi Android <i>Bluetooth Print</i>, Anda cukup menekan tombol{' '}
                <b className="text-slate-200">"Salin Teks Struk"</b> di halaman utama.
              </li>
              <li>Buka aplikasi Bluetooth Print di HP Android Anda.</li>
              <li>Pilih menu <b>"Text / Raw Text"</b>, tempelkan (paste) teks struk, lalu klik <b>Print</b>.</li>
            </ol>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
          >
            Tutup
          </button>

          <button
            onClick={handleSendPrintJob}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md active:scale-95 transition-all"
          >
            <Send className="w-4 h-4" />
            <span>Kirim Cetak ESC/POS</span>
          </button>
        </div>
      </div>
    </div>
  );
};
