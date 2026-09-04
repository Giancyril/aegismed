import React from 'react';
import { 
  SunMedium, 
  ZoomIn, 
  Move, 
  RotateCcw, 
  Ruler, 
  Crosshair, 
  Contrast
} from 'lucide-react';

interface ToolbarProps {
  activePreset: string;
  onSelectPreset: (preset: string) => void;
  sliceIndex: number;
  totalSlices: number;
  onSliceChange: (slice: number) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activePreset,
  onSelectPreset,
  sliceIndex,
  totalSlices,
  onSliceChange,
}) => {
  const presets = [
    { id: 'soft', label: 'Soft Tissue' },
    { id: 'lung', label: 'Lung' },
    { id: 'bone', label: 'Bone' },
    { id: 'brain', label: 'Brain' },
  ];

  return (
    <div className="h-10 bg-clinical-900 border-b border-clinical-750 px-3 flex items-center justify-between select-none">
      <div className="flex items-center space-x-1">
        <button className="p-1.5 rounded hover:bg-clinical-800 text-clinical-300 hover:text-white" title="Window/Level">
          <SunMedium className="w-4 h-4" />
        </button>
        <button className="p-1.5 rounded hover:bg-clinical-800 text-clinical-300 hover:text-white" title="Zoom">
          <ZoomIn className="w-4 h-4" />
        </button>
        <button className="p-1.5 rounded hover:bg-clinical-800 text-clinical-300 hover:text-white" title="Pan">
          <Move className="w-4 h-4" />
        </button>
        <button className="p-1.5 rounded hover:bg-clinical-800 text-clinical-300 hover:text-white" title="Crosshairs">
          <Crosshair className="w-4 h-4" />
        </button>
        <button className="p-1.5 rounded hover:bg-clinical-800 text-clinical-300 hover:text-white" title="Length Measurement">
          <Ruler className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-clinical-750 mx-2" />

        <div className="flex items-center space-x-1">
          <span className="text-[11px] text-clinical-400 mr-1 flex items-center gap-1">
            <Contrast className="w-3 h-3" /> W/L:
          </span>
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelectPreset(p.id)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                activePreset === p.id
                  ? 'bg-indigo-600 text-white font-medium'
                  : 'bg-clinical-800 text-clinical-300 hover:bg-clinical-750'
              }`}
            >
              {p.id.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <span className="text-xs font-mono text-clinical-300">
          Slice <span className="text-indigo-400 font-bold">{sliceIndex + 1}</span> / {totalSlices}
        </span>
        <input
          type="range"
          min={0}
          max={totalSlices - 1}
          value={sliceIndex}
          onChange={(e) => onSliceChange(parseInt(e.target.value))}
          className="w-36 h-1.5 bg-clinical-750 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
        <button className="p-1.5 rounded hover:bg-clinical-800 text-clinical-400 hover:text-clinical-200" title="Reset View">
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
