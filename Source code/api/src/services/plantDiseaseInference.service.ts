import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import * as ort from 'onnxruntime-node';
import sharp from 'sharp';
import {
  DiseaseRiskLevel,
  IDiseaseCandidate,
} from '../models/DiseaseDetection';
import { DISEASE_IMAGE_MIMETYPES, MAX_IMAGE_FILE_SIZE } from '../config/upload';
import {
  BadRequestError,
  ServiceUnavailableError,
  UnprocessableEntityError,
} from '../utils/errors';

const MODEL_DIR = path.resolve(
  __dirname,
  '..',
  '..',
  'models',
  'plant-disease'
);
const MODEL_PATH = path.join(MODEL_DIR, 'model.onnx');
const LABELS_PATH = path.join(MODEL_DIR, 'labels.json');
const METADATA_PATH = path.join(MODEL_DIR, 'metadata.json');

interface SupportedCrop {
  code: string;
  label: string;
  classIndexes: number[];
  aliases: string[];
}

interface ModelMetadata {
  version: string;
  source: string;
  onnxSha256: string;
  license: string;
  architecture: string;
  input: {
    name: string;
    width: number;
    height: number;
    layout: 'NHWC';
    dtype: 'float32';
    valueRange: [number, number];
  };
  output: {
    name: string;
    classes: number;
  };
  minConfidence: number;
  minCropMass: number;
  maxImages: number;
  supportedCrops: SupportedCrop[];
  limitations: string[];
}

interface ModelRuntime {
  session: ort.InferenceSession;
  labels: string[];
  metadata: ModelMetadata;
}

export interface InferenceImage {
  filename: string;
  absolutePath: string;
}

export interface PlantDiseaseInferenceResult {
  candidates: IDiseaseCandidate[];
  status: 'completed' | 'inconclusive';
  engine: 'onnx';
  warnings: string[];
  modelVersion: string;
  crop: SupportedCrop;
}

let metadataPromise: Promise<ModelMetadata> | null = null;
let runtimePromise: Promise<ModelRuntime> | null = null;

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const validateMetadata = (value: any): ModelMetadata => {
  const isValid =
    value &&
    typeof value.version === 'string' &&
    typeof value.source === 'string' &&
    typeof value.onnxSha256 === 'string' &&
    /^[a-f0-9]{64}$/i.test(value.onnxSha256) &&
    typeof value.license === 'string' &&
    typeof value.architecture === 'string' &&
    value.input?.layout === 'NHWC' &&
    value.input?.dtype === 'float32' &&
    Number.isInteger(value.input?.width) &&
    Number.isInteger(value.input?.height) &&
    typeof value.input?.name === 'string' &&
    typeof value.output?.name === 'string' &&
    Number.isInteger(value.output?.classes) &&
    typeof value.minConfidence === 'number' &&
    typeof value.minCropMass === 'number' &&
    Number.isInteger(value.maxImages) &&
    Array.isArray(value.supportedCrops) &&
    Array.isArray(value.limitations);

  if (!isValid) {
    throw new Error('metadata.json không đúng định dạng yêu cầu');
  }

  for (const crop of value.supportedCrops) {
    if (
      typeof crop?.code !== 'string' ||
      typeof crop?.label !== 'string' ||
      !Array.isArray(crop?.classIndexes) ||
      !Array.isArray(crop?.aliases)
    ) {
      throw new Error('supportedCrops trong metadata.json không hợp lệ');
    }
  }

  return value as ModelMetadata;
};

const loadMetadata = async (): Promise<ModelMetadata> => {
  if (!metadataPromise) {
    metadataPromise = fs
      .readFile(METADATA_PATH, 'utf8')
      .then((content) => validateMetadata(JSON.parse(content)))
      .catch((error) => {
        metadataPromise = null;
        throw error;
      });
  }
  return metadataPromise;
};

