import 'dart:convert';

import 'package:app/core/api_client.dart';
import 'package:app/models/disease_detection.dart';
import 'package:dio/dio.dart';
import 'package:http_parser/http_parser.dart';
import 'package:image_picker/image_picker.dart';

class DiseaseDetectionServiceException implements Exception {
  const DiseaseDetectionServiceException(
    this.message, {
    this.code,
    this.statusCode,
    this.details,
  });

  final String message;
  final String? code;
  final int? statusCode;
  final Map<String, dynamic>? details;

  @override
  String toString() => message;
}

class DiseaseDetectionService {
  DiseaseDetectionService({Dio? dio}) : _dio = dio ?? ApiClient.instance.dio;

  static const int minImageCount = 1;
  static const int maxImageCount = 3;
  static const int maxImageSizeBytes = 5 * 1024 * 1024;

  final Dio _dio;

  Future<DiseaseDetectionCapabilities> getCapabilities({
    String? productId,
  }) async {
    try {
      final response = await _dio.get(
        '/disease-detections/capabilities',
        queryParameters: {
          if (productId != null && productId.trim().isNotEmpty)
            'product': productId.trim(),
        },
        options: Options(receiveTimeout: const Duration(seconds: 60)),
      );
      return _parseCapabilities(response.data);
    } on DioException catch (error) {
      _throwFriendlyError(error, 'Không thể kiểm tra trạng thái mô hình AI.');
    }
  }

  Future<List<DiseaseDetection>> getDetections({String? risk}) async {
    try {
      final response = await _dio.get(
        '/disease-detections',
        queryParameters: {if (risk != null && risk.isNotEmpty) 'risk': risk},
      );
      return _mapList(response.data);
    } on DioException catch (error) {
      _throwFriendlyError(error, 'Không thể tải lịch sử nhận diện bệnh.');
    }
  }

  Future<DiseaseDetection> createDetection({
    required String productId,
    required List<String> symptoms,
    String? notes,
    required List<XFile> images,
  }) async {
    final cleanProductId = productId.trim();
    if (cleanProductId.isEmpty) {
      throw const DiseaseDetectionServiceException(
        'Vui lòng chọn lô cây trồng cần phân tích.',
        code: 'PRODUCT_REQUIRED',
      );
    }
    if (images.length < minImageCount || images.length > maxImageCount) {
      throw const DiseaseDetectionServiceException(
        'Vui lòng chọn từ 1 đến 3 ảnh để mô hình AI phân tích.',
        code: 'INVALID_IMAGE_COUNT',
      );
    }

    final formData = FormData.fromMap({
      'product': cleanProductId,
      'symptoms': jsonEncode(
        symptoms
            .map((item) => item.trim())
            .where((item) => item.isNotEmpty)
            .toList(growable: false),
      ),
      if (notes != null && notes.trim().isNotEmpty) 'notes': notes.trim(),
    });

    for (final image in images) {
      final contentType = _imageContentType(image);
      if (contentType == null) {
        throw DiseaseDetectionServiceException(
          'Ảnh ${image.name} không đúng định dạng JPEG, PNG hoặc WebP.',
          code: 'UNSUPPORTED_IMAGE_TYPE',
        );
      }
      final bytes = await image.readAsBytes();
      if (bytes.isEmpty) {
        throw DiseaseDetectionServiceException(
          'Ảnh ${image.name} không có dữ liệu.',
          code: 'INVALID_IMAGE',
        );
      }
      if (bytes.length > maxImageSizeBytes) {
        throw DiseaseDetectionServiceException(
          'Ảnh ${image.name} vượt quá giới hạn 5 MB.',
          code: 'IMAGE_TOO_LARGE',
        );
      }
      formData.files.add(
        MapEntry(
          'images',
          MultipartFile.fromBytes(
            bytes,
            filename: image.name,
            contentType: contentType,
          ),
        ),
      );
    }

    try {
      final response = await _dio.post(
        '/disease-detections',
        data: formData,
        options: Options(
          sendTimeout: const Duration(seconds: 30),
          receiveTimeout: const Duration(seconds: 90),
        ),
      );
      final payload = _asMap(response.data);
      final detection = _asMap(payload['detection']);
      if (detection.isEmpty) {
        throw const DiseaseDetectionServiceException(
          'Máy chủ không trả về kết quả nhận diện hợp lệ.',
          code: 'INVALID_RESPONSE',
        );
      }
      return _parseDetection(detection);
    } on DioException catch (error) {
      _throwFriendlyError(error, 'Không thể phân tích ảnh bệnh cây.');
    }
  }

  Future<void> deleteDetection(String id) async {
    try {
      await _dio.delete('/disease-detections/$id');
    } on DioException catch (error) {
      _throwFriendlyError(error, 'Không thể xóa kết quả nhận diện.');
    }
  }

  List<DiseaseDetection> _mapList(dynamic payload) {
    final map = _asMap(payload);
    final raw = map.isNotEmpty
        ? (map['detections'] as List<dynamic>? ?? const [])
        : (payload is List ? payload : const <dynamic>[]);
    return raw
        .map(_asMap)
        .where((item) => item.isNotEmpty)
        .map(_parseDetection)
        .toList(growable: false);
  }

