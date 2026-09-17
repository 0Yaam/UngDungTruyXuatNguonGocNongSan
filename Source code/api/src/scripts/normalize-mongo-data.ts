import 'dotenv/config';
import mongoose, { Types } from 'mongoose';
import connectDB from '../config/db';
import env from '../config/env';
import User from '../models/User';
import FarmingArea from '../models/FarmingArea';
import Product from '../models/Product';
import TraceEvent, { ActionType } from '../models/TraceEvent';
import Certification from '../models/Certification';
import QualityInspection from '../models/QualityInspection';
import DiseaseDetection from '../models/DiseaseDetection';
import SupplyChainOrganization from '../models/SupplyChainOrganization';
import SupplyChainRecord from '../models/SupplyChainRecord';
import InventoryTransaction from '../models/InventoryTransaction';

const oid = (value: string) => new Types.ObjectId(value);
const DEFAULT_USER_AVATAR = '/uploads/sample-media/default-avatar.svg';

const PRODUCT_NAMES: Record<string, { name: string; category: string; origin: string }> = {
  '6a0fdaad7ecb33512b9d4c7a': { name: 'Xoài Cát Chu', category: 'Trái cây', origin: 'Cái Bè, Tiền Giang' },
  '6a0fdaad7ecb33512b9d4c7b': { name: 'Bưởi Da Xanh', category: 'Trái cây', origin: 'Chợ Lách, Bến Tre' },
  '6a0fdaad7ecb33512b9d4c7c': { name: 'Cà Chua Bi Đà Lạt', category: 'Rau quả', origin: 'Đà Lạt, Lâm Đồng' },
  '6a0fdaae7ecb33512b9d4c7d': { name: 'Xà Lách Thủy Canh', category: 'Rau ăn lá', origin: 'Đà Lạt, Lâm Đồng' },
  '6a0fdaae7ecb33512b9d4c7e': { name: 'Dưa Lưới', category: 'Trái cây', origin: 'Cái Bè, Tiền Giang' },
  '6a0fdaae7ecb33512b9d4c7f': { name: 'Ớt Chuông', category: 'Rau quả', origin: 'Đà Lạt, Lâm Đồng' },
  '6a0fdaae7ecb33512b9d4c80': { name: 'Trứng Gà Thả Vườn', category: 'Chăn nuôi', origin: 'Chợ Lách, Bến Tre' },
  '6a0fdb11559c052f3e2b7bbc': { name: 'Khoai Lang', category: 'Rau củ', origin: 'Phường 8, Đà Lạt, Lâm Đồng' },
  '6a0fdb89559c052f3e2b7c94': { name: 'Rau Mùi', category: 'Rau ăn lá', origin: 'Chợ Lách, Bến Tre' },
  '6a0fdccc559c052f3e2b7e15': { name: 'Rau Dền', category: 'Rau ăn lá', origin: 'Phường 8, Đà Lạt, Lâm Đồng' },
};

const PRODUCT_PROFILES: Record<
  string,
  { batch_code: string; status: 'draft' | 'active' | 'completed' | 'recalled'; cultivation_time: string; harvest_at?: string }
> = {
  '6a0fdaad7ecb33512b9d4c7a': {
    batch_code: 'XM-2606-0001',
    status: 'completed',
    cultivation_time: '2026-02-15 đến 2026-06-30',
    harvest_at: '2026-06-30T01:30:00.000Z',
  },
  '6a0fdaad7ecb33512b9d4c7b': {
    batch_code: 'BU-2605-0002',
    status: 'active',
    cultivation_time: '2025-12-20 đến 2026-05-16',
    harvest_at: '2026-05-16T02:00:00.000Z',
  },
  '6a0fdaad7ecb33512b9d4c7c': {
    batch_code: 'CT-2605-0003',
    status: 'active',
    cultivation_time: '2026-03-15 đến 2026-05-28',
    harvest_at: '2026-05-28T01:00:00.000Z',
  },
  '6a0fdaae7ecb33512b9d4c7d': {
    batch_code: 'XL-2606-0004',
    status: 'active',
    cultivation_time: '2026-05-05 đến 2026-06-05',
    harvest_at: '2026-06-05T00:30:00.000Z',
  },
  '6a0fdaae7ecb33512b9d4c7e': {
    batch_code: 'DL-2607-0005',
    status: 'active',
    cultivation_time: '2026-04-10 đến 2026-07-05',
  },
  '6a0fdaae7ecb33512b9d4c7f': {
    batch_code: 'OC-2607-0006',
    status: 'active',
    cultivation_time: '2026-04-18 đến 2026-07-10',
  },
  '6a0fdaae7ecb33512b9d4c80': {
    batch_code: 'TG-2606-0007',
    status: 'completed',
    cultivation_time: 'Thu gom ngày 2026-06-12',
    harvest_at: '2026-06-12T01:00:00.000Z',
  },
  '6a0fdb11559c052f3e2b7bbc': {
    batch_code: 'KL-2607-0008',
    status: 'active',
    cultivation_time: '2026-05-10 đến 2026-07-20',
  },
  '6a0fdb89559c052f3e2b7c94': {
    batch_code: 'RM-2606-0009',
    status: 'active',
    cultivation_time: '2026-05-20 đến 2026-06-25',
    harvest_at: '2026-06-25T00:45:00.000Z',
  },
  '6a0fdccc559c052f3e2b7e15': {
    batch_code: 'RD-2606-0010',
    status: 'active',
    cultivation_time: '2026-05-18 đến 2026-06-28',
    harvest_at: '2026-06-28T00:45:00.000Z',
  },
};

const PRODUCT_INVENTORY: Record<
  string,
  { initial_quantity: number; current_quantity: number; unit: string; note: string }
> = {
  '6a0fdaad7ecb33512b9d4c7a': {
    initial_quantity: 1200,
    current_quantity: 800,
    unit: 'kg',
    note: 'Lô xoài đã phân phối một phần theo hồ sơ chuỗi cung ứng mẫu.',
  },
  '6a0fdaad7ecb33512b9d4c7b': {
    initial_quantity: 900,
    current_quantity: 500,
    unit: 'kg',
    note: 'Lô bưởi còn tồn sau đóng gói và giao cùng chuyến mẫu.',
  },
  '6a0fdaad7ecb33512b9d4c7c': {
    initial_quantity: 650,
    current_quantity: 420,
    unit: 'kg',
    note: 'Lô cà chua còn tồn sau vận chuyển thử nghiệm.',
  },
  '6a0fdaae7ecb33512b9d4c7d': {
    initial_quantity: 300,
    current_quantity: 300,
    unit: 'kg',
    note: 'Lô xà lách thủy canh đang theo dõi sản xuất.',
  },
  '6a0fdaae7ecb33512b9d4c7e': {
    initial_quantity: 780,
    current_quantity: 780,
    unit: 'kg',
    note: 'Lô dưa lưới đầu vụ.',
  },
  '6a0fdaae7ecb33512b9d4c7f': {
    initial_quantity: 260,
    current_quantity: 260,
    unit: 'kg',
    note: 'Lô ớt chuông đang chăm sóc.',
  },
  '6a0fdaae7ecb33512b9d4c80': {
    initial_quantity: 2400,
    current_quantity: 1800,
    unit: 'quả',
    note: 'Lô trứng gà đã đóng hộp và xuất một phần.',
  },
  '6a0fdb11559c052f3e2b7bbc': {
    initial_quantity: 520,
    current_quantity: 520,
    unit: 'kg',
    note: 'Lô khoai lang mới gieo trồng/theo dõi.',
  },
  '6a0fdb89559c052f3e2b7c94': {
    initial_quantity: 90,
    current_quantity: 90,
    unit: 'kg',
    note: 'Lô rau mùi quy mô nhỏ.',
  },
  '6a0fdccc559c052f3e2b7e15': {
    initial_quantity: 140,
    current_quantity: 140,
    unit: 'kg',
    note: 'Lô rau dền đang theo dõi.',
  },
};

