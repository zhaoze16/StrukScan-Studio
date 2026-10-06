import React from 'react';

interface BarcodeProps {
  value: string;
  className?: string;
}

/**
 * Clean SVG Code 128 / Code 39 style barcode renderer
 */
export const BarcodeRenderer: React.FC<BarcodeProps> = ({ value, className = '' }) => {
  // Generate deterministic pseudo-bar widths based on character charcodes
  const cleanVal = (value || '00000000').toUpperCase().replace(/[^A-Z0-9-]/g, '');
  const bars: { width: number; isBlack: boolean }[] = [];

  // Start pattern
  bars.push({ width: 2, isBlack: true });
  bars.push({ width: 1, isBlack: false });
  bars.push({ width: 2, isBlack: true });

  for (let i = 0; i < cleanVal.length; i++) {
    const code = cleanVal.charCodeAt(i);
    // 4 bars per character
    bars.push({ width: (code % 3) + 1, isBlack: false });
    bars.push({ width: ((code >> 1) % 3) + 1, isBlack: true });
    bars.push({ width: ((code >> 2) % 2) + 1, isBlack: false });
    bars.push({ width: ((code >> 3) % 3) + 1, isBlack: true });
  }

  // Stop pattern
  bars.push({ width: 2, isBlack: true });
  bars.push({ width: 1, isBlack: false });
  bars.push({ width: 3, isBlack: true });

  const totalWidth = bars.reduce((acc, b) => acc + b.width, 0);

  let currentX = 0;
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg
        viewBox={`0 0 ${totalWidth} 40`}
        className="w-full max-w-[240px] h-10 overflow-hidden"
        preserveAspectRatio="none"
      >
        {bars.map((bar, idx) => {
          const x = currentX;
          currentX += bar.width;
          if (!bar.isBlack) return null;
          return (
            <rect
              key={idx}
              x={x}
              y="0"
              width={bar.width}
              height="40"
              fill="currentColor"
            />
          );
        })}
      </svg>
      <span className="font-mono text-[10px] tracking-widest mt-0.5 text-zinc-600 dark:text-zinc-400">
        *{cleanVal}*
      </span>
    </div>
  );
};

/**
 * QR-Code style SVG matrix renderer for transaction ID / verification
 */
export const QrCodeRenderer: React.FC<{ value: string; size?: number }> = ({ value, size = 96 }) => {
  const cleanStr = value || 'https://qris.id';
  const gridCount = 21; // Standard Version 1 QR matrix (21x21)
  
  // Deterministic matrix calculation
  const matrix: boolean[][] = Array.from({ length: gridCount }, () => Array(gridCount).fill(false));

  // Function to place standard finder patterns (7x7) at corners
  const placeFinder = (rStart: number, cStart: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (
          r === 0 || r === 6 || c === 0 || c === 6 ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          matrix[rStart + r][cStart + c] = true;
        } else {
          matrix[rStart + r][cStart + c] = false;
        }
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(0, gridCount - 7);
  placeFinder(gridCount - 7, 0);

  // Timing patterns
  for (let i = 8; i < gridCount - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Data fill pseudo-hash based on string
  let charIdx = 0;
  for (let r = 0; r < gridCount; r++) {
    for (let c = 0; c < gridCount; c++) {
      // Don't overwrite finder patterns
      if ((r < 8 && c < 8) || (r < 8 && c >= gridCount - 8) || (r >= gridCount - 8 && c < 8)) {
        continue;
      }
      if (r === 6 || c === 6) continue;

      const charVal = cleanStr.charCodeAt(charIdx % cleanStr.length);
      charIdx++;
      matrix[r][c] = ((charVal * (r + 1) + c * 7) % 3) === 0;
    }
  }

  const cellSize = size / gridCount;

  return (
    <div className="p-1 bg-white inline-block rounded border border-zinc-300">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {matrix.map((row, r) =>
          row.map((isDark, c) => {
            if (!isDark) return null;
            return (
              <rect
                key={`${r}-${c}`}
                x={c * cellSize}
                y={r * cellSize}
                width={cellSize}
                height={cellSize}
                fill="#111827"
              />
            );
          })
        )}
      </svg>
    </div>
  );
};
