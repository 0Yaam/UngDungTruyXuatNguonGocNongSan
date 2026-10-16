import type { Server as HttpServer, IncomingMessage } from 'http';
import { randomUUID } from 'crypto';
import { WebSocket, WebSocketServer, type RawData } from 'ws';
import env from '../config/env';
import User from '../models/User';
import Product from '../models/Product';
import DiseaseDetection, {
  type IDiseaseCandidate,
} from '../models/DiseaseDetection';
import { verifyJWT } from '../utils/jwt';
import {
  inferPlantDisease,
  resolveSupportedCrop,
  type PlantDiseaseInferenceResult,
} from './plantDiseaseInference.service';

type ClientMessage =
  | {
      type: 'start';
      product: string;
      sessionId?: string;
      device?: {
        id?: string;
        name?: string;
        platform?: string;
        appVersion?: string;
      };
    }
  | { type: 'frame'; frameId?: string; image: string };

interface AuthenticatedUser {
  userId: string;
  role: string;
}

interface QueuedFrame {
  frameId: string;
  image: Buffer;
}

interface SessionState {
  socket: WebSocket;
  user: AuthenticatedUser;
  sessionId: string;
  productId?: string;
  crop?: Awaited<ReturnType<typeof resolveSupportedCrop>>;
  device?: {
    id?: string;
    name?: string;
    platform?: string;
    appVersion?: string;
  };
  processing: boolean;
  queued?: QueuedFrame;
  recent: PlantDiseaseInferenceResult[];
  lastPersisted: Map<string, number>;
  closed: boolean;
}

const INTERNAL_ROLES = new Set(['admin', 'manager', 'farmer']);
const DATA_URL = /^data:image\/(?:jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\r\n]+)$/;
let activeInferenceCount = 0;
const readySessions: SessionState[] = [];

const send = (socket: WebSocket, message: unknown) => {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
};

const parseToken = (request: IncomingMessage): string | null => {
  const authorization = request.headers.authorization;
  if (authorization?.startsWith('Bearer ')) return authorization.slice(7);
  const protocol = request.headers['sec-websocket-protocol'];
  const protocols = Array.isArray(protocol) ? protocol : protocol?.split(',');
  const bearer = protocols?.map((value) => value.trim()).find((value) => value.startsWith('bearer.'));
  if (bearer) return bearer.slice(7);
  const url = new URL(request.url || '/', 'http://localhost');
  return url.searchParams.get('token');
};

export const decodeLiveImage = (image: string): Buffer => {
  if (typeof image !== 'string') throw new Error('image must be a base64 data URL');
  const match = DATA_URL.exec(image);
  if (!match) throw new Error('Only JPEG, PNG, or WebP data URLs are accepted');
  const buffer = Buffer.from(match[1], 'base64');
  if (!buffer.length) throw new Error('Image frame is empty');
  if (buffer.length > env.LIVE_DISEASE_MAX_FRAME_BYTES) {
    throw new Error(`Image frame exceeds ${env.LIVE_DISEASE_MAX_FRAME_BYTES} bytes`);
  }
  return buffer;
};

export const smoothLiveResults = (
  results: PlantDiseaseInferenceResult[]
): PlantDiseaseInferenceResult => {
  if (!results.length) throw new Error('At least one result is required');
  const latest = results[results.length - 1];
  const byCode = new Map<string, { candidate: IDiseaseCandidate; total: number }>();
  for (const result of results) {
    for (const candidate of result.candidates) {
      const current = byCode.get(candidate.disease_code);
      byCode.set(candidate.disease_code, {
        candidate,
        total: (current?.total || 0) + candidate.confidence,
      });
    }
  }
  const candidates = Array.from(byCode.values())
    .map(({ candidate, total }) => ({
      ...candidate,
      confidence: Number((total / results.length).toFixed(6)),
    }))
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 3);
  return { ...latest, candidates };
};

export const shouldPersistLiveEvent = (
  lastPersisted: Map<string, number>,
  disease: IDiseaseCandidate,
  now: number,
  cooldownMs: number
): boolean => {
  if (disease.is_healthy || disease.risk_level === 'low') return false;
  const previous = lastPersisted.get(disease.disease_code) || 0;
  if (now - previous < cooldownMs) return false;
  lastPersisted.set(disease.disease_code, now);
  return true;
};

const authenticate = async (request: IncomingMessage): Promise<AuthenticatedUser> => {
  const token = parseToken(request);
  if (!token) throw new Error('Authentication token is required');
  const payload = verifyJWT(token);
  if (!payload?.userId || !INTERNAL_ROLES.has(payload.role)) throw new Error('Forbidden');
  const user = await User.findById(payload.userId).select('isActive').lean();
  if (!user || user.isActive === false) throw new Error('Account is unavailable');
  return { userId: payload.userId, role: payload.role };
};

