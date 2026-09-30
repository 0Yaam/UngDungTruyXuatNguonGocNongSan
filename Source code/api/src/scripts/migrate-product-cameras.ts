import { createHash, randomBytes } from 'crypto';
import connectDB from '../config/db';
import env from '../config/env';
import Camera from '../models/Camera';
import Product from '../models/Product';

const sourceType = (url: string) => {
  const lower = url.toLowerCase();
  if (lower.startsWith('phone://')) return 'phone';
  if (lower.includes('.m3u8')) return 'hls';
  if (/\.(jpe?g|png)(\?|$)/.test(lower)) return 'mjpeg';
  return 'webrtc';
};

const run = async () => {
  await connectDB(env.DB_URI);
  const products = await Product.find({ 'live_cameras.0': { $exists: true } }).select(
    'name farming_area created_by live_cameras'
  );
  let created = 0;
  for (const product of products) {
    if (!product.farming_area) continue;
    for (const legacy of product.live_cameras || []) {
      const code = legacy.stream_url.toLowerCase().startsWith('phone://')
        ? legacy.stream_url.slice('phone://'.length).trim().toUpperCase()
        : `CAM-${randomBytes(4).toString('hex').toUpperCase()}`;
      const exists = await Camera.exists({
        $or: [
          { code },
          { product: product._id, playback_url: legacy.stream_url },
        ],
      });
      if (exists) continue;
      const ingestKey = randomBytes(24).toString('base64url');
      await Camera.create({
        name: legacy.name,
        code,
        source_type: sourceType(legacy.stream_url),
        purpose: 'field_overview',
        playback_url: legacy.stream_url,
        snapshot_url: legacy.thumbnail,
        farming_area: product.farming_area,
        product: product._id,
        owner: product.created_by,
        is_enabled: legacy.is_active !== false,
        status_override: 'auto',
        location: legacy.location,
        ingest_key_hash: createHash('sha256').update(ingestKey).digest('hex'),
        metadata: { migrated_from: 'product.live_cameras' },
      });
      created += 1;
    }
  }
  console.log(`Migrated ${created} legacy camera(s).`);
  process.exit(0);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
