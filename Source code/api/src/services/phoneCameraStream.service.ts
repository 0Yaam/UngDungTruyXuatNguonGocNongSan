import { Server as HttpServer } from 'http';
import { RawData, WebSocket, WebSocketServer } from 'ws';
import Camera from '../models/Camera';
import Product from '../models/Product';
import env from '../config/env';

const PATHNAME = '/api/v1/phone-cameras';
const PHONE_PREFIX = 'phone://';

interface CameraDefinition {
  cameraName: string;
  productId?: string;
}

interface CameraState extends CameraDefinition {
  key: string;
  publisher?: WebSocket;
  viewers: Set<WebSocket>;
  latestFrame?: Buffer;
}

const states = new Map<string, CameraState>();
const normalizeKey = (value: string | null) =>
  (value || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 64);

const sendJson = (socket: WebSocket | undefined, value: unknown) => {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(value));
};

const broadcastJson = (state: CameraState, value: unknown) => {
  sendJson(state.publisher, value);
  for (const viewer of state.viewers) sendJson(viewer, value);
};

const findDefinition = async (key: string): Promise<CameraDefinition | null> => {
  const managed = await Camera.findOne({
    code: key,
    source_type: 'phone',
    is_enabled: true,
  }).select('name product');
  if (managed) {
    return {
      cameraName: managed.name,
      productId: managed.product?.toString(),
    };
  }

  const product = await Product.findOne({
    live_cameras: {
      $elemMatch: {
        stream_url: `${PHONE_PREFIX}${key}`,
        is_active: true,
      },
    },
  }).select('live_cameras');
  if (!product) return null;
  const camera = product.live_cameras.find(
    (item) =>
      item.is_active !== false &&
      item.stream_url.trim().toUpperCase() === `${PHONE_PREFIX}${key}`.toUpperCase()
  );
  return camera ? { cameraName: camera.name, productId: product._id.toString() } : null;
};

const getOrCreateState = async (key: string) => {
  const existing = states.get(key);
  if (existing) return existing;
  const definition = await findDefinition(key);
  if (!definition) throw new Error('Camera code không tồn tại hoặc đã bị tắt/xóa');
  const state: CameraState = { key, ...definition, viewers: new Set() };
  states.set(key, state);
  return state;
};

const publishFrame = (state: CameraState, raw: RawData) => {
  const frame = Buffer.isBuffer(raw)
    ? raw
    : Array.isArray(raw)
      ? Buffer.concat(raw)
      : Buffer.from(raw as ArrayBuffer);
  if (!frame.length || frame.length > env.LIVE_DISEASE_MAX_FRAME_BYTES) {
    sendJson(state.publisher, { type: 'error', message: 'Frame không hợp lệ hoặc vượt quá giới hạn' });
    return;
  }
  state.latestFrame = frame;
  for (const viewer of state.viewers) {
    if (viewer.readyState === WebSocket.OPEN) viewer.send(frame, { binary: true });
  }
  void Camera.updateOne(
    { code: state.key, source_type: 'phone' },
    { $set: { last_seen: new Date(), last_error: '' } }
  ).exec().catch(() => undefined);
};

export const getLatestPhoneCameraFrame = (key: string) => {
  const frame = states.get(normalizeKey(key))?.latestFrame;
  return frame ? Buffer.from(frame) : undefined;
};

export const attachPhoneCameraWebSocket = (server: HttpServer) => {
  const webSocketServer = new WebSocketServer({
    noServer: true,
    maxPayload: env.LIVE_DISEASE_MAX_FRAME_BYTES,
  });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '/', 'http://localhost');
    if (url.pathname !== PATHNAME) return;
    const mode = url.searchParams.get('mode');
    const key = normalizeKey(url.searchParams.get('key'));
    if (!key || (mode !== 'publish' && mode !== 'view')) {
      socket.write('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }

    getOrCreateState(key)
      .then((state) => {
        webSocketServer.handleUpgrade(request, socket, head, (webSocket) => {
          if (mode === 'publish') {
            state.publisher?.close(4001, 'Camera replaced by another publisher');
            state.publisher = webSocket;
            sendJson(webSocket, {
              type: 'paired',
              key,
              productId: state.productId,
              cameraName: state.cameraName,
            });
            webSocket.on('message', (data, isBinary) => {
              if (isBinary) publishFrame(state, data);
            });
            webSocket.on('close', () => {
              if (state.publisher === webSocket) state.publisher = undefined;
              broadcastJson(state, { type: 'camera_offline', key });
            });
            broadcastJson(state, { type: 'camera_online', key });
            return;
          }

          state.viewers.add(webSocket);
          sendJson(webSocket, {
            type: state.publisher ? 'camera_online' : 'camera_offline',
            key,
            cameraName: state.cameraName,
          });
          if (state.latestFrame) webSocket.send(state.latestFrame, { binary: true });
          webSocket.on('close', () => state.viewers.delete(webSocket));
        });
      })
      .catch(() => {
        socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
        socket.destroy();
      });
  });

  const timer = setInterval(() => {
    for (const [key, state] of states) {
      if (!state.publisher && state.viewers.size === 0) {
        states.delete(key);
        continue;
      }
      void findDefinition(key).then((definition) => {
        if (definition) return;
        state.publisher?.close(4004, 'Camera removed');
        for (const viewer of state.viewers) viewer.close(4004, 'Camera removed');
        states.delete(key);
      });
    }
  }, 10_000);
  timer.unref();

  return webSocketServer;
};