const loadRuntime = async (): Promise<ModelRuntime> => {
  if (!runtimePromise) {
    runtimePromise = (async () => {
      const [metadata, labelsContent, modelBuffer] = await Promise.all([
        loadMetadata(),
        fs.readFile(LABELS_PATH, 'utf8'),
        fs.readFile(MODEL_PATH),
      ]);
      const labels = JSON.parse(labelsContent);

      const actualModelHash = createHash('sha256')
        .update(modelBuffer)
        .digest('hex');
      if (actualModelHash.toLowerCase() !== metadata.onnxSha256.toLowerCase()) {
        throw new Error('SHA-256 của model.onnx không khớp metadata.json');
      }

      if (
        !Array.isArray(labels) ||
        labels.some((label) => typeof label !== 'string') ||
        labels.length !== metadata.output.classes
      ) {
        throw new Error(
          `labels.json phải có đúng ${metadata.output.classes} nhãn`
        );
      }

      const invalidCropIndex = metadata.supportedCrops.some((crop) =>
        crop.classIndexes.some(
          (index) =>
            !Number.isInteger(index) || index < 0 || index >= labels.length
        )
      );
      if (invalidCropIndex) {
        throw new Error('classIndexes trong metadata.json vượt ngoài labels.json');
      }

      const session = await ort.InferenceSession.create(MODEL_PATH);
      return { metadata, labels, session };
    })().catch((error) => {
      runtimePromise = null;
      throw error;
    });
  }
  return runtimePromise;
};

const requireRuntime = async (): Promise<ModelRuntime> => {
  try {
    return await loadRuntime();
  } catch (error) {
    console.error('Plant disease model is unavailable:', error);
    throw new ServiceUnavailableError(
      'Mô hình nhận diện bệnh hiện chưa sẵn sàng',
      'MODEL_UNAVAILABLE',
      { retryable: true }
    );
  }
};

export const getPlantDiseaseCapabilities = async () => {
  let metadata: ModelMetadata | null = null;
  let ready = false;

  try {
    const runtime = await loadRuntime();
    metadata = runtime.metadata;
    ready = true;
  } catch (error) {
    console.error('Failed to load plant disease capabilities:', error);
    try {
      metadata = await loadMetadata();
    } catch {
      metadata = null;
    }
  }

  return {
    ready,
    status: ready ? ('ready' as const) : ('unavailable' as const),
    engine: 'onnxruntime' as const,
    mode: 'image-classification' as const,
    version: metadata?.version || null,
    source: metadata?.source || null,
    license: metadata?.license || null,
    architecture: metadata?.architecture || null,
    input: {
      width: metadata?.input.width || 224,
      height: metadata?.input.height || 224,
      layout: metadata?.input.layout || 'NHWC',
      dtype: metadata?.input.dtype || 'float32',
      valueRange: metadata?.input.valueRange || [0, 255],
      minImages: 1,
      maxImages: metadata?.maxImages || 3,
      acceptedMimeTypes: DISEASE_IMAGE_MIMETYPES,
      maxFileSizeBytes: MAX_IMAGE_FILE_SIZE,
    },
    thresholds: {
      minConfidence: metadata?.minConfidence ?? 0.65,
      minCropMass: metadata?.minCropMass ?? 0.55,
    },
    supportedCrops:
      metadata?.supportedCrops.map(({ code, label, aliases }) => ({
        code,
        label,
        aliases,
      })) || [],
    limitations: metadata?.limitations || [],
  };
};

export const resolveSupportedCrop = async (
  productName: string,
  productCategory?: string
): Promise<SupportedCrop> => {
  const runtime = await requireRuntime();
  const source = normalizeText(`${productName} ${productCategory || ''}`);
  const crop = runtime.metadata.supportedCrops.find((candidate) =>
    candidate.aliases.some((alias) => source.includes(normalizeText(alias)))
  );

  if (!crop) {
    throw new UnprocessableEntityError(
      `Mô hình hiện chưa hỗ trợ nhận diện cho lô “${productName}”`,
      'UNSUPPORTED_CROP',
      {
        supportedCrops: runtime.metadata.supportedCrops.map(({ code, label }) => ({
          code,
          label,
        })),
      }
    );
  }

  return crop;
};

