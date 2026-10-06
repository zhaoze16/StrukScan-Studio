import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ReceiptData } from '../types/receipt';
import { generateEscPosBytes, formatReceiptToThermalText } from '../utils/thermalFormatter';

export interface BluetoothPrinterContextType {
  device: any | null;
  connectedDeviceName: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  isPrinting: boolean;
  statusMessage: string;
  isPolicyBlocked: boolean;
  paperWidth: 32 | 48;
  setPaperWidth: (width: 32 | 48) => void;
  cutPaper: boolean;
  setCutPaper: (val: boolean) => void;
  feedLines: number;
  setFeedLines: (lines: number) => void;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  printReceipt: (receipt: ReceiptData, customWidth?: 32 | 48, logoBytes?: Uint8Array | null) => Promise<boolean>;
  printViaRawBT: (receipt: ReceiptData, customWidth?: 32 | 48) => void;
  setStatusMessage: (msg: string) => void;
}

const BluetoothPrinterContext = createContext<BluetoothPrinterContextType | null>(null);

export const BluetoothPrinterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [device, setDevice] = useState<any | null>(null);
  const [connectedDeviceName, setConnectedDeviceName] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [printCharacteristic, setPrintCharacteristic] = useState<any | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Siap terhubung dengan printer Bluetooth');
  const [isPolicyBlocked, setIsPolicyBlocked] = useState<boolean>(false);
  const [paperWidth, setPaperWidth] = useState<32 | 48>(32);
  const [cutPaper, setCutPaperState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('pos_bt_cut_paper') === 'true';
    } catch {
      return false;
    }
  });
  const [feedLines, setFeedLinesState] = useState<number>(() => {
    try {
      const val = localStorage.getItem('pos_bt_feed_lines');
      return val !== null ? parseInt(val, 10) : 2;
    } catch {
      return 2;
    }
  });

  const setCutPaper = (val: boolean) => {
    setCutPaperState(val);
    try {
      localStorage.setItem('pos_bt_cut_paper', String(val));
    } catch {
      // ignore
    }
  };

  const setFeedLines = (val: number) => {
    const clamped = Math.max(0, Math.min(5, val));
    setFeedLinesState(clamped);
    try {
      localStorage.setItem('pos_bt_feed_lines', String(clamped));
    } catch {
      // ignore
    }
  };

  // Handle auto-cleanup when device disconnects externally
  const handleDisconnected = useCallback(() => {
    setIsConnected(false);
    setPrintCharacteristic(null);
    setStatusMessage(`Printer ${connectedDeviceName || ''} terputus.`);
  }, [connectedDeviceName]);

  useEffect(() => {
    if (!device) return;

    device.addEventListener('gattserverdisconnected', handleDisconnected);
    return () => {
      device.removeEventListener('gattserverdisconnected', handleDisconnected);
    };
  }, [device, handleDisconnected]);

  // Connect or pair Bluetooth thermal printer
  const connect = async (): Promise<boolean> => {
    setIsConnecting(true);
    setIsPolicyBlocked(false);
    setStatusMessage('Membuka dialog pencarian perangkat Bluetooth...');

    if (typeof navigator === 'undefined' || !('bluetooth' in navigator)) {
      setIsConnecting(false);
      setStatusMessage('Web Bluetooth API tidak didukung pada browser ini. Pastikan menggunakan Chrome di Android.');
      return false;
    }

    try {
      const selectedDevice = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb', // Standard POS Printer Service
          '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 BLE Serial Module
          '0000ff00-0000-1000-8000-00805f9b34fb', // POS-58
          '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Transparent UART
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
        ],
      });

      if (!selectedDevice) {
        setIsConnecting(false);
        setStatusMessage('Pencarian dibatalkan.');
        return false;
      }

      setDevice(selectedDevice);
      const devName = selectedDevice.name || 'Printer Bluetooth';
      setConnectedDeviceName(devName);
      setStatusMessage(`Menghubungkan ke ${devName}...`);

      const server = await selectedDevice.gatt?.connect();
      if (!server) {
        throw new Error('Gagal membuka koneksi GATT ke printer.');
      }

      // Search for writable print characteristic
      let foundChar: any = null;
      try {
        const services = await server.getPrimaryServices();
        for (const service of services) {
          const characteristics = await service.getCharacteristics();
          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              foundChar = char;
              break;
            }
          }
          if (foundChar) break;
        }
      } catch (svcErr) {
        console.warn('Primary service lookup warning:', svcErr);
      }

      if (foundChar) {
        setPrintCharacteristic(foundChar);
      }

      setIsConnected(true);
      setStatusMessage(`Terhubung ke ${devName}! Siap mencetak langsung kapan saja.`);
      setIsConnecting(false);
      return true;
    } catch (err: any) {
      console.warn('Bluetooth connection error:', err);
      setIsConnecting(false);

      if (err.name === 'NotFoundError') {
        setStatusMessage('Pencarian dibatalkan oleh pengguna.');
      } else if (err.message?.includes('permissions policy') || err.message?.includes('disallowed')) {
        setIsPolicyBlocked(true);
        setStatusMessage('Izin Bluetooth dibatasi oleh frame preview browser. Buka aplikasi di tab baru Google Chrome.');
      } else {
        setStatusMessage(`Gagal terhubung: ${err.message || 'Perangkat tidak merespons'}`);
      }
      return false;
    }
  };

  const disconnect = () => {
    if (device && device.gatt?.connected) {
      device.gatt.disconnect();
    }
    setDevice(null);
    setConnectedDeviceName(null);
    setIsConnected(false);
    setPrintCharacteristic(null);
    setStatusMessage('Koneksi printer diputuskan.');
  };

  // Direct print job
  const printReceipt = async (receipt: ReceiptData, customWidth?: 32 | 48, logoBytes?: Uint8Array | null): Promise<boolean> => {
    const width = customWidth || paperWidth;
    const escPosBytes = generateEscPosBytes(receipt, width, { cutPaper, feedLines, logoBytes });

    setIsPrinting(true);
    setStatusMessage(`Mengirim data cetak (${escPosBytes.length} bytes)...`);

    try {
      // If GATT characteristic is active, transmit packets
      if (printCharacteristic) {
        const chunkSize = 100;
        for (let i = 0; i < escPosBytes.length; i += chunkSize) {
          const chunk = escPosBytes.slice(i, i + chunkSize);
          if (printCharacteristic.writeValueWithoutResponse) {
            await printCharacteristic.writeValueWithoutResponse(chunk);
          } else {
            await printCharacteristic.writeValue(chunk);
          }
          await new Promise((r) => setTimeout(r, 20));
        }
        setStatusMessage('Struk berhasil dicetak ke printer! ✅');
        setIsPrinting(false);
        return true;
      }

      // If GATT is connected but characteristic wasn't cached, try reconnecting or re-fetching
      if (device && device.gatt?.connected) {
        const server = device.gatt;
        const services = await server.getPrimaryServices();
        let foundChar: any = null;
        for (const service of services) {
          const characteristics = await service.getCharacteristics();
          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              foundChar = char;
              break;
            }
          }
          if (foundChar) break;
        }

        if (foundChar) {
          setPrintCharacteristic(foundChar);
          const chunkSize = 100;
          for (let i = 0; i < escPosBytes.length; i += chunkSize) {
            const chunk = escPosBytes.slice(i, i + chunkSize);
            if (foundChar.writeValueWithoutResponse) {
              await foundChar.writeValueWithoutResponse(chunk);
            } else {
              await foundChar.writeValue(chunk);
            }
            await new Promise((r) => setTimeout(r, 20));
          }
          setStatusMessage('Struk berhasil dicetak ke printer! ✅');
          setIsPrinting(false);
          return true;
        }
      }

      // Fallback: If device is not connected via GATT
      setStatusMessage('Printer belum terhubung. Silakan hubungkan printer terlebih dahulu.');
      setIsPrinting(false);
      return false;
    } catch (err: any) {
      console.error('Print error:', err);
      setStatusMessage(`Gagal mencetak: ${err.message || 'Koneksi terputus'}`);
      setIsPrinting(false);
      return false;
    }
  };

  // Print via RawBT / Android intent
  const printViaRawBT = (receipt: ReceiptData, customWidth?: 32 | 48) => {
    try {
      const width = customWidth || paperWidth;
      const text = formatReceiptToThermalText(receipt, width);
      const base64Data = btoa(unescape(encodeURIComponent(text)));
      const rawBtUrl = `rawbt:base64,${base64Data}`;
      window.location.href = rawBtUrl;
      setStatusMessage('Mengirim ke aplikasi printer RawBT...');
    } catch (e: any) {
      setStatusMessage('Gagal membuka intent RawBT: ' + e.message);
    }
  };

  return (
    <BluetoothPrinterContext.Provider
      value={{
        device,
        connectedDeviceName,
        isConnected,
        isConnecting,
        isPrinting,
        statusMessage,
        isPolicyBlocked,
        paperWidth,
        setPaperWidth,
        cutPaper,
        setCutPaper,
        feedLines,
        setFeedLines,
        connect,
        disconnect,
        printReceipt,
        printViaRawBT,
        setStatusMessage,
      }}
    >
      {children}
    </BluetoothPrinterContext.Provider>
  );
};

export const useBluetoothPrinter = () => {
  const context = useContext(BluetoothPrinterContext);
  if (!context) {
    throw new Error('useBluetoothPrinter must be used within a BluetoothPrinterProvider');
  }
  return context;
};
