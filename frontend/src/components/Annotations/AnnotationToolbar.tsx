import React from 'react';
import { Ruler, Pentagon, Compass, Trash2, Download, MousePointer } from 'lucide-react';

export type AnnotationToolMode = 'none' | 'caliper' | 'polygon' | 'angle';

interface AnnotationToolbarProps {
  activeMode: AnnotationToolMode;
  onSelectMode: (mode: AnnotationToolMode) => void;
  annotationCount: number;
  onClearAnnotations: () => void;
  onExportAnnotations: (format: 'json' | 'sr') => void;
  className?: string;
}

export const AnnotationToolbar: React.FC<AnnotationToolbarProps> = ({
  activeMode,
  onSelectMode,
  annotationCount,
  onClearAnnotations,
  onExportAnnotations,
  className = ''
}) => {
  return (
    <div className={`flex items-center space-x-1.5 bg-clinical-900/90 border border-clinical-750 px-2.5 py-1 rounded-md text-xs font-mono text-clinical-200 select-none backdrop-blur-xs ${className}`}>
      <span className="text-[11px] text-clinical-400 font-semibold mr-1 flex items-center gap-1">
        <Ruler className="w-3.5 h-3.5 text-indigo-400" /> Measure:
      </span>

      {/* Tool Mode Buttons */}
      <button
        onClick={() => onSelectMode('none')}
        title="Pointer (Navigate)"
        className={`px-2 py-1 rounded flex items-center space-x-1 transition-colors ${
          activeMode === 'none'
            ? 'bg-clinical-700 text-clinical-100 font-bold border border-clinical-600'
            : 'text-clinical-400 hover:text-clinical-200 hover:bg-clinical-800'
        }`}
      >
        <MousePointer className="w-3 h-3" />
        <span>Pointer</span>
      </button>

      <button
        onClick={() => onSelectMode('caliper')}
        title="Linear Caliper (mm)"
        className={`px-2 py-1 rounded flex items-center space-x-1 transition-colors ${
          activeMode === 'caliper'
            ? 'bg-emerald-700 text-white font-bold border border-emerald-500 shadow-xs'
            : 'text-clinical-400 hover:text-clinical-200 hover:bg-clinical-800'
        }`}
      >
        <Ruler className="w-3 h-3" />
        <span>Caliper</span>
      </button>

      <button
        onClick={() => onSelectMode('polygon')}
        title="Polygon Region (Area mm²)"
        className={`px-2 py-1 rounded flex items-center space-x-1 transition-colors ${
          activeMode === 'polygon'
            ? 'bg-emerald-700 text-white font-bold border border-emerald-500 shadow-xs'
            : 'text-clinical-400 hover:text-clinical-200 hover:bg-clinical-800'
        }`}
      >
        <Pentagon className="w-3 h-3" />
        <span>Area</span>
      </button>

      <button
        onClick={() => onSelectMode('angle')}
        title="Cobb / Diagnostic Angle (Degrees)"
        className={`px-2 py-1 rounded flex items-center space-x-1 transition-colors ${
          activeMode === 'angle'
            ? 'bg-emerald-700 text-white font-bold border border-emerald-500 shadow-xs'
            : 'text-clinical-400 hover:text-clinical-200 hover:bg-clinical-800'
        }`}
      >
        <Compass className="w-3 h-3" />
        <span>Angle</span>
      </button>

      <div className="h-4 w-px bg-clinical-750 mx-1" />

      {/* Count badge */}
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-clinical-800 text-clinical-400">
        {annotationCount} saved
      </span>

      {/* Export / Clear */}
      <div className="flex items-center space-x-1 pl-1">
        <button
          onClick={() => onExportAnnotations('sr')}
          title="Export DICOM SR (TID 1500)"
          className="p-1 rounded hover:bg-clinical-800 text-clinical-400 hover:text-indigo-300 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
        </button>

        {annotationCount > 0 && (
          <button
            onClick={onClearAnnotations}
            title="Clear all measurements"
            className="p-1 rounded hover:bg-red-950/80 text-clinical-400 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
