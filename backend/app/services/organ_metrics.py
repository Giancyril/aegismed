import numpy as np
from typing import Dict, Any, List, Optional

ORGAN_LABELS: Dict[int, str] = {
    1: "Liver",
    2: "Spleen",
    3: "Kidneys",
    4: "Pancreas"
}

def compute_organ_morphometrics(
    mask_array: np.ndarray,
    voxel_spacing_mm: List[float] = [1.5, 1.5, 2.0]
) -> List[Dict[str, Any]]:
    """Calculates anatomical volumes (cm3), 3D bounding boxes, and shape descriptors for segmented organs."""
    voxel_vol_mm3 = float(voxel_spacing_mm[0] * voxel_spacing_mm[1] * voxel_spacing_mm[2])
    voxel_vol_cm3 = voxel_vol_mm3 / 1000.0

    organs_metrics = []

    for label_id, organ_name in ORGAN_LABELS.items():
        organ_mask = mask_array == label_id
        voxel_count = int(np.sum(organ_mask))

        if voxel_count == 0:
            continue

        volume_cm3 = round(voxel_count * voxel_vol_cm3, 2)

        # 3D bounding box
        coords = np.argwhere(organ_mask)
        min_bounds = coords.min(axis=0).tolist() # [min_x, min_y, min_z]
        max_bounds = coords.max(axis=0).tolist() # [max_x, max_y, max_z]

        # Extent along each principal axis in mm
        extent_mm = [
            round((max_bounds[i] - min_bounds[i] + 1) * voxel_spacing_mm[i], 1)
            for i in range(3)
        ]

        # Sphericity approximation
        radius_equiv = ((3.0 * (volume_cm3 * 1000.0)) / (4.0 * np.pi)) ** (1.0 / 3.0)
        sphericity = round(min(1.0, (2.0 * radius_equiv) / max(extent_mm)), 3)

        organs_metrics.append({
            "label_id": label_id,
            "organ_name": organ_name,
            "voxel_count": voxel_count,
            "volume_cm3": volume_cm3,
            "bounding_box": {
                "min": min_bounds,
                "max": max_bounds
            },
            "dimensions_mm": {
                "length_x": extent_mm[0],
                "width_y": extent_mm[1],
                "height_z": extent_mm[2]
            },
            "sphericity": sphericity
        })

    return organs_metrics
