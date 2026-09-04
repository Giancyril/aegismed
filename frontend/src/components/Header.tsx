import React from 'react';
import { Activity, Upload, Database, Settings, ShieldCheck } from 'lucide-react';
import type { PatientInfo } from '../types';

interface HeaderProps {
  patient: PatientInfo;
  onUploadClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ patient, onUploadClick }) => {
  return (
    <header className="h-12 bg-clinical-900 border-b border-clinical-750 flex items-center justify-between px-4 select-none">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 text-indigo-400 font-semibold tracking-wide">
          <Activity className="w-5 h-5 text-indigo-400 animate-pulse" />
          <span className="text-sm font-bold text-clinical-100 uppercase tracking-wider">AegisMed</span>
          <span className="text-xs px-2 py-0.5 rounded bg-clinical-800 text-indigo-300 font-mono border border-clinical-700">
            MONAI v1.3
          </span>
        </div>

        <div className="h-4 w-px bg-clinical-750" />

        <div className="flex items-center space-x-3 text-xs">
          <span className="text-clinical-400">Patient:</span>
          <span className="font-mono text-clinical-100 font-medium">{patient.name}</span>
          <span className="text-clinical-600 font-mono">[{patient.id}]</span>
          <span className="text-clinical-400 ml-2">Study:</span>
          <span className="font-mono text-clinical-200">{patient.studyDate || '2026-09-04'}</span>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2 py-1 rounded font-mono">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>PS 3.15 De-identified</span>
        </div>

        <button
          onClick={onUploadClick}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium transition-colors shadow-sm"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Ingest DICOM</span>
        </button>

        <div className="flex items-center space-x-1 text-clinical-400 hover:text-clinical-200 cursor-pointer p-1">
          <Database className="w-4 h-4" />
        </div>
        <div className="flex items-center space-x-1 text-clinical-400 hover:text-clinical-200 cursor-pointer p-1">
          <Settings className="w-4 h-4" />
        </div>
      </div>
    </header>
  );
};
