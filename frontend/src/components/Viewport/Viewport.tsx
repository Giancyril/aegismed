import React from 'react';
import type { SegmentationLabel } from '../../types';

interface ViewportProps {
  sliceIndex: number;
  totalSlices: number;
  activePreset: string;
  labels: SegmentationLabel[];
}

export const Viewport: React.FC<ViewportProps> = ({
  sliceIndex,
  activePreset,
  labels,
}) => {
  const spleenOpacity = labels.find((l) => l.id === 'spleen')?.visible 
    ? labels.find((l) => l.id === 'spleen')?.opacity ?? 0.6 
    : 0;
  const liverOpacity = labels.find((l) => l.id === 'liver')?.visible 
    ? labels.find((l) => l.id === 'liver')?.opacity ?? 0.6 
    : 0;

  return (
    <div className="flex-1 bg-clinical-950 relative overflow-hidden flex items-center justify-center select-none">
      <div className="absolute top-2 left-1/2 -translate-x-1/2 text-xs font-mono font-bold text-clinical-500 bg-clinical-900/60 px-1.5 py-0.5 rounded">
        A (Anterior)
      </div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-mono font-bold text-clinical-500 bg-clinical-900/60 px-1.5 py-0.5 rounded">
        P (Posterior)
      </div>
      <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-clinical-500 bg-clinical-900/60 px-1.5 py-0.5 rounded">
        R (Right)
      </div>
      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-clinical-500 bg-clinical-900/60 px-1.5 py-0.5 rounded">
        L (Left)
      </div>

      <div className="absolute top-2 left-2 text-[11px] font-mono text-clinical-400 space-y-0.5 pointer-events-none">
        <div>CT ABDOMEN/PELVIS</div>
        <div>KV: 120 | mA: 240</div>
        <div>Thick: 2.0 mm</div>
      </div>

      <div className="absolute top-2 right-2 text-[11px] font-mono text-clinical-400 text-right space-y-0.5 pointer-events-none">
        <div>W: {activePreset === 'soft' ? '400' : activePreset === 'lung' ? '1500' : '2000'}</div>
        <div>L: {activePreset === 'soft' ? '40' : activePreset === 'lung' ? '-600' : '300'}</div>
        <div>Zoom: 100%</div>
      </div>

      <div className="absolute bottom-2 left-2 text-[11px] font-mono text-clinical-400 pointer-events-none">
        <div>X: 256 Y: 256 | Val: <span className="text-indigo-400">42 HU</span></div>
      </div>

      <div className="w-[480px] h-[480px] relative border border-clinical-750/40 rounded bg-[#0d0f14] shadow-2xl flex items-center justify-center">
        <svg viewBox="0 0 512 512" className="w-full h-full">
          <ellipse cx="256" cy="256" rx="210" ry="170" fill="#181c24" stroke="#374151" strokeWidth="2" />
          <ellipse cx="256" cy="256" rx="195" ry="155" fill="#13161c" stroke="#2d3748" strokeWidth="1" />
          <path d="M 236 380 Q 256 360 276 380 Q 266 400 246 400 Z" fill="#e5e7eb" />
          <circle cx="256" cy="385" r="8" fill="#090a0d" />
          <path d="M 70 240 Q 60 280 80 320" stroke="#d1d5db" strokeWidth="6" fill="none" strokeLinecap="round" />
          <path d="M 442 240 Q 452 280 432 320" stroke="#d1d5db" strokeWidth="6" fill="none" strokeLinecap="round" />
          
          <path
            d="M 120 220 C 140 160, 240 170, 250 250 C 230 310, 140 310, 120 220 Z"
            fill="#232a38"
            stroke="#475569"
            strokeWidth="1.5"
          />

          {liverOpacity > 0 && (
            <path
              d="M 120 220 C 140 160, 240 170, 250 250 C 230 310, 140 310, 120 220 Z"
              fill="#3b82f6"
              fillOpacity={liverOpacity}
              stroke="#60a5fa"
              strokeWidth="2"
            />
          )}

          <path
            d="M 360 210 C 400 220, 410 280, 370 310 C 340 310, 340 240, 360 210 Z"
            fill="#272d3b"
            stroke="#475569"
            strokeWidth="1.5"
          />

          {spleenOpacity > 0 && (
            <path
              d="M 360 210 C 400 220, 410 280, 370 310 C 340 310, 340 240, 360 210 Z"
              fill="#8b5cf6"
              fillOpacity={spleenOpacity}
              stroke="#a78bfa"
              strokeWidth="2"
            />
          )}
        </svg>

        <div className="absolute top-3 left-3 bg-clinical-900/80 backdrop-blur border border-clinical-750 px-2 py-1 rounded text-[10px] font-mono text-indigo-300">
          MONAI Spleen Mask • Slice {sliceIndex + 1}
        </div>
      </div>
    </div>
  );
};
