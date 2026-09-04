import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ThumbnailPanel } from './components/ThumbnailPanel/ThumbnailPanel';
import { Toolbar } from './components/Toolbar/Toolbar';
import { Viewport } from './components/Viewport/Viewport';
import { SegmentationPanel } from './components/Segmentation/SegmentationPanel';
import { JobStatusBar } from './components/JobStatus/JobStatusBar';
import { useJobStream } from './hooks/useJobStream';
import { LiveProgressOverlay } from './components/LiveProgress/LiveProgressOverlay';
import { MetadataExplorer } from './components/MetadataExplorer/MetadataExplorer';
import { MPRViewer } from './components/MPRViewer/MPRViewer';
import { AnnotationToolbar, type AnnotationToolMode } from './components/Annotations/AnnotationToolbar';
import { useAnnotations } from './hooks/useAnnotations';
import { UploadModal } from './components/Upload/UploadModal';
import { initCornerstone } from './services/cornerstoneInit';
import { LayoutGrid, Square, BrainCircuit, FileCode } from 'lucide-react';
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
  const [rightPanelTab, setRightPanelTab] = useState<'segmentation' | 'metadata'>('segmentation');
  const [viewMode, setViewMode] = useState<'single' | 'mpr'>('single');
  const [annMode, setAnnMode] = useState<AnnotationToolMode>('caliper');
  const { annotations, clearAnnotations, exportAnnotations } = useAnnotations(selectedSeriesUid);
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
      jobId: newId,
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

  const isBusy = jobStatus.status === 'preprocessing' || jobStatus.status === 'inferring' || jobStatus.status === 'postprocessing';

  return (
    <div className="flex flex-col h-screen w-screen bg-clinical-950 text-clinical-100 overflow-hidden font-sans">
      <Header patient={patient} onUploadClick={() => setIsUploadOpen(true)} />

      <div className="flex flex-1 overflow-hidden relative">
        <ThumbnailPanel
          seriesList={seriesList}
          selectedSeriesUid={selectedSeriesUid}
          onSelectSeries={setSelectedSeriesUid}
        />

        <main className="flex-1 flex flex-col overflow-hidden bg-clinical-950 relative">
          <div className="px-3 py-1.5 bg-clinical-950 flex items-center justify-between border-b border-clinical-800">
            <AnnotationToolbar
              activeMode={annMode}
              onSelectMode={setAnnMode}
              annotationCount={annotations.length}
              onClearAnnotations={clearAnnotations}
              onExportAnnotations={exportAnnotations}
            />

            <div className="flex items-center space-x-2">
              {/* View mode toggle */}
              <div className="flex items-center bg-clinical-900 border border-clinical-750 rounded p-0.5 text-xs font-mono">
                <button
                  onClick={() => setViewMode('single')}
                  className={`flex items-center space-x-1 px-2 py-1 rounded transition-colors ${
                    viewMode === 'single' ? 'bg-indigo-600 text-white shadow-xs' : 'text-clinical-400 hover:text-clinical-200'
                  }`}
                  title="Single 2D Viewport"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>2D View</span>
                </button>
                <button
                  onClick={() => setViewMode('mpr')}
                  className={`flex items-center space-x-1 px-2 py-1 rounded transition-colors ${
                    viewMode === 'mpr' ? 'bg-indigo-600 text-white shadow-xs' : 'text-clinical-400 hover:text-clinical-200'
                  }`}
                  title="Multi-Planar Reconstruction"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>3D MPR</span>
                </button>
              </div>

              {/* Right Panel Tab Switcher */}
              <div className="flex items-center bg-clinical-900 border border-clinical-750 rounded p-0.5 text-xs font-mono">
                <button
                  onClick={() => setRightPanelTab('segmentation')}
                  className={`flex items-center space-x-1 px-2 py-1 rounded transition-colors ${
                    rightPanelTab === 'segmentation' ? 'bg-indigo-600 text-white shadow-xs' : 'text-clinical-400 hover:text-clinical-200'
                  }`}
                  title="AI Segmentation Panel"
                >
                  <BrainCircuit className="w-3.5 h-3.5" />
                  <span>AI Masks</span>
                </button>
                <button
                  onClick={() => setRightPanelTab('metadata')}
                  className={`flex items-center space-x-1 px-2 py-1 rounded transition-colors ${
                    rightPanelTab === 'metadata' ? 'bg-indigo-600 text-white shadow-xs' : 'text-clinical-400 hover:text-clinical-200'
                  }`}
                  title="DICOM Metadata Tag Explorer"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>DICOM Tags</span>
                </button>
              </div>
            </div>
          </div>

          {viewMode === 'mpr' ? (
            <div className="flex-1 overflow-hidden p-2">
              <MPRViewer seriesInstanceUid={selectedSeriesUid} />
            </div>
          ) : (
            <>
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
            </>
          )}

          {/* Live Progress Overlay for background inferencing/preprocessing */}
          {isBusy && (
            <div className="absolute inset-0 z-40 bg-black/50 backdrop-blur-xs flex items-center justify-center p-6 pointer-events-none">
              <div className="w-full max-w-md pointer-events-auto">
                <LiveProgressOverlay
                  stage={stream.stage || jobStatus.status}
                  progress={stream.progress || jobStatus.progress}
                  message={stream.message || jobStatus.message}
                  isConnected={stream.isConnected}
                />
              </div>
            </div>
          )}
        </main>

        {rightPanelTab === 'metadata' ? (
          <aside className="w-80 bg-[#0d1017] border-l border-clinical-750 flex flex-col h-[calc(100vh-3rem-2rem)] select-none">
            <MetadataExplorer
              studyInstanceUid={selectedSeriesUid}
              onClose={() => setRightPanelTab('segmentation')}
            />
          </aside>
        ) : (
          <SegmentationPanel
            labels={labels}
            onToggleLabel={handleToggleLabel}
            onOpacityChange={handleOpacityChange}
            jobStatus={jobStatus}
            onRunInference={handleRunInference}
          />
        )}
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