const normalizeProbabilities = (
  data: ArrayLike<number>,
  expectedLength: number
): number[] => {
  if (data.length !== expectedLength) {
    throw new ServiceUnavailableError(
      'Đầu ra của mô hình nhận diện không đúng định dạng',
      'MODEL_OUTPUT_INVALID',
      { expectedClasses: expectedLength, receivedClasses: data.length }
    );
  }

  const values = Array.from(data, Number);
  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new ServiceUnavailableError(
      'Mô hình trả về xác suất không hợp lệ',
      'MODEL_OUTPUT_INVALID'
    );
  }

  const sum = values.reduce((total, value) => total + value, 0);
  if (!Number.isFinite(sum) || sum <= 0) {
    throw new ServiceUnavailableError(
      'Mô hình không trả về kết quả có thể sử dụng',
      'MODEL_OUTPUT_INVALID'
    );
  }

  return values.map((value) => value / sum);
};

const preprocessImage = async (
  image: InferenceImage,
  metadata: ModelMetadata
): Promise<Float32Array> => {
  try {
    const probe = await sharp(image.absolutePath, { failOn: 'error' }).metadata();
    if (!probe.width || !probe.height || !['jpeg', 'png', 'webp'].includes(probe.format || '')) {
      throw new Error('Unsupported or empty image');
    }

    const { data, info } = await sharp(image.absolutePath, { failOn: 'error' })
      .rotate()
      .resize(metadata.input.width, metadata.input.height, {
        fit: 'fill',
      })
      .removeAlpha()
      .toColorspace('srgb')
      .raw()
      .toBuffer({ resolveWithObject: true });

    if (
      info.width !== metadata.input.width ||
      info.height !== metadata.input.height ||
      info.channels !== 3 ||
      data.length !== metadata.input.width * metadata.input.height * 3
    ) {
      throw new Error('Unexpected decoded image dimensions');
    }

    const pixels = new Float32Array(data.length);
    for (let index = 0; index < data.length; index += 1) {
      pixels[index] = data[index];
    }
    return pixels;
  } catch (error) {
    if (error instanceof BadRequestError) throw error;
    throw new UnprocessableEntityError(
      `Ảnh “${image.filename}” bị hỏng hoặc không thể đọc`,
      'INVALID_IMAGE',
      { filename: image.filename }
    );
  }
};

const diseaseInfo = (
  sourceLabel: string
): {
  code: string;
  name: string;
  risk: DiseaseRiskLevel;
  description: string;
  recommendations: string[];
} => {
  const rawDisease = sourceLabel.split('___')[1] || sourceLabel;
  const key = rawDisease
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  const code = key;

  const names: Record<string, string> = {
    healthy: 'Không phát hiện bệnh',
    bacterial_spot: 'Đốm vi khuẩn',
    early_blight: 'Cháy lá sớm',
    late_blight: 'Bệnh mốc sương',
    leaf_mold: 'Mốc lá',
    septoria_leaf_spot: 'Đốm lá Septoria',
    spider_mites_two_spotted_spider_mite: 'Nhện đỏ hai chấm',
    target_spot: 'Đốm vòng',
    tomato_yellow_leaf_curl_virus: 'Virus xoăn vàng lá cà chua',
    tomato_mosaic_virus: 'Virus khảm cà chua',
  };
  const name = names[key] || rawDisease.replace(/[_(),]+/g, ' ').trim();
  const isHealthy = key === 'healthy';
  const isHighRisk = key.includes('late_blight') || key.includes('virus');
  const risk: DiseaseRiskLevel = isHealthy
    ? 'low'
    : isHighRisk
      ? 'high'
      : 'medium';

  if (isHealthy) {
    return {
      code,
      name,
      risk,
      description: 'Mô hình chưa phát hiện dấu hiệu bệnh rõ ràng trên các ảnh đã gửi.',
      recommendations: [
        'Tiếp tục theo dõi cây và chụp lại khi xuất hiện triệu chứng mới.',
        'Duy trì lịch chăm sóc và ghi nhật ký canh tác đầy đủ.',
      ],
    };
  }

  return {
    code,
    name,
    risk,
    description: `Hình ảnh có đặc trưng tương đồng với ${name.toLowerCase()}.`,
    recommendations: [
      'Cách ly và đánh dấu cây nghi nhiễm để tiếp tục theo dõi.',
      'Nhờ kỹ thuật viên nông nghiệp xác nhận trước khi sử dụng thuốc.',
      risk === 'high'
        ? 'Ưu tiên kiểm tra toàn bộ lô và xử lý sớm để hạn chế lây lan.'
        : 'Chụp bổ sung mặt trên, mặt dưới lá và theo dõi diễn biến trong 2-3 ngày.',
    ],
  };
};

