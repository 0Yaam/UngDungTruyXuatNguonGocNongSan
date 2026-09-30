import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {
  getPlantDiseaseCapabilities,
  inferPlantDisease,
  resolveSupportedCrop,
} from './plantDiseaseInference.service';

test('loads bundled ONNX model and runs Buffer inference', async () => {
  const capabilities = await getPlantDiseaseCapabilities();
  assert.equal(capabilities.ready, true);
  assert.equal(capabilities.input.layout, 'NHWC');
  const crop = await resolveSupportedCrop('Cà chua');
  const buffer = await sharp({
    create: {
      width: 224,
      height: 224,
      channels: 3,
      background: { r: 40, g: 130, b: 40 },
    },
  }).jpeg().toBuffer();
  try {
    const result = await inferPlantDisease([{ filename: 'smoke.jpg', buffer }], crop);
    assert.ok(result.candidates.length > 0);
    assert.equal(result.engine, 'onnx');
  } catch (error: any) {
    assert.equal(error?.code, 'IMAGE_CROP_MISMATCH');
  }
});
