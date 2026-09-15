import TraceEvent, { ActionType } from '../models/TraceEvent';
import Product from '../models/Product';
import {
  BadRequestError,
  NotFoundError,
  ServiceUnavailableError,
  UnauthorizedError,
} from '../utils/errors';
import {
  getBatchHistoryFromChain,
  recordActionOnChain,
  verifyActionOnChain,
  hashEventData,
  createBatchOnChain,
  batchExistsOnChain,
<<<<<<< HEAD
  assertContractDeployed,
} from './blockchain.service';
=======
} from './blockchain';
>>>>>>> dan/main
import { notifyTraceEventAdded } from './notification.service';
import env from '../config/env';
import QualityInspection from '../models/QualityInspection';
import SupplyChainRecord from '../models/SupplyChainRecord';

const isBlockchainConfigured = () =>
  !!(env.CONTRACT_ADDRESS && env.BLOCKCHAIN_PRIVATE_KEY);

<<<<<<< HEAD
const blockchainErrorMessage = (error: any): string => {
  const rawMessage = String(
    error?.shortMessage || error?.reason || error?.message || 'Lỗi blockchain không xác định'
  );
  const normalized = rawMessage.toLowerCase();
=======
const BLOCKCHAIN_READ_TIMEOUT_MS = 2500;

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number) =>
  Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);

const normalizeImages = (
  images?: Array<string | { path?: string; filename?: string }>
) => {
  if (!Array.isArray(images)) return [];
>>>>>>> dan/main

  if (
    error?.code === 'ECONNREFUSED' ||
    normalized.includes('econnrefused') ||
    normalized.includes('failed to detect network') ||
    normalized.includes('could not coalesce error')
  ) {
    return `Không kết nối được node blockchain tại ${env.BLOCKCHAIN_RPC_URL}. Hãy khởi động Hardhat node trước khi ghi lại.`;
  }

  if (
    normalized.includes('could not decode result data') ||
    normalized.includes('contract runner does not support') ||
    normalized.includes('no data present')
  ) {
    return 'Không tìm thấy smart contract tại địa chỉ đã cấu hình. Hãy deploy lại contract và cập nhật CONTRACT_ADDRESS.';
  }

  if (normalized.includes('insufficient funds')) {
    return 'Ví ghi blockchain không đủ phí giao dịch.';
  }

  return rawMessage;
};

const isBlockchainUnavailable = (error: any) => {
  const message = String(error?.message || '').toLowerCase();
  return (
    error?.code === 'ECONNREFUSED' ||
    message.includes('econnrefused') ||
    message.includes('failed to detect network') ||
    message.includes('could not decode result data')
  );
};

const buildCoreData = (event: {
  batchId: string;
  eventType: ActionType;
  description: string;
  details?: Record<string, unknown>;
  recorded_by: { toString(): string };
}): Record<string, unknown> => ({
  batchId: event.batchId,
  eventType: event.eventType,
  description: event.description,
  details: event.details || {},
  recordedBy: event.recorded_by.toString(),
});

const assertCanManageProduct = (
  productOwnerId: string,
  userId: string,
  userRole: string
) => {
  if (userRole === 'farmer' && productOwnerId !== userId) {
    throw new UnauthorizedError(
      'Bạn chỉ được ghi nhật ký cho lô nông sản do mình quản lý'
    );
  }
};

const normalizeMedia = (
  files?: Array<
    string | { path?: string; filename?: string; mimeType?: string }
  >
) => {
  if (!Array.isArray(files)) return [];

  return files
    .map((file) => {
      if (typeof file === 'string') {
        const normalizedPath = file.trim();
        if (!normalizedPath) return null;

        const parts = normalizedPath.split(/[\/]/);
        return {
          path: normalizedPath,
          filename: parts[parts.length - 1] || 'image',
          mimeType: undefined,
        };
      }

      if (file && typeof file === 'object') {
        const normalizedPath = file.path?.trim();
        if (!normalizedPath) return null;

        return {
          path: normalizedPath,
          filename:
            file.filename?.trim() ||
            normalizedPath.split(/[\/]/).pop() ||
            'file',
          mimeType: file.mimeType?.trim() || undefined,
        };
      }

      return null;
    })
    .filter(
      (
        file
      ): file is { path: string; filename: string; mimeType: string | undefined } =>
        Boolean(file)
    );
};

