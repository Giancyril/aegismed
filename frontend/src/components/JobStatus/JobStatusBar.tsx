import React from 'react';
import type { JobStatus } from '../../types';

interface JobStatusBarProps {
  status: JobStatus;
  isStreaming?: boolean;
}

export const JobStatusBar: React.FC<JobStatusBarProps> = ({ status, isStreaming }) => {
  const isBusy = status.status === 'inferring' || status.status === 'preprocessing' || status.status === 'postprocessing';

  return (
    <footer className="h-8 bg-clinical-900 border-t border-clinical-750 flex items-center justify-between px-4 text-xs font-mono select-none">
      <div className="flex items-center space-x-3">
        {/* Animated Pulse Ring indicator */}
        <div className="flex items-center space-x-2">
          <div className="relative flex items-center justify-center w-3 h-3">
            {isBusy ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
              </>
            ) : status.status === 'completed' ? (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-sm shadow-emerald-400/50" />
            ) : (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-clinical-500" />
            )}
          </div>
          <span className="text-clinical-500">Pipeline Status:</span>
          <span className="capitalize font-semibold text-clinical-200">{status.status}</span>
        </div>

        {/* Animated gradient progress bar */}
        {isBusy ? (
          <div className="flex items-center space-x-2">
            <div className="w-36 bg-clinical-800 rounded-full h-1.5 overflow-hidden relative">
              <div
                className="h-1.5 rounded-full transition-all duration-300 ease-out bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
                style={{ width: `${Math.max(5, status.progress)}%` }}
              />
              <div className="absolute inset-0 bg-white/10 animate-pulse" />
            </div>
            <span className="text-[11px] font-bold text-indigo-400">{status.progress}%</span>
          </div>
        ) : null}

        <span className="text-clinical-400 text-[11px] truncate max-w-md">
          {status.message}
        </span>
      </div>

      <div className="flex items-center space-x-4 text-[11px] text-clinical-400">
        <div className="flex items-center space-x-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${isStreaming ? 'bg-emerald-400 animate-pulse' : 'bg-clinical-500'}`} />
          <span>WebSocket: <strong className={isStreaming ? 'text-emerald-400 font-normal' : 'text-clinical-400 font-normal'}>
            {isStreaming ? 'Active' : 'Polling'}
          </strong></span>
        </div>
        <div>Engine: <span className="text-indigo-300">MONAI Core</span></div>
        <div>WebGPU / WebGL: <span className="text-emerald-400">Active</span></div>
      </div>
    </footer>
  );
};
