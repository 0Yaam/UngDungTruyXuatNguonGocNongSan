import React, { useEffect, useRef, useState } from 'react';
import { borderRadius, spacing, typography } from '../../core/theme';

interface Props {
  streamUrl: string;
  name: string;
}

const pairingKey = (streamUrl: string) =>
  streamUrl.replace(/^phone:\/\//i, '').trim().toUpperCase();

const PhoneCameraPlayer: React.FC<Props> = ({ streamUrl, name }) => {
  const [frameUrl, setFrameUrl] = useState('');
  const [online, setOnline] = useState(false);
  const [status, setStatus] = useState('Đang kết nối camera...');
  const [disease, setDisease] = useState('');
  const [confidence, setConfidence] = useState<number | null>(null);
  const oldUrlRef = useRef('');

  useEffect(() => {
    const key = pairingKey(streamUrl);
    if (!key) {
      setStatus('Mã camera không hợp lệ');
      return;
    }

    let stopped = false;
    let socket: WebSocket | null = null;
    let retry: number | undefined;

    const connect = () => {
      if (stopped) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url =
        `${protocol}//${window.location.host}` +
        `/api/v1/phone-cameras?mode=view&key=${encodeURIComponent(key)}`;

      setStatus('Đang kết nối camera...');
      socket = new WebSocket(url);
      socket.binaryType = 'arraybuffer';

      socket.onopen = () => {
        if (!stopped) setStatus('Đã kết nối server, đang chờ phone...');
      };

      socket.onmessage = (event) => {
        if (stopped) return;

        if (event.data instanceof ArrayBuffer) {
          const blob = new Blob([event.data], { type: 'image/jpeg' });
          const nextUrl = URL.createObjectURL(blob);
          if (oldUrlRef.current) URL.revokeObjectURL(oldUrlRef.current);
          oldUrlRef.current = nextUrl;
          setFrameUrl(nextUrl);
          setOnline(true);
          setStatus('LIVE');
          return;
        }

        if (typeof event.data !== 'string') return;

        try {
          const data = JSON.parse(event.data);
          if (data.type === 'viewer_ready') {
            setOnline(Boolean(data.online));
            setStatus(data.online ? 'LIVE' : 'Camera phone đang offline');
          } else if (data.type === 'camera_online') {
            setOnline(true);
            setStatus('LIVE');
          } else if (data.type === 'camera_offline') {
            setOnline(false);
            setStatus('Camera phone đang offline');
          } else if (data.type === 'ai_result') {
            const top = Array.isArray(data.candidates) ? data.candidates[0] : null;
            if (top) {
              setDisease(String(top.disease_name || ''));
              setConfidence(
                typeof top.confidence === 'number' ? top.confidence : null
              );
            }
          } else if (data.type === 'ai_error') {
            setStatus(String(data.message || 'AI tạm thời không khả dụng'));
          }
        } catch {
        }
      };

      socket.onerror = () => {
        if (!stopped) setStatus('Lỗi kết nối camera');
      };

      socket.onclose = () => {
        if (stopped) return;
        setOnline(false);
        setStatus('Mất kết nối, đang thử lại...');
        retry = window.setTimeout(connect, 1500);
      };
    };

    connect();

    return () => {
      stopped = true;
      if (retry) window.clearTimeout(retry);
      socket?.close();
      if (oldUrlRef.current) {
        URL.revokeObjectURL(oldUrlRef.current);
        oldUrlRef.current = '';
      }
    };
  }, [streamUrl]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16 / 9',
        overflow: 'hidden',
        borderRadius: borderRadius.lg,
        background: '#000',
      }}
    >
      {frameUrl ? (
        <img
          alt={`Live camera ${name}`}
          src={frameUrl}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            textAlign: 'center',
            padding: spacing[5],
          }}
        >
          <div>
            <div style={{ fontSize: 42, marginBottom: spacing[2] }}>📷</div>
            <strong>{status}</strong>
            <div
              style={{
                marginTop: spacing[2],
                opacity: 0.68,
                fontSize: typography.sizes.xs,
              }}
            >
              {name} · {pairingKey(streamUrl)}
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          padding: '5px 9px',
          borderRadius: 999,
          color: '#fff',
          background: online ? '#dc2626' : 'rgba(0,0,0,.65)',
          fontWeight: 800,
          fontSize: 11,
        }}
      >
        {online ? '● LIVE' : 'OFFLINE'}
      </div>

      {disease && (
        <div
          style={{
            position: 'absolute',
            left: 10,
            right: 10,
            bottom: 10,
            padding: '9px 12px',
            borderRadius: 10,
            color: '#fff',
            background: 'rgba(0,0,0,.72)',
            fontSize: typography.sizes.sm,
            fontWeight: 700,
          }}
        >
          {disease}
          {confidence !== null &&
            ` · Độ tin cậy mô hình ${(confidence * 100).toFixed(1)}%`}
        </div>
      )}
    </div>
  );
};

export default PhoneCameraPlayer;
