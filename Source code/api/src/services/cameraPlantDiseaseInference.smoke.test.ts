import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import {
  inferPlantDisease,
  resolveSupportedCrop,
} from './plantDiseaseInference.service';

test('camera mode returns an inconclusive result instead of rejecting a crop mismatch', async () => {
  const crop = await resolveSupportedCrop('Cà chua', 'Rau củ');
  const buffer = await sharp({
    create: {
      width: 224,
      height: 224,
      channels: 3,
      background: { r: 40, g: 130, b: 40 },
    },
  }).jpeg().toBuffer();

  const result = await inferPlantDisease(
    [{ filename: 'camera-frame.jpg', buffer }],
    crop,
    { strictCropMatch: false }
  );

  assert.equal(result.engine, 'onnx');
  assert.equal(result.status, 'inconclusive');
  assert.ok(result.candidates.length > 0);
  assert.ok(result.warnings.some((warning) => warning.includes('MobileNet')));
});
