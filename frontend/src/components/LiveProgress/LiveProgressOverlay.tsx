import React from 'react';
import { Activity, CheckCircle2, Clock, Cpu, AlertCircle, Loader2 } from 'lucide-react';

interface StageDef {
  id: string;
  name: string;
  description: string;
  expectedSeconds: number;
}

const STAGES: StageDef[] = [
  { id: 'queued', name: 'Job Queued', description: 'Assigned to async worker pool', expectedSeconds: 2 },
  { id: 'preprocessing', name: 'Preprocessing', description: 'RAS orientation, 1.5mm resampling, HU window', expectedSeconds: 4 },
  { id: 'inferring', name: '3D Inference', description: 'MONAI sliding-window with Gaussian aggregation', expectedSeconds: 12 },
  { id: 'postprocessing', name: 'Post-processing', description: 'Connected components & mask packaging', expectedSeconds: 3 },
  { id: 'completed', name: 'Complete', description: 'Organ segmentation ready for rendering', expectedSeconds: 0 }
];

interface LiveProgressOverlayProps {
  stage: string;
  progress: number;
  message: string;
  isConnected: boolean;
  error?: string | null;
  metrics?: any;
}

export const LiveProgressOverlay: React.FC<LiveProgressOverlayProps> = ({
  stage,
  progress,
  message,
  isConnected,
  error,
  metrics
}) => {
  if (stage === 'idle' && !error) return null;

  const getStageIndex = (s: string) => {
    switch (s) {
      case 'queued': return 0;
      case 'preprocessing': return 1;
      case 'inferring': return 2;
      case 'postprocessing': return 3;
      case 'completed': return 4;
      default: return 0;
    }
  };

  const currentIndex = getStageIndex(stage);

  // Calculate dynamic remaining ETA in seconds
  const remainingSeconds = STAGES.slice(currentIndex).reduce((acc, s) => acc + s.expectedSeconds, 0);

  return (
    <div className="bg-clinical-900/90 border border-clinical-700/80 rounded-lg p-4 shadow-xl backdrop-blur-md text-clinical-100 mb-3">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-clinical-800">
        <div className="flex items-center space-x-2">
          <Activity className={`w-4 h-4 ${stage === 'completed' ? 'text-emerald-400' : 'text-indigo-400 animate-pulse'}`} />
          <span className="text-xs font-bold tracking-wider uppercase text-clinical-200">
            Real-Time Inference Pipeline
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium ${
            isConnected ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60' : 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
          }`}>
            {isConnected ? 'LIVE WS' : 'RECONNECTING'}
          </span>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono text-clinical-400">
          <span className="flex items-center space-x-1">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>GPU: A10G / MONAI Core</span>
          </span>
          {stage !== 'completed' && stage !== 'failed' && (
            <span className="flex items-center space-x-1 text-clinical-300">
              <Clock className="w-3.5 h-3.5 text-clinical-400" />
              <span>ETA: ~{remainingSeconds}s</span>
            </span>
          )}
        </div>
      </div>

      {/* Stage Timeline */}
      <div className="grid grid-cols-5 gap-2 mb-3">
        {STAGES.map((s, idx) => {
          const isDone = currentIndex > idx || stage === 'completed';
          const isActive = currentIndex === idx && stage !== 'completed' && stage !== 'failed';

          return (
            <div
              key={s.id}
              className={`p-2 rounded border transition-all ${
                isDone
                  ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
                  : isActive
                  ? 'bg-indigo-950/50 border-indigo-500/70 text-indigo-200 shadow-sm shadow-indigo-950'
                  : 'bg-clinical-950/40 border-clinical-800/50 text-clinical-500'
              }`}
            >
              <div className="flex items-center space-x-1.5 mb-1">
                {isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                ) : isActive ? (
                  <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin flex-shrink-0" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border border-clinical-700 flex items-center justify-center text-[9px] text-clinical-500">
                    {idx + 1}
                  </div>
                )}
                <span className="text-[11px] font-semibold truncate">{s.name}</span>
              </div>
              <p className="text-[9px] text-clinical-400 line-clamp-2 leading-tight">
                {s.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Message and Status */}
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-clinical-300 truncate max-w-[80%]">
          {error ? (
            <span className="text-red-400 flex items-center space-x-1">
              <AlertCircle className="w-3.5 h-3.5 mr-1 inline" />
              {error}
            </span>
          ) : (
            message
          )}
        </span>
        <span className="font-bold text-indigo-400">{progress}%</span>
      </div>

      {/* Metrics badge if completed */}
      {metrics && metrics.volume_cm3 && (
        <div className="mt-2 pt-2 border-t border-clinical-800/80 flex items-center space-x-4 text-[11px] font-mono text-clinical-300">
          <span>Target Volume: <strong className="text-emerald-400">{metrics.volume_cm3} cm³</strong></span>
          <span>Confidence: <strong className="text-indigo-400">{(metrics.confidence * 100).toFixed(1)}%</strong></span>
          <span>Voxels: <strong className="text-clinical-200">{metrics.voxel_count?.toLocaleString()}</strong></span>
        </div>
      )}
    </div>
  );
};
