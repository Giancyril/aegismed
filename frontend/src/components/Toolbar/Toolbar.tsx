import React from 'react';
import { 
  SunMedium, 
  ZoomIn, 
  Move, 
  RotateCcw, 
  Ruler, 
  Crosshair, 
  Contrast,
  Layers3,
  Gauge
} from 'lucide-react';
import type { ViewportTool, MprOrientation } from '../../types';

interface ToolbarProps {
  activeTool: ViewportTool;
  onSelectTool: (tool: ViewportTool) => void;
  orientation: MprOrientation;
  onSelectOrientation: (ori: MprOrientation) => void;
  activePreset: string;
  onSelectPreset: (preset: string) => void;
  sliceIndex: number;
  totalSlices: number;
  onSliceChange: (slice: number) => void;
  onResetView: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onSelectTool,
  orientation,
  onSelectOrientation,
  activePreset,
  onSelectPreset,
  sliceIndex,
  totalSlices,
  onSliceChange,
  onResetView,
}) => {
  const presets = [
    { id: 'soft', label: 'Soft Tissue', w: 400, l: 40 },
    { id: 'lung', label: 'Lung', w: 1500, l: -600 },
    { id: 'bone', label: 'Bone', w: 2000, l: 300 },
    { id: 'brain', label: 'Brain', w: 80, l: 40 },
  ];

  const tools: { id: ViewportTool; label: string; icon: React.ReactNode }[] = [
    { id: 'windowLevel', label: 'Window/Level (WW/WL)', icon: <SunMedium className="w-4 h-4" /> },
    { id: 'zoom', label: 'Zoom (Right-Click Drag)', icon: <ZoomIn className="w-4 h-4" /> },
    { id: 'pan', label: 'Pan (Middle-Click Drag)', icon: <Move className="w-4 h-4" /> },
    { id: 'crosshair', label: 'Crosshairs (Sync)', icon: <Crosshair className="w-4 h-4" /> },
    { id: 'measure', label: 'Caliper (Distance mm)', icon: <Ruler className="w-4 h-4" /> },
    { id: 'probe', label: 'HU Probe (Pixel Value)', icon: <Gauge className="w-4 h-4" /> },
  ];

  return (
    <div className="h-10 bg-clinical-900 border-b border-clinical-750 px-3 flex items-center justify-between select-none">
      {/* Primary Radiology Tools */}
      <div className="flex items-center space-x-1">
        {tools.map((t) => {
          const isActive = activeTool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onSelectTool(t.id)}
              className={`p-1.5 rounded transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-clinical-300 hover:bg-clinical-800 hover:text-clinical-100'
              }`}
              title={t.label}
            >
              {t.icon}
            </button>
          );
        })}

        <div className="h-4 w-px bg-clinical-750 mx-1.5" />

        {/* MPR Orientation Switcher */}
        <div className="flex items-center space-x-1">
          <span className="text-[11px] text-clinical-400 mr-1 flex items-center gap-1 font-mono">
            <Layers3 className="w-3 h-3 text-clinical-500" /> MPR:
          </span>
          {(['axial', 'coronal', 'sagittal'] as MprOrientation[]).map((ori) => (
            <button
              key={ori}
              onClick={() => onSelectOrientation(ori)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono capitalize transition-colors ${
                orientation === ori
                  ? 'bg-clinical-700 text-clinical-100 font-semibold border border-clinical-600'
                  : 'bg-clinical-850 text-clinical-400 hover:bg-clinical-800 hover:text-clinical-200'
              }`}
            >
              {ori.slice(0, 3).toUpperCase()}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-clinical-750 mx-1.5" />

        {/* W/L Presets */}
        <div className="flex items-center space-x-1">
          <span className="text-[11px] text-clinical-400 mr-1 flex items-center gap-1 font-mono">
            <Contrast className="w-3 h-3 text-clinical-500" /> W/L:
          </span>
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelectPreset(p.id)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                activePreset === p.id
                  ? 'bg-indigo-600/90 text-white font-medium shadow-sm'
                  : 'bg-clinical-850 text-clinical-400 hover:bg-clinical-800 hover:text-clinical-200'
              }`}
              title={`${p.label} (W: ${p.w}, L: ${p.l})`}
            >
              {p.id.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Slice slider & counter */}
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
          className="w-32 h-1.5 bg-clinical-750 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
        <button
          onClick={onResetView}
          className="p-1.5 rounded hover:bg-clinical-800 text-clinical-400 hover:text-clinical-200 transition-colors"
          title="Reset Pan, Zoom, and W/L"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
