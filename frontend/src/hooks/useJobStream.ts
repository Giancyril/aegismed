import { useState, useEffect, useRef, useCallback } from 'react';

export interface JobStreamEvent {
  type: 'connected' | 'stage_update' | 'heartbeat' | 'pong';
  job_id: string;
  stage?: 'queued' | 'preprocessing' | 'inferring' | 'postprocessing' | 'completed' | 'failed';
  progress?: number;
  message?: string;
  metrics?: {
    volume_cm3?: number;
    confidence?: number;
    voxel_count?: number;
    model?: string;
  };
  error?: string;
  timestamp?: number;
}

export interface UseJobStreamReturn {
  isConnected: boolean;
  stage: string;
  progress: number;
  message: string;
  metrics: any;
  error: string | null;
  reconnect: () => void;
}

export function useJobStream(jobId: string | null | undefined): UseJobStreamReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [stage, setStage] = useState<string>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [message, setMessage] = useState<string>('Awaiting inference request...');
  const [metrics, setMetrics] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const pingIntervalRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);

  const connect = useCallback(() => {
    if (!jobId) return;

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // When in dev, connect directly to backend on port 8000 if running on 5173/5174
    const host = window.location.port === '5173' || window.location.port === '5174'
      ? `${window.location.hostname}:8000`
      : window.location.host;

    const url = `${protocol}//${host}/ws/jobs/${jobId}`;
    console.log(`[useJobStream] Connecting to WebSocket: ${url}`);

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        retryCountRef.current = 0;
        console.log(`[useJobStream] WebSocket connected for job: ${jobId}`);

        // Setup ping interval
        pingIntervalRef.current = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: 'ping', timestamp: Date.now() }));
          }
        }, 10000);
      };

      ws.onmessage = (event) => {
        try {
          const payload: JobStreamEvent = JSON.parse(event.data);
          if (payload.type === 'stage_update') {
            if (payload.stage) setStage(payload.stage);
            if (typeof payload.progress === 'number') setProgress(payload.progress);
            if (payload.message) setMessage(payload.message);
            if (payload.metrics) setMetrics(payload.metrics);
            if (payload.error) setError(payload.error);
          } else if (payload.type === 'connected') {
            setMessage(payload.message || 'Connected to live stream');
          }
        } catch (e) {
          console.error('[useJobStream] Failed to parse message:', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Reconnect if job is still in flight (not completed or failed)
        if (stage !== 'completed' && stage !== 'failed' && retryCountRef.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000);
          retryCountRef.current += 1;
          reconnectTimeoutRef.current = window.setTimeout(connect, delay);
        }
      };

      ws.onerror = (err) => {
        console.warn('[useJobStream] WebSocket error:', err);
      };
    } catch (err: any) {
      setError(err?.message || 'Failed to establish WebSocket');
      setIsConnected(false);
    }
  }, [jobId, stage]);

  useEffect(() => {
    if (!jobId) {
      setStage('idle');
      setProgress(0);
      setMessage('Awaiting inference request...');
      return;
    }

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };
  }, [jobId, connect]);

  return {
    isConnected,
    stage,
    progress,
    message,
    metrics,
    error,
    reconnect: connect
  };
}
