import React, { useState } from 'react';
import { MPRPanel } from './MPRPanel';
import { useCrosshairSync } from '../../hooks/useCrosshairSync';
import { LayoutGrid, Maximize2, RotateCcw, Sliders } from 'lucide-react';

const PRESETS = [
  { id: 'soft', name: 'Soft Tissue', w: 400, l: 40 },
  { id: 'bone', name: 'Bone', w: 1800, l: 400 },
  { id: 'lung', name: 'Lung', w: 1500, l: -600 },
  { id: 'liver', name: 'Liver', w: 150, l: 30 }
];


interface MPRViewerProps {
  seriesInstanceUid?: string;
  windowWidth?: number;
  windowLevel?: number;
}

export const MPRViewer: React.FC<MPRViewerProps> = ({
  seriesInstanceUid = '1.2.840.113619.2.55.3.60468842',
  windowWidth = 400,
  windowLevel = 40
}) => {
  const {
    coord,
    axialIndex,
    coronalIndex,
    sagittalIndex,
    updateFromPlane,
    setSliceIndex,
    resetToCenter
  } = useCrosshairSync(128);

  const [zoom, setZoom] = useState(1.0);
  const [activePreset, setActivePreset] = useState('soft');
  const [wl, setWl] = useState({ w: windowWidth, l: windowLevel });

  const applyPreset = (presetId: string) => {
    const p = PRESETS.find(x => x.id === presetId);
    if (p) {
      setActivePreset(p.id);
      setWl({ w: p.w, l: p.l });
    }
  };


  return (
    <div className="flex-1 flex flex-col bg-[#07090e] border border-clinical-750 overflow-hidden select-none">
      {/* MPR Top Header */}
      <div className="h-9 bg-clinical-900/90 border-b border-clinical-750 px-3 flex items-center justify-between font-mono text-xs text-clinical-300">
        <div className="flex items-center space-x-2">
          <LayoutGrid className="w-4 h-4 text-indigo-400" />
          <span className="font-bold text-clinical-100">Multi-Planar Reconstruction (MPR)</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-clinical-800 text-clinical-400">
            Synchronized 3-Plane
          </span>
        </div>

        <div className="flex items-center space-x-3 text-[11px]">
        <div className="flex items-center space-x-2">
          <span className="text-[11px] text-clinical-400 font-mono">Preset:</span>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p.id)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                activePreset === p.id
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'bg-clinical-800 text-clinical-400 hover:text-clinical-200'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>

          <span>W/L: <strong className="text-clinical-100">{windowWidth}/{windowLevel}</strong></span>
          <button
            onClick={() => {
              resetToCenter();
              setZoom(1.0);
            }}
            title="Reset Crosshairs"
            className="flex items-center space-x-1 px-2 py-0.5 rounded bg-clinical-800 hover:bg-clinical-750 text-clinical-300 hover:text-clinical-100 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* 3-Panel Grid: Axial on top, Coronal and Sagittal on bottom */}
      <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-1 p-1 bg-clinical-950">
        {/* Axial Panel */}
        <MPRPanel
          plane="axial"
          sliceIndex={axialIndex}
          totalSlices={128}
          windowWidth={wl.w}
          windowLevel={wl.l}
          zoom={zoom}
          crosshair={{ x: coord.x, y: coord.y }}
          onSliceChange={(idx) => setSliceIndex('axial', idx)}
          onCrosshairMove={(x, y) => updateFromPlane('axial', x, y)}
          seriesInstanceUid={seriesInstanceUid}
        />

        {/* Coronal Panel */}
        <MPRPanel
          plane="coronal"
          sliceIndex={coronalIndex}
          totalSlices={128}
          windowWidth={wl.w}
          windowLevel={wl.l}
          zoom={zoom}
          crosshair={{ x: coord.x, y: coord.z }}
          onSliceChange={(idx) => setSliceIndex('coronal', idx)}
          onCrosshairMove={(x, z) => updateFromPlane('coronal', x, z)}
          seriesInstanceUid={seriesInstanceUid}
        />

        {/* Sagittal Panel */}
        <MPRPanel
          plane="sagittal"
          sliceIndex={sagittalIndex}
          totalSlices={128}
          windowWidth={wl.w}
          windowLevel={wl.l}
          zoom={zoom}
          crosshair={{ x: coord.y, y: coord.z }}
          onSliceChange={(idx) => setSliceIndex('sagittal', idx)}
          onCrosshairMove={(y, z) => updateFromPlane('sagittal', y, z)}
          seriesInstanceUid={seriesInstanceUid}
        />

        {/* 3D Volume Orientation Overview (Bottom Right) */}
        <div className="bg-[#080a0f] border border-clinical-750 rounded p-4 flex flex-col justify-between font-mono text-xs text-clinical-300">
          <div className="space-y-2">
            <div className="text-xs font-bold text-clinical-100 uppercase tracking-wider">Spatial Position HUD</div>
            <div className="space-y-1 text-[11px]">
              <div>Axial (Z): <span className="text-indigo-400 font-bold">{axialIndex}</span> / 128</div>
              <div>Coronal (Y): <span className="text-emerald-400 font-bold">{coronalIndex}</span> / 128</div>
              <div>Sagittal (X): <span className="text-amber-400 font-bold">{sagittalIndex}</span> / 128</div>
            </div>
          </div>

          <div className="p-2.5 rounded bg-clinical-900/60 border border-clinical-800 text-[10px] text-clinical-400 leading-relaxed">
            Scroll wheel over any plane to page through slices. Click to position synchronized 3D crosshair.
          </div>
        </div>
      </div>
    </div>
  );
};
