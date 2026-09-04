const API_BASE = "http://localhost:8000/api/v1";

export interface StudyResponse {
  study_instance_uid: string;
  patient_id: string;
  study_description?: string;
  series: {
    series_instance_uid: string;
    series_number: number;
    series_description: string;
    modality: string;
    num_slices: number;
    slice_thickness?: number;
    nifti_volume_path?: string;
  }[];
}

export const api = {
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },

  async getStudies(): Promise<StudyResponse[]> {
    try {
      const res = await fetch(`${API_BASE}/studies`);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  },

  async uploadDicom(files: FileList | File[]) {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }
    const res = await fetch(`${API_BASE}/upload/dicom`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      throw new Error(`Upload failed with status ${res.status}`);
    }
    return res.json();
  },

  async startJob(jobId: string) {
    const res = await fetch(`${API_BASE}/jobs/${jobId}/start`, {
      method: "POST",
    });
    return res.json();
  },

  async getJobStatus(jobId: string) {
    const res = await fetch(`${API_BASE}/jobs/${jobId}`);
    if (!res.ok) throw new Error("Job not found");
    return res.json();
  },

  getMaskUrl(seriesUid: string) {
    return `${API_BASE}/series/${seriesUid}/mask`;
  },

  getNiftiUrl(seriesUid: string) {
    return `${API_BASE}/series/${seriesUid}/nifti`;
  }
};
