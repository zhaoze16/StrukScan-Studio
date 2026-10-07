import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ReceiptData } from '../types/receipt';
import { generateEscPosBytes } from '../utils/thermalFormatter';

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
  setStatusMessage: (msg: string) => void;
  // Cordova bluetooth-serial specific properties for Android/Capacitor PPOB direct printing
  isNative: boolean;
  pairedDevices: { name: string; address: string; id?: string }[];
  connectNativeDevice: (address: string) => Promise<boolean>;
  refreshNativeDevices: () => void;
}

const BluetoothPrinterContext = createContext<BluetoothPrinterContextType | null>(null);

export const BluetoothPrinterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Web Bluetooth state
  const [device, setDevice] = useState<any | null>(null);
  const [printCharacteristic, setPrintCharacteristic] = useState<any | null>(null);

  // Common state
  const [connectedDeviceName, setConnectedDeviceName] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
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

  // Cordova Native State
  const [isNative, setIsNative] = useState<boolean>(false);
  const [pairedDevices, setPairedDevices] = useState<{ name: string; address: string; id?: string }[]>([]);

  // 1. Detect Cordova Native bluetoothSerial on Mount
  useEffect(() => {
    const btSerial = (window as any).bluetoothSerial;
    if (btSerial) {
      setIsNative(true);
      setStatusMessage('Menggunakan Driver Native Bluetooth Classic (Cordova Plugin).');
      
      // Load paired devices on startup
      btSerial.list(
        (devices: any[]) => {
          setPairedDevices(devices);
        },
        (err: any) => {
          console.warn('Failed to list native paired devices on init:', err);
        }
      );

      // Check if previously connected native printer exists
      const savedAddress = localStorage.getItem('connected_native_address');
      if (savedAddress) {
        btSerial.isConnected(
          () => {
            setIsConnected(true);
            const dev = pairedDevices.find((d) => d.address === savedAddress);
            setConnectedDeviceName(dev ? dev.name : 'Printer Bluetooth Classic');
            setStatusMessage('Printer Bluetooth PPOB terhubung kembali.');
          },
          () => {
            // Auto reconnect native printer
            btSerial.connect(
              savedAddress,
              () => {
                setIsConnected(true);
                const dev = pairedDevices.find((d) => d.address === savedAddress);
                setConnectedDeviceName(dev ? dev.name : 'Printer Bluetooth Classic');
                setStatusMessage('Printer Bluetooth PPOB berhasil terhubung kembali secara native.');
              },
              () => {
                localStorage.removeItem('connected_native_address');
              }
            );
          }
        );
      }
    }
  }, [pairedDevices.length]);

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

  // Auto-cleanup for Web Bluetooth GATT disconnection
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

  // --- NATIVE CORDOVA METHOD IMPLEMENTATIONS ---
  const refreshNativeDevices = () => {
    const btSerial = (window as any).bluetoothSerial;
    if (btSerial) {
      btSerial.list(
        (devices: any[]) => {
          setPairedDevices(devices);
          setStatusMessage(`Ditemukan ${devices.length} perangkat Bluetooth thermal terpasang.`);
        },
        (err: any) => {
          setStatusMessage(`Gagal memuat daftar perangkat Bluetooth: ${err}`);
        }
      );
    } else {
      setStatusMessage('Koneksi native tidak tersedia di peramban standar.');
    }
  };

  const connectNativeDevice = async (address: string): Promise<boolean> => {
    const btSerial = (window as any).bluetoothSerial;
    if (!btSerial) return false;

    setIsConnecting(true);
    setStatusMessage(`Menghubungkan ke printer ${address}...`);

    return new Promise((resolve) => {
      btSerial.connect(
        address,
        () => {
          setIsConnected(true);
          setIsConnecting(false);
          const dev = pairedDevices.find((d) => d.address === address);
          setConnectedDeviceName(dev ? dev.name : 'Printer Bluetooth Classic');
          setStatusMessage(`Printer ${dev ? dev.name : address} berhasil terhubung! Siap mencetak.`);
          localStorage.setItem('connected_native_address', address);
          resolve(true);
        },
        (err: any) => {
          setIsConnected(false);
          setIsConnecting(false);
          setStatusMessage(`Gagal menghubungkan ke printer: ${err}`);
          resolve(false);
        }
      );
    });
  };

  // --- WEB BLUETOOTH METHOD IMPLEMENTATIONS ---
  const connect = async (): Promise<boolean> => {
    // If cordova bluetoothSerial is active, let them use list/dropdown instead of Web Bluetooth BLE popup
    if (isNative) {
      refreshNativeDevices();
      return true;
    }

    setIsConnecting(true);
    setIsPolicyBlocked(false);
    setStatusMessage('Membuka dialog pencarian perangkat Bluetooth BLE...');

    if (typeof navigator === 'undefined' || !('bluetooth' in navigator)) {
      setIsConnecting(false);
      setStatusMessage('Web Bluetooth API tidak didukung pada browser ini. Pastikan menggunakan Chrome.');
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
      setStatusMessage(`Terhubung ke ${devName}! Siap mencetak langsung.`);
      setIsConnecting(false);
      return true;
    } catch (err: any) {
      console.warn('Bluetooth connection error:', err);
      setIsConnecting(false);

      if (err.name === 'NotFoundError') {
        setStatusMessage('Pencarian dibatalkan oleh pengguna.');
      } else if (err.message?.includes('permissions policy') || err.message?.includes('disallowed')) {
        setIsPolicyBlocked(true);
        setStatusMessage('Izin Bluetooth dibatasi oleh frame preview browser.');
      } else {
        setStatusMessage(`Gagal terhubung: ${err.message || 'Perangkat tidak merespons'}`);
      }
      return false;
    }
  };

  const disconnect = () => {
    if (isNative) {
      const btSerial = (window as any).bluetoothSerial;
      if (btSerial) {
        btSerial.disconnect();
      }
      localStorage.removeItem('connected_native_address');
    } else {
      if (device && device.gatt?.connected) {
        device.gatt.disconnect();
      }
      setDevice(null);
      setPrintCharacteristic(null);
    }

    setIsConnected(false);
    setConnectedDeviceName(null);
    setStatusMessage('Koneksi printer diputuskan.');
  };

  // --- CONSOLIDATED PRINT ENGINE ---
  const printReceipt = async (
    receipt: ReceiptData,
    customWidth?: 32 | 48,
    logoBytes?: Uint8Array | null
  ): Promise<boolean> => {
    const width = customWidth || paperWidth;
    const escPosBytes = generateEscPosBytes(receipt, width, { cutPaper, feedLines, logoBytes });

    setIsPrinting(true);
    setStatusMessage(`Mengirim data cetak (${escPosBytes.length} bytes)...`);

    // Scenario A: Native Direct Printing via cordova-plugin-bluetooth-serial (ArrayBuffer support)
    if (isNative) {
      const btSerial = (window as any).bluetoothSerial;
      if (!btSerial) {
        setStatusMessage('Native printer driver tidak ditemukan.');
        setIsPrinting(false);
        return false;
      }

      return new Promise((resolve) => {
        btSerial.write(
          escPosBytes.buffer,
          () => {
            setStatusMessage('Struk berhasil dicetak natively! ✅');
            setIsPrinting(false);
            resolve(true);
          },
          (err: any) => {
            console.error('Native printing failed:', err);
            setStatusMessage(`Cetak gagal secara native: ${err}`);
            setIsPrinting(false);
            resolve(false);
          }
        );
      });
    }

    // Scenario B: Web Bluetooth GATT transmission (chunked packets)
    try {
      let activeChar = printCharacteristic;

      if (!activeChar && device && device.gatt?.connected) {
        const server = device.gatt;
        const services = await server.getPrimaryServices();
        for (const service of services) {
          const characteristics = await service.getCharacteristics();
          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              activeChar = char;
              break;
            }
          }
          if (activeChar) break;
        }
        if (activeChar) {
          setPrintCharacteristic(activeChar);
        }
      }

      if (activeChar) {
        const chunkSize = 100;
        for (let i = 0; i < escPosBytes.length; i += chunkSize) {
          const chunk = escPosBytes.slice(i, i + chunkSize);
          if (activeChar.writeValueWithoutResponse) {
            await activeChar.writeValueWithoutResponse(chunk);
          } else {
            await activeChar.writeValue(chunk);
          }
          await new Promise((r) => setTimeout(r, 20));
        }
        setStatusMessage('Struk berhasil dicetak! ✅');
        setIsPrinting(false);
        return true;
      }

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
        setStatusMessage,
        // Native properties
        isNative,
        pairedDevices,
        connectNativeDevice,
        refreshNativeDevices,
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
