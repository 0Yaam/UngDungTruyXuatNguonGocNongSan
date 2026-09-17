import Product from '../models/Product';
import DiseaseDetection, { DiseaseRiskLevel } from '../models/DiseaseDetection';
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  UnprocessableEntityError,
} from '../utils/errors';
import { removeStoredUploads } from '../utils/uploadFiles';
import {
  getPlantDiseaseCapabilities,
  inferPlantDisease,
  resolveSupportedCrop,
} from './plantDiseaseInference.service';

interface DetectionImage {
  path: string;
  filename: string;
  absolutePath: string;
}

const INTERNAL_ROLES = new Set(['admin', 'manager', 'farmer']);

const assertInternalAccess = (userRole?: string) => {
  if (!userRole || !INTERNAL_ROLES.has(userRole)) {
    throw new UnauthorizedError('Bạn không có quyền truy cập nhận diện bệnh');
  }
};

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export const getCapabilities = async (
  productId?: string,
  userId?: string,
  userRole?: string
) => {
  assertInternalAccess(userRole);
  const capabilities = await getPlantDiseaseCapabilities();
  let productCapability:
    | {
        _id: string;
        name: string;
        type: string;
        supported: boolean;
        cropCode?: string;
        reason?: string;
        detail?: string;
      }
    | undefined;

  if (productId) {
    const product = await Product.findOne({
      _id: productId,
      isDeleted: { $ne: true },
    }).select('name category type created_by');
    if (!product) throw new NotFoundError(`Không tìm thấy lô ${productId}`);
    if (
      userRole === 'farmer' &&
      product.created_by?.toString() !== userId
    ) {
      throw new UnauthorizedError('Bạn chỉ được phân tích lô do mình quản lý');
    }

    const matchedCrop = capabilities.supportedCrops.find((crop) => {
      const source = normalizeText(`${product.name} ${product.category}`);
      return crop.aliases.some((alias) =>
        source.includes(normalizeText(alias))
      );
    });
    const isPlant = product.type === 'Plant';
    const supported = capabilities.ready && isPlant && Boolean(matchedCrop);

    productCapability = {
      _id: product._id.toString(),
      name: product.name,
      type: product.type,
      supported,
      ...(matchedCrop ? { cropCode: matchedCrop.code } : {}),
      ...(!isPlant
        ? {
            reason: 'animal_product',
            detail: 'Nhận diện bệnh bằng ảnh hiện chỉ áp dụng cho cây trồng.',
          }
        : !capabilities.ready
          ? {
              reason: 'unsupported_crop',
              detail: 'Mô hình AI hiện chưa sẵn sàng.',
            }
          : !matchedCrop
            ? {
                reason: 'unsupported_crop',
                detail: 'Loại cây của lô này chưa được mô hình hỗ trợ.',
              }
            : {}),
    };
  }

  return {
    model: {
      ready: capabilities.ready,
      version: capabilities.version,
      inputSize: capabilities.input.width,
      inputWidth: capabilities.input.width,
      inputHeight: capabilities.input.height,
      maxImages: capabilities.input.maxImages,
      minConfidence: capabilities.thresholds.minConfidence,
    },
    supportedCrops: capabilities.supportedCrops,
    ...(productCapability ? { product: productCapability } : {}),
    capabilities,
  };
};

export const getDetections = async (
  filters: {
    product?: string;
    risk?: DiseaseRiskLevel;
  },
  userId: string,
  userRole: string
) => {
  assertInternalAccess(userRole);
  const query: Record<string, unknown> = {};
  if (filters.product) query.product = filters.product;
  if (filters.risk) query.overall_risk = filters.risk;

  if (userRole === 'farmer') {
    const ownedProductIds = await Product.find({
      created_by: userId,
      isDeleted: { $ne: true },
    }).distinct('_id');
    query.product = filters.product
      ? {
          $in: ownedProductIds.filter((id) => id.toString() === filters.product),
        }
      : { $in: ownedProductIds };
  }

  return DiseaseDetection.find(query)
    .populate('product', 'name category origin status created_by')
    .populate('detected_by', 'first_name last_name email')
    .sort({ createdAt: -1 });
};

