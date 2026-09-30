import { createHash, randomBytes } from 'crypto';
import { FilterQuery } from 'mongoose';
import Camera, { CameraPurpose, CameraSourceType, CameraStatusOverride, ICamera } from '../models/Camera';
import CameraTaskRun from '../models/CameraTaskRun';
import FarmingArea from '../models/FarmingArea';
import Product from '../models/Product';
import env from '../config/env';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../utils/errors';
import { removeMediaMtxPath, syncMediaMtxPath } from './mediaMtx.service';

type CameraInput = Partial<{
  name: string;
  description: string;
  source_type: CameraSourceType;
  purpose: CameraPurpose;
  stream_path: string;
  source_url: string;
  playback_url: string;
  snapshot_url: string;
  username: string;
  password: string;
  farming_area: string;
  product: string;
  is_enabled: boolean;
  status_override: CameraStatusOverride;
  location: string;
  metadata: Record<string, unknown>;
}>;

const hashKey = (value: string) => createHash('sha256').update(value).digest('hex');
const cleanPath = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
const cameraCode = () => `CAM-${randomBytes(4).toString('hex').toUpperCase()}`;

const assertUrl = (value: string | undefined, protocols: string[], field: string) => {
  if (!value) return;
  if (value.toLowerCase().startsWith('phone://') && protocols.includes('phone:')) return;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new BadRequestError(`${field} không hợp lệ`, 'INVALID_CAMERA_URL');
  }
  if (!protocols.includes(parsed.protocol)) {
    throw new BadRequestError(`${field} không hỗ trợ giao thức ${parsed.protocol}`, 'INVALID_CAMERA_PROTOCOL');
  }
};

const associationAccess = async (data: CameraInput, userId: string, role: string) => {
  if (data.farming_area) {
    const area = await FarmingArea.findById(data.farming_area).select('owner');
    if (!area) throw new NotFoundError('Không tìm thấy vùng trồng');
    if (role === 'farmer' && area.owner.toString() !== userId) {
      throw new UnauthorizedError('Bạn chỉ được gắn camera vào vùng trồng của mình');
    }
  }
  if (data.product) {
    const product = await Product.findById(data.product).select('created_by');
    if (!product) throw new NotFoundError('Không tìm thấy lô nông sản');
    if (role === 'farmer' && product.created_by.toString() !== userId) {
      throw new UnauthorizedError('Bạn chỉ được gắn camera vào lô của mình');
    }
  }
};

const accessFilter = (userId: string, role: string): FilterQuery<ICamera> =>
  role === 'farmer' ? { owner: userId } : {};

const effectiveStatus = (camera: any) => {
  if (!camera.is_enabled) return 'offline';
  if (camera.status_override !== 'auto') return camera.status_override;
  if (!camera.last_seen) return 'offline';
  return Date.now() - new Date(camera.last_seen).getTime() <= env.CAMERA_OFFLINE_AFTER_MS
    ? 'online'
    : 'offline';
};

export const toCameraResponse = (camera: any, includeSecrets = false) => {
  const value = camera.toObject ? camera.toObject() : { ...camera };
  value.status = effectiveStatus(value);
  if (value.stream_path) {
    value.stream_urls = {
      webrtc: `${env.MEDIA_PUBLIC_WEBRTC_BASE.replace(/\/$/, '')}/${value.stream_path}`,
      hls: `${env.MEDIA_PUBLIC_HLS_BASE.replace(/\/$/, '')}/${value.stream_path}/index.m3u8`,
    };
  }
  delete value.ingest_key_hash;
  if (!includeSecrets) {
    delete value.source_url;
    delete value.username;
    delete value.password;
  }
  return value;
};

const derivePlayback = (data: CameraInput, code: string) => {
  if (data.source_type === 'phone') return `phone://${code}`;
  if (data.playback_url?.trim()) return data.playback_url.trim();
  const streamPath = cleanPath(data.stream_path || code.toLowerCase());
  if (!streamPath) throw new BadRequestError('Vui lòng nhập đường dẫn stream', 'STREAM_PATH_REQUIRED');
  return `${env.MEDIA_PUBLIC_WEBRTC_BASE.replace(/\/$/, '')}/${streamPath}`;
};

export const listCameras = async (userId: string, role: string, query: Record<string, unknown>) => {
  const filter: FilterQuery<ICamera> = accessFilter(userId, role);
  if (query.farming_area) filter.farming_area = String(query.farming_area);
  if (query.product) filter.product = String(query.product);
  if (query.enabled === 'true') filter.is_enabled = true;
  const cameras = await Camera.find(filter)
    .populate('farming_area', 'name address')
    .populate('product', 'name category status')
    .sort({ createdAt: -1 });
  return cameras.map((camera) => toCameraResponse(camera));
};

