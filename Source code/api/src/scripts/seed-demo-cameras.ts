import 'dotenv/config';
import connectDB from '../config/db';
import env from '../config/env';
import Product from '../models/Product';

const DEMO_STREAMS = [
  'https://www.w3schools.com/html/mov_bbb.mp4',
  'https://www.w3schools.com/html/movie.mp4',
  'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
];

const CAMERA_NAMES = [
  ['Camera nhà kính A', 'Camera vườn chính', 'Camera khu thu hoạch'],
  ['Camera luống cây 1', 'Camera tưới tiêu', 'Camera bao bì'],
  ['Camera giám sát 1', 'Camera giám sát 2', 'Camera kho lạnh'],
];

const CAMERA_LOCATIONS = [
  ['Khu ươm giống', 'Luống cây trung tâm', 'Khu thu hoạch'],
  ['Hàng cây phía Bắc', 'Hệ thống tưới phun sương', 'Khu đóng gói'],
  ['Cổng vào vườn', 'Khu canh tác chính', 'Kho bảo quản'],
];

const buildDemoCameras = (index: number) => {
  const names = CAMERA_NAMES[index % CAMERA_NAMES.length];
  const locations = CAMERA_LOCATIONS[index % CAMERA_LOCATIONS.length];

  return names.map((name, cameraIndex) => ({
    name,
    stream_url: DEMO_STREAMS[cameraIndex],
    location: locations[cameraIndex],
    is_active: true,
  }));
};

const seedDemoCameras = async () => {
  await connectDB(env.DB_URI);

  const products = await Product.find({});
  let updated = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    
    product.live_cameras = buildDemoCameras(i);
    await product.save();
    updated += 1;
    console.log(`Đã cập nhật ${product.live_cameras.length} camera demo cho "${product.name}".`);
  }

  console.log(`Hoàn tất: cập nhật ${updated}/${products.length} sản phẩm.`);
  process.exit(0);
};

seedDemoCameras().catch((error) => {
  console.error('Seed demo cameras failed:', error);
  process.exit(1);
});
