import Product from '../../models/Product';
import { detectCameraPlantDisease } from '../cameraDiseaseDetector.service';
import { inferPlantDisease, resolveSupportedCrop } from '../plantDiseaseInference.service';
import { CameraTaskDefinition } from './types';

export const plantDiseaseTask: CameraTaskDefinition = {
  key: 'plant-disease',
  name: 'Chẩn đoán bệnh cây',
  description: 'Lấy frame hiện tại và phân tích dấu hiệu bệnh cây bằng mô hình AI.',
  requires_frame: true,
  handler: async ({ camera, frame }) => {
    let productName: string | undefined;
    let productCategory: string | undefined;
    if (camera.product) {
      const product = await Product.findById((camera.product as any)?._id || camera.product).select('name category');
      productName = product?.name;
      productCategory = product?.category;
    }

    const cropHint = [productName, productCategory, camera.name].filter(Boolean).join(' ');
    let candidates: any[] = [];
    let modelVersion = '';
    let inferenceEngine = '';
    let analysisStatus: 'completed' | 'inconclusive' = 'inconclusive';
    let warnings: string[] = [];
    let crop: unknown;
    let detectionMeta: Record<string, unknown> = {};

    try {
      const detection = await detectCameraPlantDisease(frame, cropHint);
      if (detection.candidates.length) {
        candidates = detection.candidates;
        modelVersion = detection.modelVersion;
        inferenceEngine = detection.engine;
        analysisStatus = 'completed';
        warnings = detection.warnings;
        detectionMeta = {
          detections: detection.candidates,
          detection_mode: 'object-detection',
          source_width: detection.sourceWidth,
          source_height: detection.sourceHeight,
        };
      }
    } catch (error) {
      console.warn('YOLO camera detection unavailable, using MobileNet fallback:', error);
    }

    if (!candidates.length) {
      const supportedCrop = await resolveSupportedCrop(productName || camera.name, productCategory);
      const inference = await inferPlantDisease(
        [{ filename: frame.filename, absolutePath: frame.absolutePath, buffer: frame.buffer }],
        supportedCrop,
        { strictCropMatch: false }
      );
      candidates = inference.candidates;
      crop = inference.crop;
      modelVersion = inference.modelVersion;
      inferenceEngine = inference.engine;
      analysisStatus = inference.status;
      warnings = ['YOLO không phát hiện vùng bệnh rõ ràng; hệ thống đã dùng MobileNet dự phòng.', ...inference.warnings];
      detectionMeta = { detection_mode: 'classification', detections: [] };
    }

    const topDisease = candidates[0];
    const shouldAlert = Boolean(
      topDisease && !topDisease.is_healthy && topDisease.risk_level === 'high' && topDisease.confidence >= 0.7
    );

    return {
      confidence: topDisease?.confidence,
      result: {
        candidates,
        top_disease: topDisease,
        crop,
        model_version: modelVersion,
        analysis_status: analysisStatus,
        inference_engine: inferenceEngine,
        warnings,
        ...detectionMeta,
      },
      alert: shouldAlert ? {
        title: `Cảnh báo bệnh cây tại ${camera.name}`,
        message: `${topDisease.disease_name} được phát hiện với độ tin cậy ${(topDisease.confidence * 100).toFixed(1)}%.`,
        type: 'warning',
      } : undefined,
    };
  },
};
