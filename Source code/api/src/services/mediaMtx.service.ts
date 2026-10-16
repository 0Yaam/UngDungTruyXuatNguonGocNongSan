import env from '../config/env';
import { ICamera } from '../models/Camera';
import { ServiceUnavailableError } from '../utils/errors';

const endpoint = (action: string, streamPath: string) =>
  `${env.MEDIA_CONTROL_API_BASE.replace(/\/$/, '')}/v3/config/paths/${action}/${encodeURIComponent(streamPath)}`;

const sourceWithCredentials = (camera: ICamera) => {
  if (!camera.source_url || !camera.username) return camera.source_url;
  try {
    const url = new URL(camera.source_url);
    url.username = camera.username;
    url.password = camera.password || '';
    return url.toString();
  } catch {
    return camera.source_url;
  }
};

const request = async (url: string, init: RequestInit) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error: any) {
    throw new ServiceUnavailableError(`Không kết nối được MediaMTX Control API: ${error.message}`);
  } finally {
    clearTimeout(timeout);
  }
};

export const syncMediaMtxPath = async (camera: ICamera) => {
  if (camera.source_type !== 'mediamtx' || !camera.stream_path || !camera.source_url) return;
  const body = JSON.stringify({ source: sourceWithCredentials(camera), sourceOnDemand: true });
  const current = await request(endpoint('get', camera.stream_path), { method: 'GET' });
  const response = current.ok
    ? await request(endpoint('patch', camera.stream_path), { method: 'PATCH', headers: { 'content-type': 'application/json' }, body })
    : await request(endpoint('add', camera.stream_path), { method: 'POST', headers: { 'content-type': 'application/json' }, body });
  if (!response.ok) {
    throw new ServiceUnavailableError(`MediaMTX từ chối cấu hình stream (${response.status}).`);
  }
};

export const removeMediaMtxPath = async (streamPath?: string) => {
  if (!streamPath) return;
  const response = await request(endpoint('delete', streamPath), { method: 'DELETE' });
  if (!response.ok && response.status !== 404) {
    throw new ServiceUnavailableError(`Không xóa được path MediaMTX (${response.status}).`);
  }
};
