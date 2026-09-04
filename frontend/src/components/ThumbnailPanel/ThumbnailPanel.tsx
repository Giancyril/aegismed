import React from 'react';
import { Layers, Folder, HardDrive } from 'lucide-react';
import type { SeriesInfo } from '../../types';

interface ThumbnailPanelProps {
  seriesList: SeriesInfo[];
  selectedSeriesUid: string;
  onSelectSeries: (uid: string) => void;
}

export const ThumbnailPanel: React.FC<ThumbnailPanelProps> = ({
  seriesList,
  selectedSeriesUid,
  onSelectSeries,
}) => {
  return (
    <aside className="w-64 bg-clinical-900 border-r border-clinical-750 flex flex-col h-[calc(100vh-3rem-2rem)] select-none">
      <div className="p-3 border-b border-clinical-750 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs font-semibold text-clinical-200 uppercase tracking-wider">
          <Folder className="w-3.5 h-3.5 text-clinical-400" />
          <span>Series Navigator</span>
        </div>
        <span className="text-[11px] font-mono text-clinical-400 bg-clinical-800 px-1.5 py-0.5 rounded">
          {seriesList.length} Series
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {seriesList.map((series) => {
          const isSelected = series.seriesInstanceUid === selectedSeriesUid;
          return (
            <div
              key={series.seriesInstanceUid}
              onClick={() => onSelectSeries(series.seriesInstanceUid)}
              className={`p-2.5 rounded border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-clinical-800 border-indigo-500 shadow-sm'
                  : 'bg-clinical-850/50 border-clinical-750 hover:bg-clinical-800 hover:border-clinical-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-clinical-100 truncate flex items-center gap-1.5">
                  <span className="px-1 py-0.2 bg-clinical-750 text-clinical-300 rounded text-[10px] font-mono">
                    #{series.seriesNumber}
                  </span>
                  {series.seriesDescription}
                </span>
                <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/50">
                  {series.modality}
                </span>
              </div>

              <div className="h-24 bg-clinical-950 rounded border border-clinical-700 flex items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-t from-clinical-950/80 to-transparent z-10" />
                <div className="w-16 h-16 rounded-full border border-dashed border-clinical-600/40 flex items-center justify-center">
                  <span className="text-[10px] font-mono text-clinical-600">3D VOL</span>
                </div>
                <div className="absolute bottom-1.5 left-2 z-20 flex items-center space-x-1.5 text-[11px] font-mono text-clinical-300">
                  <Layers className="w-3 h-3 text-clinical-400" />
                  <span>{series.numSlices} Slices</span>
                </div>
                {series.sliceThickness && (
                  <div className="absolute bottom-1.5 right-2 z-20 text-[10px] font-mono text-clinical-400">
                    {series.sliceThickness}mm
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-2 border-t border-clinical-750 bg-clinical-900/50 text-[11px] text-clinical-400 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <HardDrive className="w-3 h-3 text-clinical-600" />
          <span>Local Cache: Ready</span>
        </span>
        <span className="font-mono text-emerald-400">320 MB</span>
      </div>
    </aside>
  );
};
