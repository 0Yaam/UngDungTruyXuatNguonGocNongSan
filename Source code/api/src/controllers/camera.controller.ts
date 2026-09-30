import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as cameraService from '../services/camera.service';
import * as taskService from '../services/cameraTask.service';

export const getTasks = async (_req: Request, res: Response) => {
  res.status(StatusCodes.OK).json({ tasks: taskService.listCameraTasks() });
};

export const getAll = async (req: Request, res: Response) => {
  const cameras = await cameraService.listCameras(req.user!.userId, req.user!.role, req.query);
  res.status(StatusCodes.OK).json({ cameras });
};

export const getOne = async (req: Request, res: Response) => {
  const camera = await cameraService.getCamera(req.params.id, req.user!.userId, req.user!.role);
  res.status(StatusCodes.OK).json({ camera: cameraService.toCameraResponse(camera) });
};

export const create = async (req: Request, res: Response) => {
  const result = await cameraService.createCamera(req.body, req.user!.userId, req.user!.role);
  res.status(StatusCodes.CREATED).json(result);
};

export const update = async (req: Request, res: Response) => {
  const camera = await cameraService.updateCamera(req.params.id, req.body, req.user!.userId, req.user!.role);
  res.status(StatusCodes.OK).json({ camera });
};

export const remove = async (req: Request, res: Response) => {
  const camera = await cameraService.deleteCamera(req.params.id, req.user!.userId, req.user!.role);
  res.status(StatusCodes.OK).json({ camera });
};

export const rotateKey = async (req: Request, res: Response) => {
  const result = await cameraService.rotateIngestKey(req.params.id, req.user!.userId, req.user!.role);
  res.status(StatusCodes.OK).json(result);
};

export const heartbeat = async (req: Request, res: Response) => {
  const camera = await cameraService.heartbeatByAgent(
    req.params.code,
    String(req.headers['x-camera-key'] || ''),
    req.body?.error
  );
  res.status(StatusCodes.OK).json({ camera });
};

export const runTask = async (req: Request, res: Response) => {
  const run = await taskService.runCameraTask(
    req.params.id,
    req.params.taskKey,
    req.user!.userId,
    req.user!.role,
    req.file
  );
  res.status(StatusCodes.CREATED).json({ run });
};

export const previewTask = async (req: Request, res: Response) => {
  const analysis = await taskService.previewCameraTask(
    req.params.id,
    req.params.taskKey,
    req.user!.userId,
    req.user!.role,
    req.file
  );
  res.status(StatusCodes.OK).json({ analysis });
};

export const getTaskRuns = async (req: Request, res: Response) => {
  const runs = await taskService.listCameraTaskRuns(
    req.params.id,
    req.user!.userId,
    req.user!.role,
    typeof req.query.task === 'string' ? req.query.task : undefined
  );
  res.status(StatusCodes.OK).json({ runs });
};
