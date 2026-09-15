import Product, { ILiveCamera } from '../models/Product';
import TraceEvent from '../models/TraceEvent';
import FarmingArea from '../models/FarmingArea';
import InventoryTransaction from '../models/InventoryTransaction';
import QualityInspection from '../models/QualityInspection';
import DiseaseDetection from '../models/DiseaseDetection';
import SupplyChainRecord from '../models/SupplyChainRecord';
import env from '../config/env';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../utils/errors';
import generateQR from '../utils/qrcode';
import { createBatchOnChain } from './blockchain';
import { notifyProductStatusChanged } from './notification.service';

const isBlockchainConfigured = () =>
  !!(env.CONTRACT_ADDRESS && env.BLOCKCHAIN_PRIVATE_KEY);

const activeProductQuery = { isDeleted: { $ne: true } };
const PRODUCT_STATUSES = ['draft', 'active', 'completed', 'recalled'] as const;
type ProductStatus = (typeof PRODUCT_STATUSES)[number];

const statusLabels: Record<ProductStatus, string> = {
  draft: 'Bản nháp',
  active: 'Đang theo dõi',
  completed: 'Hoàn tất',
  recalled: 'Thu hồi',
};

const allowedStatusTransitions: Record<ProductStatus, ProductStatus[]> = {
  draft: ['active', 'recalled'],
  active: ['completed', 'recalled'],
  completed: [],
  recalled: [],
};

const privilegedStatusTransitions: Record<ProductStatus, ProductStatus[]> = {
  draft: ['active', 'recalled'],
  active: ['completed', 'recalled'],
  completed: ['active'],
  recalled: [],
};

const isProductStatus = (value: unknown): value is ProductStatus =>
  typeof value === 'string' && PRODUCT_STATUSES.includes(value as ProductStatus);

const makeBatchPrefix = (value: string) => {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  return (normalized || 'LO').slice(0, 4).padEnd(4, 'X');
};

const generateBatchCode = async (name: string, category: string) => {
  const year = new Date().getFullYear();
  const prefix = makeBatchPrefix(category || name);
  const pattern = new RegExp(`^${prefix}-${year}-`);
  const count = await Product.countDocuments({ batch_code: pattern });
  return `${prefix}-${year}-${(count + 1).toString().padStart(4, '0')}`;
};

const assertFarmingAreaAccess = async (
  farmingAreaId: string | undefined,
  userId: string,
  userRole: string
) => {
  if (!farmingAreaId) return null;

  const farmingArea = await FarmingArea.findById(farmingAreaId);
  if (!farmingArea) {
    throw new NotFoundError(`Không tìm thấy vùng trồng ${farmingAreaId}`);
  }

  if (userRole === 'farmer' && farmingArea.owner.toString() !== userId) {
    throw new UnauthorizedError('Bạn chỉ được gắn lô vào vùng trồng của mình');
  }

  return farmingArea;
};

const pickProductUpdate = (
  data: Partial<{
    name: string;
    category: string;
    type: 'Plant' | 'Animal';
    description: string;
    origin: string;
    cultivation_time: string;
    farming_area: string;
    images: { path: string; filename: string }[];
    live_cameras: ILiveCamera[];
  }>
) => {
  const allowed: Record<string, unknown> = {};
  const keys = [
    'name',
    'category',
    'type',
    'description',
    'origin',
    'cultivation_time',
    'farming_area',
    'images',
    'live_cameras',
  ] as const;

  for (const key of keys) {
    if (key in data) allowed[key] = data[key];
  }

  return allowed;
};

export const getAllProducts = async () => {
  return Product.find(activeProductQuery)
    .populate('created_by', 'first_name last_name email')
    .populate({
      path: 'farming_area',
      select: 'name address area_size coordinates',
      populate: {
        path: 'certifications',
        select: 'name type certificate_number status expiry_date issuing_authority'
      }
    });
};

