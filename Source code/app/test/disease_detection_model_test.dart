import 'package:app/models/disease_detection.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('DiseaseDetectionCapabilities', () {
    test('parses model, supported crops and product capability', () {
      final capability = DiseaseDetectionCapabilities.fromJson({
        'model': {
          'ready': true,
          'version': 'plant-disease-v1',
          'inputWidth': 224,
          'inputHeight': 224,
          'maxImages': 5,
          'minConfidence': 0.65,
        },
        'supportedCrops': [
          {
            'code': 'tomato',
            'label': 'Cà chua',
            'aliases': ['cà chua', 'tomato'],
          },
        ],
        'product': {
          '_id': 'product-1',
          'name': 'Cà chua bi',
          'type': 'Plant',
          'supported': true,
          'cropCode': 'tomato',
        },
      });

      expect(capability.model.ready, isTrue);
      expect(capability.model.version, 'plant-disease-v1');
      expect(capability.model.maxImages, 3);
      expect(capability.supportedCrops.single.code, 'tomato');
      expect(capability.product?.supported, isTrue);
      expect(capability.product?.cropCode, 'tomato');
    });
  });

  group('DiseaseDetection', () {
    test('parses AI result and resolves uploaded image URLs', () {
      final detection = DiseaseDetection.fromJson({
        '_id': 'detection-1',
        'product': {'_id': 'product-1', 'name': 'Cà chua bi'},
        'crop_name': 'Cà chua',
        'images': [
          {'path': '/uploads/disease-detections/leaf.jpg'},
        ],
        'candidates': [
          {
            'disease_code': 'tomato_healthy',
            'disease_name': 'Cây khỏe mạnh',
            'confidence': 0.91,
            'risk_level': 'low',
            'description': 'Không thấy dấu hiệu bệnh rõ ràng.',
            'recommendations': ['Tiếp tục theo dõi.'],
            'crop_code': 'tomato',
            'model_label': 'Tomato___healthy',
            'source_label': 'Tomato___healthy',
            'is_healthy': true,
          },
        ],
        'top_disease': {
          'disease_code': 'tomato_healthy',
          'disease_name': 'Cây khỏe mạnh',
          'confidence': 0.91,
          'risk_level': 'low',
          'description': 'Không thấy dấu hiệu bệnh rõ ràng.',
          'recommendations': ['Tiếp tục theo dõi.'],
          'is_healthy': true,
        },
        'overall_risk': 'low',
        'model_version': 'plant-disease-v1',
        'analysis_status': 'completed',
        'inference_engine': 'onnx',
        'warnings': <String>[],
        'createdAt': '2026-07-13T08:00:00.000Z',
      }, mediaBaseUrl: 'http://localhost:5000/');

      expect(detection.usesAi, isTrue);
      expect(detection.analysisStatus, 'completed');
      expect(detection.topDisease.isHealthy, isTrue);
      expect(
        detection.imageUrls.single,
        'http://localhost:5000/uploads/disease-detections/leaf.jpg',
      );
    });

    test('keeps old records compatible as legacy rule results', () {
      final detection = DiseaseDetection.fromJson({
        '_id': 'legacy-1',
        'product': {'_id': 'product-1', 'name': 'Lô cũ'},
        'candidates': <Map<String, dynamic>>[],
        'top_disease': {
          'disease_code': 'unknown',
          'disease_name': 'Chưa xác định',
          'confidence': 0.4,
          'risk_level': 'medium',
          'description': 'Kết quả dựa trên triệu chứng.',
          'recommendations': <String>[],
        },
      });

      expect(detection.isLegacy, isTrue);
      expect(detection.inferenceEngine, 'rules');
      expect(detection.modelVersion, 'ruleset-v1');
    });
  });
}
