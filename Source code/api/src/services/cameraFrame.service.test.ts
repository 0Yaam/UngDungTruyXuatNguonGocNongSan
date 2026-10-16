import assert from 'node:assert/strict';
import test from 'node:test';
import { ICamera } from '../models/Camera';
import { resolveCameraFrameInput, resolveCameraFrameInputs } from './cameraFrame.service';

test('camera frame inputs prefer authenticated source then MediaMTX fallback', () => {
  const camera = {
    source_url: 'rtsp://10.0.0.20/live',
    username: 'farm user',
    password: 'p@ss',
    stream_path: 'greenhouse-a',
    playback_url: 'http://localhost:8889/greenhouse-a',
  } as ICamera;

  const inputs = resolveCameraFrameInputs(camera);
  assert.equal(inputs[0], 'rtsp://farm%20user:p%40ss@10.0.0.20/live');
  assert.match(inputs[1], /\/greenhouse-a$/);
  assert.equal(inputs[2], camera.playback_url);
});

test('phone-only camera requires a pushed frame instead of FFmpeg capture', () => {
  assert.throws(
    () => resolveCameraFrameInput({ playback_url: 'phone://CAM-TEST' } as ICamera),
    (error: any) => error?.code === 'CAMERA_FRAME_SOURCE_REQUIRED'
  );
});
