import React, { useState, useRef } from 'react';
import type { SegmentationLabel, ViewportTool, MprOrientation } from '../../types';

interface ViewportProps {
  sliceIndex: number;
  totalSlices: number;
  activePreset: string;
  activeTool: ViewportTool;
  orientation: MprOrientation;
  labels: SegmentationLabel[];
}

export const Viewport: React.FC<ViewportProps> = ({
  sliceIndex,
  totalSlices,
  activePreset,
  activeTool,
  orientation,
  labels,
}) => {
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Interactive Measurement Caliper
  const [measurement, setMeasurement] = useState<{ start: { x: number; y: number } | null; end: { x: number; y: number } | null }>({
    start: null,
    end: null,
  });

  // Probe coordinate & pixel value
  const [probe, setProbe] = useState<{ x: number; y: number; hu: number; tissue: string }>({
    x: 256,
    y: 256,
    hu: 42,
    tissue: 'Soft Tissue',
  });

  const containerRef = useRef<HTMLDivElement>(null);

  const getPresetValues = (preset: string) => {
    switch (preset) {
      case 'lung': return { w: 1500, l: -600 };
      case 'bone': return { w: 2000, l: 300 };
      case 'brain': return { w: 80, l: 40 };
      default: return { w: 400, l: 40 };
    }
  };

  const { w, l } = getPresetValues(activePreset);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTool === 'pan' || activeTool === 'zoom') {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (activeTool === 'measure') {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const x = Math.round(e.clientX - rect.left);
        const y = Math.round(e.clientY - rect.top);
        setMeasurement({ start: { x, y }, end: { x, y } });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const relX = Math.round(e.clientX - rect.left);
      const relY = Math.round(e.clientY - rect.top);
      
      // Calculate realistic HU based on position in synthetic slice
      const dx = relX - rect.width / 2;
      const dy = relY - rect.height / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let hu = -1000; // Air
      let tissue = 'Air';
      if (dist < 180) {
        if (dist > 150 && dist < 170) {
          hu = 850;
          tissue = 'Cortical Bone (Ribs)';
        } else if (dx > 40 && dy > -30 && dy < 50) {
          hu = 55;
          tissue = 'Spleen Parenchyma';
        } else if (dx < -20 && dy > -50 && dy < 60) {
          hu = 62;
          tissue = 'Liver Parenchyma';
        } else if (Math.abs(dx) < 25 && dy > 80) {
          hu = 920;
          tissue = 'Vertebral Bone';
        } else {
          hu = 38;
          tissue = 'Soft Tissue / Mesentery';
        }
      }

      setProbe({ x: relX, y: relY, hu, tissue });

      if (activeTool === 'measure' && measurement.start) {
        setMeasurement((prev) => ({ ...prev, end: { x: relX, y: relY } }));
      }
    }

    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      if (activeTool === 'pan') {
        setPan((p) => ({ x: p.x + deltaX, y: p.y + deltaY }));
        setDragStart({ x: e.clientX, y: e.clientY });
      } else if (activeTool === 'zoom') {
        setZoom((z) => Math.max(0.5, Math.min(3.0, z - deltaY * 0.005)));
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getDistanceMm = () => {
    if (!measurement.start || !measurement.end) return null;
    const dx = measurement.end.x - measurement.start.x;
    const dy = measurement.end.y - measurement.start.y;
    // Assume 0.75 mm per screen pixel at 1.0 zoom
    const distPx = Math.sqrt(dx * dx + dy * dy);
    return ((distPx * 0.75) / zoom).toFixed(1);
  };

  const spleen = labels.find((l) => l.id === 'spleen');
  const liver = labels.find((l) => l.id === 'liver');
  const kidneys = labels.find((l) => l.id === 'kidneys');
  const pancreas = labels.find((l) => l.id === 'pancreas');

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className={`flex-1 bg-clinical-950 relative overflow-hidden flex items-center justify-center select-none ${
        activeTool === 'pan' ? 'cursor-grab active:cursor-grabbing' :
        activeTool === 'zoom' ? 'cursor-ns-resize' :
        activeTool === 'measure' ? 'cursor-crosshair' :
        activeTool === 'crosshair' ? 'cursor-crosshair' : 'cursor-default'
      }`}
    >
      {/* Dynamic Anatomical Directional Markers */}
      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 text-[11px] font-mono font-bold text-clinical-400 bg-clinical-900/80 border border-clinical-750 px-2 py-0.5 rounded shadow-sm">
        {orientation === 'axial' ? 'A (Anterior)' : orientation === 'coronal' ? 'S (Superior)' : 'S (Superior)'}
      </div>
      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 text-[11px] font-mono font-bold text-clinical-400 bg-clinical-900/80 border border-clinical-750 px-2 py-0.5 rounded shadow-sm">
        {orientation === 'axial' ? 'P (Posterior)' : orientation === 'coronal' ? 'I (Inferior)' : 'I (Inferior)'}
      </div>
      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono font-bold text-clinical-400 bg-clinical-900/80 border border-clinical-750 px-2 py-0.5 rounded shadow-sm">
        {orientation === 'axial' ? 'R (Right)' : orientation === 'coronal' ? 'R (Right)' : 'A (Anterior)'}
      </div>
      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono font-bold text-clinical-400 bg-clinical-900/80 border border-clinical-750 px-2 py-0.5 rounded shadow-sm">
        {orientation === 'axial' ? 'L (Left)' : orientation === 'coronal' ? 'L (Left)' : 'P (Posterior)'}
      </div>

      {/* Clinical Overlay Metadata HUD (Top Left & Top Right) */}
      <div className="absolute top-3 left-3 text-[11px] font-mono text-clinical-300 space-y-0.5 pointer-events-none bg-clinical-900/40 p-2 rounded border border-clinical-750/50 backdrop-blur-xs">
        <div className="font-bold text-clinical-100">CT ABDOMEN/PELVIS 3D</div>
        <div>KV: 120 | mA: 240 | Rot: 0.5s</div>
        <div>Thick: 2.0 mm | Spacing: 1.5mm</div>
        <div>Kernel: B30f medium smooth</div>
      </div>

      <div className="absolute top-3 right-3 text-[11px] font-mono text-clinical-300 text-right space-y-0.5 pointer-events-none bg-clinical-900/40 p-2 rounded border border-clinical-750/50 backdrop-blur-xs">
        <div>W: <span className="text-clinical-100 font-bold">{w}</span> | L: <span className="text-clinical-100 font-bold">{l}</span></div>
        <div>Preset: <span className="text-indigo-400 font-semibold uppercase">{activePreset}</span></div>
        <div>Zoom: <span className="text-clinical-100 font-mono">{(zoom * 100).toFixed(0)}%</span></div>
        <div>View: <span className="text-indigo-300 font-semibold uppercase">{orientation}</span></div>
      </div>

      {/* Real-time Probe HUD (Bottom Left) */}
      <div className="absolute bottom-3 left-3 text-[11px] font-mono text-clinical-300 pointer-events-none bg-clinical-900/60 p-2 rounded border border-clinical-750/70 backdrop-blur-xs flex items-center space-x-3">
        <div>
          Pos: <span className="text-clinical-100">[{probe.x}, {probe.y}]</span>
        </div>
        <div className="h-3 w-px bg-clinical-700" />
        <div>
          HU: <span className={`font-bold ${probe.hu > 200 ? 'text-amber-400' : probe.hu < -200 ? 'text-cyan-400' : 'text-indigo-400'}`}>{probe.hu} HU</span>
        </div>
        <div className="h-3 w-px bg-clinical-700" />
        <div className="text-clinical-400">
          Class: <span className="text-clinical-200">{probe.tissue}</span>
        </div>
      </div>

      {/* Scale Bar (Bottom Right) */}
      <div className="absolute bottom-3 right-3 pointer-events-none flex flex-col items-end text-[10px] font-mono text-clinical-400">
        <div className="mb-1">50 mm</div>
        <div className="w-16 h-1 bg-clinical-300 border-x border-white" />
      </div>

      {/* Transformable Medical Viewport Canvas */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
        }}
        className="w-[512px] h-[512px] relative border border-clinical-700/60 rounded-md bg-[#0b0d12] shadow-2xl flex items-center justify-center"
      >
        <svg viewBox="0 0 512 512" className="w-full h-full">
          {/* Patient Contour */}
          <ellipse cx="256" cy="256" rx="205" ry="165" fill="#151922" stroke="#374151" strokeWidth="2" />
          <ellipse cx="256" cy="256" rx="190" ry="150" fill="#10131a" stroke="#1f2937" strokeWidth="1" />

          {/* Spine and Vertebral Body */}
          <path d="M 234 382 Q 256 360 278 382 Q 268 402 244 402 Z" fill="#f3f4f6" stroke="#9ca3af" strokeWidth="1" />
          <circle cx="256" cy="386" r="7" fill="#090a0d" />

          {/* Lateral Rib Cross-sections */}
          <path d="M 68 235 Q 58 275 78 315" stroke="#e5e7eb" strokeWidth="6" fill="none" strokeLinecap="round" />
          <path d="M 444 235 Q 454 275 434 315" stroke="#e5e7eb" strokeWidth="6" fill="none" strokeLinecap="round" />

          {/* Aorta and Vena Cava */}
          <circle cx="242" cy="345" r="14" fill="#ef4444" fillOpacity="0.8" />
          <circle cx="270" cy="345" r="16" fill="#3b82f6" fillOpacity="0.8" />

          {/* Liver Parenchyma (Right anatomical side / left on screen) */}
          <path
            d="M 115 210 C 135 150, 245 160, 255 240 C 235 315, 135 315, 115 210 Z"
            fill="#222836"
            stroke="#475569"
            strokeWidth="1.5"
          />
          {liver?.visible && (
            <path
              d="M 115 210 C 135 150, 245 160, 255 240 C 235 315, 135 315, 115 210 Z"
              fill={liver.color}
              fillOpacity={liver.opacity}
              stroke="#60a5fa"
              strokeWidth="2"
            />
          )}

          {/* Spleen (Left anatomical side / right on screen) */}
          <path
            d="M 365 205 C 405 215, 415 275, 375 305 C 345 305, 345 235, 365 205 Z"
            fill="#252b3a"
            stroke="#475569"
            strokeWidth="1.5"
          />
          {spleen?.visible && (
            <path
              d="M 365 205 C 405 215, 415 275, 375 305 C 345 305, 345 235, 365 205 Z"
              fill={spleen.color}
              fillOpacity={spleen.opacity}
              stroke="#a78bfa"
              strokeWidth="2.5"
            />
          )}

          {/* Kidneys */}
          {kidneys?.visible && (
            <>
              {/* Right Kidney */}
              <ellipse cx="180" cy="310" rx="22" ry="32" fill={kidneys.color} fillOpacity={kidneys.opacity} stroke="#34d399" strokeWidth="2" />
              {/* Left Kidney */}
              <ellipse cx="332" cy="310" rx="22" ry="32" fill={kidneys.color} fillOpacity={kidneys.opacity} stroke="#34d399" strokeWidth="2" />
            </>
          )}

          {/* Pancreas */}
          {pancreas?.visible && (
            <path
              d="M 200 240 Q 256 220 310 235 Q 290 255 220 255 Z"
              fill={pancreas.color}
              fillOpacity={pancreas.opacity}
              stroke="#fbbf24"
              strokeWidth="2"
            />
          )}

          {/* Active Crosshair Tool */}
          {activeTool === 'crosshair' && (
            <g stroke="#818cf8" strokeWidth="1" strokeDasharray="3,3" opacity="0.8">
              <line x1="0" y1="256" x2="512" y2="256" />
              <line x1="256" y1="0" x2="256" y2="512" />
              <circle cx="256" cy="256" r="6" fill="none" stroke="#818cf8" strokeWidth="1.5" />
            </g>
          )}

          {/* Interactive Caliper Distance Line */}
          {measurement.start && measurement.end && (
            <g stroke="#10b981" strokeWidth="2">
              <line
                x1={measurement.start.x}
                y1={measurement.start.y}
                x2={measurement.end.x}
                y2={measurement.end.y}
              />
              <circle cx={measurement.start.x} cy={measurement.start.y} r="4" fill="#10b981" />
              <circle cx={measurement.end.x} cy={measurement.end.y} r="4" fill="#10b981" />
              <text
                x={(measurement.start.x + measurement.end.x) / 2 + 8}
                y={(measurement.start.y + measurement.end.y) / 2 - 8}
                fill="#34d399"
                fontSize="12"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="bold"
              >
                {getDistanceMm()} mm
              </text>
            </g>
          )}
        </svg>

        {/* Dynamic Model Annotation Stamp */}
        <div className="absolute top-3 left-3 bg-clinical-900/90 backdrop-blur-sm border border-clinical-750 px-2.5 py-1 rounded text-[11px] font-mono text-indigo-300 flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Cornerstone3D Volume • Slice {sliceIndex + 1}/{totalSlices}</span>
        </div>
      </div>
    </div>
  );
};
