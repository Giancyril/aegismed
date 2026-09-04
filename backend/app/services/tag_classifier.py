from typing import Dict, Any

VR_DESCRIPTIONS: Dict[str, str] = {
    "AE": "Application Entity",
    "AS": "Age String",
    "AT": "Attribute Tag",
    "CS": "Code String",
    "DA": "Date",
    "DS": "Decimal String",
    "DT": "Date Time",
    "FL": "Floating Point Single",
    "FD": "Floating Point Double",
    "IS": "Integer String",
    "LO": "Long String",
    "LT": "Long Text",
    "OB": "Other Byte",
    "OD": "Other Double",
    "OF": "Other Float",
    "OW": "Other Word",
    "PN": "Person Name",
    "SH": "Short String",
    "SL": "Signed Long",
    "SQ": "Sequence of Items",
    "SS": "Signed Short",
    "ST": "Short Text",
    "TM": "Time",
    "UI": "Unique Identifier (UID)",
    "UL": "Unsigned Long",
    "US": "Unsigned Short",
    "UT": "Unlimited Text"
}

def classify_tag_module(group_hex: str, element_hex: str, keyword: str) -> str:
    """Classifies a DICOM tag into a standard DICOM Module."""
    grp = group_hex.upper().strip("()")
    if grp == "0010":
        return "Patient Identification Module"
    elif grp == "0008":
        if any(term in keyword for term in ["Manufacturer", "Station", "Software"]):
            return "General Equipment Module"
        return "General Study Module"
    elif grp == "0020":
        if "Series" in keyword:
            return "General Series Module"
        elif "Study" in keyword:
            return "General Study Module"
        return "Image Plane & Position Module"
    elif grp == "0018":
        return "Acquisition & Equipment Module"
    elif grp == "0028":
        return "Image Pixel & Contrast Module"
    return "Specialized / Extended Attributes"

def enrich_and_group_tags(tags: list) -> Dict[str, list]:
    """Enriches tag list with VR descriptions and groups into modules."""
    grouped: Dict[str, list] = {}
    for item in tags:
        tag_str = item.get("tag", "(0000,0000)")
        clean = tag_str.strip("()").split(",")
        grp = clean[0] if len(clean) > 0 else "0000"
        elem = clean[1] if len(clean) > 1 else "0000"
        kw = item.get("keyword", "")

        module = classify_tag_module(grp, elem, kw)
        vr = item.get("vr", "UN")
        item["vr_description"] = VR_DESCRIPTIONS.get(vr, "Unknown VR")
        item["module"] = module

        if module not in grouped:
            grouped[module] = []
        grouped[module].append(item)

    return grouped
