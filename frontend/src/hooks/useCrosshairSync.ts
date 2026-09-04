import { useState, useCallback } from 'react';

export interface VoxelCoord {
  x: number; // 0.0 to 1.0 (Sagittal axis: Right -> Left)
  y: number; // 0.0 to 1.0 (Coronal axis: Anterior -> Posterior)
  z: number; // 0.0 to 1.0 (Axial axis: Inferior -> Superior)
}

export interface UseCrosshairSyncReturn {
  coord: VoxelCoord;
  axialIndex: number;
  coronalIndex: number;
  sagittalIndex: number;
  updateFromPlane: (plane: 'axial' | 'coronal' | 'sagittal', u: number, v: number) => void;
  setSliceIndex: (plane: 'axial' | 'coronal' | 'sagittal', idx: number) => void;
  resetToCenter: () => void;
}

export function useCrosshairSync(totalSlices: number = 128): UseCrosshairSyncReturn {
  const [coord, setCoord] = useState<VoxelCoord>({ x: 0.5, y: 0.5, z: 0.5 });

  const axialIndex = Math.min(totalSlices - 1, Math.max(0, Math.floor(coord.z * totalSlices)));
  const coronalIndex = Math.min(totalSlices - 1, Math.max(0, Math.floor(coord.y * totalSlices)));
  const sagittalIndex = Math.min(totalSlices - 1, Math.max(0, Math.floor(coord.x * totalSlices)));

  const updateFromPlane = useCallback((plane: 'axial' | 'coronal' | 'sagittal', u: number, v: number) => {
    setCoord(prev => {
      switch (plane) {
        case 'axial':
          // u is X, v is Y
          return { ...prev, x: u, y: v };
        case 'coronal':
          // u is X, v is Z
          return { ...prev, x: u, z: v };
        case 'sagittal':
          // u is Y, v is Z
          return { ...prev, y: u, z: v };
        default:
          return prev;
      }
    });
  }, []);

  const setSliceIndex = useCallback((plane: 'axial' | 'coronal' | 'sagittal', idx: number) => {
    const norm = idx / totalSlices;
    setCoord(prev => {
      switch (plane) {
        case 'axial':
          return { ...prev, z: norm };
        case 'coronal':
          return { ...prev, y: norm };
        case 'sagittal':
          return { ...prev, x: norm };
        default:
          return prev;
      }
    });
  }, [totalSlices]);

  const resetToCenter = useCallback(() => {
    setCoord({ x: 0.5, y: 0.5, z: 0.5 });
  }, []);

  return {
    coord,
    axialIndex,
    coronalIndex,
    sagittalIndex,
    updateFromPlane,
    setSliceIndex,
    resetToCenter
  };
}