const AREA_DATA: Record<string, { name: string; address: string }> = {
  '6a0fdaac7ecb33512b9d4c77': { name: 'Vườn trái cây Cái Bè', address: 'Cái Bè, Tiền Giang' },
  '6a0fdaac7ecb33512b9d4c78': { name: 'Nhà kính Đà Lạt', address: 'Phường 8, Đà Lạt, Lâm Đồng' },
  '6a0fdaad7ecb33512b9d4c79': { name: 'Trang trại Chợ Lách', address: 'Chợ Lách, Bến Tre' },
};

const PRODUCT_FARMING_AREAS: Record<string, string> = {
  '6a0fdaad7ecb33512b9d4c7a': '6a0fdaac7ecb33512b9d4c77',
  '6a0fdaad7ecb33512b9d4c7b': '6a0fdaad7ecb33512b9d4c79',
  '6a0fdaad7ecb33512b9d4c7c': '6a0fdaac7ecb33512b9d4c78',
  '6a0fdaae7ecb33512b9d4c7d': '6a0fdaac7ecb33512b9d4c78',
  '6a0fdaae7ecb33512b9d4c7e': '6a0fdaac7ecb33512b9d4c77',
  '6a0fdaae7ecb33512b9d4c7f': '6a0fdaac7ecb33512b9d4c78',
  '6a0fdaae7ecb33512b9d4c80': '6a0fdaad7ecb33512b9d4c79',
  '6a0fdb11559c052f3e2b7bbc': '6a0fdaac7ecb33512b9d4c78',
  '6a0fdb89559c052f3e2b7c94': '6a0fdaac7ecb33512b9d4c78',
  '6a0fdccc559c052f3e2b7e15': '6a0fdaac7ecb33512b9d4c78',
};

const EVENT_DESCRIPTIONS: Record<string, string> = {
  '6a0fda8090c8a58380d6d8d9': 'Thu hoạch lô xoài đợt đầu, tuyển chọn quả đạt tiêu chuẩn.',
  '6a0fda8090c8a58380d6d8da': 'Phân loại và đóng gói bưởi da xanh theo quy cách.',
  '6a0fda8090c8a58380d6d8db': 'Chuyển cà chua đến điểm bán lẻ bằng xe lạnh.',
  '6a0fda8090c8a58380d6d8dc': 'Cấp dung dịch dinh dưỡng cho lô xà lách thủy canh.',
  '6a0fda8090c8a58380d6d8dd': 'Ghi nhận cây giống dưa lưới đầu vụ.',
  '6a0fda8090c8a58380d6d8de': 'Kiểm tra và phòng trừ sâu bệnh cho khu ớt chuông.',
  '6a0fda8090c8a58380d6d8df': 'Đóng hộp trứng gà trong ngày thu gom.',
  '6a0fdb21559c052f3e2b7bca': 'Gieo hạt giống F1 đã qua kiểm định.',
  '6a0fdb52559c052f3e2b7c54': 'Bón 12 kg phân NPK theo định mức canh tác.',
  '6a0fdb93559c052f3e2b7ca2': 'Gieo hạt giống F1 đã qua kiểm định.',
  '6a0fdbaf559c052f3e2b7cdd': 'Bón 12 kg phân NPK theo định mức canh tác.',
  '6a0fdc41559c052f3e2b7d9e': 'Tưới nước theo lịch canh tác, độ ẩm đất đạt yêu cầu.',
  '6a0fdc91559c052f3e2b7de8': 'Kiểm tra sâu bệnh định kỳ, không phát hiện dấu hiệu bất thường.',
  '6a0fdcd5559c052f3e2b7e23': 'Gieo hạt giống F1 đã qua kiểm định.',
  '6a33b296e364d09b32f991ae': 'Bàn giao lô hàng cho kho trung chuyển; xe lạnh duy trì nhiệt độ ổn định.',
};

const sampleImage = (filename: string) => ({
  path: `/uploads/sample-media/${filename}`,
  filename,
});

const sampleVideo = (filename: string) => ({
  path: `/uploads/sample-media/${filename}`,
  filename,
  mimeType: 'video/mp4',
});

const PRODUCT_DEFAULT_IMAGES = [
  { pattern: /xoài|mango/i, filename: 'mango-harvest.png' },
  { pattern: /bưởi|pomelo/i, filename: 'fruit-packaging.png' },
  { pattern: /cà chua|tomato/i, filename: 'cherry-tomatoes.png' },
  { pattern: /xà lách|lettuce/i, filename: 'hydroponic-lettuce.png' },
  { pattern: /dưa lưới|cantaloupe|melon/i, filename: 'cantaloupe.png' },
  { pattern: /ớt chuông|bell pepper|pepper/i, filename: 'bell-peppers.png' },
  { pattern: /trứng|egg/i, filename: 'free-range-eggs.png' },
  { pattern: /khoai lang|sweet potato/i, filename: 'sweet-potatoes.png' },
  { pattern: /rau mùi|rau dền|herb|amaranth|coriander/i, filename: 'fresh-herbs-amaranth.png' },
  { pattern: /rau ăn lá|rau|leaf/i, filename: 'hydroponic-lettuce.png' },
  { pattern: /trái cây|fruit/i, filename: 'fruit-packaging.png' },
] as const;

const resolveProductImage = (name = '', category = '') => {
  const text = `${name} ${category}`;
  return PRODUCT_DEFAULT_IMAGES.find((item) => item.pattern.test(text))?.filename || 'fruit-packaging.png';
};

const EVENT_MEDIA: Record<
  string,
  {
    images?: { path: string; filename: string }[];
    videos?: { path: string; filename: string; mimeType: string }[];
    details?: Record<string, string | number | boolean>;
  }
