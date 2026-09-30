import assert from 'node:assert/strict';
import test from 'node:test';
import { getCameraTask, listRegisteredCameraTasks, registerCameraTask } from './registry';

test('camera task registry accepts a new task without changing camera service', () => {
  const key = `fruit-count-${Date.now()}`;
  registerCameraTask({
    key,
    name: 'Đếm trái',
    description: 'Kiểm tra registry nhiệm vụ camera.',
    requires_frame: true,
    handler: async () => ({ confidence: 0.9, result: { count: 12 } }),
  });
  assert.equal(getCameraTask(key).key, key);
  assert.equal(listRegisteredCameraTasks().some((task) => task.key === key), true);
});
