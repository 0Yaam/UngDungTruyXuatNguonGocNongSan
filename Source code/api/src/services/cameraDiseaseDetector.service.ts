import { createHash } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import * as ort from 'onnxruntime-node';
import sharp from 'sharp';
import { DiseaseRiskLevel, IDiseaseCandidate } from '../models/DiseaseDetection';

const MODEL_DIR = path.resolve(__dirname, '../../models/plant-disease-yolo');
const MODEL_PATH = path.join(MODEL_DIR, 'PlantDiseaseDetection.onnx');
const LABELS_PATH = path.join(MODEL_DIR, 'labels.json');
const METADATA_PATH = path.join(MODEL_DIR, 'metadata.json');

interface DetectorMetadata {
  version: string;
  onnxSha256: string;
  inputSize: number;
  confidenceThreshold: number;
}

export interface DiseaseBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CameraDiseaseDetection extends IDiseaseCandidate {
  box: DiseaseBoundingBox;
}

export interface CameraDiseaseDetectionResult {
  candidates: CameraDiseaseDetection[];
  confidence: number;
  modelVersion: string;
  engine: 'onnx-yolo';
  sourceWidth: number;
  sourceHeight: number;
  warnings: string[];
}

interface LetterboxTransform {
  sourceWidth: number;
  sourceHeight: number;
  scale: number;
  padX: number;
  padY: number;
}

interface DetectorRuntime {
  session: ort.InferenceSession;
  labels: string[];
  metadata: DetectorMetadata;
}

const CROP_RULES = [
  { hints: ['ca chua', 'tomato'], labels: ['tomato'] },
  { hints: ['ot chuong', 'bell pepper'], labels: ['bell pepper'] },
  { hints: ['khoai tay', 'potato'], labels: ['potato'] },
  { hints: ['dau tay', 'strawberry'], labels: ['strawberry'] },
  { hints: ['ca phe', 'coffee'], labels: ['coffee'] },
  { hints: ['xa lach', 'lettuce'], labels: ['lettuce'] },
  { hints: ['bap cai', 'cabbage'], labels: ['cabbage'] },
  { hints: ['sup lo', 'cauliflower'], labels: ['cauliflower'] },
  { hints: ['can tay', 'celery'], labels: ['celery'] },
  { hints: ['ca tim', 'eggplant'], labels: ['eggplant'] },
  { hints: ['hung que', 'basil'], labels: ['basil'] },
];

const CROP_NAMES: Array<[string, string]> = [
  ['bell pepper', 'Ớt chuông'], ['cauliflower', 'Súp lơ'], ['strawberry', 'Dâu tây'],
  ['tomato', 'Cà chua'], ['potato', 'Khoai tây'], ['coffee', 'Cà phê'],
  ['lettuce', 'Xà lách'], ['cabbage', 'Bắp cải'], ['celery', 'Cần tây'],
  ['eggplant', 'Cà tím'], ['basil', 'Húng quế'],
];

const DISEASE_NAMES: Array<[string, string]> = [
  ['yellow leaf curl virus', 'Virus xoăn vàng lá'], ['bacterial leaf spot', 'Đốm lá vi khuẩn'],
  ['septoria leaf spot', 'Đốm lá Septoria'], ['cercospora leaf spot', 'Đốm lá Cercospora'],
  ['alternaria leaf spot', 'Đốm lá Alternaria'], ['mosaic virus', 'Virus khảm'],
  ['downy mildew', 'Bệnh sương mai'], ['late blight', 'Mốc sương'],
  ['early blight', 'Cháy lá sớm'], ['leaf scorch', 'Cháy mép lá'],
  ['leaf rust', 'Gỉ sắt lá'], ['leaf mold', 'Mốc lá'], ['anthracnose', 'Bệnh thán thư'],
  ['bacterial wilt', 'Héo vi khuẩn'], ['brown spots', 'Đốm nâu'],
  ['blight leaf', 'Cháy lá'], ['leaf spot', 'Đốm lá'], ['healthy', 'Khỏe mạnh'],
];

let runtimePromise: Promise<DetectorRuntime> | null = null;

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const slug = (value: string) => normalize(value).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

const describeLabel = (label: string) => {
  const normalized = normalize(label);
  const crop = CROP_NAMES.find(([key]) => normalized.includes(key))?.[1] || 'Cây trồng';
  const disease = DISEASE_NAMES.find(([key]) => normalized.includes(key))?.[1];
  const genericLeaf = /(^| )leaf$/.test(normalized);
  const healthy = normalized.includes('healthy') || genericLeaf;
  return {
    crop,
    name: disease ? `${crop} · ${disease}` : genericLeaf ? `Lá ${crop.toLowerCase()}` : label,
    healthy,
  };
};

const recommendationsFor = (healthy: boolean) => healthy
  ? ['Tiếp tục theo dõi cây và duy trì điều kiện chăm sóc hiện tại.']
  : [
      'Đánh dấu cây hoặc khu vực nghi nhiễm để tiếp tục theo dõi.',
      'Chụp thêm ảnh cận cảnh lá và nhờ kỹ thuật viên nông nghiệp xác nhận.',
      'Không sử dụng thuốc chỉ dựa trên kết quả AI.',
    ];

const riskFor = (healthy: boolean, confidence: number): DiseaseRiskLevel =>
  healthy ? 'low' : confidence >= 0.7 ? 'high' : 'medium';

