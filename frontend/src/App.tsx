import React, { useState } from 'react';
import { Header } from './components/Header';
import { ThumbnailPanel } from './components/ThumbnailPanel/ThumbnailPanel';
import { Toolbar } from './components/Toolbar/Toolbar';
import { Viewport } from './components/Viewport/Viewport';
import { SegmentationPanel } from './components/Segmentation/SegmentationPanel';
import { JobStatusBar } from './components/JobStatus/JobStatusBar';
import { UploadModal } from './components/Upload/UploadModal';
import type { PatientInfo, SeriesInfo, SegmentationLabel, JobStatus } from './types';

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
  const [activePreset, setActivePreset] = useState<string>('soft');
  const [sliceIndex, setSliceIndex] = useState<number>(42);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);

  const [labels, setLabels] = useState<SegmentationLabel[]>([
    {
      id: 'spleen',
      name: 'Spleen (MONAI)',
      color: '#8b5cf6',
      volumeCm3: 184.2,
      visible: true,
      opacity: 0.65,
      confidence: 0.94,
    },
    {
      id: 'liver',
      name: 'Liver (Atlas)',
      color: '#3b82f6',
      volumeCm3: 1420.5,
      visible: true,
      opacity: 0.45,
      confidence: 0.91,
    },
  ]);

  const [jobStatus, setJobStatus] = useState<JobStatus>({
    jobId: 'job_49a8f2',
    status: 'completed',
    progress: 100,
    message: 'MONAI Spleen CT Segmentation completed (Latency: 1.4s)',
    modelName: 'spleen_ct_segmentation:v1',
  });

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

  const handleRunInference = () => {
    setJobStatus({
      jobId: 'job_' + Math.random().toString(36).substring(7),
      status: 'preprocessing',
      progress: 25,
      message: 'Applying MONAI transforms (resample 1.5mm, intensity scale)...',
      modelName: 'spleen_ct_segmentation:v1',
    });

    setTimeout(() => {
      setJobStatus((prev) => ({
        ...prev,
        status: 'inferring',
        progress: 70,
        message: 'Running SlidingWindowInferer on GPU...',
      }));

      setTimeout(() => {
        setJobStatus((prev) => ({
          ...prev,
          status: 'completed',
          progress: 100,
          message: 'Inference complete. NIfTI mask rendered.',
        }));
      }, 1000);
    }, 1000);
  };

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
            activePreset={activePreset}
            onSelectPreset={setActivePreset}
            sliceIndex={sliceIndex}
            totalSlices={seriesList[0].numSlices}
            onSliceChange={setSliceIndex}
          />
          <Viewport
            sliceIndex={sliceIndex}
            totalSlices={seriesList[0].numSlices}
            activePreset={activePreset}
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

      <JobStatusBar status={jobStatus} />

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
