import test from 'node:test';
import assert from 'node:assert/strict';
import { toCameraResponse } from './camera.service';

test('camera status follows enabled, override and heartbeat rules', () => {
  assert.equal(toCameraResponse({ is_enabled: false, status_override: 'auto' }).status, 'offline');
  assert.equal(toCameraResponse({ is_enabled: true, status_override: 'maintenance' }).status, 'maintenance');
  assert.equal(
    toCameraResponse({ is_enabled: true, status_override: 'auto', last_seen: new Date() }).status,
    'online'
  );
});

test('camera response never leaks ingest credentials', () => {
  const response = toCameraResponse({
    is_enabled: true,
    status_override: 'auto',
    ingest_key_hash: 'secret',
    source_url: 'rtsp://secret',
    username: 'user',
    password: 'pass',
  });
  assert.equal(response.ingest_key_hash, undefined);
  assert.equal(response.source_url, undefined);
  assert.equal(response.password, undefined);
});
