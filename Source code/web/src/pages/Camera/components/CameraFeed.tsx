import React, { useEffect, useMemo, useRef, useState } from 'react';
import PhoneCameraPlayer from '../../../components/LiveStream/PhoneCameraPlayer';
import { Camera, CameraTaskRun, cameraApi } from '../../../core/api/camera.api';

interface CameraFeedProps {
  camera: Camera;
  compact?: boolean;
  aiTaskKey?: string;
}

interface FrameSize {
  width: number;
  height: number;
}

const CameraFeed: React.FC<CameraFeedProps> = ({ camera, compact = false, aiTaskKey }) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const [analysis, setAnalysis] = useState<Pick<CameraTaskRun, 'status' | 'confidence' | 'result'>>();
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [frameSize, setFrameSize] = useState<FrameSize>({ width: 0, height: 0 });
  const playbackUrl = camera.stream_urls?.webrtc || camera.playback_url;

  useEffect(() => {
    const element = frameRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      setFrameSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!aiTaskKey || compact) {
      setAnalysis(undefined);
      setAnalyzing(false);
      setAnalysisError('');
      return;
    }
    let stopped = false;
    let timer: number | undefined;
    const detect = async () => {
      if (stopped) return;
      setAnalyzing(true);
      try {
        const response = await cameraApi.preview(camera._id, aiTaskKey);
        if (!stopped) {
          setAnalysis(response.data.analysis);
          setAnalysisError('');
        }
      } catch (error: any) {
        if (!stopped) setAnalysisError(error?.response?.data?.msg || 'Không thể phân tích frame hiện tại.');
      } finally {
        if (!stopped) {
          setAnalyzing(false);
          timer = window.setTimeout(detect, 1800);
        }
      }
    };
    timer = window.setTimeout(detect, 250);
    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [aiTaskKey, camera._id, compact]);

  const detections = analysis?.result?.detections || [];
  const topDisease = analysis?.result?.top_disease;
  const sourceWidth = analysis?.result?.source_width || 16;
  const sourceHeight = analysis?.result?.source_height || 9;
  const fitted = useMemo(() => {
    const scale = Math.min(frameSize.width / sourceWidth, frameSize.height / sourceHeight);
    const width = sourceWidth * scale;
    const height = sourceHeight * scale;
    return { width, height, left: (frameSize.width - width) / 2, top: (frameSize.height - height) / 2 };
  }, [frameSize, sourceHeight, sourceWidth]);

  let media: React.ReactNode;
  if (camera.source_type === 'phone' || camera.playback_url.startsWith('phone://')) {
    media = <PhoneCameraPlayer streamUrl={camera.playback_url} name={camera.name} />;
  } else if (camera.source_type === 'mjpeg' || /\.(jpe?g|png)(\?|$)/i.test(camera.playback_url)) {
    media = <img className="camera-live-media" src={playbackUrl} alt={`Camera ${camera.name}`} />;
  } else if (camera.source_type === 'hls') {
    media = <video className="camera-live-media" src={playbackUrl} controls autoPlay muted playsInline />;
  } else {
    media = (
      <iframe
        className="camera-live-media"
        src={playbackUrl}
        title={camera.name}
        loading={compact ? 'lazy' : 'eager'}
        allow="autoplay; fullscreen; picture-in-picture"
      />
    );
  }

  return (
    <div ref={frameRef} className="camera-feed-frame">
      {media}
      {aiTaskKey && !compact && (
        <div className="camera-detection-layer" aria-live="polite">
          <span className={`camera-detection-state${analysisError ? ' is-error' : ''}`}>
            {analysisError || (analyzing ? 'AI đang quét frame…' : detections.length ? `${detections.length} vùng được phát hiện` : 'MobileNet đang dự phòng')}
          </span>
          {detections.map((detection, index) => (
            <div
              key={`${detection.disease_name}-${index}`}
              className={`camera-detection-box${detection.is_healthy ? ' is-healthy' : ''}`}
              style={{
                left: fitted.left + detection.box.x * fitted.width,
                top: fitted.top + detection.box.y * fitted.height,
                width: detection.box.width * fitted.width,
                height: detection.box.height * fitted.height,
              }}
            >
              <span>{detection.disease_name} · {(detection.confidence * 100).toFixed(0)}%</span>
            </div>
          ))}
          {!detections.length && topDisease && (
            <div className="camera-classification-result">
              {topDisease.disease_name} · {(topDisease.confidence * 100).toFixed(1)}%
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(CameraFeed);
