import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ThumbnailPanel } from './components/ThumbnailPanel/ThumbnailPanel';
import { Toolbar } from './components/Toolbar/Toolbar';
import { Viewport } from './components/Viewport/Viewport';
import { SegmentationPanel } from './components/Segmentation/SegmentationPanel';
import { JobStatusBar } from './components/JobStatus/JobStatusBar';
import { useJobStream } from './hooks/useJobStream';
import { LiveProgressOverlay } from './components/LiveProgress/LiveProgressOverlay';
import { UploadModal } from './components/Upload/UploadModal';
import { initCornerstone } from './services/cornerstoneInit';
import type { PatientInfo, SeriesInfo, SegmentationLabel, JobStatus, ViewportTool, MprOrientation } from './types';

export const App: React.FC = () => {
  const [patient] = useState<PatientInfo>({
    id: 'ANON-9042-CT',
    name: 'DE-IDENTIFIED SUBJECT 01',
    age: '54Y',
    sex: 'M',
    studyDate: '2026-09-04',
    accessionNumber: 'ACC-881920',
  });

  const [seriesList] = useState<SeriesInfo[]>([
    {
      seriesInstanceUid: '1.2.840.113619.2.55.3.2831172',
      seriesNumber: 2,
      seriesDescription: 'Abdomen/Pelvis 2.0mm Soft',
      modality: 'CT',
      numSlices: 96,
      sliceThickness: 2.0,
    },
    {
      seriesInstanceUid: '1.2.840.113619.2.55.3.2831173',
      seriesNumber: 3,
      seriesDescription: 'Thorax 1.5mm Lung Kernel',
      modality: 'CT',
      numSlices: 120,
      sliceThickness: 1.5,
    },
  ]);

  const [selectedSeriesUid, setSelectedSeriesUid] = useState<string>(seriesList[0].seriesInstanceUid);
  const [activeTool, setActiveTool] = useState<ViewportTool>('windowLevel');
  const [orientation, setOrientation] = useState<MprOrientation>('axial');
  const [activePreset, setActivePreset] = useState<string>('soft');
  const [sliceIndex, setSliceIndex] = useState<number>(42);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);

  const [labels, setLabels] = useState<SegmentationLabel[]>([
    {
      id: 'spleen',
      name: 'Spleen (MONAI Bundle)',
      color: '#8b5cf6',
      volumeCm3: 184.2,
      visible: true,
      opacity: 0.65,
      confidence: 0.942,
    },
    {
      id: 'liver',
      name: 'Liver (Atlas Head)',
      color: '#3b82f6',
      volumeCm3: 1420.5,
      visible: true,
      opacity: 0.45,
      confidence: 0.915,
    },
    {
      id: 'kidneys',
      name: 'Kidneys (Bilateral)',
      color: '#10b981',
      volumeCm3: 312.0,
      visible: false,
      opacity: 0.50,
      confidence: 0.887,
    },
    {
      id: 'pancreas',
      name: 'Pancreas Head/Tail',
      color: '#f59e0b',
      volumeCm3: 84.6,
      visible: false,
      opacity: 0.55,
      confidence: 0.854,
    },
  ]);

  const [activeJobId, setActiveJobId] = useState<string>('job_49a8f2');
  const stream = useJobStream(activeJobId);
  const [jobStatus, setJobStatus] = useState<JobStatus>({
    jobId: 'job_49a8f2',
    status: 'completed',
    progress: 100,
    message: 'MONAI Spleen CT Segmentation completed (GPU Latency: 1.4s)',
    modelName: 'spleen_ct_segmentation:v1',
  });

  useEffect(() => {
    // Initialize Cornerstone3D engine
    initCornerstone();
  }, []);

  const handleToggleLabel = (id: string) => {
    setLabels((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l))
    );
  };

  const handleOpacityChange = (id: string, opacity: number) => {
    setLabels((prev) =>
      prev.map((l) => (l.id === id ? { ...l, opacity } : l))
    );
  };

  const handleResetView = () => {
    setActivePreset('soft');
    setActiveTool('windowLevel');
    setOrientation('axial');
    setSliceIndex(Math.floor(seriesList[0].numSlices / 2));
  };

  const handleRunInference = async () => {
    const newId = 'job_' + Math.random().toString(36).substring(7);
    setActiveJobId(newId);
    setJobStatus({
      jobId: 'job_' + Math.random().toString(36).substring(7),
      status: 'preprocessing',
      progress: 25,
      message: 'Applying MONAI transforms (RAS reorientation, 1.5mm spacing)...',
      modelName: 'spleen_ct_segmentation:v1',
    });

    setTimeout(() => {
      setJobStatus((prev) => ({
        ...prev,
        status: 'inferring',
        progress: 65,
        message: 'Running SlidingWindowInferer on Modal GPU (T4)...',
      }));

      setTimeout(() => {
        setJobStatus((prev) => ({
          ...prev,
          status: 'completed',
          progress: 100,
          message: 'Inference complete. NIfTI organ masks rendered.',
        }));
        // Ensure segmented spleen is visible
        setLabels((prev) =>
          prev.map((l) => (l.id === 'spleen' ? { ...l, visible: true } : l))
        );
      }, 1200);
    }, 1000);
  };

  
  // Synchronize WebSocket stream updates to local jobStatus state
  useEffect(() => {
    if (stream.stage && stream.stage !== 'idle') {
      setJobStatus(prev => ({
        ...prev,
        status: stream.stage as any,
        progress: stream.progress,
        message: stream.message
      }));
    }
  }, [stream.stage, stream.progress, stream.message]);

  return (
    <div className="flex flex-col h-screen w-screen bg-clinical-950 text-clinical-100 overflow-hidden font-sans">
      <Header patient={patient} onUploadClick={() => setIsUploadOpen(true)} />

      <div className="flex flex-1 overflow-hidden">
        <ThumbnailPanel
          seriesList={seriesList}
          selectedSeriesUid={selectedSeriesUid}
          onSelectSeries={setSelectedSeriesUid}
        />

        <main className="flex-1 flex flex-col overflow-hidden bg-clinical-950">
          <Toolbar
            activeTool={activeTool}
            onSelectTool={setActiveTool}
            orientation={orientation}
            onSelectOrientation={setOrientation}
            activePreset={activePreset}
            onSelectPreset={setActivePreset}
            sliceIndex={sliceIndex}
            totalSlices={seriesList[0].numSlices}
            onSliceChange={setSliceIndex}
            onResetView={handleResetView}
          />
          <Viewport
            sliceIndex={sliceIndex}
            totalSlices={seriesList[0].numSlices}
            activePreset={activePreset}
            activeTool={activeTool}
            orientation={orientation}
            labels={labels}
          />
        </main>

        <SegmentationPanel
          labels={labels}
          onToggleLabel={handleToggleLabel}
          onOpacityChange={handleOpacityChange}
          jobStatus={jobStatus}
          onRunInference={handleRunInference}
        />
      </div>

      <JobStatusBar status={jobStatus} isStreaming={stream.isConnected} />

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploaded={(fileName) => {
          console.log('Ingested DICOM file:', fileName);
        }}
      />
    </div>
  );
};

export default App;
