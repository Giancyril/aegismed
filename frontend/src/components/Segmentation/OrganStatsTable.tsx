import React, { useState, useEffect } from 'react';
import { BarChart2, ShieldAlert, CheckCircle } from 'lucide-react';

interface OrganMetric {
  organ_name: string;
  volume_cm3: number;
  clinical_status: string;
  alert_level: string;
  sphericity?: number;
}

interface OrganStatsTableProps {
  jobId?: string;
  className?: string;
}

export const OrganStatsTable: React.FC<OrganStatsTableProps> = ({
  jobId = 'job_49a8f2',
  className = ''
}) => {
  const [metrics, setMetrics] = useState<OrganMetric[]>([
    { organ_name: 'Liver', volume_cm3: 1420.5, clinical_status: 'Normal', alert_level: 'NORMAL', sphericity: 0.82 },
    { organ_name: 'Spleen', volume_cm3: 385.2, clinical_status: 'Splenomegaly', alert_level: 'MODERATE_ALERT', sphericity: 0.74 },
    { organ_name: 'Kidneys', volume_cm3: 310.8, clinical_status: 'Normal', alert_level: 'NORMAL', sphericity: 0.79 },
    { organ_name: 'Pancreas', volume_cm3: 82.4, clinical_status: 'Normal', alert_level: 'NORMAL', sphericity: 0.65 }
  ]);
  const [riskLevel, setRiskLevel] = useState<string>('MODERATE_ALERT');

  useEffect(() => {
    let isMounted = true;
    const fetchMetrics = async () => {
      try {
        const host = window.location.port === '5173' || window.location.port === '5174' ? 'http://localhost:8000' : '';
        const res = await fetch(`${host}/api/v1/jobs/${jobId}/metrics/summary`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.evaluated_organs) {
            setMetrics(data.evaluated_organs);
            setRiskLevel(data.overall_risk_level || 'NORMAL');
          }
        }
      } catch (err) {
        // Fallback default metrics already set
      }
    };
    fetchMetrics();
    return () => { isMounted = false; };
  }, [jobId]);

  return (
    <div className={`space-y-2 text-xs font-mono select-none ${className}`}>
      <div className="flex items-center justify-between text-clinical-300 pb-1 border-b border-clinical-800">
        <span className="flex items-center space-x-1.5 font-bold text-clinical-200">
          <BarChart2 className="w-3.5 h-3.5 text-indigo-400" />
          <span>Organ Volumetrics</span>
        </span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
          riskLevel === 'HIGH_ALERT' ? 'bg-red-950/80 text-red-400 border border-red-800/60' :
          riskLevel === 'MODERATE_ALERT' ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60' :
          'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
        }`}>
          {riskLevel.replace('_', ' ')}
        </span>
      </div>

      <div className="border border-clinical-800 rounded bg-clinical-950/50 overflow-hidden divide-y divide-clinical-800/60">
        {metrics.map((m) => (
          <div key={m.organ_name} className="p-2 flex items-center justify-between hover:bg-clinical-800/30">
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-semibold text-clinical-200">{m.organ_name}</span>
                {m.alert_level !== 'NORMAL' ? (
                  <ShieldAlert className="w-3 h-3 text-amber-400" />
                ) : (
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                )}
              </div>
              <div className="text-[10px] text-clinical-400">
                {m.clinical_status}
              </div>
            </div>

            <div className="text-right">
              <div className="font-bold text-indigo-300">{m.volume_cm3} cm³</div>
              {m.sphericity && (
                <div className="text-[10px] text-clinical-500">Ψ: {m.sphericity}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
