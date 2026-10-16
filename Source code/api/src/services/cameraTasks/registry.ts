import { NotFoundError } from '../../utils/errors';
import { CameraTaskDefinition, PublicCameraTaskDefinition } from './types';

const registry = new Map<string, CameraTaskDefinition>();

export const registerCameraTask = (definition: CameraTaskDefinition) => {
  if (registry.has(definition.key)) throw new Error(`Camera task already registered: ${definition.key}`);
  registry.set(definition.key, definition);
};

export const getCameraTask = (key: string) => {
  const task = registry.get(key);
  if (!task) throw new NotFoundError('Nhiệm vụ camera chưa có bộ xử lý');
  return task;
};

export const listRegisteredCameraTasks = (): PublicCameraTaskDefinition[] =>
  Array.from(registry.values()).map(({ handler: _handler, ...definition }) => definition);
