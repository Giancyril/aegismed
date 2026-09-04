import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Database, Shield, Search, Copy, Check } from 'lucide-react';

export interface DicomTag {
  tag: string;
  vr: string;
  vr_description?: string;
  keyword: string;
  name: string;
  value: string;
  module?: string;
  is_phi?: boolean;
  redacted?: boolean;
}

interface MetadataExplorerProps {
  studyInstanceUid?: string;
  onClose?: () => void;
}

export const MetadataExplorer: React.FC<MetadataExplorerProps> = ({
  studyInstanceUid = '1.2.840.113619.2.55.3.60468842',
  onClose
}) => {
  const [modules, setModules] = useState<Record<string, DicomTag[]>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [redactPhi, setRedactPhi] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const fetchMetadata = async () => {
      try {
        const host = window.location.port === '5173' || window.location.port === '5174'
          ? 'http://localhost:8000'
          : '';
        const res = await fetch(`${host}/api/v1/studies/${studyInstanceUid}/metadata?redact_phi=${redactPhi}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.modules) {
            setModules(data.modules);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('[MetadataExplorer] Falling back to default tags:', err);
      }

      // Default mock tags for offline/demo
      if (isMounted) {
        setModules({
          "Patient Identification Module": [
            { tag: "(0010,0010)", vr: "PN", vr_description: "Person Name", keyword: "PatientName", name: "Patient's Name", value: redactPhi ? "ANONYMIZED^PATIENT" : "DOE^JOHN^A", is_phi: true, redacted: redactPhi },
            { tag: "(0010,0020)", vr: "LO", vr_description: "Long String", keyword: "PatientID", name: "Patient ID", value: redactPhi ? "ANON-XXXX" : "PAT-998241", is_phi: true, redacted: redactPhi },
            { tag: "(0010,0030)", vr: "DA", vr_description: "Date", keyword: "PatientBirthDate", name: "Patient Birth Date", value: redactPhi ? "19000101" : "19680512", is_phi: true, redacted: redactPhi },
            { tag: "(0010,0040)", vr: "CS", vr_description: "Code String", keyword: "PatientSex", name: "Patient's Sex", value: "M", is_phi: false, redacted: false }
          ],
          "General Study Module": [
            { tag: "(0020,000D)", vr: "UI", vr_description: "Unique Identifier", keyword: "StudyInstanceUID", name: "Study Instance UID", value: studyInstanceUid },
            { tag: "(0008,0020)", vr: "DA", vr_description: "Date", keyword: "StudyDate", name: "Study Date", value: "20260904" },
            { tag: "(0008,1030)", vr: "LO", vr_description: "Long String", keyword: "StudyDescription", name: "Study Description", value: "CT ABDOMEN/PELVIS W/ CONTRAST" },
            { tag: "(0008,0060)", vr: "CS", vr_description: "Code String", keyword: "Modality", name: "Modality", value: "CT" }
          ],
          "Acquisition & Equipment Module": [
            { tag: "(0008,0070)", vr: "LO", vr_description: "Long String", keyword: "Manufacturer", name: "Manufacturer", value: "GE MEDICAL SYSTEMS" },
            { tag: "(0008,1090)", vr: "LO", vr_description: "Long String", keyword: "ManufacturerModelName", name: "Manufacturer's Model Name", value: "Discovery CT750 HD" },
            { tag: "(0018,0050)", vr: "DS", vr_description: "Decimal String", keyword: "SliceThickness", name: "Slice Thickness", value: "2.0 mm" },
            { tag: "(0018,0060)", vr: "DS", vr_description: "Decimal String", keyword: "KVP", name: "kVp", value: "120" },
            { tag: "(0018,1151)", vr: "IS", vr_description: "Integer String", keyword: "XRayTubeCurrent", name: "X-Ray Tube Current", value: "240 mA" }
          ],
          "Image Pixel & Contrast Module": [
            { tag: "(0028,0010)", vr: "US", vr_description: "Unsigned Short", keyword: "Rows", name: "Rows", value: "512" },
            { tag: "(0028,0011)", vr: "US", vr_description: "Unsigned Short", keyword: "Columns", name: "Columns", value: "512" },
            { tag: "(0028,0030)", vr: "DS", vr_description: "Decimal String", keyword: "PixelSpacing", name: "Pixel Spacing", value: "0.75 \ 0.75 mm" },
            { tag: "(0028,1050)", vr: "DS", vr_description: "Decimal String", keyword: "WindowCenter", name: "Window Center (Level)", value: "40" },
            { tag: "(0028,1051)", vr: "DS", vr_description: "Decimal String", keyword: "WindowWidth", name: "Window Width", value: "400" }
          ]
        });
        setLoading(false);
      }
    };

    fetchMetadata();
    return () => { isMounted = false; };
  }, [studyInstanceUid, redactPhi]);

  const toggleCollapse = (moduleName: string) => {
    setCollapsed(prev => ({ ...prev, [moduleName]: !prev[moduleName] }));
  };

  const handleCopy = (tag: DicomTag) => {
    const text = `${tag.tag} ${tag.keyword} [${tag.vr}]: ${highlightMatch(tag.value, searchTerm)}`;
    navigator.clipboard?.writeText(text);
    setCopiedTag(tag.tag);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <span key={i} className="bg-amber-400/20 text-amber-300 font-bold px-0.5 rounded">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

    // Filter modules based on search term
  const filteredModules: Record<string, DicomTag[]> = {};
  const query = searchTerm.toLowerCase().trim();

  Object.entries(modules).forEach(([modName, tags]) => {
    if (!query) {
      filteredModules[modName] = tags;
    } else {
      const matchingTags = tags.filter(t =>
        t.keyword.toLowerCase().includes(query) ||
        t.tag.toLowerCase().includes(query) ||
        t.name.toLowerCase().includes(query) ||
        t.value.toLowerCase().includes(query) ||
        t.vr.toLowerCase().includes(query)
      );
      if (matchingTags.length > 0) {
        filteredModules[modName] = matchingTags;
      }
    }
  });

  const matchingTagCount = Object.values(filteredModules).reduce((acc, list) => acc + list.length, 0);

  const totalTagCount = Object.values(modules).reduce((acc, list) => acc + list.length, 0);

  return (
    <div className="flex flex-col h-full bg-[#0d1017] text-clinical-100 select-none border-l border-clinical-750">
      {/* Explorer Header */}
      <div className="p-3 border-b border-clinical-750 bg-clinical-900/70 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Database className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold tracking-wider uppercase text-clinical-200">
            DICOM Metadata Explorer
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-clinical-800 text-clinical-300">
            {searchTerm ? `${matchingTagCount} of ${totalTagCount} tags` : `${totalTagCount} tags`}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              const allTags = Object.values(modules).flat();
              navigator.clipboard?.writeText(JSON.stringify(allTags, null, 2));
              setCopiedTag('ALL_JSON');
              setTimeout(() => setCopiedTag(null), 2000);
            }}
            title="Export all tags as JSON"
            className="text-[11px] font-mono flex items-center space-x-1 px-2 py-1 rounded bg-clinical-800 hover:bg-clinical-750 text-clinical-300 hover:text-clinical-100 transition-colors"
          >
            {copiedTag === 'ALL_JSON' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copiedTag === 'ALL_JSON' ? 'Copied JSON' : 'Copy JSON'}</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="text-clinical-400 hover:text-clinical-100 text-xs px-2 py-0.5 rounded hover:bg-clinical-800"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Redaction Control Bar */}
      <div className="px-3 py-2 bg-clinical-950/60 border-b border-clinical-800/80 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-2">
          <Shield className={`w-3.5 h-3.5 ${redactPhi ? 'text-amber-400' : 'text-clinical-500'}`} />
          <span className="text-clinical-300">PS 3.15 PHI Redaction:</span>
        </div>
        <button
          onClick={() => setRedactPhi(!redactPhi)}
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide transition-all border ${
            redactPhi
              ? 'bg-amber-950/70 border-amber-600/80 text-amber-300 shadow-xs shadow-amber-950'
              : 'bg-clinical-800 border-clinical-700 text-clinical-400 hover:text-clinical-200'
          }`}
        >
          {redactPhi ? 'ACTIVE (MASKED)' : 'DISABLED (RAW PHI)'}
        </button>
      </div>

            {/* Search Bar */}
      <div className="p-3 border-b border-clinical-750 bg-clinical-900/40">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-clinical-400" />
          <input
            type="text"
            placeholder="Search tags by keyword, hex, VR, value..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-clinical-950/80 border border-clinical-700/80 rounded pl-8 pr-3 py-1.5 text-xs text-clinical-100 placeholder-clinical-500 focus:outline-none focus:border-indigo-500 font-mono"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-clinical-500 hover:text-clinical-300 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Accordion Module List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading ? (
          <div className="p-4 text-center text-xs font-mono text-clinical-400">Loading DICOM tags...</div>
        ) : (
          Object.entries(filteredModules).map(([moduleName, tags]) => {
            const isClosed = searchTerm.trim() ? false : collapsed[moduleName];
            return (
              <div key={moduleName} className="border border-clinical-800 rounded-md overflow-hidden bg-clinical-900/40">
                <button
                  onClick={() => toggleCollapse(moduleName)}
                  className="w-full px-3 py-2 bg-clinical-850/80 hover:bg-clinical-800/80 flex items-center justify-between text-left text-xs font-semibold text-clinical-200 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    {isClosed ? <ChevronRight className="w-3.5 h-3.5 text-clinical-400" /> : <ChevronDown className="w-3.5 h-3.5 text-clinical-400" />}
                    <span>{moduleName}</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-clinical-800 text-clinical-400">
                    {tags.length}
                  </span>
                </button>

                {!isClosed && (
                  <div className="divide-y divide-clinical-800/60 font-mono text-[11px]">
                    {tags.map((tag) => (
                      <div key={tag.tag} className="p-2 hover:bg-clinical-800/30 flex items-start justify-between group">
                        <div className="space-y-0.5 min-w-0 pr-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-indigo-400 font-bold">{highlightMatch(tag.tag, searchTerm)}</span>
                            <span className="text-clinical-300 font-semibold truncate">{highlightMatch(tag.keyword, searchTerm)}</span>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-clinical-800 text-clinical-400">
                              {tag.vr}
                            </span>
                            {tag.is_phi && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-950/80 text-amber-400 border border-amber-800/50">
                                PHI
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-clinical-500">{tag.name}</div>
                          <div className={`text-xs break-all ${tag.redacted ? 'text-amber-300/80 font-semibold' : 'text-clinical-100'}`}>
                            {highlightMatch(tag.value, searchTerm)}
                          </div>
                        </div>

                        <button
                          onClick={() => handleCopy(tag)}
                          title="Copy tag details"
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-clinical-750 text-clinical-400 hover:text-clinical-100 flex-shrink-0"
                        >
                          {copiedTag === tag.tag ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
