import io
import datetime
from typing import Dict, Any, List
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_radiology_report_pdf(
    patient_info: Dict[str, Any],
    study_info: Dict[str, Any],
    risk_evaluation: Dict[str, Any],
    model_name: str = "MONAI 3D Multi-Organ ResUNet"
) -> bytes:
    """Generates an official formatted clinical radiology PDF report using ReportLab."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=4
    )
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        textColor=colors.HexColor('#4f46e5'),
        spaceAfter=15
    )
    section_heading = ParagraphStyle(
        'SectionHead',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        textColor=colors.HexColor('#1e293b'),
        spaceBefore=12,
        spaceAfter=6
    )
    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        textColor=colors.HexColor('#334155'),
        leading=12
    )
    disclaimer_style = ParagraphStyle(
        'Disclaimer',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=7.5,
        textColor=colors.HexColor('#64748b'),
        leading=10
    )

    elements = []

    # Header Title
    elements.append(Paragraph("AEGISMED CLINICAL IMAGING REPORT", title_style))
    elements.append(Paragraph("AI-Assisted Quantitative Organ Volumetry & Risk Profiling", subtitle_style))

    # Patient & Study Table
    pat_name = patient_info.get("name", "ANONYMIZED^PATIENT")
    pat_id = patient_info.get("id", "SUBJ-9921")
    study_desc = study_info.get("description", "CT ABDOMEN/PELVIS W/ CONTRAST")
    modality = study_info.get("modality", "CT")
    study_date = str(study_info.get("date", datetime.date.today().isoformat()))

    meta_data = [
        [
            Paragraph(f"<b>Patient Name:</b> {pat_name}", body_style),
            Paragraph(f"<b>Patient ID:</b> {pat_id}", body_style)
        ],
        [
            Paragraph(f"<b>Modality:</b> {modality}", body_style),
            Paragraph(f"<b>Study Date:</b> {study_date}", body_style)
        ],
        [
            Paragraph(f"<b>Exam:</b> {study_desc}", body_style),
            Paragraph(f"<b>AI Engine:</b> {model_name}", body_style)
        ]
    ]

    meta_table = Table(meta_data, colWidths=[260, 270])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 14))

    # Quantitative Organ Table
    elements.append(Paragraph("Quantitative Morphometry & Volumetric Analysis", section_heading))

    organs_table_data = [
        ["Organ", "Measured Vol (cm³)", "Reference Range", "Status", "Sphericity"]
    ]

    evaluated = risk_evaluation.get("evaluated_organs", [])
    for organ in evaluated:
        name = organ.get("organ_name", "Organ")
        vol = organ.get("volume_cm3", 0.0)
        status = organ.get("clinical_status", "Normal")
        sphericity = organ.get("sphericity", 0.0)

        # Lookup standard range text
        if name == "Liver":
            ref = "1200 - 1800 cm³"
        elif name == "Spleen":
            ref = "150 - 350 cm³"
        elif name == "Kidneys":
            ref = "250 - 440 cm³"
        elif name == "Pancreas":
            ref = "60 - 110 cm³"
        else:
            ref = "N/A"

        organs_table_data.append([
            name,
            f"{vol:.1f}",
            ref,
            status,
            f"{sphericity:.2f}"
        ])

    org_table = Table(organs_table_data, colWidths=[100, 110, 120, 130, 70])
    org_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0f172a')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 9),
        ('ALIGN', (1,0), (1,-1), 'RIGHT'),
        ('ALIGN', (4,0), (4,-1), 'RIGHT'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')]),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(org_table)
    elements.append(Spacer(1, 14))

    # Clinical Finding & Risk Summary Banner
    overall = risk_evaluation.get("overall_risk_level", "NORMAL")
    banner_color = (
        colors.HexColor('#dc2626') if overall == 'HIGH_ALERT'
        else colors.HexColor('#d97706') if overall == 'MODERATE_ALERT'
        else colors.HexColor('#16a34a')
    )

    elements.append(Paragraph("AI Impression & Risk Stratification", section_heading))

    risk_data = [
        [Paragraph(f"<b>OVERALL STATUS: {overall}</b>", ParagraphStyle('W', parent=body_style, textColor=colors.white, fontName='Helvetica-Bold'))],
    ]
    findings = risk_evaluation.get("findings", [])
    if findings:
        for f in findings:
            risk_data.append([Paragraph(f"• <b>{f['organ']}:</b> {f['finding']} (measured {f['measured_cm3']} cm³)", body_style)])
    else:
        risk_data.append([Paragraph("• No acute organomegaly or severe volume discrepancies identified within reference thresholds.", body_style)])

    risk_table = Table(risk_data, colWidths=[530])
    risk_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,0), banner_color),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#f1f5f9')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#94a3b8')),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
    ]))
    elements.append(risk_table)
    elements.append(Spacer(1, 18))

    # Regulatory Disclaimer
    elements.append(Paragraph(
        "<b>Clinical Decision Support Disclaimer:</b> This volumetric report is generated by deep learning computer vision algorithms (MONAI Framework) for informational and research assistance. Final diagnostic evaluation and clinical correlation must be performed by a board-certified radiologist or licensed physician.",
        disclaimer_style
    ))

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