export const getDetectionsByProduct = async (
  productId: string,
  userId: string,
  userRole: string
) => {
  assertInternalAccess(userRole);
  const product = await Product.findOne({
    _id: productId,
    isDeleted: { $ne: true },
  }).select('created_by');
  if (!product) throw new NotFoundError(`Không tìm thấy lô ${productId}`);
  if (userRole === 'farmer' && product.created_by.toString() !== userId) {
    throw new UnauthorizedError('Bạn chỉ được xem kết quả của lô mình quản lý');
  }

  return DiseaseDetection.find({ product: productId })
    .populate('detected_by', 'first_name last_name email')
    .sort({ createdAt: -1 });
};

export const createDetection = async (
  data: {
    product: string;
    symptoms?: string[];
    notes?: string;
    images?: DetectionImage[];
  },
  userId: string,
  userRole: string
) => {
  const product = await Product.findOne({
    _id: data.product,
    isDeleted: { $ne: true },
  }).select('name category type created_by');
  if (!product) throw new NotFoundError(`Không tìm thấy lô ${data.product}`);

  if (userRole === 'farmer' && product.created_by.toString() !== userId) {
    throw new UnauthorizedError('Bạn chỉ được nhận diện bệnh cho lô của mình');
  }

  if (product.type !== 'Plant') {
    throw new UnprocessableEntityError(
      'Nhận diện bệnh bằng ảnh chỉ áp dụng cho lô cây trồng',
      'UNSUPPORTED_CROP',
      { productType: product.type }
    );
  }

  const images = data.images || [];
  if (images.length < 1) {
    throw new BadRequestError(
      'Vui lòng tải ít nhất 1 ảnh cây trồng để nhận diện',
      'IMAGE_REQUIRED',
      { minImages: 1, maxImages: 3 }
    );
  }
  if (images.length > 3) {
    throw new BadRequestError(
      'Chỉ được tải tối đa 3 ảnh cho mỗi lần nhận diện',
      'TOO_MANY_IMAGES',
      { maxImages: 3 }
    );
  }

  const crop = await resolveSupportedCrop(product.name, product.category);
  const inference = await inferPlantDisease(
    images.map(({ filename, absolutePath }) => ({ filename, absolutePath })),
    crop
  );
  const symptoms = (data.symptoms || [])
    .map((symptom) => symptom.trim())
    .filter(Boolean);
  const notes = data.notes?.trim();
  const topDisease = inference.candidates[0];

  const detection = await DiseaseDetection.create({
    product: data.product,
    crop_name: inference.crop.label,
    symptoms,
    notes,
    images: images.map(({ path, filename }) => ({ path, filename })),
    candidates: inference.candidates,
    top_disease: topDisease,
    overall_risk: topDisease.risk_level,
    model_version: inference.modelVersion,
    analysis_status: inference.status,
    inference_engine: inference.engine,
    warnings: inference.warnings,
    detected_by: userId,
  });

  try {
    await detection.populate([
      { path: 'product', select: 'name category origin status' },
      { path: 'detected_by', select: 'first_name last_name email' },
    ]);
  } catch (error) {
    // The result is already safely persisted. Return it even if optional
    // population fails so the controller does not remove referenced images.
    console.error('Failed to populate disease detection response:', error);
  }

  return detection;
};

export const removeDetection = async (
  id: string,
  userId: string,
  userRole: string
) => {
  const detection = await DiseaseDetection.findById(id).populate(
    'product',
    'created_by'
  );
  if (!detection) throw new NotFoundError(`Không tìm thấy kết quả ${id}`);

  const product = detection.product as any;
  const productOwnerId = product?.created_by?.toString?.();
  if (userRole === 'farmer' && productOwnerId !== userId) {
    throw new UnauthorizedError('Bạn chỉ được xóa kết quả của lô mình quản lý');
  }

  const deletion = await DiseaseDetection.deleteOne({ _id: detection._id });
  if (deletion.deletedCount !== 1) {
    throw new NotFoundError(`Không tìm thấy kết quả ${id}`);
  }

  await removeStoredUploads(
    detection.images
      .filter((image) => Boolean(image.filename))
      .map((image) => ({ filename: image.filename }))
  );
  return detection;
};