  DiseaseDetection _parseDetection(Map<String, dynamic> json) {
    return DiseaseDetection.fromJson(json, mediaBaseUrl: _mediaBaseUrl);
  }

  DiseaseDetectionCapabilities _parseCapabilities(dynamic raw) {
    final response = _asMap(raw);
    final wrapped = _asMap(response['data']);
    final payload = wrapped.containsKey('model') ? wrapped : response;
    final model = _asMap(payload['model']);
    final supportedCrops = payload['supportedCrops'];

    final hasValidModel = model.isNotEmpty && model['ready'] is bool;
    final hasValidCrops =
        supportedCrops is List &&
        supportedCrops.every((item) {
          final crop = _asMap(item);
          return (crop['code']?.toString().trim().isNotEmpty ?? false) &&
              (crop['label']?.toString().trim().isNotEmpty ?? false) &&
              crop['aliases'] is List;
        });

    if (!hasValidModel || !hasValidCrops) {
      throw const DiseaseDetectionServiceException(
        'Máy chủ trả về thông tin mô hình AI không đúng định dạng. '
        'Vui lòng cập nhật hoặc khởi động lại API.',
        code: 'INVALID_CAPABILITIES_RESPONSE',
      );
    }

    return DiseaseDetectionCapabilities.fromJson(payload);
  }

  String? get _mediaBaseUrl {
    final base = Uri.tryParse(_dio.options.baseUrl);
    if (base == null || !base.hasScheme || base.host.isEmpty) return null;
    return base.replace(path: '/', query: null, fragment: null).toString();
  }

  Never _throwFriendlyError(DioException error, String fallbackMessage) {
    final payload = _asMap(error.response?.data);
    final rawDetails = _asMap(payload['details']);
    final code = payload['code']?.toString();
    final message =
        _friendlyMessageForCode(code) ??
        payload['msg'] ??
        payload['message'] ??
        payload['error'];

    if (message != null && message.toString().trim().isNotEmpty) {
      throw DiseaseDetectionServiceException(
        message.toString(),
        code: code,
        statusCode: error.response?.statusCode,
        details: rawDetails.isEmpty ? null : rawDetails,
      );
    }
    if (error.type == DioExceptionType.connectionError ||
        error.type == DioExceptionType.connectionTimeout) {
      throw const DiseaseDetectionServiceException(
        'Không kết nối được tới máy chủ AI. Vui lòng kiểm tra kết nối mạng.',
        code: 'CONNECTION_ERROR',
      );
    }
    if (error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.sendTimeout) {
      throw const DiseaseDetectionServiceException(
        'Quá trình phân tích mất quá nhiều thời gian. Vui lòng thử lại.',
        code: 'REQUEST_TIMEOUT',
      );
    }

    throw DiseaseDetectionServiceException(
      fallbackMessage,
      statusCode: error.response?.statusCode,
    );
  }

  String? _friendlyMessageForCode(String? code) {
    switch (code) {
      case 'MODEL_UNAVAILABLE':
        return 'Mô hình AI chưa sẵn sàng. Vui lòng thử lại sau.';
      case 'UNSUPPORTED_CROP':
        return 'Lô này chưa được hỗ trợ. Hiện mô hình chỉ nhận diện cà chua và ớt chuông.';
      case 'CROP_MISMATCH':
      case 'IMAGE_CROP_MISMATCH':
        return 'Ảnh không khớp với loại cây của lô. Hãy chụp rõ phần lá hoặc quả cần kiểm tra.';
      case 'INVALID_IMAGE':
        return 'Không thể đọc ảnh. Vui lòng chọn một ảnh rõ nét khác.';
      case 'UNSUPPORTED_IMAGE_TYPE':
        return 'Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.';
      case 'IMAGE_TOO_LARGE':
      case 'LIMIT_FILE_SIZE':
        return 'Mỗi ảnh phải có dung lượng không quá 5 MB.';
      case 'IMAGE_REQUIRED':
      case 'INVALID_IMAGE_COUNT':
      case 'TOO_MANY_IMAGES':
      case 'LIMIT_FILE_COUNT':
        return 'Vui lòng chọn từ 1 đến 3 ảnh để phân tích.';
      case 'MODEL_INFERENCE_FAILED':
        return 'Mô hình AI không phân tích được ảnh này. Vui lòng thử ảnh rõ nét khác.';
      case 'MODEL_OUTPUT_INVALID':
        return 'Kết quả mô hình AI không hợp lệ. Vui lòng thử lại sau.';
      default:
        return null;
    }
  }

  MediaType? _imageContentType(XFile image) {
    final mimeType = image.mimeType?.toLowerCase().trim();
    switch (mimeType) {
      case 'image/jpeg':
      case 'image/jpg':
        return MediaType('image', 'jpeg');
      case 'image/png':
        return MediaType('image', 'png');
      case 'image/webp':
        return MediaType('image', 'webp');
    }

    final name = image.name.toLowerCase();
    if (name.endsWith('.jpg') || name.endsWith('.jpeg')) {
      return MediaType('image', 'jpeg');
    }
    if (name.endsWith('.png')) return MediaType('image', 'png');
    if (name.endsWith('.webp')) return MediaType('image', 'webp');
    return null;
  }

  Map<String, dynamic> _asMap(dynamic value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) {
      return value.map((key, item) => MapEntry(key.toString(), item));
    }
    return const {};
  }
}