export const inferPlantDisease = async (
  images: InferenceImage[],
  crop: SupportedCrop
): Promise<PlantDiseaseInferenceResult> => {
  const runtime = await requireRuntime();
  const { metadata, labels, session } = runtime;

  if (images.length < 1) {
    throw new BadRequestError(
      'Vui lòng tải ít nhất 1 ảnh cây trồng để nhận diện',
      'IMAGE_REQUIRED',
      { minImages: 1, maxImages: metadata.maxImages }
    );
  }
  if (images.length > metadata.maxImages) {
    throw new BadRequestError(
      `Chỉ được tải tối đa ${metadata.maxImages} ảnh cho mỗi lần nhận diện`,
      'TOO_MANY_IMAGES',
      { maxImages: metadata.maxImages }
    );
  }

  const summed = new Array<number>(labels.length).fill(0);
  for (const image of images) {
    const pixels = await preprocessImage(image, metadata);
    const tensor = new ort.Tensor('float32', pixels, [
      1,
      metadata.input.height,
      metadata.input.width,
      3,
    ]);
    let output: ort.InferenceSession.OnnxValueMapType;
    try {
      output = await session.run({ [metadata.input.name]: tensor });
    } catch (error) {
      console.error(`Plant disease inference failed for ${image.filename}:`, error);
      throw new ServiceUnavailableError(
        'Không thể phân tích ảnh vào lúc này',
        'MODEL_INFERENCE_FAILED',
        { retryable: true }
      );
    }
    const outputTensor = output[metadata.output.name];
    if (!outputTensor) {
      throw new ServiceUnavailableError(
        'Không tìm thấy đầu ra của mô hình nhận diện',
        'MODEL_OUTPUT_INVALID',
        { outputName: metadata.output.name }
      );
    }

    const probabilities = normalizeProbabilities(
      outputTensor.data as ArrayLike<number>,
      labels.length
    );
    probabilities.forEach((probability, index) => {
      summed[index] += probability;
    });
  }

  const averaged = summed.map((value) => value / images.length);
  const cropMass = crop.classIndexes.reduce(
    (total, index) => total + averaged[index],
    0
  );
  const topOverallIndex = averaged.reduce(
    (best, value, index, values) => (value > values[best] ? index : best),
    0
  );

  if (cropMass < metadata.minCropMass) {
    throw new UnprocessableEntityError(
      `Ảnh tải lên không có đủ đặc trưng của ${crop.label.toLowerCase()}`,
      'IMAGE_CROP_MISMATCH',
      {
        expectedCrop: { code: crop.code, label: crop.label },
        cropProbability: Number(cropMass.toFixed(4)),
        minimumCropProbability: metadata.minCropMass,
        likelyClass: labels[topOverallIndex],
        likelyConfidence: Number(averaged[topOverallIndex].toFixed(4)),
      }
    );
  }

  const candidates = crop.classIndexes
    .map((index) => ({ index, confidence: averaged[index] }))
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 3)
    .map(({ index, confidence }) => {
      const info = diseaseInfo(labels[index]);
      return {
        disease_code: `${crop.code}_${info.code}`,
        disease_name: info.name,
        confidence: Number(confidence.toFixed(6)),
        risk_level: info.risk,
        description: info.description,
        recommendations: info.recommendations,
        crop_code: crop.code,
        model_label: labels[index],
        source_label: labels[index],
        is_healthy: info.code === 'healthy',
      } satisfies IDiseaseCandidate;
    });

  const warnings = [
    'Kết quả AI chỉ dùng để sàng lọc và không thay thế chẩn đoán của chuyên gia.',
  ];
  const status =
    candidates[0].confidence >= metadata.minConfidence
      ? ('completed' as const)
      : ('inconclusive' as const);
  if (status === 'inconclusive') {
    warnings.unshift(
      `Độ tin cậy thấp hơn ngưỡng ${Math.round(metadata.minConfidence * 100)}%; cần chụp lại ảnh rõ hơn hoặc nhờ kỹ thuật viên xác nhận.`
    );
  }

  return {
    candidates,
    status,
    engine: 'onnx',
    warnings,
    modelVersion: metadata.version,
    crop,
  };
};
