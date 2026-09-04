import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, ChevronUp, ChevronDown } from 'lucide-react';

export interface MPRPanelProps {
  plane: 'axial' | 'coronal' | 'sagittal';
  sliceIndex: number;
  totalSlices: number;
  windowWidth: number;
  windowLevel: number;
  zoom: number;
  crosshair: { x: number; y: number };
  onSliceChange: (newIndex: number) => void;
  onCrosshairMove: (x: number, y: number) => void;
  seriesInstanceUid?: string;
  className?: string;
}

export const MPRPanel: React.FC<MPRPanelProps> = ({
  plane,
  sliceIndex,
  totalSlices,
  windowWidth,
  windowLevel,
  zoom,
  crosshair,
  onSliceChange,
  onCrosshairMove,
  seriesInstanceUid = '1.2.840.113619.2.55.3.60468842',
  className = ''
}) => {
  // Determine anatomical orientation labels
  const getOrientationLabels = () => {
    switch (plane) {
      case 'axial':
        return { top: 'A (Anterior)', bottom: 'P (Posterior)', left: 'R (Right)', right: 'L (Left)', color: 'text-indigo-400' };
      case 'coronal':
        return { top: 'S (Superior)', bottom: 'I (Inferior)', left: 'R (Right)', right: 'L (Left)', color: 'text-emerald-400' };
      case 'sagittal':
        return { top: 'S (Superior)', bottom: 'I (Inferior)', left: 'A (Anterior)', right: 'P (Posterior)', color: 'text-amber-400' };
    }
  };

  const labels = getOrientationLabels();
  const [isPlaying, setIsPlaying] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation when hovered or focused
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault();
      onSliceChange(Math.min(totalSlices - 1, sliceIndex + 1));
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault();
      onSliceChange(Math.max(0, sliceIndex - 1));
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      onSliceChange(Math.min(totalSlices - 1, sliceIndex + 10));
    } else if (e.key === 'PageDown') {
      e.preventDefault();
      onSliceChange(Math.max(0, sliceIndex - 10));
    } else if (e.key === ' ') {
      e.preventDefault();
      setIsPlaying(prev => !prev);
    }
  };

  // Cine playback loop
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      onSliceChange((sliceIndex + 1) % totalSlices);
    }, 80);
    return () => clearInterval(timer);
  }, [isPlaying, sliceIndex, totalSlices, onSliceChange]);


  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY > 0) {
      onSliceChange(Math.min(totalSlices - 1, sliceIndex + 1));
    } else {
      onSliceChange(Math.max(0, sliceIndex - 1));
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    onCrosshairMove(x, y);
  };

  const host = window.location.port === '5173' || window.location.port === '5174' ? 'http://localhost:8000' : '';
  const sliceUrl = `${host}/api/v1/volumes/${seriesInstanceUid}/slice?plane=${plane}&index=${sliceIndex}&window_width=${windowWidth}&window_level=${windowLevel}`;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onWheel={handleWheel}
      className={`relative bg-[#080a0f] focus:outline-none focus:ring-1 focus:ring-indigo-500/50 border border-clinical-750 flex flex-col items-center justify-center select-none overflow-hidden group ${className}`}
    >
      {/* Plane Badge */}
      <div className="absolute top-2 left-2 z-10 flex items-center space-x-1.5 bg-clinical-900/80 px-2 py-0.5 rounded border border-clinical-700/60 backdrop-blur-xs font-mono text-[10px]">
        <span className={`w-2 h-2 rounded-full ${plane === 'axial' ? 'bg-indigo-400' : plane === 'coronal' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
        <span className="font-bold uppercase text-clinical-200">{plane}</span>
        <span className="text-clinical-400">[{sliceIndex + 1}/{totalSlices}]</span>
      </div>

      {/* Anatomical Direction Compass */}
      <div className="absolute top-1.5 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold text-clinical-400 pointer-events-none z-10">
        {labels.top}
      </div>
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] font-mono font-bold text-clinical-400 pointer-events-none z-10">
        {labels.bottom}
      </div>
      <div className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] font-mono font-bold text-clinical-400 pointer-events-none z-10">
        {labels.left}
      </div>
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-mono font-bold text-clinical-400 pointer-events-none z-10">
        {labels.right}
      </div>

            {/* Slice Scroller & Cine Controls */}
      <div className="absolute bottom-2 right-2 z-10 flex items-center space-x-1.5 bg-clinical-900/85 px-2 py-1 rounded border border-clinical-700/60 backdrop-blur-xs font-mono text-xs opacity-80 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          title="Toggle Cine Loop (Space)"
          className="p-0.5 hover:text-indigo-400 text-clinical-300 transition-colors"
        >
          {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
        </button>

        <button
          onClick={() => onSliceChange(Math.max(0, sliceIndex - 1))}
          title="Previous Slice"
          className="p-0.5 hover:text-indigo-400 text-clinical-400"
        >
          <ChevronDown className="w-3 h-3" />
        </button>

        <input
          type="range"
          min={0}
          max={totalSlices - 1}
          value={sliceIndex}
          onChange={(e) => onSliceChange(Number(e.target.value))}
          className="w-16 h-1 bg-clinical-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />

        <button
          onClick={() => onSliceChange(Math.min(totalSlices - 1, sliceIndex + 1))}
          title="Next Slice"
          className="p-0.5 hover:text-indigo-400 text-clinical-400"
        >
          <ChevronUp className="w-3 h-3" />
        </button>
      </div>

      {/* Slice image view and interactive crosshair */}
      <div
        onClick={handleCanvasClick}
        className="w-full h-full relative cursor-crosshair flex items-center justify-center"
      >
        <img
          src={sliceUrl}
          alt={`${plane} slice ${sliceIndex}`}
          className="w-full h-full object-contain pointer-events-none"
          style={{ transform: `scale(${zoom})` }}
        />

        {/* Synchronized Crosshair lines */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ transform: `scale(${zoom})` }}
        >
          {/* Vertical line */}
          <div
            className="absolute top-0 bottom-0 w-[1px] bg-indigo-400/70 border-r border-dashed border-indigo-300/40"
            style={{ left: `${crosshair.x * 100}%` }}
          />
          {/* Horizontal line */}
          <div
            className="absolute left-0 right-0 h-[1px] bg-indigo-400/70 border-b border-dashed border-indigo-300/40"
            style={{ top: `${crosshair.y * 100}%` }}
          />
          {/* Center marker */}
          <div
            className="absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-indigo-400 bg-indigo-500/20"
            style={{ left: `${crosshair.x * 100}%`, top: `${crosshair.y * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
