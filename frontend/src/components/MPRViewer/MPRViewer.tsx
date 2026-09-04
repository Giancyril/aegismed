import React, { useState } from 'react';
import { MPRPanel } from './MPRPanel';
import { LayoutGrid, Maximize2, RotateCcw } from 'lucide-react';

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
  // Orthogonal slice indexes (0 to 127)
  const [axialIndex, setAxialIndex] = useState(64);
  const [coronalIndex, setCoronalIndex] = useState(64);
  const [sagittalIndex, setSagittalIndex] = useState(64);

  // Synchronized 3D crosshair position normalized 0.0 to 1.0
  const [crosshair, setCrosshair] = useState({ x: 0.5, y: 0.5, z: 0.5 });
  const [zoom, setZoom] = useState(1.0);

  // When clicking on an axial panel (X, Y), update Sagittal (X) and Coronal (Y)
  const handleAxialClick = (x: number, y: number) => {
    setCrosshair(prev => ({ ...prev, x, y }));
    setSagittalIndex(Math.floor(x * 128));
    setCoronalIndex(Math.floor(y * 128));
  };

  const handleCoronalClick = (x: number, z: number) => {
    setCrosshair(prev => ({ ...prev, x, z }));
    setSagittalIndex(Math.floor(x * 128));
    setAxialIndex(Math.floor(z * 128));
  };

  const handleSagittalClick = (y: number, z: number) => {
    setCrosshair(prev => ({ ...prev, y, z }));
    setCoronalIndex(Math.floor(y * 128));
    setAxialIndex(Math.floor(z * 128));
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
          <span>W/L: <strong className="text-clinical-100">{windowWidth}/{windowLevel}</strong></span>
          <button
            onClick={() => {
              setCrosshair({ x: 0.5, y: 0.5, z: 0.5 });
              setAxialIndex(64);
              setCoronalIndex(64);
              setSagittalIndex(64);
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
          windowWidth={windowWidth}
          windowLevel={windowLevel}
          zoom={zoom}
          crosshair={{ x: crosshair.x, y: crosshair.y }}
          onSliceChange={setAxialIndex}
          onCrosshairMove={handleAxialClick}
          seriesInstanceUid={seriesInstanceUid}
        />

        {/* Coronal Panel */}
        <MPRPanel
          plane="coronal"
          sliceIndex={coronalIndex}
          totalSlices={128}
          windowWidth={windowWidth}
          windowLevel={windowLevel}
          zoom={zoom}
          crosshair={{ x: crosshair.x, y: crosshair.z }}
          onSliceChange={setCoronalIndex}
          onCrosshairMove={handleCoronalClick}
          seriesInstanceUid={seriesInstanceUid}
        />

        {/* Sagittal Panel */}
        <MPRPanel
          plane="sagittal"
          sliceIndex={sagittalIndex}
          totalSlices={128}
          windowWidth={windowWidth}
          windowLevel={windowLevel}
          zoom={zoom}
          crosshair={{ x: crosshair.y, y: crosshair.z }}
          onSliceChange={setSagittalIndex}
          onCrosshairMove={handleSagittalClick}
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
