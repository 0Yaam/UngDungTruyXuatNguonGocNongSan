import React, { useEffect, useState } from 'react';
import { productApi } from '../../core/api/product.api';
import type { LiveCamera, Product } from '../../core/types';
import { colors, spacing, borderRadius, typography } from '../../core/theme';

interface ProductCameraModalProps {
  product: Product;
  onClose: () => void;
  onSaved: (product: Product) => void;
}

const emptyCamera = (): LiveCamera => ({
  name: '',
  stream_url: '',
  location: '',
  is_active: true,
});

const fieldStyle: React.CSSProperties = {
  padding: `${spacing[3]} ${spacing[4]}`,
  borderRadius: borderRadius.lg,
  border: `1px solid ${colors.neutral[300]}`,
  fontSize: typography.sizes.sm,
  width: '100%',
  boxSizing: 'border-box',
};

const ProductCameraModal: React.FC<ProductCameraModalProps> = ({
  product,
  onClose,
  onSaved,
}) => {
  const [cameras, setCameras] = useState<LiveCamera[]>(product.live_cameras ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setCameras(product.live_cameras ?? []);
  }, [product]);

  const handleAdd = () => {
    setCameras((prev) => [...prev, emptyCamera()]);
  };

  const handleRemove = (index: number) => {
    setCameras((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChange = (
    index: number,
    field: keyof LiveCamera,
    value: string | boolean
  ) => {
    setCameras((prev) =>
      prev.map((camera, i) =>
        i === index ? { ...camera, [field]: value } : camera
      )
    );
  };

  const handleSave = async () => {
    setError('');

    const invalid = cameras.find(
      (camera) => !camera.name.trim() || !camera.stream_url.trim()
    );
    if (invalid) {
      setError('Mỗi camera cần có tên và URL live stream.');
      return;
    }

    setSaving(true);
    try {
      const { data } = await productApi.update(product._id, {
        live_cameras: cameras.map((camera) => ({
          ...camera,
          name: camera.name.trim(),
          stream_url: camera.stream_url.trim(),
          location: camera.location?.trim() || undefined,
        })),
      });
      onSaved(data.product);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Không lưu được danh sách camera.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing[4],
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 720,
          maxHeight: '90vh',
          overflow: 'auto',
          background: colors.surface,
          borderRadius: borderRadius.xl,
          padding: spacing[6],
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: spacing[4],
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: typography.sizes.xl }}>
              Quản lý camera trực tiếp
            </h2>
            <p
              style={{
                margin: `${spacing[2]} 0 0`,
                color: colors.textSecondary,
                fontSize: typography.sizes.sm,
              }}
            >
              {product.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: 24,
              cursor: 'pointer',
              color: colors.textSecondary,
            }}
          >
            ×
          </button>
        </div>

        <p
          style={{
            color: colors.textSecondary,
            fontSize: typography.sizes.sm,
            marginBottom: spacing[4],
          }}
        >
          Hỗ trợ URL HLS (.m3u8), MP4, YouTube hoặc Vimeo. Người quét QR sẽ thấy
          danh sách camera trên trang truy xuất.
        </p>

        <div style={{ display: 'grid', gap: spacing[4], marginBottom: spacing[4] }}>
          {cameras.length === 0 ? (
            <div
              style={{
                padding: spacing[5],
                border: `1px dashed ${colors.neutral[300]}`,
                borderRadius: borderRadius.lg,
                color: colors.textSecondary,
                textAlign: 'center',
              }}
            >
              Chưa có camera nào. Thêm camera để hiển thị live stream khi quét QR.
            </div>
          ) : (
            cameras.map((camera, index) => (
              <div
                key={camera._id ?? index}
                style={{
                  border: `1px solid ${colors.neutral[200]}`,
                  borderRadius: borderRadius.lg,
                  padding: spacing[4],
                  display: 'grid',
                  gap: spacing[3],
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <strong>Camera #{index + 1}</strong>
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    style={{
                      border: 'none',
                      background: '#fef2f2',
                      color: '#b91c1c',
                      borderRadius: borderRadius.md,
                      padding: `${spacing[1]} ${spacing[3]}`,
                      cursor: 'pointer',
                      fontSize: typography.sizes.sm,
                    }}
                  >
                    Xóa
                  </button>
                </div>

                <label style={{ display: 'grid', gap: spacing[1] }}>
                  <span style={{ fontSize: typography.sizes.sm, fontWeight: 600 }}>
                    Tên camera
                  </span>
                  <input
                    value={camera.name}
                    onChange={(e) => handleChange(index, 'name', e.target.value)}
                    placeholder="Ví dụ: Camera nhà kính A"
                    style={fieldStyle}
                  />
                </label>

                <label style={{ display: 'grid', gap: spacing[1] }}>
                  <span style={{ fontSize: typography.sizes.sm, fontWeight: 600 }}>
                    URL live stream
                  </span>
                  <input
                    value={camera.stream_url}
                    onChange={(e) =>
                      handleChange(index, 'stream_url', e.target.value)
                    }
                    placeholder="https://... hoặc link YouTube"
                    style={fieldStyle}
                  />
                </label>

                <label style={{ display: 'grid', gap: spacing[1] }}>
                  <span style={{ fontSize: typography.sizes.sm, fontWeight: 600 }}>
                    Vị trí (tùy chọn)
                  </span>
                  <input
                    value={camera.location ?? ''}
                    onChange={(e) => handleChange(index, 'location', e.target.value)}
                    placeholder="Ví dụ: Khu vực thu hoạch"
                    style={fieldStyle}
                  />
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing[2],
                    fontSize: typography.sizes.sm,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={camera.is_active !== false}
                    onChange={(e) =>
                      handleChange(index, 'is_active', e.target.checked)
                    }
                  />
                  Đang hoạt động (hiển thị trên trang truy xuất)
                </label>
              </div>
            ))
          )}
        </div>

        {error && (
          <div
            style={{
              background: '#fef2f2',
              color: '#b91c1c',
              padding: spacing[3],
              borderRadius: borderRadius.lg,
              marginBottom: spacing[4],
              fontSize: typography.sizes.sm,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: spacing[3], flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleAdd}
            style={{
              padding: `${spacing[3]} ${spacing[4]}`,
              borderRadius: borderRadius.lg,
              border: `1px solid ${colors.neutral[300]}`,
              background: colors.surface,
              cursor: 'pointer',
              fontWeight: typography.weights.medium,
            }}
          >
            + Thêm camera
          </button>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: `${spacing[3]} ${spacing[4]}`,
              borderRadius: borderRadius.lg,
              border: `1px solid ${colors.neutral[300]}`,
              background: colors.surface,
              cursor: 'pointer',
            }}
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: `${spacing[3]} ${spacing[5]}`,
              borderRadius: borderRadius.lg,
              border: 'none',
              background: saving ? colors.neutral[400] : colors.primary[600],
              color: 'white',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontWeight: typography.weights.semibold,
            }}
          >
            {saving ? 'Đang lưu...' : 'Lưu camera'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCameraModal;
