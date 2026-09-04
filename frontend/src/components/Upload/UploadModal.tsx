import React, { useState } from 'react';
import { X, UploadCloud, ShieldCheck } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: (fileName: string) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUploaded }) => {
  const [dragOver, setDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleSimulatedUpload = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onUploaded("CT_Abdomen_Study_01.zip");
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-clinical-900 border border-clinical-700 w-full max-w-lg rounded-lg shadow-2xl overflow-hidden">
        <div className="p-3.5 border-b border-clinical-750 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm font-semibold text-clinical-100">
            <UploadCloud className="w-4 h-4 text-indigo-400" />
            <span>Ingest Medical Imaging Data (DICOM / ZIP)</span>
          </div>
          <button onClick={onClose} className="text-clinical-400 hover:text-clinical-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleSimulatedUpload(); }}
            onClick={handleSimulatedUpload}
            className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              dragOver ? 'border-indigo-500 bg-indigo-950/20' : 'border-clinical-700 hover:border-clinical-600 bg-clinical-850/50'
            }`}
          >
            <UploadCloud className="w-10 h-10 text-indigo-400 mb-3" />
            <h4 className="text-xs font-semibold text-clinical-100 mb-1">
              {isProcessing ? "Ingesting and de-identifying DICOM..." : "Drag & Drop DICOM files or series ZIP archive here"}
            </h4>
            <p className="text-[11px] text-clinical-400 max-w-xs mb-3">
              Supports single .dcm slices, multi-frame DICOM, and zipped series folders.
            </p>
            <button className="px-3 py-1.5 bg-clinical-800 hover:bg-clinical-750 text-clinical-200 rounded text-xs border border-clinical-700 font-mono">
              Browse Local Files
            </button>
          </div>

          <div className="mt-4 p-3 bg-clinical-850 rounded border border-clinical-750 text-xs space-y-1.5">
            <div className="flex items-center space-x-2 text-emerald-400 font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>Automated DICOM PS 3.15 De-identification</span>
            </div>
            <p className="text-[11px] text-clinical-400">
              All direct Patient Health Information (PHI) tags are automatically pseudonymized before persistence.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
