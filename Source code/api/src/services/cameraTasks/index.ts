import { plantDiseaseTask } from './plantDisease.task';
import { getCameraTask, listRegisteredCameraTasks, registerCameraTask } from './registry';

registerCameraTask(plantDiseaseTask);

export { getCameraTask, listRegisteredCameraTasks };
export type { CameraTaskContext, CameraTaskDefinition, CameraTaskOutput } from './types';