export const createTraceEvent = async (
  data: {
    product: string;
    eventType: ActionType;
    description: string;
    details?: Record<string, unknown>;
    images?: { path: string; filename: string }[];
    videos?: { path: string; filename: string; mimeType?: string }[];
  },
  userId: string,
  userRole: string
) => {
  const {
    product: productId,
    eventType,
    description,
    details,
    images,
    videos,
  } = data;
  const product = await Product.findOne({ _id: productId, isDeleted: { $ne: true } });

  if (!product) {
    throw new NotFoundError(`Kh?ng t?m th?y s?n ph?m ${productId}`);
  }

  assertCanManageProduct(product.created_by.toString(), userId, userRole);

  if (eventType === 'STATUS_UPDATE') {
    throw new BadRequestError(
      'Vui lòng dùng chức năng chuyển trạng thái lô để ghi nhận sự kiện này.'
    );
  }

  if (product.status === 'completed') {
    throw new BadRequestError(
      'Lô nông sản đã hoàn thành, không thể thêm nhật ký mới. Vui lòng chuyển trạng thái lô về đang theo dõi nếu cần bổ sung hồ sơ.'
    );
  }

  const batchId = product._id.toString();
  const normalizedImages = normalizeMedia(images);
  const normalizedVideos = normalizeMedia(videos);

  // Hash only core fields. Images stay off-chain.
  const coreData = buildCoreData({
    batchId,
    eventType,
    description,
    details: details || {},
    recorded_by: { toString: () => userId },
  });

  const traceEvent = await TraceEvent.create({
    product: productId,
    batchId,
    eventType,
    description,
    details: details || {},
    images: normalizedImages,
    videos: normalizedVideos,
    recorded_by: userId,
    onChainStatus: 'pending',
    dataHashVersion: 'v2',
  });

  // Notify product owner about the new trace event (if different from current user)
  const productOwnerId = product.created_by.toString();
  if (productOwnerId !== userId) {
    notifyTraceEventAdded(productOwnerId, product.name, eventType, productId).catch((err) => {
      console.error('Failed to send trace event notification:', err.message);
    });
  }

  if (!isBlockchainConfigured()) {
    traceEvent.onChainStatus = 'skipped';
    traceEvent.dataHash = hashEventData(coreData);
    await traceEvent.save();

    return {
      traceEvent,
      blockchain: null,
      warning: 'Blockchain ch?a ???c c?u h?nh. D? li?u ?? l?u off-chain v?i hash c?c b?.',
    };
  }

  try {
    await assertContractDeployed();
    const existsOnChain = await batchExistsOnChain(batchId);
    if (!existsOnChain) {
      await createBatchOnChain(batchId);
    }

    const chainResult = await recordActionOnChain(batchId, coreData, eventType);

    traceEvent.dataHash = chainResult.dataHash;
    traceEvent.txHash = chainResult.txHash;
    traceEvent.blockNumber = chainResult.blockNumber;
    traceEvent.actionIndex = chainResult.actionIndex;
    traceEvent.onChainStatus = 'confirmed';
    await traceEvent.save();

    return {
      traceEvent,
      blockchain: {
        txHash: chainResult.txHash,
        blockNumber: chainResult.blockNumber,
        dataHash: chainResult.dataHash,
        actionIndex: chainResult.actionIndex,
      },
    };
  } catch (error: any) {
    traceEvent.onChainStatus = 'failed';
    traceEvent.dataHash = hashEventData(coreData);
    await traceEvent.save();

    console.error('Blockchain recordAction failed:', error.message);

    return {
      traceEvent,
      blockchain: null,
      warning: 'Ghi blockchain th?t b?i, d? li?u ?? l?u off-chain.',
    };
  }
};

export const getEventsByProduct = async (productId: string) => {
  const product = await Product.findOne({ _id: productId, isDeleted: { $ne: true } });
  if (!product) {
    throw new NotFoundError(`Kh?ng t?m th?y s?n ph?m ${productId}`);
  }

  return TraceEvent.find({ product: productId })
    .populate('recorded_by', 'first_name last_name email')
    .sort({ createdAt: 1 });
};