> = {
  '6a0fda8090c8a58380d6d8d9': {
    images: [sampleImage('mango-harvest.png')],
    videos: [sampleVideo('harvest-field-video.mp4')],
    details: {
      harvestTeam: 'Tổ thu hoạch Cái Bè',
      qualityGrade: 'Loại A',
      temperatureC: 29,
    },
  },
  '6a0fda8090c8a58380d6d8dc': {
    images: [sampleImage('hydroponic-lettuce.png')],
    details: {
      ec: 1.6,
      ph: 6.1,
      nutrientSolution: 'Dung dịch thủy canh rau ăn lá',
    },
  },
  '6a0fda8090c8a58380d6d8da': {
    images: [sampleImage('fruit-packaging.png')],
    videos: [sampleVideo('packing-line-video.mp4')],
    details: {
      packageType: 'Thùng carton 5 kg',
      packageCount: 160,
      inspector: 'QC-01',
    },
  },
};

const SAMPLE_TRACE_EVENTS: {
  key: string;
  product: string;
  eventType: ActionType;
  description: string;
  details: Record<string, string | number | boolean>;
  images?: { path: string; filename: string }[];
  videos?: { path: string; filename: string; mimeType: string }[];
}[] = [
  {
    key: 'mango-bagging-demo',
    product: '6a0fdaad7ecb33512b9d4c7a',
    eventType: 'PEST_CONTROL',
    description: 'Bao trái xoài sau khi kiểm tra sâu bệnh, loại bỏ quả trầy xước và đánh dấu cây theo hàng.',
    details: {
      pestName: 'Ruồi đục quả',
      treatment: 'Bao trái + bẫy sinh học',
      dosage: 'Không phun hóa chất',
      preHarvestIntervalDays: 21,
    },
    images: [sampleImage('mango-harvest.png')],
  },
  {
    key: 'lettuce-nutrient-check-demo',
    product: '6a0fdaae7ecb33512b9d4c7d',
    eventType: 'WATERING',
    description: 'Kiểm tra pH/EC dung dịch thủy canh, bổ sung nước sạch và cân bằng dinh dưỡng cho giàn rau.',
    details: {
      wateringMethod: 'Tuần hoàn thủy canh',
      waterVolume: 80,
      waterUnit: 'lít',
      ph: 6.1,
      ec: 1.6,
    },
    images: [sampleImage('hydroponic-lettuce.png')],
  },
  {
    key: 'mango-postharvest-packaging-demo',
    product: '6a0fdaad7ecb33512b9d4c7a',
    eventType: 'PACKAGING',
    description: 'Rửa, phân loại và đóng thùng xoài theo quy cách xuất kho, loại bỏ quả dập trước khi niêm phong.',
    details: {
      packageType: 'Thùng carton 5 kg',
      packageCount: 160,
      qualityGrade: 'Loại A',
      storageTemperatureC: 12,
    },
    images: [sampleImage('fruit-packaging.png')],
    videos: [sampleVideo('packing-line-video.mp4')],
  },
  {
    key: 'tomato-cold-shipping-demo',
    product: '6a0fdaad7ecb33512b9d4c7c',
    eventType: 'SHIPPING',
    description: 'Vận chuyển cà chua bằng xe lạnh đến điểm bán lẻ, kiểm tra nhiệt độ thùng trước khi niêm phong.',
    details: {
      vehicle: 'Xe lạnh 1.5 tấn',
      destination: 'Điểm bán lẻ Đà Lạt',
      distanceKm: 18,
      temperatureC: 8.5,
    },
    videos: [sampleVideo('harvest-field-video.mp4')],
  },
];

async function repairReferences(fallbackUserId: Types.ObjectId) {
  const userIds = await User.distinct('_id');
  const productIds = await Product.distinct('_id');
  const areaIds = await FarmingArea.distinct('_id');
  const validProductIds = new Set(productIds.map(String));
  const invalidCertificationProductIds = (await Certification.distinct('products')).filter(
    (id) => id && !validProductIds.has(String(id))
  );
  const invalidRelatedProductIds = (await SupplyChainRecord.distinct('related_products')).filter(
    (id) => id && !validProductIds.has(String(id))
  );
  const invalidDiseaseDetectionProductIds = (await DiseaseDetection.distinct('product')).filter(
    (id) => id && !validProductIds.has(String(id))
  );

  const labels = [
    'farmingAreaOwner',
    'productCreator',
    'traceEventRecorder',
    'certificationHolder',
    'inspectionCreator',
    'organizationCreator',
    'supplyChainRecordCreator',
    'invalidFarmingArea',
    'invalidCertificationProducts',
    'invalidRelatedProducts',
    'diseaseDetectionActor',
    'invalidDiseaseDetections',
  ] as const;
  const results = await Promise.all([
    FarmingArea.updateMany({ owner: { $nin: userIds } }, { $set: { owner: fallbackUserId } }),
    Product.updateMany({ created_by: { $nin: userIds } }, { $set: { created_by: fallbackUserId } }),
    TraceEvent.updateMany({ recorded_by: { $nin: userIds } }, { $set: { recorded_by: fallbackUserId } }),
    Certification.updateMany({ holder: { $nin: userIds } }, { $set: { holder: fallbackUserId } }),
    QualityInspection.updateMany({ created_by: { $nin: userIds } }, { $set: { created_by: fallbackUserId } }),
    SupplyChainOrganization.updateMany({ created_by: { $nin: userIds } }, { $set: { created_by: fallbackUserId } }),
    SupplyChainRecord.updateMany({ created_by: { $nin: userIds } }, { $set: { created_by: fallbackUserId } }),
    Product.updateMany({ farming_area: { $exists: true, $nin: areaIds } }, { $unset: { farming_area: 1 } }),
    invalidCertificationProductIds.length
      ? Certification.updateMany(
          {},
          { $pull: { products: { $in: invalidCertificationProductIds } } }
        )
      : Promise.resolve({ modifiedCount: 0 }),
    invalidRelatedProductIds.length
      ? SupplyChainRecord.updateMany(
          {},
          { $pull: { related_products: { $in: invalidRelatedProductIds } } }
        )
      : Promise.resolve({ modifiedCount: 0 }),
    DiseaseDetection.updateMany({ detected_by: { $nin: userIds } }, { $set: { detected_by: fallbackUserId } }),
    invalidDiseaseDetectionProductIds.length
      ? DiseaseDetection.deleteMany({ product: { $in: invalidDiseaseDetectionProductIds } })
      : Promise.resolve({ modifiedCount: 0 }),
  ]);

  return Object.fromEntries(
    labels.map((label, index) => {
      const result = results[index] as { modifiedCount?: number; deletedCount?: number };
      return [label, result.modifiedCount ?? result.deletedCount ?? 0];
    })
  );
}

