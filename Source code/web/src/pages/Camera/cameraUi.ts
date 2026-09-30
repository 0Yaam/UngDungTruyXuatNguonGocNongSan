import { Camera } from '../../core/api/camera.api';

export const purposeLabels: Record<Camera['purpose'], string> = {
  field_overview: 'Toàn cảnh vùng trồng',
  greenhouse: 'Nhà kính',
  irrigation: 'Hệ thống tưới',
  nursery: 'Vườn ươm',
  storage: 'Khu sơ chế và lưu trữ',
  livestock: 'Khu chăn nuôi',
};

export const statusLabels: Record<Camera['status'], string> = {
  online: 'Đang hoạt động',
  offline: 'Mất kết nối',
  maintenance: 'Đang bảo trì',
};

export const sourceLabels: Record<Camera['source_type'], string> = {
  phone: 'Điện thoại qua Tailscale',
  mediamtx: 'Camera RTSP qua MediaMTX',
  webrtc: 'Camera WebRTC',
  hls: 'Camera HLS',
  mjpeg: 'Camera MJPEG',
};

export const statusTone = (status: Camera['status']) => {
  if (status === 'online') return 'success' as const;
  if (status === 'maintenance') return 'warning' as const;
  return 'neutral' as const;
};