const startSession = async (state: SessionState, message: Extract<ClientMessage, { type: 'start' }>) => {
  if (!message.product) throw new Error('product is required');
  const product = await Product.findOne({
    _id: message.product,
    isDeleted: { $ne: true },
  }).select('name category type created_by');
  if (!product) throw new Error('Product not found');
  if (product.type !== 'Plant') throw new Error('Live disease detection supports plant products only');
  if (state.user.role === 'farmer' && product.created_by.toString() !== state.user.userId) {
    throw new Error('Forbidden');
  }
  state.productId = product._id.toString();
  state.crop = await resolveSupportedCrop(product.name, product.category);
  state.sessionId = String(message.sessionId || state.sessionId).slice(0, 120);
  state.device = {
    id: message.device?.id?.slice(0, 120),
    name: message.device?.name?.slice(0, 120),
    platform: message.device?.platform?.slice(0, 60),
    appVersion: message.device?.appVersion?.slice(0, 60),
  };
  send(state.socket, { type: 'ready', sessionId: state.sessionId, crop: state.crop.code });
};

const persistDetection = async (
  state: SessionState,
  result: PlantDiseaseInferenceResult,
  frameId: string
) => {
  const top = result.candidates[0];
  const now = Date.now();
  if (!shouldPersistLiveEvent(state.lastPersisted, top, now, env.LIVE_DISEASE_EVENT_COOLDOWN_MS)) return false;
  await DiseaseDetection.create({
    product: state.productId,
    crop_name: result.crop.label,
    source: 'live',
    live_session: {
      session_id: state.sessionId,
      device_id: state.device?.id,
      device_name: state.device?.name,
      platform: state.device?.platform,
      app_version: state.device?.appVersion,
      frame_id: frameId,
    },
    symptoms: [],
    images: [],
    candidates: result.candidates,
    top_disease: top,
    overall_risk: top.risk_level,
    model_version: result.modelVersion,
    analysis_status: result.status,
    inference_engine: result.engine,
    warnings: result.warnings,
    detected_by: state.user.userId,
  });
  return true;
};

const schedule = (state: SessionState) => {
  if (state.closed || state.processing || !state.queued) return;
  if (!readySessions.includes(state)) readySessions.push(state);
  drainQueue();
};

const drainQueue = () => {
  while (activeInferenceCount < env.LIVE_DISEASE_MAX_CONNECTIONS && readySessions.length) {
    const state = readySessions.shift()!;
    if (state.closed || state.processing || !state.queued || !state.crop || !state.productId) continue;
    const frame = state.queued;
    state.queued = undefined;
    state.processing = true;
    activeInferenceCount += 1;
    inferPlantDisease([{ filename: `${frame.frameId}.jpg`, buffer: frame.image }], state.crop)
      .then(async (result) => {
        state.recent.push(result);
        state.recent.splice(0, Math.max(0, state.recent.length - env.LIVE_DISEASE_SMOOTHING_WINDOW));
        const smoothed = smoothLiveResults(state.recent);
        const persisted = await persistDetection(state, smoothed, frame.frameId);
        send(state.socket, {
          type: 'result',
          frameId: frame.frameId,
          sessionId: state.sessionId,
          candidates: smoothed.candidates,
          status: smoothed.status,
          warnings: smoothed.warnings,
          persisted,
        });
      })
      .catch((error) => send(state.socket, { type: 'error', frameId: frame.frameId, message: error.message }))
      .finally(() => {
        state.processing = false;
        activeInferenceCount -= 1;
        schedule(state);
        drainQueue();
      });
  }
};

const handleMessage = async (state: SessionState, raw: RawData) => {
  const message = JSON.parse(raw.toString()) as ClientMessage;
  if (message.type === 'start') {
    await startSession(state, message);
    return;
  }
  if (message.type !== 'frame' || !state.crop || !state.productId) throw new Error('Start session before sending frames');
  state.queued = {
    frameId: String(message.frameId || randomUUID()).slice(0, 120),
    image: decodeLiveImage(message.image),
  };
  schedule(state);
};

export const attachLiveDiseaseWebSocket = (server: HttpServer) => {
  const webSocketServer = new WebSocketServer({ noServer: true, maxPayload: env.LIVE_DISEASE_MAX_FRAME_BYTES * 2 });
  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url || '/', 'http://localhost').pathname;
    if (pathname !== env.LIVE_DISEASE_PATH) return;
    if (webSocketServer.clients.size >= env.LIVE_DISEASE_MAX_CONNECTIONS) {
      socket.write('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    authenticate(request)
      .then((user) => webSocketServer.handleUpgrade(request, socket, head, (ws) => {
        const state: SessionState = {
          socket: ws,
          user,
          sessionId: randomUUID(),
          processing: false,
          recent: [],
          lastPersisted: new Map(),
          closed: false,
        };
        ws.on('message', (raw) => handleMessage(state, raw).catch((error) => send(ws, { type: 'error', message: error.message })));
        ws.on('close', () => {
          state.closed = true;
          state.queued = undefined;
        });
        send(ws, { type: 'connected', sessionId: state.sessionId });
      }))
      .catch(() => {
        socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
        socket.destroy();
      });
  });
  return webSocketServer;
};