async function normalizeBaseData(fallbackUserId: Types.ObjectId) {
  for (const [id, data] of Object.entries(AREA_DATA)) {
    await FarmingArea.findOneAndUpdate(
      { _id: oid(id) },
      {
        $set: {
          ...data,
          owner: fallbackUserId,
          images: [],
          certifications: [],
          status: 'active',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );
  }
  for (const [id, data] of Object.entries(PRODUCT_NAMES)) {
    const farmingArea = PRODUCT_FARMING_AREAS[id];
    const profile = PRODUCT_PROFILES[id];
    await Product.updateOne(
      { _id: oid(id) },
      {
        $set: {
          ...data,
          ...(profile
            ? {
                batch_code: profile.batch_code,
                status: profile.status,
                cultivation_time: profile.cultivation_time,
              }
            : {}),
          ...(farmingArea ? { farming_area: oid(farmingArea) } : {}),
        },
      }
    );
  }
  for (const [id, description] of Object.entries(EVENT_DESCRIPTIONS)) {
    await TraceEvent.updateOne({ _id: oid(id) }, { $set: { description } });
  }
  for (const [id, media] of Object.entries(EVENT_MEDIA)) {
    await TraceEvent.updateOne({ _id: oid(id) }, { $set: media });
  }

  await User.updateOne(
    { email: 'admin@gmail.com' },
    { $set: { first_name: 'Quản trị', last_name: 'AgriTrace', avatar: DEFAULT_USER_AVATAR, isActive: true } }
  );
  await User.updateOne(
    { email: 'farmer@gmail.com' },
    { $set: { first_name: 'Trần', last_name: 'Thị Nông', avatar: DEFAULT_USER_AVATAR, isActive: true } }
  );
  await User.updateOne(
    { email: 'farmerb@gmail.com' },
    { $set: { first_name: 'Nguyễn', last_name: 'Văn Vườn', avatar: DEFAULT_USER_AVATAR, isActive: true } }
  );

  await User.updateMany(
    { $or: [{ avatar: { $exists: false } }, { avatar: '' }, { avatar: null }] },
    { $set: { avatar: DEFAULT_USER_AVATAR } }
  );

  await Certification.updateOne(
    { certificate_number: 'VIETGAP-2026-07' },
    {
      $set: {
        name: 'Chứng nhận VietGAP',
        type: 'VietGAP',
        issuing_authority: 'Sở Nông nghiệp và Môi trường Tiền Giang',
        status: 'valid',
        products: [oid('6a0fdaad7ecb33512b9d4c7a'), oid('6a0fdaae7ecb33512b9d4c7e')],
      },
    }
  );

  await TraceEvent.updateMany(
    { product: { $in: await Product.distinct('_id') } },
    [{ $set: { batchId: { $toString: '$product' } } }]
  );

  await Product.updateMany(
    { isDeleted: { $exists: false } },
    { $set: { isDeleted: false } }
  );

  await SupplyChainOrganization.updateMany(
    { tax_code: '' },
    { $unset: { tax_code: 1 } }
  );

  return repairReferences(fallbackUserId);
}

async function ensureHarvestEvents(createdBy: Types.ObjectId) {
  let harvestEventsUpserted = 0;

  for (const [id, profile] of Object.entries(PRODUCT_PROFILES)) {
    if (!profile.harvest_at) continue;

    const product = await Product.findById(oid(id)).select('_id name');
    if (!product) continue;

    const harvestAt = new Date(profile.harvest_at);
    const result = await TraceEvent.findOneAndUpdate(
      { product: product._id, 'details.seed_key': `harvest-${profile.batch_code}` },
      {
        $set: {
          product: product._id,
          batchId: product._id.toString(),
          eventType: 'HARVESTING' as ActionType,
          description: `Thu hoạch ${product.name} theo lịch lô ${profile.batch_code}.`,
          details: {
            seed_key: `harvest-${profile.batch_code}`,
            source: 'normalized-demo-data',
            batch_code: profile.batch_code,
            harvestDate: profile.harvest_at,
            qualityGrade: 'Loại A',
          },
          images: [sampleImage(resolveProductImage(product.name, ''))],
          videos: [],
          recorded_by: createdBy,
          onChainStatus: 'skipped',
          dataHashVersion: 'v2',
          createdAt: harvestAt,
          updatedAt: harvestAt,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true, timestamps: false }
    );
    if (result) harvestEventsUpserted += 1;
  }

  return { harvestEventsUpserted };
}

async function seedFarmingAreaDemo(createdBy: Types.ObjectId) {
  const areas = [
    {
      _id: oid('6b1000000000000000000001'),
      name: 'Vườn xoài VietGAP Cái Bè - Khu A',
      address: 'Ấp Mỹ Lợi, xã Hòa Khánh, Cái Bè, Tiền Giang',
      coordinates: { lat: 10.3527, lng: 105.9462 },
      area_size: 3.8,
      description:
        'Vườn xoài cát chu canh tác theo VietGAP, có hệ thống tưới nhỏ giọt và nhật ký chăm sóc định kỳ.',
      images: [sampleImage('mango-harvest.png')],
    },
    {
      _id: oid('6b1000000000000000000002'),
      name: 'Nhà kính rau thủy canh Đà Lạt - Dãy B',
      address: 'Phường 8, Đà Lạt, Lâm Đồng',
      coordinates: { lat: 11.9678, lng: 108.4426 },
      area_size: 1.2,
      description:
        'Khu nhà kính trồng xà lách, rau mùi và rau ăn lá bằng hệ thống thủy canh tuần hoàn.',
      images: [sampleImage('hydroponic-lettuce.png')],
    },
    {
      _id: oid('6b1000000000000000000003'),
      name: 'Trang trại bưởi hữu cơ Chợ Lách',
      address: 'Chợ Lách, Bến Tre',
      coordinates: { lat: 10.2455, lng: 106.1372 },
      area_size: 4.6,
      description:
        'Vườn bưởi da xanh theo hướng hữu cơ, ưu tiên phân compost và bẫy sinh học.',
      images: [sampleImage('fruit-packaging.png')],
    },
    {
      _id: oid('6b1000000000000000000004'),
      name: 'Khu rau màu ven sông Cần Thơ',
      address: 'Cái Răng, Cần Thơ',
      coordinates: { lat: 10.0078, lng: 105.7431 },
      area_size: 2.4,
      description:
        'Khu canh tác rau củ ngắn ngày, phù hợp demo kiểm nghiệm, tồn kho và vận chuyển nội vùng.',
      images: [sampleImage('hydroponic-lettuce.png')],
    },
  ];

  for (const area of areas) {
    await FarmingArea.findOneAndUpdate(
      { _id: area._id },
      {
        $set: {
          ...area,
          owner: createdBy,
          certifications: [],
          status: 'active',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );
  }

  const products = [
    {
      _id: oid('6b2000000000000000000001'),
      batch_code: 'DEMO-MANGO-A-2026',
      name: 'Xoài Cát Chu - Khu A tháng 6',
      category: 'Trái cây',
      type: 'Plant',
      description: 'Lô xoài cát chu tuyển chọn từ khu A, trái đồng đều, chuẩn đóng thùng 5kg.',
      origin: 'Cái Bè, Tiền Giang',
      cultivation_time: '2026-02-15 đến 2026-06-10',
      farming_area: oid('6b1000000000000000000001'),
      initial_quantity: 980,
      current_quantity: 760,
      unit: 'kg',
      images: [sampleImage('mango-harvest.png')],
      live_cameras: [
        {
          name: 'Camera vườn xoài khu A',
          stream_url: 'https://www.youtube.com/watch?v=5qap5aO4i9A',
          location: 'Cổng vườn khu A',
          is_active: true,
        },
      ],
    },
    {
      _id: oid('6b2000000000000000000002'),
      batch_code: 'DEMO-LETTUCE-B-2026',
      name: 'Xà Lách Romaine thủy canh',
      category: 'Rau ăn lá',
      type: 'Plant',
      description: 'Lô xà lách romaine thu từ hệ thống thủy canh tuần hoàn, đóng túi 500g.',
      origin: 'Đà Lạt, Lâm Đồng',
      cultivation_time: '2026-05-05 đến 2026-06-05',
      farming_area: oid('6b1000000000000000000002'),
      initial_quantity: 260,
      current_quantity: 210,
      unit: 'kg',
      images: [sampleImage('hydroponic-lettuce.png')],
      live_cameras: [
        {
          name: 'Camera nhà kính dãy B',
          stream_url: 'https://www.youtube.com/watch?v=21X5lGlDOfg',
          location: 'Dãy B - giàn thủy canh',
          is_active: true,
        },
      ],
    },
    {
      _id: oid('6b2000000000000000000003'),
      batch_code: 'DEMO-POMELO-C-2026',
      name: 'Bưởi Da Xanh hữu cơ',
      category: 'Trái cây',
      type: 'Plant',
      description: 'Lô bưởi da xanh thu hoạch chọn lọc, không xử lý hóa chất sau thu hoạch.',
      origin: 'Chợ Lách, Bến Tre',
      cultivation_time: '2025-12-20 đến 2026-06-12',
      farming_area: oid('6b1000000000000000000003'),
      initial_quantity: 720,
      current_quantity: 620,
      unit: 'kg',
      images: [sampleImage('fruit-packaging.png')],
      live_cameras: [],
    },
    {
      _id: oid('6b2000000000000000000004'),
      batch_code: 'DEMO-CUCUMBER-D-2026',
      name: 'Dưa leo baby Cần Thơ',
      category: 'Rau quả',
      type: 'Plant',
      description: 'Dưa leo baby thu trong ngày, phân loại theo kích cỡ trước khi nhập kho.',
      origin: 'Cái Răng, Cần Thơ',
      cultivation_time: '2026-05-01 đến 2026-06-01',
      farming_area: oid('6b1000000000000000000004'),
      initial_quantity: 430,
      current_quantity: 390,
      unit: 'kg',
      images: [sampleImage('hydroponic-lettuce.png')],
      live_cameras: [],
    },
  ] as const;

  for (const product of products) {
    await Product.findOneAndUpdate(
      { _id: product._id },
      {
        $set: {
          ...product,
          status: 'active',
          created_by: createdBy,
          isDeleted: false,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );

    await InventoryTransaction.findOneAndUpdate(
      { 'metadata.seed_key': `area-demo-${product.batch_code}-initial` },
      {
        $set: {
          product: product._id,
          type: 'INITIAL',
          quantity: product.initial_quantity,
          unit: product.unit,
          balance_before: 0,
          balance_after: product.initial_quantity,
          related_products: [],
          note: `Khởi tạo tồn kho cho ${product.name}`,
          occurred_at: new Date('2026-06-01T01:00:00.000Z'),
          metadata: {
            seed_key: `area-demo-${product.batch_code}-initial`,
            source: 'area-demo-data',
          },
          created_by: createdBy,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );
  }

  const traceEvents = [
    {
      key: 'area-demo-mango-fertilizing',
      product: oid('6b2000000000000000000001'),
      eventType: 'FERTILIZING' as ActionType,
      description: 'Bón phân hữu cơ hoai mục kết hợp kali trước thu hoạch 30 ngày.',
      details: { fertilizer: 'Compost + Kali', amount: 120, unit: 'kg', weather: 'Nắng nhẹ' },
      images: [sampleImage('mango-harvest.png')],
    },
    {
      key: 'area-demo-mango-harvest',
      product: oid('6b2000000000000000000001'),
      eventType: 'HARVESTING' as ActionType,
      description: 'Thu hoạch xoài đạt độ chín thương phẩm, loại bỏ trái dập và trái sâu.',
      details: { harvestTeam: 'Tổ thu hoạch Cái Bè 02', gradeA: 82, unit: '%' },
      images: [sampleImage('mango-harvest.png')],
    },
    {
      key: 'area-demo-lettuce-water',
      product: oid('6b2000000000000000000002'),
      eventType: 'WATERING' as ActionType,
      description: 'Kiểm tra pH/EC dung dịch thủy canh và bổ sung nước sạch.',
      details: { ph: 6.2, ec: 1.55, waterVolume: 65, waterUnit: 'lít' },
      images: [sampleImage('hydroponic-lettuce.png')],
    },
    {
      key: 'area-demo-pomelo-pest',
      product: oid('6b2000000000000000000003'),
      eventType: 'PEST_CONTROL' as ActionType,
      description: 'Đặt bẫy sinh học ruồi vàng và bao trái bưởi trước giai đoạn lớn nhanh.',
      details: { pestName: 'Ruồi vàng', treatment: 'Bẫy sinh học + bao trái', chemicalFree: true },
      images: [sampleImage('fruit-packaging.png')],
    },
    {
      key: 'area-demo-cucumber-packaging',
      product: oid('6b2000000000000000000004'),
      eventType: 'PACKAGING' as ActionType,
      description: 'Rửa sạch, làm ráo và đóng khay dưa leo baby theo quy cách 1kg.',
      details: { packageType: 'Khay 1 kg', packageCount: 390, qcStaff: 'QC-CT-01' },
      images: [sampleImage('hydroponic-lettuce.png')],
    },
  ];

  for (const event of traceEvents) {
    await TraceEvent.findOneAndUpdate(
      { product: event.product, 'details.seed_key': event.key },
      {
        $set: {
          product: event.product,
          batchId: event.product.toString(),
          eventType: event.eventType,
          description: event.description,
          details: {
            ...event.details,
            seed_key: event.key,
            source: 'area-demo-data',
          },
          images: event.images,
          videos: [],
          recorded_by: createdBy,
          onChainStatus: 'skipped',
          dataHashVersion: 'v2',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );
  }

  return {
    farmingAreasUpserted: areas.length,
    productsUpserted: products.length,
    traceEventsUpserted: traceEvents.length,
  };
}

async function attachProductsToExistingFarmingAreas() {
  const fallbackAreaId = oid('6a0fdaac7ecb33512b9d4c77');
  const rules = [
    { pattern: /Đà Lạt|Lâm Đồng|Phường 8/i, areaId: oid('6a0fdaac7ecb33512b9d4c78') },
    { pattern: /Chợ Lách|Bến Tre/i, areaId: oid('6a0fdaad7ecb33512b9d4c79') },
    { pattern: /Cần Thơ|Cái Răng/i, areaId: oid('6b1000000000000000000004') },
    { pattern: /Cái Bè|Tiền Giang/i, areaId: fallbackAreaId },
  ];

  const products = await Product.find({
    $or: [{ farming_area: { $exists: false } }, { farming_area: null }],
  }).select('_id origin');

  let productsAttached = 0;
  for (const product of products) {
    const origin = product.origin || '';
    const matched = rules.find((rule) => rule.pattern.test(origin));
    const areaId = matched?.areaId || fallbackAreaId;
    const areaExists = await FarmingArea.exists({ _id: areaId });
    if (!areaExists) continue;

    const result = await Product.updateOne(
      { _id: product._id },
      { $set: { farming_area: areaId } },
      { runValidators: true }
    );
    productsAttached += result.modifiedCount;
  }

  return { productsAttached };
}

async function seedTraceEventMedia(createdBy: Types.ObjectId) {
  let traceEventsUpserted = 0;

  for (const event of SAMPLE_TRACE_EVENTS) {
    const productId = oid(event.product);
    const product = await Product.findById(productId).select('_id');
    if (!product) continue;

    const result = await TraceEvent.findOneAndUpdate(
      {
        product: productId,
        'details.seed_key': event.key,
      },
      {
        $set: {
          product: productId,
          batchId: event.product,
          eventType: event.eventType,
          description: event.description,
          details: {
            ...event.details,
            seed_key: event.key,
            source: 'normalized-demo-data',
          },
          images: event.images || [],
          videos: event.videos || [],
          recorded_by: createdBy,
          onChainStatus: 'skipped',
          dataHashVersion: 'v2',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );
    if (result) traceEventsUpserted += 1;
  }

  return { traceEventsUpserted };
}

async function seedOrganizations(createdBy: Types.ObjectId) {
  const organizations = [
    { key: 'cooperative', name: 'Hợp tác xã Nông nghiệp Cái Bè', type: 'COOPERATIVE', tax_code: '1201680001', address: 'Cái Bè, Tiền Giang', contact_name: 'Trần Thị Nông', phone: '0901000001', email: 'caibe@agritrace.vn' },
    { key: 'processor', name: 'Nhà máy Sơ chế AgriFresh', type: 'PROCESSOR', tax_code: '0318000002', address: 'Tân An, Long An', contact_name: 'Lê Minh Khang', phone: '0901000002', email: 'soche@agritrace.vn' },
    { key: 'warehouse', name: 'Kho lạnh Mekong', type: 'WAREHOUSE', tax_code: '1801800003', address: 'Cái Răng, Cần Thơ', contact_name: 'Phạm Hoài Nam', phone: '0901000003', email: 'kho@agritrace.vn' },
    { key: 'carrier', name: 'Vận tải Lạnh Đồng Bằng', type: 'CARRIER', tax_code: '0318000004', address: 'Bình Chánh, TP. Hồ Chí Minh', contact_name: 'Võ Thành Công', phone: '0901000004', email: 'vantai@agritrace.vn' },
    { key: 'distributor', name: 'Phân phối Nông sản Việt', type: 'DISTRIBUTOR', tax_code: '0318000005', address: 'Thủ Đức, TP. Hồ Chí Minh', contact_name: 'Nguyễn Minh Anh', phone: '0901000005', email: 'phanphoi@agritrace.vn' },
    { key: 'retailer', name: 'Siêu thị Nông sản Xanh', type: 'RETAILER', tax_code: '0318000006', address: 'Quận 7, TP. Hồ Chí Minh', contact_name: 'Đặng Thu Hà', phone: '0901000006', email: 'banle@agritrace.vn' },
    { key: 'supplier', name: 'Công ty Vật tư Nông nghiệp Miền Tây', type: 'SUPPLIER', tax_code: '1801800007', address: 'Ninh Kiều, Cần Thơ', contact_name: 'Bùi Quốc Huy', phone: '0901000007', email: 'vattu@agritrace.vn' },
  ] as const;

  const ids: Record<string, Types.ObjectId> = {};
  for (const organization of organizations) {
    const { key, ...data } = organization;
    const document = await SupplyChainOrganization.findOneAndUpdate(
      { tax_code: data.tax_code },
      { $set: { ...data, active: true, created_by: createdBy } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    ids[key] = document._id;
  }
  return ids;
}

async function seedSupplyChain(createdBy: Types.ObjectId, org: Record<string, Types.ObjectId>) {
  const products = await Product.find({}).sort({ createdAt: 1 }).limit(4).select('_id name');
  if (products.length < 2) throw new Error('Cần ít nhất 2 sản phẩm để tạo dữ liệu chuỗi cung ứng.');

  const primary = products[0]._id;
  const secondary = products[1]._id;
  const records = [
    { key: 'demo-transfer', product: primary, operation_type: 'TRANSFER', title: 'Bàn giao nông sản từ hợp tác xã', description: 'Kiểm đếm, niêm phong và bàn giao lô hàng cho đơn vị sơ chế.', from_organization: org.cooperative, to_organization: org.processor, status: 'COMPLETED', quantity: 1200, unit: 'kg', occurred_at: new Date('2026-05-15T03:00:00.000Z'), location: 'Cái Bè, Tiền Giang' },
    { key: 'demo-processing', product: primary, operation_type: 'PROCESSING', title: 'Sơ chế và phân loại', description: 'Rửa, làm sạch, phân cỡ và đóng thùng theo tiêu chuẩn.', from_organization: org.processor, to_organization: org.processor, status: 'COMPLETED', quantity: 1165, unit: 'kg', occurred_at: new Date('2026-05-15T08:00:00.000Z'), location: 'Tân An, Long An' },
    { key: 'demo-split', product: primary, related_products: [secondary], operation_type: 'SPLIT', title: 'Tách lô theo quy cách đóng gói', description: 'Tách một phần sản lượng sang lô đóng gói bán lẻ.', from_organization: org.processor, to_organization: org.processor, status: 'COMPLETED', quantity: 350, unit: 'kg', occurred_at: new Date('2026-05-15T09:30:00.000Z'), location: 'Tân An, Long An' },
    { key: 'demo-warehouse-in', product: primary, operation_type: 'WAREHOUSE_IN', title: 'Nhập kho lạnh', description: 'Tiếp nhận lô hàng, kiểm tra niêm phong và điều kiện bảo quản.', from_organization: org.processor, to_organization: org.warehouse, status: 'COMPLETED', quantity: 815, unit: 'kg', occurred_at: new Date('2026-05-15T12:00:00.000Z'), location: 'Cái Răng, Cần Thơ', temperature: 8, humidity: 75 },
    { key: 'demo-warehouse-out', product: primary, operation_type: 'WAREHOUSE_OUT', title: 'Xuất kho giao nhà phân phối', description: 'Xuất kho theo nguyên tắc nhập trước, xuất trước.', from_organization: org.warehouse, to_organization: org.carrier, status: 'COMPLETED', quantity: 815, unit: 'kg', occurred_at: new Date('2026-05-16T00:30:00.000Z'), location: 'Cái Răng, Cần Thơ', temperature: 8.4, humidity: 73 },
    { key: 'demo-transport', product: primary, operation_type: 'TRANSPORT', title: 'Vận chuyển bằng xe lạnh', description: 'Theo dõi điều kiện vận chuyển xuyên suốt hành trình.', from_organization: org.carrier, to_organization: org.distributor, status: 'COMPLETED', quantity: 815, unit: 'kg', occurred_at: new Date('2026-05-16T02:00:00.000Z'), location: 'Cần Thơ – TP. Hồ Chí Minh', temperature: 9.1, humidity: 72, vehicle: '51D-123.45', driver: 'Nguyễn Văn Bình' },
    { key: 'demo-retail-transfer', product: primary, operation_type: 'TRANSFER', title: 'Phân phối đến điểm bán lẻ', description: 'Bàn giao đủ số lượng, bao bì nguyên vẹn.', from_organization: org.distributor, to_organization: org.retailer, status: 'COMPLETED', quantity: 800, unit: 'kg', occurred_at: new Date('2026-05-16T08:00:00.000Z'), location: 'Quận 7, TP. Hồ Chí Minh' },
    { key: 'demo-merge', product: secondary, related_products: [primary], operation_type: 'MERGE', title: 'Gộp lô giao cùng chuyến', description: 'Gộp các lô cùng tiêu chuẩn để tối ưu chuyến giao hàng.', from_organization: org.distributor, to_organization: org.retailer, status: 'COMPLETED', quantity: 500, unit: 'kg', occurred_at: new Date('2026-05-17T02:00:00.000Z'), location: 'Thủ Đức, TP. Hồ Chí Minh' },
  ] as const;

  for (const record of records) {
    const { key, ...data } = record;
    await SupplyChainRecord.findOneAndUpdate(
      { 'metadata.seed_key': key },
      { $set: { ...data, metadata: { seed_key: key, source: 'normalized-demo-data' }, created_by: createdBy } },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );
  }
}

async function seedQualityInspections(createdBy: Types.ObjectId) {
  const products = await Product.find({}).sort({ createdAt: 1 }).limit(3).select('_id');
  const reports = [
    { report_number: 'KN-2026-001', product: products[0]?._id, inspection_type: 'PESTICIDE_RESIDUE', laboratory: 'Trung tâm Kỹ thuật Tiêu chuẩn Đo lường Chất lượng 3', sample_date: new Date('2026-05-14T00:00:00.000Z'), result_date: new Date('2026-05-15T00:00:00.000Z'), result: 'passed', summary: 'Không phát hiện dư lượng thuốc bảo vệ thực vật vượt ngưỡng.', metrics: [{ name: 'Carbendazim', value: '< 0.01', unit: 'mg/kg', limit: '0.1 mg/kg', passed: true }] },
    { report_number: 'KN-2026-002', product: products[1]?._id, inspection_type: 'MICROBIOLOGY', laboratory: 'Viện Pasteur TP. Hồ Chí Minh', sample_date: new Date('2026-05-15T00:00:00.000Z'), result_date: new Date('2026-05-16T00:00:00.000Z'), result: 'passed', summary: 'Các chỉ tiêu vi sinh nằm trong giới hạn cho phép.', metrics: [{ name: 'E. coli', value: 'Không phát hiện', unit: 'CFU/g', limit: '10 CFU/g', passed: true }] },
    { report_number: 'KN-2026-003', product: products[2]?._id, inspection_type: 'HEAVY_METAL', laboratory: 'Trung tâm Phân tích và Chứng nhận Chất lượng', sample_date: new Date('2026-05-16T00:00:00.000Z'), result_date: new Date('2026-05-17T00:00:00.000Z'), result: 'passed', summary: 'Hàm lượng kim loại nặng đạt quy chuẩn an toàn thực phẩm.', metrics: [{ name: 'Chì (Pb)', value: '0.018', unit: 'mg/kg', limit: '0.1 mg/kg', passed: true }] },
  ] as const;

  for (const report of reports) {
    if (!report.product) continue;
    await QualityInspection.findOneAndUpdate(
      { report_number: report.report_number },
      { $set: { ...report, created_by: createdBy } },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );
  }
}

async function seedDiseaseDetections(createdBy: Types.ObjectId) {
  const products = await Product.find({}).sort({ createdAt: 1 }).limit(4).select('_id name');
  const detections = [
    {
      key: 'disease-mango-leaf-spot',
      product: products[0]?._id,
      crop_name: products[0]?.name || 'Xoài Cát Chu',
      symptoms: ['Đốm nâu', 'Cháy lá', 'Vàng lá'],
      notes: 'Một số lá già có đốm nâu lan từ mép sau đợt mưa lớn.',
      top_disease: {
        disease_code: 'leaf_spot',
        disease_name: 'Đốm lá do nấm',
        confidence: 0.81,
        risk_level: 'medium',
        description: 'Lá xuất hiện đốm nâu/vàng hoặc vùng cháy mép, thường liên quan đến nấm bệnh và ẩm độ cao.',
        recommendations: [
          'Tỉa bỏ lá bệnh và gom ra khỏi khu vực canh tác.',
          'Giảm tưới phun lên tán lá, tăng thông thoáng luống trồng.',
          'Theo dõi 2-3 ngày và tham khảo cán bộ kỹ thuật nếu vết bệnh lan nhanh.',
        ],
      },
    },
    {
      key: 'disease-tomato-wilt',
      product: products[2]?._id,
      crop_name: products[2]?.name || 'Cà Chua Bi Đà Lạt',
      symptoms: ['Héo rũ', 'Thối rễ'],
      notes: 'Cây héo nhanh vào buổi trưa, một số gốc có dấu hiệu thối rễ.',
      top_disease: {
        disease_code: 'bacterial_wilt',
        disease_name: 'Héo xanh/héo rũ',
        confidence: 0.86,
        risk_level: 'high',
        description: 'Cây héo nhanh, rũ lá hoặc thối rễ có thể là dấu hiệu bệnh hệ thống, nguy cơ ảnh hưởng cả luống.',
        recommendations: [
          'Đánh dấu và cách ly cây nghi nhiễm ngay.',
          'Kiểm tra độ ẩm đất, rễ và lịch tưới gần nhất.',
          'Báo kỹ thuật viên để xác nhận trước khi xử lý diện rộng.',
        ],
      },
    },
    {
      key: 'disease-lettuce-healthy',
      product: products[3]?._id,
      crop_name: products[3]?.name || 'Xà Lách Thủy Canh',
      symptoms: ['Chậm lớn'],
      notes: 'Không có vết bệnh rõ, chỉ ghi nhận sinh trưởng chậm nhẹ.',
      top_disease: {
        disease_code: 'nutrient_stress',
        disease_name: 'Thiếu dinh dưỡng hoặc stress môi trường',
        confidence: 0.62,
        risk_level: 'low',
        description: 'Cây sinh trưởng chậm hoặc lá nhạt màu có thể do dinh dưỡng, nước tưới hoặc thời tiết.',
        recommendations: [
          'Kiểm tra nồng độ dinh dưỡng và pH dung dịch.',
          'Theo dõi lô trong 5-7 ngày sau điều chỉnh chăm sóc.',
        ],
      },
    },
  ] as const;

  let upserted = 0;
  for (const detection of detections) {
    if (!detection.product) continue;
    const candidates = [detection.top_disease];
    const result = await DiseaseDetection.findOneAndUpdate(
      { 'notes': detection.notes, product: detection.product },
      {
        $set: {
          product: detection.product,
          crop_name: detection.crop_name,
          symptoms: detection.symptoms,
          notes: detection.notes,
          images: [],
          candidates,
          top_disease: detection.top_disease,
          overall_risk: detection.top_disease.risk_level,
          model_version: 'ruleset-v1',
          detected_by: createdBy,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );
    if (result) upserted += 1;
  }

  return { diseaseDetectionsUpserted: upserted };
}

async function normalizeInventory(createdBy: Types.ObjectId) {
  let productsUpdated = 0;
  let transactionsUpserted = 0;

  for (const [id, inventory] of Object.entries(PRODUCT_INVENTORY)) {
    const productId = oid(id);
    const product = await Product.findById(productId).select('_id name');
    if (!product) continue;

    const updateResult = await Product.updateOne(
      { _id: productId },
      {
        $set: {
          initial_quantity: inventory.initial_quantity,
          current_quantity: inventory.current_quantity,
          unit: inventory.unit,
        },
      },
      { runValidators: true }
    );
    productsUpdated += updateResult.modifiedCount;

    const initialKey = `inventory-${id}-initial`;
    const initialTx = await InventoryTransaction.findOneAndUpdate(
      { 'metadata.seed_key': initialKey },
      {
        $set: {
          product: productId,
          type: 'INITIAL',
          quantity: inventory.initial_quantity,
          unit: inventory.unit,
          balance_before: 0,
          balance_after: inventory.initial_quantity,
          related_products: [],
          note: `Khởi tạo tồn kho mẫu: ${inventory.note}`,
          occurred_at: new Date('2026-05-14T00:00:00.000Z'),
          metadata: {
            seed_key: initialKey,
            source: 'normalized-demo-data',
          },
          created_by: createdBy,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );
    if (initialTx) transactionsUpserted += 1;

    const adjustedQuantity = inventory.initial_quantity - inventory.current_quantity;
    const adjustKey = `inventory-${id}-adjust-out`;
    if (adjustedQuantity > 0) {
      const adjustTx = await InventoryTransaction.findOneAndUpdate(
        { 'metadata.seed_key': adjustKey },
        {
          $set: {
            product: productId,
            type: 'ADJUST_OUT',
            quantity: adjustedQuantity,
            unit: inventory.unit,
            balance_before: inventory.initial_quantity,
            balance_after: inventory.current_quantity,
            related_products: [],
            note: `Điều chỉnh tồn kho theo dữ liệu chuỗi cung ứng mẫu: ${inventory.note}`,
            occurred_at: new Date('2026-05-16T09:00:00.000Z'),
            metadata: {
              seed_key: adjustKey,
              source: 'normalized-demo-data',
            },
            created_by: createdBy,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
      );
      if (adjustTx) transactionsUpserted += 1;
    } else {
      await InventoryTransaction.deleteMany({ 'metadata.seed_key': adjustKey });
    }
  }

  return { productsUpdated, transactionsUpserted };
}

async function ensureProductImages() {
  const products = await Product.find({
    $or: [
      { images: { $exists: false } },
      { images: { $size: 0 } },
    ],
  }).select('_id name category');

  let productsUpdated = 0;
  for (const product of products) {
    const filename = resolveProductImage(product.name, product.category);
    const result = await Product.updateOne(
      { _id: product._id },
      { $set: { images: [sampleImage(filename)] } },
      { runValidators: true }
    );
    productsUpdated += result.modifiedCount;
  }

  return { productsUpdated };
}

async function main() {
  await connectDB(env.DB_URI);
  const fallbackUser = await User.findOne({ role: 'admin', isActive: true }).sort({ createdAt: 1 });
  if (!fallbackUser) throw new Error('Không tìm thấy tài khoản quản trị đang hoạt động.');

  const repairedReferences = await normalizeBaseData(fallbackUser._id);
  const harvestEvents = await ensureHarvestEvents(fallbackUser._id);
  const farmingAreaDemo = await seedFarmingAreaDemo(fallbackUser._id);
  const productAreaLinks = await attachProductsToExistingFarmingAreas();
  const organizations = await seedOrganizations(fallbackUser._id);
  await seedSupplyChain(fallbackUser._id, organizations);
  const traceEventMedia = await seedTraceEventMedia(fallbackUser._id);
  await seedQualityInspections(fallbackUser._id);
  const disease = await seedDiseaseDetections(fallbackUser._id);
  const inventory = await normalizeInventory(fallbackUser._id);
  const productImages = await ensureProductImages();

  const counts = {
    users: await User.countDocuments(),
    farmingAreas: await FarmingArea.countDocuments(),
    products: await Product.countDocuments(),
    traceEvents: await TraceEvent.countDocuments(),
    certifications: await Certification.countDocuments(),
    qualityInspections: await QualityInspection.countDocuments(),
    diseaseDetections: await DiseaseDetection.countDocuments(),
    supplyChainOrganizations: await SupplyChainOrganization.countDocuments(),
    supplyChainRecords: await SupplyChainRecord.countDocuments(),
    inventoryTransactions: await InventoryTransaction.countDocuments(),
  };

  console.log(JSON.stringify({ success: true, repairedReferences, harvestEvents, farmingAreaDemo, productAreaLinks, traceEventMedia, disease, inventory, productImages, counts }, null, 2));
}

main()
  .catch((error) => {
    console.error('Chuẩn hóa dữ liệu thất bại:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