export const getProductsForUser = async (userId: string, userRole: string) => {
  const query =
    userRole === 'farmer'
      ? { ...activeProductQuery, created_by: userId }
      : activeProductQuery;
  const products = await Product.find(query)
    .populate('created_by', 'first_name last_name email')
    .populate('farming_area', 'name address area_size')
    .lean();

  const productIds = products.map((product) => product._id);
  const events = await TraceEvent.find({ product: { $in: productIds } })
    .select(
      'product eventType description details images videos dataHash txHash blockNumber actionIndex recorded_by onChainStatus createdAt'
    )
    .populate('recorded_by', 'first_name last_name')
    .sort({ createdAt: 1 })
    .lean();

  const eventsByProduct = new Map<string, typeof events>();
  for (const event of events) {
    const productId = event.product.toString();
    const current = eventsByProduct.get(productId) || [];
    current.push(event);
    eventsByProduct.set(productId, current);
  }

  return products.map((product) => ({
    ...product,
    events: eventsByProduct.get(product._id.toString()) || [],
  }));
};

export const getProductById = async (productId: string) => {
  const product = await Product.findOne({ _id: productId, ...activeProductQuery })
    .populate('created_by', 'first_name last_name email')
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

  return product;
};

export const getDeletedProducts = async () => {
  return Product.find({ isDeleted: true })
    .populate('created_by', 'first_name last_name email')
    .populate('deleted_by', 'first_name last_name email')
    .populate('farming_area', 'name address area_size')
    .sort({ deletedAt: -1, updatedAt: -1 });
};

export const createProduct = async (
  data: {
    name: string;
    category: string;
    type: 'Plant' | 'Animal';
    description: string;
    origin?: string;
    cultivation_time?: string;
    initial_quantity?: number;
    current_quantity?: number;
    unit?: string;
    images?: { path: string; filename: string }[];
    live_cameras?: ILiveCamera[];
    farming_area?: string;
  },
  userId: string,
  userRole: string
) => {
  if (!data.name || !data.category || !data.type || !data.description) {
    throw new BadRequestError('Vui lòng điền đầy đủ thông tin sản phẩm');
  }
  if (!data.farming_area) {
    throw new BadRequestError('Vui lòng chọn vùng trồng từ danh sách có sẵn');
  }

  const farmingArea = await assertFarmingAreaAccess(
    data.farming_area,
    userId,
    userRole
  );
  if (!farmingArea) {
    throw new BadRequestError('Vui lòng chọn vùng trồng từ danh sách có sẵn');
  }

  const origin = farmingArea.address;

  const initialQuantity = Number(data.initial_quantity ?? data.current_quantity ?? 0);
  if (!Number.isFinite(initialQuantity) || initialQuantity < 0) {
    throw new BadRequestError('Số lượng ban đầu không hợp lệ');
  }
  const currentQuantity = Number(data.current_quantity ?? initialQuantity);
  if (!Number.isFinite(currentQuantity) || currentQuantity < 0) {
    throw new BadRequestError('Số lượng tồn không hợp lệ');
  }

  const batchCode = await generateBatchCode(data.name, data.category);

  const product = await Product.create({ 
    ...data, 
    batch_code: batchCode,
    origin: origin || 'Việt Nam',
    initial_quantity: initialQuantity,
    current_quantity: currentQuantity,
    unit: data.unit?.trim() || 'kg',
    created_by: userId 
  });
  const batchId = product._id.toString();
  let batchTxHash = '';

  if (isBlockchainConfigured()) {
    try {
      const result = await createBatchOnChain(batchId);
      batchTxHash = result.txHash;
      product.onChainBatchId = batchId;
      product.batchTxHash = result.txHash;
      product.status = 'active';
    } catch (error: any) {
      console.error('Blockchain createBatch failed:', error.message);
    }
  }

  const traceUrl = `${env.FRONTEND_URL || 'http://localhost:3000'}/trace/${batchId}`;
  const qrcode = await generateQR(traceUrl);

  product.qrcode = qrcode;
  await product.save();

  if (currentQuantity > 0) {
    await InventoryTransaction.create({
      product: product._id,
      type: 'INITIAL',
      quantity: currentQuantity,
      unit: product.unit || 'kg',
      balance_before: 0,
      balance_after: currentQuantity,
      note: 'Tạo lô ban đầu',
      created_by: userId,
    });
  }

  // Populate farming_area for response
  await product.populate({
    path: 'farming_area',
    select: 'name address area_size',
    populate: {
      path: 'certifications',
      select: 'name type certificate_number status'
    }
  });

  return { product, batchId, batchTxHash };
};

