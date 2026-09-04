export interface PatientInfo {
  id: string;
  name: string;
  age?: string;
  sex?: string;
  studyDate?: string;
  accessionNumber?: string;
}

export interface SeriesInfo {
  seriesInstanceUid: string;
  seriesNumber: number;
  seriesDescription: string;
  modality: 'CT' | 'MR' | 'PT' | 'CR' | 'DX';
  numSlices: number;
  sliceThickness?: number;
  thumbnailUrl?: string;
}

export interface SegmentationLabel {
  id: string;
  name: string;
  color: string; // hex
  volumeCm3?: number;
  visible: boolean;
  opacity: number; // 0.0 - 1.0
  confidence?: number; // 0.0 - 1.0
}

export interface JobStatus {
  jobId: string;
  status: 'idle' | 'queued' | 'preprocessing' | 'inferring' | 'postprocessing' | 'completed' | 'failed';
  progress: number; // 0 - 100
  message: string;
  modelName: string;
}

export type ViewportTool = 'windowLevel' | 'zoom' | 'pan' | 'crosshair' | 'measure' | 'probe';
export type MprOrientation = 'axial' | 'coronal' | 'sagittal';
