import React, { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
  cameraCode: string;
  cameraName: string;
  onClose: () => void;
}

type PublisherState = 'idle' | 'connecting' | 'live' | 'error';

const PhoneCameraPublisher: React.FC<Props> = ({ cameraCode, cameraName, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<WebSocket>();
  const streamRef = useRef<MediaStream>();
  const timerRef = useRef<number>();
  const wakeLockRef = useRef<any>();
  const [state, setState] = useState<PublisherState>('idle');
  const [message, setMessage] = useState('Sẵn sàng sử dụng camera sau của điện thoại.');

  const stop = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = undefined;
    socketRef.current?.close(1000, 'Publisher stopped');
    socketRef.current = undefined;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = undefined;
    void wakeLockRef.current?.release?.();
    wakeLockRef.current = undefined;
    setState('idle');
    setMessage('Đã dừng phát camera.');
  }, []);

  useEffect(() => stop, [stop]);

  const startFrameLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const socket = socketRef.current;
    if (!video || !canvas || !socket) return;

    timerRef.current = window.setInterval(() => {
      if (socket.readyState !== WebSocket.OPEN || socket.bufferedAmount > 1_000_000 || video.readyState < 2) return;
      const width = Math.min(video.videoWidth || 960, 960);
      const height = Math.round(width * ((video.videoHeight || 720) / (video.videoWidth || 960)));
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d', { alpha: false })?.drawImage(video, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob && socket.readyState === WebSocket.OPEN && socket.bufferedAmount < 1_000_000) socket.send(blob);
      }, 'image/jpeg', 0.72);
    }, 350);
  }, []);

  const start = async () => {
    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      setState('error');
      setMessage('Trình duyệt chỉ cho mở camera qua HTTPS. Hãy dùng URL Tailscale https://…ts.net.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('error');
      setMessage('Trình duyệt này không hỗ trợ truy cập camera.');
      return;
    }

    stop();
    setState('connecting');
    setMessage('Đang xin quyền camera và kết nối máy chủ…');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = new WebSocket(
        `${protocol}//${window.location.host}/api/v1/phone-cameras?mode=publish&key=${encodeURIComponent(cameraCode)}`
      );
      socketRef.current = socket;
      socket.onopen = async () => {
        setState('live');
        setMessage('Đang phát trực tiếp. Giữ màn hình này mở và hướng camera vào vùng trồng.');
        try {
          wakeLockRef.current = await (navigator as any).wakeLock?.request?.('screen');
        } catch {
          // Trình duyệt có thể từ chối wake lock; stream vẫn tiếp tục khi màn hình sáng.
        }
        startFrameLoop();
      };
      socket.onmessage = (event) => {
        if (typeof event.data !== 'string') return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'error') {
            setState('error');
            setMessage(data.message || 'Máy chủ từ chối frame camera.');
          }
        } catch {
          // Bỏ qua message không phải JSON từ stream server.
        }
      };
      socket.onerror = () => {
        setState('error');
        setMessage('Không kết nối được kênh camera. Kiểm tra API và Tailscale rồi thử lại.');
      };
      socket.onclose = (event) => {
        if (event.code !== 1000) {
          setState('error');
          setMessage(event.reason || 'Kênh camera đã ngắt kết nối.');
        }
      };
    } catch (error: any) {
      stop();
      setState('error');
      setMessage(error?.name === 'NotAllowedError'
        ? 'Bạn chưa cấp quyền camera cho trình duyệt.'
        : `Không mở được camera: ${error?.message || 'lỗi không xác định'}`);
    }
  };

  return (
    <div className="phone-publisher-modal" role="dialog" aria-modal="true" aria-label="Dùng điện thoại làm camera">
      <section className="phone-publisher">
        <header>
          <div><span>CAMERA TẠM THỜI QUA TAILSCALE</span><h2>{cameraName}</h2><p>Mã ghép nối: <strong>{cameraCode}</strong></p></div>
          <button type="button" onClick={() => { stop(); onClose(); }} aria-label="Đóng">×</button>
        </header>
        <div className="phone-publisher__preview">
          <video ref={videoRef} muted playsInline autoPlay />
          {state !== 'live' && <div><strong>{state === 'connecting' ? 'Đang kết nối…' : 'Chưa phát camera'}</strong><span>Ưu tiên camera sau, khung hình ngang.</span></div>}
          <span className={`phone-publisher__status phone-publisher__status--${state}`}>{state === 'live' ? 'LIVE' : state === 'error' ? 'LỖI' : 'SẴN SÀNG'}</span>
        </div>
        <canvas ref={canvasRef} hidden />
        <p className={`phone-publisher__message${state === 'error' ? ' is-error' : ''}`}>{message}</p>
        <div className="phone-publisher__notes">
          <span>Điện thoại và máy chủ phải cùng tailnet.</span>
          <span>Dùng URL HTTPS Tailscale để trình duyệt cấp quyền camera.</span>
          <span>AI chỉ chạy khi người xem chủ động chọn nhiệm vụ.</span>
        </div>
        <footer>
          <button type="button" onClick={() => { stop(); onClose(); }}>Đóng</button>
          {state === 'live'
            ? <button type="button" className="camera-button camera-button--danger" onClick={stop}>Dừng phát</button>
            : <button type="button" className="camera-button camera-button--primary" disabled={state === 'connecting'} onClick={start}>Bắt đầu phát</button>}
        </footer>
      </section>
    </div>
  );
};

export default PhoneCameraPublisher;
