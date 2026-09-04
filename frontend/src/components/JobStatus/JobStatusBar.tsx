import React from 'react';
import type { JobStatus } from '../../types';

interface JobStatusBarProps {
  status: JobStatus;
}

export const JobStatusBar: React.FC<JobStatusBarProps> = ({ status }) => {
  return (
    <footer className="h-8 bg-clinical-900 border-t border-clinical-750 flex items-center justify-between px-4 text-xs font-mono select-none">
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1.5">
          <span className="text-clinical-500">Pipeline Status:</span>
          <span className="capitalize font-semibold text-clinical-200">{status.status}</span>
        </div>

        {status.status === 'inferring' || status.status === 'preprocessing' ? (
          <div className="flex items-center space-x-2">
            <div className="w-32 bg-clinical-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${status.progress}%` }}
              />
            </div>
            <span className="text-[11px] text-indigo-400">{status.progress}%</span>
          </div>
        ) : null}

        <span className="text-clinical-400 text-[11px]">• {status.message}</span>
      </div>

      <div className="flex items-center space-x-4 text-[11px] text-clinical-400">
        <div>Cornerstone3D: <span className="text-emerald-400">Initialized</span></div>
        <div>WebGPU / WebGL: <span className="text-emerald-400">Active</span></div>
      </div>
    </footer>
  );
};