export const getCamera = async (id: string, userId: string, role: string, includeSecrets = false) => {
  const query = Camera.findOne({ _id: id, ...accessFilter(userId, role) })
    .populate('farming_area', 'name address')
    .populate('product', 'name category status');
  if (includeSecrets) query.select('+source_url +username +password');
  const camera = await query;
  if (!camera) throw new NotFoundError('Không tìm thấy camera');
  return camera;
};

export const createCamera = async (data: CameraInput, userId: string, role: string) => {
  if (!data.name?.trim()) throw new BadRequestError('Vui lòng nhập tên camera');
  if (!data.farming_area) {
    throw new BadRequestError(
      'Camera nông nghiệp phải được gắn với một vùng trồng',
      'FARMING_AREA_REQUIRED'
    );
  }
  await associationAccess(data, userId, role);
  const code = cameraCode();
  const ingestKey = randomBytes(24).toString('base64url');
  const sourceType = data.source_type || 'mediamtx';
  const playbackUrl = derivePlayback({ ...data, source_type: sourceType }, code);
  assertUrl(playbackUrl, ['http:', 'https:', 'phone:'], 'URL phát');
  assertUrl(data.source_url, ['rtsp:', 'rtsps:', 'http:', 'https:'], 'URL nguồn');
  assertUrl(data.snapshot_url, ['http:', 'https:'], 'URL snapshot');

  const camera = await Camera.create({
    ...data,
    name: data.name.trim(),
    code,
    source_type: sourceType,
    purpose: data.purpose || 'field_overview',
    stream_path: cleanPath(data.stream_path || code.toLowerCase()),
    playback_url: playbackUrl,
    owner: userId,
    ingest_key_hash: hashKey(ingestKey),
  });
  try {
    await syncMediaMtxPath(camera);
  } catch (error) {
    await camera.deleteOne();
    throw error;
  }
  return { camera: toCameraResponse(camera), ingest_key: ingestKey };
};

export const updateCamera = async (id: string, data: CameraInput, userId: string, role: string) => {
  const camera = await getCamera(id, userId, role, true);
  const previousStreamPath = camera.stream_path;
  const previousConfiguration = camera.toObject({ depopulate: true });
  await associationAccess(data, userId, role);
  assertUrl(data.playback_url, ['http:', 'https:', 'phone:'], 'URL phát');
  assertUrl(data.source_url, ['rtsp:', 'rtsps:', 'http:', 'https:'], 'URL nguồn');
  assertUrl(data.snapshot_url, ['http:', 'https:'], 'URL snapshot');
  const allowed: (keyof CameraInput)[] = [
    'name', 'description', 'source_type', 'purpose', 'stream_path', 'source_url', 'playback_url',
    'snapshot_url', 'username', 'password', 'farming_area', 'product', 'is_enabled',
    'status_override', 'location', 'metadata',
  ];
  for (const key of allowed) {
    if (data[key] !== undefined) (camera as any)[key] = data[key];
  }
  if (data.source_type === 'phone') camera.playback_url = `phone://${camera.code}`;
  await camera.save();
  try {
    await syncMediaMtxPath(camera);
  } catch (error) {
    await Camera.replaceOne({ _id: camera._id }, previousConfiguration);
    throw error;
  }
  if (previousStreamPath && previousStreamPath !== camera.stream_path) {
    await removeMediaMtxPath(previousStreamPath).catch(() => undefined);
  }
  return toCameraResponse(camera);
};

export const deleteCamera = async (id: string, userId: string, role: string) => {
  const camera = await getCamera(id, userId, role, true);
  if (camera.source_type === 'mediamtx') await removeMediaMtxPath(camera.stream_path);
  await CameraTaskRun.deleteMany({ camera: camera._id });
  await camera.deleteOne();
  return toCameraResponse(camera);
};

export const rotateIngestKey = async (id: string, userId: string, role: string) => {
  const camera = await getCamera(id, userId, role, true);
  const ingestKey = randomBytes(24).toString('base64url');
  camera.ingest_key_hash = hashKey(ingestKey);
  await camera.save();
  return { camera: toCameraResponse(camera), ingest_key: ingestKey };
};

export const heartbeatByAgent = async (code: string, ingestKey: string, error?: string) => {
  const camera = await Camera.findOne({ code: code.toUpperCase() }).select('+ingest_key_hash');
  if (!camera || hashKey(ingestKey) !== camera.ingest_key_hash) {
    throw new UnauthorizedError('Thông tin xác thực camera không hợp lệ');
  }
  camera.last_seen = new Date();
  camera.last_error = error?.trim() || undefined;
  await camera.save();
  return toCameraResponse(camera);
};