const loadRuntime = async (): Promise<DetectorRuntime> => {
  const [model, labelsText, metadataText] = await Promise.all([
    fs.readFile(MODEL_PATH),
    fs.readFile(LABELS_PATH, 'utf8'),
    fs.readFile(METADATA_PATH, 'utf8'),
  ]);
  const labels = JSON.parse(labelsText) as string[];
  const metadata = JSON.parse(metadataText) as DetectorMetadata;
  const hash = createHash('sha256').update(model).digest('hex');
  if (hash !== metadata.onnxSha256) throw new Error('YOLO model checksum mismatch');
  if (!Array.isArray(labels) || labels.length !== 116) throw new Error('YOLO labels are invalid');
  const session = await ort.InferenceSession.create(MODEL_PATH);
  return { session, labels, metadata };
};

const requireRuntime = () => {
  if (!runtimePromise) runtimePromise = loadRuntime().catch((error) => {
    runtimePromise = null;
    throw error;
  });
  return runtimePromise;
};

const preprocess = async (source: string | Buffer, size: number) => {
  const metadata = await sharp(source, { failOn: 'error' }).metadata();
  if (!metadata.width || !metadata.height) throw new Error('Không đọc được kích thước frame');
  const scale = Math.min(size / metadata.width, size / metadata.height);
  const renderedWidth = Math.round(metadata.width * scale);
  const renderedHeight = Math.round(metadata.height * scale);
  const padX = Math.floor((size - renderedWidth) / 2);
  const padY = Math.floor((size - renderedHeight) / 2);
  const { data } = await sharp(source, { failOn: 'error' })
    .rotate()
    .resize(size, size, { fit: 'contain', background: { r: 114, g: 114, b: 114 } })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const plane = size * size;
  const tensorData = new Float32Array(plane * 3);
  for (let index = 0; index < plane; index += 1) {
    tensorData[index] = data[index * 3] / 255;
    tensorData[plane + index] = data[index * 3 + 1] / 255;
    tensorData[plane * 2 + index] = data[index * 3 + 2] / 255;
  }
  return {
    tensor: new ort.Tensor('float32', tensorData, [1, 3, size, size]),
    transform: { sourceWidth: metadata.width, sourceHeight: metadata.height, scale, padX, padY },
  };
};

export const parseYoloDetections = (
  values: Float32Array,
  labels: string[],
  transform: LetterboxTransform,
  confidenceThreshold: number,
  cropHint = ''
): CameraDiseaseDetection[] => {
  const expected = CROP_RULES.find((rule) => rule.hints.some((hint) => normalize(cropHint).includes(hint)));
  const detections: CameraDiseaseDetection[] = [];
  for (let offset = 0; offset + 5 < values.length; offset += 6) {
    const confidence = values[offset + 4];
    const classId = Math.round(values[offset + 5]);
    const modelLabel = labels[classId];
    if (confidence < confidenceThreshold || !modelLabel) continue;
    const normalizedLabel = normalize(modelLabel);
    if (expected && !expected.labels.some((label) => normalizedLabel.includes(label))) continue;
    const x1 = clamp(((values[offset] - transform.padX) / transform.scale) / transform.sourceWidth);
    const y1 = clamp(((values[offset + 1] - transform.padY) / transform.scale) / transform.sourceHeight);
    const x2 = clamp(((values[offset + 2] - transform.padX) / transform.scale) / transform.sourceWidth);
    const y2 = clamp(((values[offset + 3] - transform.padY) / transform.scale) / transform.sourceHeight);
    if (x2 <= x1 || y2 <= y1) continue;
    const description = describeLabel(modelLabel);
    detections.push({
      disease_code: `yolo_${slug(modelLabel)}`,
      disease_name: description.name,
      confidence,
      risk_level: riskFor(description.healthy, confidence),
      description: description.healthy
        ? 'Không phát hiện dấu hiệu bệnh rõ ràng trong vùng lá này.'
        : `YOLO phát hiện vùng hình ảnh tương đồng với ${description.name.toLowerCase()}.`,
      recommendations: recommendationsFor(description.healthy),
      crop_code: slug(description.crop),
      model_label: modelLabel,
      source_label: modelLabel,
      is_healthy: description.healthy,
      box: { x: x1, y: y1, width: x2 - x1, height: y2 - y1 },
    });
  }
  const diseased = detections.filter((item) => !item.is_healthy);
  return (diseased.length ? diseased : detections).sort((a, b) => b.confidence - a.confidence).slice(0, 20);
};

export const detectCameraPlantDisease = async (
  image: { absolutePath?: string; buffer?: Buffer },
  cropHint = ''
): Promise<CameraDiseaseDetectionResult> => {
  const runtime = await requireRuntime();
  const source = image.buffer || image.absolutePath;
  if (!source) throw new Error('Không có frame cho YOLO');
  const { tensor, transform } = await preprocess(source, runtime.metadata.inputSize);
  const output = await runtime.session.run({ [runtime.session.inputNames[0]]: tensor });
  const values = output[runtime.session.outputNames[0]].data as Float32Array;
  const candidates = parseYoloDetections(
    values,
    runtime.labels,
    transform,
    runtime.metadata.confidenceThreshold,
    cropHint
  );
  return {
    candidates,
    confidence: candidates[0]?.confidence || 0,
    modelVersion: runtime.metadata.version,
    engine: 'onnx-yolo',
    sourceWidth: transform.sourceWidth,
    sourceHeight: transform.sourceHeight,
    warnings: ['Bounding box là gợi ý sàng lọc; cần kỹ thuật viên xác nhận trước khi xử lý cây bệnh.'],
  };
};