export const getFullTrace = async (productId: string) => {
  const product = await Product.findOne({ _id: productId, isDeleted: { $ne: true } })
    .populate('created_by', 'first_name last_name')
    .populate({
      path: 'farming_area',
      select: 'name address area_size coordinates owner',
      populate: [
        {
          path: 'certifications',
          select: 'name type certificate_number status expiry_date issuing_authority scope'
        },
        {
          path: 'owner',
          select: 'first_name last_name email'
        }
      ]
    });

  if (!product) {
    throw new NotFoundError(`Không tìm thấy sản phẩm ${productId}`);
  }

  const [events, qualityInspections, supplyChainRecords] = await Promise.all([
    TraceEvent.find({ product: productId })
      .populate('recorded_by', 'first_name last_name')
      .sort({ createdAt: 1 }),
    QualityInspection.find({ product: productId })
      .populate('created_by', 'first_name last_name')
      .sort({ sample_date: -1 }),
    SupplyChainRecord.find({
      $or: [{ product: productId }, { related_products: productId }],
    })
      .populate('product', 'name category origin')
      .populate('related_products', 'name category origin')
      .populate('from_organization', 'name type address')
      .populate('to_organization', 'name type address')
      .sort({ occurred_at: 1 }),
  ]);

  let onChain = null;
  try {
    onChain = await withTimeout(
      getBatchHistoryFromChain(product._id.toString()),
      BLOCKCHAIN_READ_TIMEOUT_MS
    );
  } catch (error: any) {
    console.error('Blockchain getHistory failed:', error.message);
  }

  return { product, events, qualityInspections, supplyChainRecords, onChain };
};

export const verifyTraceEvent = async (eventId: string) => {
  const event = await TraceEvent.findById(eventId);
  if (!event) {
    throw new NotFoundError(`Kh?ng t?m th?y s? ki?n ${eventId}`);
  }

  if (event.onChainStatus !== 'confirmed' || event.actionIndex === undefined) {
    return {
      verified: false,
      reason: 'S? ki?n ch?a ???c ghi l?n blockchain',
      event,
    };
  }

  const coreData = buildCoreData(event);

  try {
    const { verified, dataHash, dataHashVersion } = await verifyActionOnChain(
      event.batchId,
      event.actionIndex,
      coreData,
      event.dataHashVersion || 'v1'
    );

    return {
      verified,
      dataHash,
      dataHashVersion,
      txHash: event.txHash,
      blockNumber: event.blockNumber,
      event,
    };
  } catch (error: any) {
    return {
      verified: false,
      reason: `L?i khi ki?m tra blockchain: ${error.message}`,
      event,
    };
  }
};

export const retryTraceEvent = async (
  eventId: string,
  userId: string,
  userRole: string
) => {
  if (!isBlockchainConfigured()) {
    throw new BadRequestError('Blockchain chưa được cấu hình');
  }

  const event = await TraceEvent.findById(eventId);
  if (!event) {
    throw new NotFoundError(`Không tìm thấy sự kiện ${eventId}`);
  }

  const product = await Product.findOne({ _id: event.product, isDeleted: { $ne: true } });
  if (!product) {
    throw new NotFoundError(`Không tìm thấy lô của sự kiện ${eventId}`);
  }

  assertCanManageProduct(product.created_by.toString(), userId, userRole);

  if (!['failed', 'skipped'].includes(event.onChainStatus)) {
    throw new BadRequestError(
      'Chỉ có thể ghi lại sự kiện đang ở trạng thái failed hoặc skipped'
    );
  }

  const lockedEvent = await TraceEvent.findOneAndUpdate(
    { _id: eventId, onChainStatus: { $in: ['failed', 'skipped'] } },
    { onChainStatus: 'pending' },
    { new: true }
  );

  if (!lockedEvent) {
    throw new BadRequestError('Sự kiện đang được xử lý bởi một yêu cầu khác');
  }

  const coreData = buildCoreData(lockedEvent);

  try {
    if (lockedEvent.eventType === 'STATUS_UPDATE') {
      throw new BadRequestError(
        'Sự kiện chuyển trạng thái chỉ lưu off-chain; smart contract hiện tại không hỗ trợ ghi loại sự kiện này.'
      );
    }

    await assertContractDeployed();
    const existsOnChain = await batchExistsOnChain(lockedEvent.batchId);
    if (!existsOnChain) {
      await createBatchOnChain(lockedEvent.batchId);
    }

    const chainResult = await recordActionOnChain(
      lockedEvent.batchId,
      coreData,
      lockedEvent.eventType
    );

    lockedEvent.dataHash = chainResult.dataHash;
    lockedEvent.dataHashVersion = 'v2';
    lockedEvent.txHash = chainResult.txHash;
    lockedEvent.blockNumber = chainResult.blockNumber;
    lockedEvent.actionIndex = chainResult.actionIndex;
    lockedEvent.onChainStatus = 'confirmed';
    await lockedEvent.save();

    return lockedEvent;
  } catch (error: any) {
    lockedEvent.onChainStatus = 'failed';
    lockedEvent.dataHash = hashEventData(coreData);
    await lockedEvent.save();
    const message = blockchainErrorMessage(error);
    if (isBlockchainUnavailable(error)) {
      throw new ServiceUnavailableError(message);
    }
    throw new BadRequestError(`Ghi lại blockchain thất bại: ${message}`);
  }
};
