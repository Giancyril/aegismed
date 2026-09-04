import React from 'react';
import { BrainCircuit, Eye, EyeOff, Sliders, Cpu, Play, BarChart3 } from 'lucide-react';
import type { SegmentationLabel, JobStatus } from '../../types';
import { OrganStatsTable } from './OrganStatsTable';

interface SegmentationPanelProps {
  labels: SegmentationLabel[];
  onToggleLabel: (id: string) => void;
  onOpacityChange: (id: string, opacity: number) => void;
  jobStatus: JobStatus;
  onRunInference: () => void;
}

export const SegmentationPanel: React.FC<SegmentationPanelProps> = ({
  labels,
  onToggleLabel,
  onOpacityChange,
  jobStatus,
  onRunInference,
}) => {
  const isInferring = jobStatus.status === 'preprocessing' || jobStatus.status === 'inferring';

  return (
    <aside className="w-72 bg-clinical-900 border-l border-clinical-750 flex flex-col h-[calc(100vh-3rem-2rem)] select-none">
      <div className="p-3 border-b border-clinical-750 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs font-semibold text-clinical-200 uppercase tracking-wider">
          <BrainCircuit className="w-4 h-4 text-indigo-400" />
          <span>AI Inference & Overlays</span>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 rounded">
          Modal Serverless
        </span>
      </div>

      {/* Model Specs Card */}
      <div className="p-3 border-b border-clinical-750 bg-clinical-850/40">
        <div className="text-[11px] font-medium text-clinical-300 mb-1 flex items-center justify-between">
          <span>Active Bundle:</span>
          <span className="font-mono text-indigo-300 font-semibold">{jobStatus.modelName}</span>
        </div>
        <p className="text-[11px] text-clinical-400 mb-3">
          MONAI 3D sliding-window segmentation resampled at 1.5mm isometric voxel spacing.
        </p>

        <button
          onClick={onRunInference}
          disabled={isInferring}
          className={`w-full py-2 px-3 rounded flex items-center justify-center space-x-2 text-xs font-semibold transition-all ${
            isInferring
              ? 'bg-clinical-750 text-clinical-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
          }`}
        >
          {isInferring ? (
            <>
              <Cpu className="w-3.5 h-3.5 animate-spin text-indigo-300" />
              <span>{jobStatus.message.slice(0, 24)}...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run GPU Inference</span>
            </>
          )}
        </button>
      </div>

      {/* Organ / Label List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        <div className="text-[11px] font-semibold text-clinical-400 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-clinical-500" />
            Anatomical Structures
          </span>
          <span className="text-[10px] font-mono bg-clinical-800 px-1.5 py-0.5 rounded">
            {labels.length} Regions
          </span>
        </div>

        {labels.map((label) => (
          <div
            key={label.id}
            className="p-2.5 rounded bg-clinical-850 border border-clinical-750 hover:border-clinical-700 transition-colors"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center space-x-2">
                <span
                  className="w-3 h-3 rounded-xs"
                  style={{ backgroundColor: label.color }}
                />
                <span className="text-xs font-semibold text-clinical-100">{label.name}</span>
              </div>
              <button
                onClick={() => onToggleLabel(label.id)}
                className="text-clinical-400 hover:text-clinical-100 p-1 transition-colors"
                title={label.visible ? 'Hide mask' : 'Show mask'}
              >
                {label.visible ? (
                  <Eye className="w-3.5 h-3.5 text-indigo-400" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-clinical-600" />
                )}
              </button>
            </div>

            {/* Metrics */}
            <div className="flex items-center justify-between text-[11px] font-mono text-clinical-400 mb-2">
              <span>Vol: <span className="text-clinical-100 font-semibold">{label.volumeCm3 ?? 0} cm³</span></span>
              {label.confidence && (
                <span>Conf: <span className="text-emerald-400 font-semibold">{(label.confidence * 100).toFixed(1)}%</span></span>
              )}
            </div>

            {/* Opacity slider */}
            <div className="flex items-center space-x-2 text-[10px] text-clinical-400">
              <Sliders className="w-3 h-3 text-clinical-500" />
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(label.opacity * 100)}
                disabled={!label.visible}
                onChange={(e) => onOpacityChange(label.id, parseInt(e.target.value) / 100)}
                className="w-full h-1 bg-clinical-750 rounded appearance-none cursor-pointer accent-indigo-500 disabled:opacity-30"
              />
              <span className="font-mono w-7 text-right">{Math.round(label.opacity * 100)}%</span>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};
