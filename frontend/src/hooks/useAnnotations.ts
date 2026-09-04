import { useState, useEffect, useCallback } from 'react';

export interface PersistentAnnotation {
  id: string;
  series_instance_uid: string;
  slice_index: number;
  plane: string;
  annotation_type: 'caliper' | 'polygon' | 'angle';
  label?: string;
  unit: string;
  measurement_value: number;
  geometry: any;
  color: string;
  created_at?: string;
}

export function useAnnotations(seriesInstanceUid: string = '1.2.840.113619.2.55.3.60468842') {
  const [annotations, setAnnotations] = useState<PersistentAnnotation[]>([
    {
      id: 'ann_seed_01',
      series_instance_uid: seriesInstanceUid,
      slice_index: 64,
      plane: 'axial',
      annotation_type: 'caliper',
      label: 'Spleen Long Axis',
      unit: 'mm',
      measurement_value: 94.2,
      geometry: { start: { x: 350, y: 215 }, end: { x: 385, y: 310 } },
      color: '#10b981'
    }
  ]);

  const [loading, setLoading] = useState(false);

  const fetchAnnotations = useCallback(async () => {
    try {
      const host = window.location.port === '5173' || window.location.port === '5174' ? 'http://localhost:8000' : '';
      const res = await fetch(`${host}/api/v1/series/${seriesInstanceUid}/annotations`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setAnnotations(data);
        }
      }
    } catch (err) {
      console.warn('[useAnnotations] Offline mode or server unavailable:', err);
    }
  }, [seriesInstanceUid]);

  useEffect(() => {
    fetchAnnotations();
  }, [fetchAnnotations]);

  const addAnnotation = async (ann: Omit<PersistentAnnotation, 'id'>) => {
    const tempId = `ann_${Date.now().toString(36)}`;
    const fullAnn: PersistentAnnotation = { ...ann, id: tempId };
    setAnnotations(prev => [...prev, fullAnn]);

    try {
      const host = window.location.port === '5173' || window.location.port === '5174' ? 'http://localhost:8000' : '';
      const res = await fetch(`${host}/api/v1/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ann)
      });
      if (res.ok) {
        const created = await res.json();
        setAnnotations(prev => prev.map(a => a.id === tempId ? created : a));
      }
    } catch (e) {
      console.warn('[useAnnotations] Saved locally:', e);
    }
  };

  const clearAnnotations = async () => {
    setAnnotations([]);
  };

  const exportAnnotations = async (format: 'json' | 'sr') => {
    try {
      const host = window.location.port === '5173' || window.location.port === '5174' ? 'http://localhost:8000' : '';
      const res = await fetch(`${host}/api/v1/series/${seriesInstanceUid}/annotations/export?format=${format}`);
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${seriesInstanceUid}_annotations_${format.toUpperCase()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
    } catch (e) {
      console.warn('[useAnnotations] Falling back to client export:', e);
    }

    // Client fallback export
    const blob = new Blob([JSON.stringify(annotations, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `annotations_${format}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return {
    annotations,
    addAnnotation,
    clearAnnotations,
    exportAnnotations
  };
}