export const updateProduct = async (
  productId: string,
  data: Partial<{
    name: string;
    category: string;
    type: 'Plant' | 'Animal';
    description: string;
    origin: string;
    cultivation_time: string;
    initial_quantity: number;
    current_quantity: number;
    unit: string;
    status: string;
    farming_area: string;
    images: { path: string; filename: string }[];
    live_cameras: ILiveCamera[];
  }>,
  userId: string,
  userRole: string
) => {
  // Get the current product to check for status change
  const currentProduct = await Product.findOne({ _id: productId, ...activeProductQuery });
  if (!currentProduct) {
    throw new NotFoundError(`Không tìm thấy sản phẩm ${productId}`);
  }

  if (userRole === 'farmer' && currentProduct.created_by.toString() !== userId) {
    throw new UnauthorizedError('Bạn chỉ được chỉnh sửa lô do mình quản lý');
  }

  const farmingArea = await assertFarmingAreaAccess(data.farming_area, userId, userRole);

  if (
    'initial_quantity' in data ||
    'current_quantity' in data ||
    'unit' in data
  ) {
    throw new BadRequestError(
      'Vui lòng cập nhật số lượng qua chức năng tồn kho để hệ thống ghi nhận lịch sử'
    );
  }

  if ('status' in data) {
    throw new BadRequestError(
      'Vui lòng dùng chức năng chuyển trạng thái để hệ thống ghi nhận lý do và lịch sử'
    );
  }
  
  const safeData = pickProductUpdate(data);
  if (farmingArea) {
    safeData.origin = farmingArea.address;
  }
  const product = await Product.findOneAndUpdate({ _id: productId, ...activeProductQuery }, safeData, {
    new: true,
    runValidators: true,
  });

  if (!product) {
    throw new NotFoundError(`Không tìm thấy sản phẩm ${productId}`);
  }

  return product;
};

export const updateProductStatus = async (
  productId: string,
  data: {
    status?: string;
    reason?: string;
    note?: string;
  },
  userId: string,
  userRole: string
) => {
  const product = await Product.findOne({ _id: productId, ...activeProductQuery });
  if (!product) {
    throw new NotFoundError(`Không tìm thấy sản phẩm ${productId}`);
  }

  if (userRole === 'farmer' && product.created_by.toString() !== userId) {
    throw new UnauthorizedError('Bạn chỉ được đổi trạng thái lô do mình quản lý');
  }

  if (!isProductStatus(data.status)) {
    throw new BadRequestError('Trạng thái lô không hợp lệ');
  }

  const nextStatus = data.status;
  const currentStatus = product.status as ProductStatus;
  if (nextStatus === currentStatus) {
    throw new BadRequestError('Lô đã ở trạng thái này');
  }

  const isPrivileged = ['admin', 'manager'].includes(userRole);
  const transitions = isPrivileged
    ? privilegedStatusTransitions[currentStatus]
    : allowedStatusTransitions[currentStatus];
  if (!transitions.includes(nextStatus)) {
    throw new BadRequestError(
      `Không thể chuyển trạng thái từ "${statusLabels[currentStatus]}" sang "${statusLabels[nextStatus]}"`
    );
  }

  const reason = data.reason?.trim() || '';
  const note = data.note?.trim() || '';
  if (!reason) {
    throw new BadRequestError('Vui lòng nhập lý do chuyển trạng thái');
  }
  if (nextStatus === 'recalled' && reason.length < 10) {
    throw new BadRequestError('Lý do thu hồi cần rõ ràng hơn');
  }

  product.status = nextStatus;
  await product.save();

  await TraceEvent.create({
    product: product._id,
    batchId: product._id.toString(),
    eventType: 'STATUS_UPDATE',
    description: `Chuyển trạng thái từ "${statusLabels[currentStatus]}" sang "${statusLabels[nextStatus]}": ${reason}`,
    details: {
      oldStatus: currentStatus,
      newStatus: nextStatus,
      reason,
      note,
    },
    images: [],
    videos: [],
    recorded_by: userId,
    onChainStatus: 'skipped',
    dataHashVersion: 'v2',
  });

  notifyProductStatusChanged(
    product.created_by.toString(),
    product.name,
    currentStatus,
    nextStatus,
    productId
  ).catch((err) => {
    console.error('Failed to send product status notification:', err.message);
  });

  return product.populate('farming_area', 'name address area_size');
};

