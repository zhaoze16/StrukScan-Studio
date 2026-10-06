import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use((_req, res, next) => {
  res.setHeader(
    'Permissions-Policy',
    'bluetooth=*, camera=*, display-capture=*, geolocation=*'
  );
  next();
});

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Server-side Gemini AI Client
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Express API Router - mounted BEFORE Vite middleware
app.post('/api/ocr/ai-recalculate', async (req, res) => {
  try {
    const { receiptData, prompt } = req.body || {};

    if (!receiptData) {
      return res.status(400).json({ success: false, error: 'receiptData parameter is required.' });
    }

    // Smart fallback if GEMINI_API_KEY is not set in environment
    if (!ai) {
      console.warn('GEMINI_API_KEY is missing. Performing smart local recalculation.');
      
      const items = Array.isArray(receiptData.items) ? receiptData.items : [];
      let subtotal = 0;
      const updatedItems = items.map((item: any) => {
        const qty = Number(item.quantity) || 1;
        const unitPrice = Number(item.unitPrice) || 0;
        const disc = Number(item.discount) || 0;
        const lineTotal = Math.max(0, qty * unitPrice - disc);
        subtotal += lineTotal;
        return {
          ...item,
          quantity: qty,
          unitPrice,
          discount: disc,
          subtotal: lineTotal,
        };
      });

      const taxPercent = Number(receiptData.financials?.taxPercent) || 0;
      const taxAmount = Math.round((subtotal * taxPercent) / 100);
      const discount = Number(receiptData.financials?.discount) || 0;
      const serviceCharge = Number(receiptData.financials?.serviceCharge) || 0;
      const rounding = Number(receiptData.financials?.rounding) || 0;
      const grandTotal = Math.max(0, subtotal - discount + taxAmount + serviceCharge + rounding);

      const recalculated = {
        ...receiptData,
        items: updatedItems,
        financials: {
          subtotal,
          taxPercent,
          taxAmount,
          discount,
          serviceCharge,
          rounding,
          grandTotal,
          currency: receiptData.financials?.currency || 'IDR',
        },
        payment: {
          ...receiptData.payment,
          amountPaid: Math.max(receiptData.payment?.amountPaid || grandTotal, grandTotal),
          change: Math.max(0, (receiptData.payment?.amountPaid || grandTotal) - grandTotal),
        },
      };

      return res.json({
        success: true,
        data: recalculated,
      });
    }

    const systemInstruction = `You are an expert AI receipt auditor, accountant, and parser for POS & thermal print systems.
Your goal is to inspect the receipt data, correct typos, uppercase item names, recalculate line subtotals (quantity * unitPrice - discount), tax, discounts, rounding, and grand total.
CRITICAL: Always extract ALL metadata, payment numbers, customer IDs, reference codes, institution names, status codes, and notes into 'extraFields' (e.g. { "label": "Nomor Pembayaran", "value": "8888801665704452" }), EVEN IF they appear as standalone lines, keyless numbers, or multi-line vertical texts in the raw OCR output without explicit colons or left-right pairs.
If the user prompt asks for specific changes (e.g. "change item names", "round to thousands", "add discount"), perform those exact updates.
Return ONLY valid JSON with updated receipt fields matching the original structure.`;

    const userPrompt = `Current receipt data:
${JSON.stringify(receiptData, null, 2)}

User request/instruction:
${prompt || 'Verify and recalculate subtotal, tax, discounts, and grand total. Capitalize item names and clean up typos.'}`;

    const aiResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const responseText = aiResponse.text || '';
    let parsedData = {};

    try {
      parsedData = JSON.parse(responseText);
    } catch {
      const cleaned = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleaned);
    }

    return res.json({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    console.error('Error in /api/ocr/ai-recalculate:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Gagal merevisi data struk dengan AI Gemini.',
    });
  }
});

// Setup Vite middleware in dev or static serving in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 StrukScan Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
