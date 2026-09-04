import io
import numpy as np
from PIL import Image
from typing import Optional, Tuple, Dict

WINDOW_PRESETS: Dict[str, Tuple[float, float]] = {
    "soft_tissue": (400.0, 40.0),
    "bone": (1800.0, 400.0),
    "lung": (1500.0, -600.0),
    "brain": (80.0, 40.0),
    "liver": (150.0, 30.0)
}

def extract_oriented_plane(volume: np.ndarray, plane: str, index: int) -> np.ndarray:
    """Extracts a 2D slice from a 3D RAS volume correctly oriented for clinical display."""
    plane = plane.lower()
    if plane == "axial":
        idx = int(np.clip(index, 0, volume.shape[2] - 1))
        # Axial: X is R->L, Y is P->A. Radiological view: Anterior UP, Right LEFT
        slice_2d = volume[:, :, idx]
        # Transpose and flip so Y (Anterior) is UP
        return np.rot90(slice_2d, 1)

    elif plane == "coronal":
        idx = int(np.clip(index, 0, volume.shape[1] - 1))
        # Coronal: X is R->L, Z is I->S. Radiological view: Superior UP, Right LEFT
        slice_2d = volume[:, idx, :]
        return np.rot90(slice_2d, 1)

    elif plane == "sagittal":
        idx = int(np.clip(index, 0, volume.shape[0] - 1))
        # Sagittal: Y is P->A, Z is I->S. Radiological view: Superior UP, Anterior LEFT
        slice_2d = volume[idx, :, :]
        return np.rot90(slice_2d, 1)

    else:
        raise ValueError(f"Unsupported plane orientation: {plane}")

def apply_window_level(
    data: np.ndarray,
    window_width: float,
    window_level: float
) -> np.ndarray:
    """Applies clinical Hounsfield Unit Window/Level contrast normalization."""
    lower = window_level - (window_width / 2.0)
    upper = window_level + (window_width / 2.0)
    windowed = np.clip(data, lower, upper)
    return ((windowed - lower) / (upper - lower + 1e-6) * 255.0).astype(np.uint8)

def render_slice_to_png(
    volume: np.ndarray,
    plane: str,
    index: int,
    window_width: float = 400.0,
    window_level: float = 40.0,
    mask: Optional[np.ndarray] = None,
    mask_opacity: float = 0.35
) -> bytes:
    """Renders a slice to PNG bytes with optional colorized segmentation mask overlay."""
    slice_data = extract_oriented_plane(volume, plane, index)
    gray = apply_window_level(slice_data, window_width, window_level)

    if mask is not None and mask.shape == volume.shape:
        mask_slice = extract_oriented_plane(mask, plane, index)
        rgb = np.stack([gray, gray, gray], axis=-1)

        # Apply multi-organ tint: e.g. label 1: Liver (Blue/Cyan), label 2: Spleen (Purple), label 3: Kidney (Green)
        overlay = rgb.copy()
        overlay[mask_slice == 1] = [59, 130, 246]   # Blue
        overlay[mask_slice == 2] = [168, 85, 247]   # Purple
        overlay[mask_slice == 3] = [16, 185, 129]   # Emerald

        has_mask = mask_slice > 0
        rgb[has_mask] = (
            (1.0 - mask_opacity) * rgb[has_mask] + mask_opacity * overlay[has_mask]
        ).astype(np.uint8)
        img = Image.fromarray(rgb)
    else:
        img = Image.fromarray(gray)

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()
