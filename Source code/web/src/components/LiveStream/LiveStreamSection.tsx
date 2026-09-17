import React, { useMemo, useState } from 'react';
import type { LiveCamera } from '../../core/types';
import { colors, spacing, borderRadius, shadows, typography } from '../../core/theme';

const toEmbedUrl = (url: string): string | null => {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const youtubeMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|live\/|embed\/)|youtu\.be\/)([\w-]{11})/
  );
  if (youtubeMatch) {
    return `https://www.youtube-nocookie.com/embed/${youtubeMatch[1]}?autoplay=1&mute=1&playsinline=1&rel=0`;
  }

  if (trimmed.includes('player.vimeo.com/video/')) {
    return trimmed.includes('autoplay')
      ? trimmed
      : `${trimmed}${trimmed.includes('?') ? '&' : '?'}autoplay=1&muted=1`;
  }

  const vimeoMatch = trimmed.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&muted=1`;
  }

  return null;
};

const LiveStreamPlayer: React.FC<{ camera: LiveCamera }> = ({ camera }) => {
  const embedUrl = useMemo(() => toEmbedUrl(camera.stream_url), [camera.stream_url]);

  if (embedUrl) {
    return (
      <iframe
        title={camera.name}
        src={embedUrl}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{
          width: '100%',
          aspectRatio: '16 / 9',
          border: 'none',
          borderRadius: borderRadius.lg,
          background: '#000',
        }}
      />
    );
  }

  return (
    <video
      src={camera.stream_url}
      controls
      autoPlay
      muted
      playsInline
      style={{
        width: '100%',
        aspectRatio: '16 / 9',
        borderRadius: borderRadius.lg,
        background: '#000',
      }}
    >
      Trình duyệt không hỗ trợ phát stream này.
    </video>
  );
};

interface LiveStreamSectionProps {
  cameras?: LiveCamera[];
}

const LiveStreamSection: React.FC<LiveStreamSectionProps> = ({ cameras = [] }) => {
  const activeCameras = cameras.filter((camera) => camera.is_active !== false);
  const [selectedId, setSelectedId] = useState<string | null>(
    activeCameras[0]?._id ?? null
  );

  if (activeCameras.length === 0) {
    return null;
  }

  const selectedCamera =
    activeCameras.find((camera) => camera._id === selectedId) ?? activeCameras[0];

  return (
    <div
      style={{
        background: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing[6],
        border: `1px solid ${colors.neutral[200]}`,
        boxShadow: shadows.sm,
        marginBottom: spacing[6],
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing[3],
          marginBottom: spacing[5],
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: borderRadius.lg,
            background: '#fee2e2',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
          }}
        >
          📹
        </div>
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: typography.sizes.xl,
              fontWeight: typography.weights.bold,
            }}
          >
            Camera trực tiếp
          </h2>
          <p
            style={{
              margin: `${spacing[1]} 0 0`,
              color: colors.textSecondary,
              fontSize: typography.sizes.sm,
            }}
          >
            {activeCameras.length} camera đang hoạt động tại vùng sản xuất
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: spacing[5],
        }}
      >
        <div>
          <LiveStreamPlayer camera={selectedCamera} />
          <div style={{ marginTop: spacing[3] }}>
            <div
              style={{
                fontWeight: typography.weights.semibold,
                fontSize: typography.sizes.base,
              }}
            >
              {selectedCamera.name}
            </div>
            {selectedCamera.location && (
              <div
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.sizes.sm,
                  marginTop: spacing[1],
                }}
              >
                📍 {selectedCamera.location}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
          {activeCameras.map((camera) => {
            const isSelected = camera._id === selectedCamera._id;
            return (
              <button
                key={camera._id ?? camera.name}
                type="button"
                onClick={() => setSelectedId(camera._id ?? null)}
                style={{
                  textAlign: 'left',
                  padding: spacing[4],
                  borderRadius: borderRadius.lg,
                  border: isSelected
                    ? `2px solid ${colors.primary[600]}`
                    : `1px solid ${colors.neutral[200]}`,
                  background: isSelected ? colors.primary[50] : colors.neutral[50],
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing[2],
                    marginBottom: spacing[1],
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#ef4444',
                      boxShadow: '0 0 0 3px rgba(239,68,68,0.25)',
                    }}
                  />
                  <span
                    style={{
                      fontWeight: typography.weights.semibold,
                      fontSize: typography.sizes.sm,
                      color: colors.textPrimary,
                    }}
                  >
                    LIVE
                  </span>
                </div>
                <div style={{ fontWeight: typography.weights.medium }}>
                  {camera.name}
                </div>
                {camera.location && (
                  <div
                    style={{
                      fontSize: typography.sizes.xs,
                      color: colors.textSecondary,
                      marginTop: spacing[1],
                    }}
                  >
                    {camera.location}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LiveStreamSection;
