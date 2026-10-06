import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { BluetoothPrinterProvider } from './context/BluetoothPrinterContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <BluetoothPrinterProvider>
    <App />
  </BluetoothPrinterProvider>
);