export const updateProductCameras = async (
  productId: string,
  liveCameras: ILiveCamera[],
  userId: string,
  userRole: string
) => {
  const product = await Product.findOne({ _id: productId, ...activeProductQuery });
  if (!product) {
    throw new NotFoundError(`Không tìm thấy sản phẩm ${productId}`);
  }

  if (userRole === 'farmer' && product.created_by.toString() !== userId) {
    throw new UnauthorizedError('Bạn không có quyền quản lý camera của lô này');
  }

  const invalid = liveCameras.find(
    (camera) => !camera.name?.trim() || !camera.stream_url?.trim()
  );
  if (invalid) {
    throw new BadRequestError('Mỗi camera cần có tên và URL live stream');
  }

  product.live_cameras = liveCameras.map((camera) => ({
    name: camera.name.trim(),
    stream_url: camera.stream_url.trim(),
    location: camera.location?.trim() || '',
    is_active: camera.is_active !== false,
    thumbnail: camera.thumbnail,
  }));

  await product.save();
  return product;
};

export const deleteProduct = async (productId: string, userId: string) => {
  const product = await Product.findOneAndUpdate(
    { _id: productId, ...activeProductQuery },
    {
      $set: {
        isDeleted: true,
        deletedAt: new Date(),
        deleted_by: userId,
        status: 'completed',
      },
    },
    { new: true }
  );

  if (!product) {
    throw new NotFoundError(`Kh?ng t?m th?y s?n ph?m ${productId}`);
  }

  return product;
};

export const restoreProduct = async (productId: string) => {
  const product = await Product.findOneAndUpdate(
    { _id: productId, isDeleted: true },
    {
      $set: { isDeleted: false },
      $unset: { deletedAt: 1, deleted_by: 1 },
    },
    { new: true, runValidators: true }
  )
    .populate('created_by', 'first_name last_name email')
    .populate('farming_area', 'name address area_size');

  if (!product) {
    throw new NotFoundError(`Không tìm thấy lô đã lưu trữ ${productId}`);
  }

  return product;
};

export const permanentlyDeleteProduct = async (productId: string) => {
  const product = await Product.findOne({ _id: productId, isDeleted: true });
  if (!product) {
    throw new NotFoundError(`Không tìm thấy lô đã lưu trữ ${productId}`);
  }

  const [
    traceEventCount,
    qualityInspectionCount,
    diseaseDetectionCount,
    supplyChainRecordCount,
    inventoryTransactionCount,
  ] = await Promise.all([
    TraceEvent.countDocuments({ product: productId }),
    QualityInspection.countDocuments({ product: productId }),
    DiseaseDetection.countDocuments({ product: productId }),
    SupplyChainRecord.countDocuments({
      $or: [{ product: productId }, { related_products: productId }],
    }),
    InventoryTransaction.countDocuments({
      $or: [{ product: productId }, { related_products: productId }],
    }),
  ]);

  const totalRelated =
    traceEventCount +
    qualityInspectionCount +
    diseaseDetectionCount +
    supplyChainRecordCount +
    inventoryTransactionCount;

  if (totalRelated > 0 || product.onChainBatchId) {
    throw new BadRequestError(
      'Không thể xóa vĩnh viễn lô đã có lịch sử truy xuất, tồn kho, kiểm nghiệm, nhận diện bệnh, chuỗi cung ứng hoặc dữ liệu blockchain. Hãy giữ ở thùng rác để bảo toàn hồ sơ.'
    );
  }

  await Product.deleteOne({ _id: productId, isDeleted: true });
  return product;
};
