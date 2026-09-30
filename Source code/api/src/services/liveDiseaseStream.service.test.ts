import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decodeLiveImage,
  shouldPersistLiveEvent,
  smoothLiveResults,
} from './liveDiseaseStream.service';
import type { PlantDiseaseInferenceResult } from './plantDiseaseInference.service';

const result = (code: string, confidence: number): PlantDiseaseInferenceResult => ({
  candidates: [
    {
      disease_code: code,
      disease_name: code,
      confidence,
      risk_level: 'high',
      description: code,
      recommendations: [],
      is_healthy: false,
    },
  ],
  status: 'completed',
  engine: 'onnx',
  warnings: [],
  modelVersion: 'test',
  crop: { code: 'tomato', label: 'Tomato', aliases: [], classIndexes: [0] },
});

test('decodes allowed image data URL into a Buffer', () => {
  assert.deepEqual(decodeLiveImage('data:image/jpeg;base64,AQID'), Buffer.from([1, 2, 3]));
  assert.throws(() => decodeLiveImage('AQID'));
});

test('smooths confidence across recent frames', () => {
  const smoothed = smoothLiveResults([result('late_blight', 0.4), result('late_blight', 0.8)]);
  assert.equal(smoothed.candidates[0].confidence, 0.6);
});

test('applies disease cooldown and ignores healthy results', () => {
  const persisted = new Map<string, number>();
  const disease = result('late_blight', 0.9).candidates[0];
  assert.equal(shouldPersistLiveEvent(persisted, disease, 10_000, 5_000), true);
  assert.equal(shouldPersistLiveEvent(persisted, disease, 12_000, 5_000), false);
  assert.equal(shouldPersistLiveEvent(persisted, disease, 16_000, 5_000), true);
  assert.equal(
    shouldPersistLiveEvent(persisted, { ...disease, disease_code: 'healthy', is_healthy: true }, 20_000, 5_000),
    false
  );
});
