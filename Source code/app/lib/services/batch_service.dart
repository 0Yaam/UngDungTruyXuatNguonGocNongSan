import 'package:app/core/api_client.dart';
import 'package:app/models/live_camera.dart';
import 'package:app/models/batch.dart';
import 'package:app/models/product.dart';
import 'package:dio/dio.dart';
import 'package:http_parser/http_parser.dart';
import 'package:image_picker/image_picker.dart';

class _UploadedMedia {
  const _UploadedMedia({
    required this.path,
    required this.filename,
    required this.mediaType,
    this.mimeType,
  });

  final String path;
  final String filename;
  final String mediaType;
  final String? mimeType;

  Map<String, dynamic> toTracePayload() => {
    'path': path,
    'filename': filename,
    if (mimeType != null && mimeType!.isNotEmpty) 'mimeType': mimeType,
  };
}

class _BatchServiceException implements Exception {
  const _BatchServiceException(this.message);

  final String message;

  @override
  String toString() => message;
}

class BatchService {
  BatchService({Dio? dio}) : _dio = dio ?? ApiClient.instance.dio;

  final Dio _dio;

  Never _handleDioError(DioException error, String defaultMessage) {
    final responseData = error.response?.data;
    if (responseData is Map<String, dynamic>) {
      final message =
          responseData['msg'] ??
          responseData['message'] ??
          responseData['error'];
      if (message != null && message.toString().trim().isNotEmpty) {
        throw _BatchServiceException(message.toString());
      }
    }

    if (error.type == DioExceptionType.connectionError ||
        error.type == DioExceptionType.connectionTimeout) {
      throw const _BatchServiceException(
        'Không kết nối được tới máy chủ API. Vui lòng kiểm tra lại kết nối.',
      );
    }

    if (error.type == DioExceptionType.receiveTimeout) {
      throw const _BatchServiceException(
        'Máy chủ phản hồi quá lâu. Vui lòng thử lại sau.',
      );
    }

    throw _BatchServiceException(defaultMessage);
  }

  Future<List<Batch>> getBatches() async {
    final response = await _dio.get('/products/my/products');
    final payload = response.data;

    final items = payload is List
        ? payload
        : (payload is Map<String, dynamic>
              ? (payload['products'] as List<dynamic>? ?? const [])
              : const <dynamic>[]);

    return items
        .map((item) => _mapProductToBatch(item as Map<String, dynamic>))
        .toList();
  }

  Future<Batch> getTimeline(String batchId) async {
    final response = await _dio.get('/trace/$batchId');
    final payload = response.data as Map<String, dynamic>;

    final product = payload['product'] as Map<String, dynamic>? ?? const {};
    final events = (payload['events'] as List<dynamic>? ?? const []);

    return Batch(
      id: (product['_id'] ?? batchId).toString(),
      batchId: (product['_id'] ?? batchId).toString(),
      batchCode: (product['batch_code'] ?? '').toString(),
      productName: (product['name'] ?? '').toString(),
      productType: (product['category'] ?? product['type'] ?? '').toString(),
      productKind: (product['type'] ?? 'Plant').toString(),
      farmingAreaId: _objectId(product['farming_area']),
      origin: (product['origin'] ?? '').toString(),
      cultivationTime: (product['cultivation_time'] ?? '').toString(),
      description: (product['description'] ?? '').toString(),
      status: (product['status'] ?? 'active').toString(),
      initialQuantity: _numToDouble(product['initial_quantity']),
      currentQuantity: _numToDouble(product['current_quantity']),
      unit: (product['unit'] ?? 'kg').toString(),
      imageUrls: _mapMediaUrls(product['images']),
      qrCodeUrl: (product['qrcode'] ?? '').toString(),
      liveCameras: _mapLiveCameras(product['live_cameras']),
      events: events
          .map((item) => _mapTraceEvent(item as Map<String, dynamic>))
          .toList(),
    );
  }

  Future<BatchEvent> retryBlockchainEvent(String eventId) async {
    try {
      final response = await _dio.post(
        '/trace/events/$eventId/retry',
        options: Options(
          sendTimeout: const Duration(seconds: 30),
          receiveTimeout: const Duration(seconds: 90),
        ),
      );
      final payload = response.data as Map<String, dynamic>;
      final event =
          (payload['event'] as Map<String, dynamic>?) ??
          (payload['traceEvent'] as Map<String, dynamic>?) ??
          const <String, dynamic>{};
      return _mapTraceEvent(event);
    } on DioException catch (error) {
      _handleDioError(error, 'Không thể ghi sự kiện lên blockchain.');
    }
  }

  Future<List<Product>> getTrashProducts() async {
    try {
      final response = await _dio.get('/products/trash');
      final payload = response.data;
      final items = payload is Map<String, dynamic>
          ? (payload['products'] as List<dynamic>? ?? const [])
          : const <dynamic>[];

      return items
          .whereType<Map<String, dynamic>>()
          .map(Product.fromJson)
          .toList();
    } on DioException catch (error) {
      _handleDioError(error, 'Không tải được danh sách lô đã lưu trữ.');
    }
  }

  Future<Product> restoreProduct(String productId) async {
    try {
      final response = await _dio.post('/products/$productId/restore');
      final payload = response.data as Map<String, dynamic>;
      final product = payload['product'] as Map<String, dynamic>? ?? const {};
      return Product.fromJson(product);
    } on DioException catch (error) {
      _handleDioError(error, 'Không thể khôi phục lô này.');
    }
  }

  Future<void> permanentDeleteProduct(String productId) async {
    try {
      await _dio.delete('/products/$productId/permanent');
    } on DioException catch (error) {
      _handleDioError(error, 'Không thể xóa vĩnh viễn lô này.');
    }
  }

  Future<void> deleteProduct(String productId) async {
    try {
      await _dio.delete('/products/$productId');
    } on DioException catch (error) {
      _handleDioError(error, 'Không thể chuyển lô vào thùng rác.');
    }
  }

  Future<void> splitProduct({
    required String productId,
    required double quantity,
    required String childName,
    String? note,
  }) async {
    try {
      await _dio.post(
        '/products/$productId/split',
        data: {
          'quantity': quantity,
          'note': note,
          'loss_reason': note,
          'children': [
            {
              if (childName.trim().isNotEmpty) 'name': childName.trim(),
              'quantity': quantity,
            },
          ],
        },
      );
    } on DioException catch (error) {
      _handleDioError(error, 'Không thể tách lô. Vui lòng kiểm tra lại số lượng.');
    }
  }

  Future<void> mergeProducts({
    required String targetProductId,
    required String sourceProductId,
    double? sourceQuantity,
    String? targetName,
    String? note,
  }) async {
    final cleanTargetName = (targetName ?? '').trim();
    final sourcePayload = <String, dynamic>{'product': sourceProductId};
    if (sourceQuantity != null) sourcePayload['quantity'] = sourceQuantity;

    final data = <String, dynamic>{
      'sources': [sourcePayload],
      'target': {
        'product': targetProductId,
        if (cleanTargetName.isNotEmpty) 'name': cleanTargetName,
      },
      'note': note,
      'loss_reason': note,
    };

    try {
      await _dio.post(
        '/products/merge',
        data: data,
      );
    } on DioException catch (error) {
      _handleDioError(error, 'Không thể gộp lô. Vui lòng kiểm tra lại số lượng.');
    }
  }

  Future<void> recallProduct({
    required String productId,
    double? quantity,
    required String reason,
    String? note,
    String? location,
    String status = 'IN_PROGRESS',
  }) async {
    final data = <String, dynamic>{
      'reason': reason.trim(),
      'note': note,
      'location': location,
      'status': status,
    };
    if (quantity != null) data['quantity'] = quantity;

    await _dio.post(
      '/products/$productId/recall',
      data: data,
    );
  }

  Future<Batch> createProduct({
    required String name,
    required String category,
    required String type,
    required String description,
    required String origin,
    String? cultivationTime,
    required double initialQuantity,
    required String unit,
    String? farmingArea,
    List<XFile> images = const [],
  }) async {
    final imagePayload = await _uploadProductImages(images);

    final response = await _dio.post(
      '/products',
      data: {
        'name': name.trim(),
        'category': category.trim(),
        'type': type,
        'description': description.trim(),
        'origin': origin.trim(),
        if (cultivationTime != null && cultivationTime.trim().isNotEmpty)
          'cultivation_time': cultivationTime.trim(),
        'initial_quantity': initialQuantity,
        'current_quantity': initialQuantity,
        'unit': unit.trim().isEmpty ? 'kg' : unit.trim(),
        if (imagePayload.isNotEmpty) 'images': imagePayload,
        if (farmingArea != null && farmingArea.trim().isNotEmpty)
          'farming_area': farmingArea.trim(),
      },
    );
    final payload = response.data as Map<String, dynamic>;
    final product = payload['product'] as Map<String, dynamic>? ?? const {};
    return _mapProductToBatch(product);
  }

  Future<Batch> updateProduct({
    required String productId,
    required String name,
    required String category,
    String? type,
    required String description,
    required String origin,
    String? cultivationTime,
    String? farmingArea,
    List<String>? existingImageUrls,
    List<XFile> newImages = const [],
  }) async {
    final imagePayload = [
      for (final url in existingImageUrls ?? const <String>[])
        _mediaPayloadFromUrl(url),
      ...await _uploadProductImages(newImages),
    ];

    final response = await _dio.patch(
      '/products/$productId',
      data: {
        'name': name.trim(),
        'category': category.trim(),
        if (type != null && type.trim().isNotEmpty) 'type': type.trim(),
        'description': description.trim(),
        'origin': origin.trim(),
        if (cultivationTime != null && cultivationTime.trim().isNotEmpty)
          'cultivation_time': cultivationTime.trim(),
        if (farmingArea != null && farmingArea.trim().isNotEmpty)
          'farming_area': farmingArea.trim(),
        if (existingImageUrls != null || newImages.isNotEmpty)
          'images': imagePayload,
      },
    );
    final payload = response.data as Map<String, dynamic>;
    final product = payload['product'] as Map<String, dynamic>? ?? const {};
    return _mapProductToBatch(product);
  }

  Future<Batch> updateProductStatus({
    required String productId,
    required String status,
    required String reason,
    String? note,
  }) async {
    final response = await _dio.patch(
      '/products/$productId/status',
      data: {
        'status': status,
        'reason': reason.trim(),
        if (note != null && note.trim().isNotEmpty) 'note': note.trim(),
      },
    );
    final payload = response.data as Map<String, dynamic>;
    final product = payload['product'] as Map<String, dynamic>? ?? const {};
    return _mapProductToBatch(product);
  }

  Future<CreateEventResult> addFarmingEvent({
    required String batchId,
    required String actionType,
    required String note,
    required List<XFile> images,
    List<XFile> videos = const [],
    Map<String, dynamic>? details,
  }) async {
    final uploadedMedia = await _uploadMediaFiles([...images, ...videos]);
    final imagePayload = uploadedMedia
        .where((item) => item.mediaType == 'image')
        .map((item) => item.toTracePayload())
        .toList();
    final videoPayload = uploadedMedia
        .where((item) => item.mediaType == 'video')
        .map((item) => item.toTracePayload())
        .toList();

    final response = await _dio.post(
      '/trace/events',
      data: {
        'product': batchId,
        'eventType': actionType,
        'description': note,
        'details': details ?? const {},
        'images': imagePayload,
        'videos': videoPayload,
      },
    );

    final payload = response.data as Map<String, dynamic>;
    final event =
        (payload['event'] as Map<String, dynamic>?) ??
        (payload['traceEvent'] as Map<String, dynamic>?) ??
        const {};
    final blockchain =
        payload['blockchain'] as Map<String, dynamic>? ?? const {};
    final message =
        (payload['msg'] ??
                payload['message'] ??
                payload['warning'] ??
                (blockchain.isNotEmpty
                    ? 'Đã lưu nhật ký và ghi nhận xác thực thành công.'
                    : 'Đã lưu nhật ký nhưng blockchain chưa được cấu hình.'))
            .toString();

    return CreateEventResult(
      message: message,
      batchId: batchId,
      transactionHash:
          (payload['txHash'] ?? blockchain['txHash'] ?? event['txHash'] ?? '')
              .toString(),
      dataHash:
          payload['dataHash']?.toString() ??
          blockchain['dataHash']?.toString() ??
          event['dataHash']?.toString(),
      onChainStatus:
          (payload['onChainStatus'] ?? event['onChainStatus'] ?? 'pending')
              .toString(),
      warning: payload['warning']?.toString(),
    );
  }

  Batch _mapProductToBatch(Map<String, dynamic> product) {
    final events = product['events'] as List<dynamic>? ?? const [];
    return Batch(
      id: (product['_id'] ?? '').toString(),
      batchId: (product['_id'] ?? '').toString(),
      batchCode: (product['batch_code'] ?? '').toString(),
      productName: (product['name'] ?? '').toString(),
      productType: (product['category'] ?? product['type'] ?? '').toString(),
      productKind: (product['type'] ?? 'Plant').toString(),
      farmingAreaId: _objectId(product['farming_area']),
      origin: (product['origin'] ?? '').toString(),
      cultivationTime: (product['cultivation_time'] ?? '').toString(),
      description: (product['description'] ?? '').toString(),
      status: (product['status'] ?? 'active').toString(),
      initialQuantity: _numToDouble(product['initial_quantity']),
      currentQuantity: _numToDouble(product['current_quantity']),
      unit: (product['unit'] ?? 'kg').toString(),
      imageUrls: _mapMediaUrls(product['images']),
      qrCodeUrl: (product['qrcode'] ?? '').toString(),
      liveCameras: _mapLiveCameras(product['live_cameras']),
      events: events
          .whereType<Map<String, dynamic>>()
          .map(_mapTraceEvent)
          .toList(),
    );
  }

  List<LiveCamera> _mapLiveCameras(dynamic raw) {
    if (raw is! List) return const [];

    return raw
        .whereType<Map<String, dynamic>>()
        .map(LiveCamera.fromJson)
        .where((camera) => camera.isActive && camera.streamUrl.isNotEmpty)
        .toList();
  }

  List<String> _mapMediaUrls(dynamic raw) {
    if (raw is! List) return const [];

    return raw
        .map(
          (item) => item is Map<String, dynamic>
              ? _resolveMediaUrl((item['path'] ?? item['url'] ?? '').toString())
              : _resolveMediaUrl(item.toString()),
        )
        .where((item) => item.isNotEmpty)
        .toList();
  }

  double _numToDouble(dynamic raw) {
    if (raw is num) return raw.toDouble();
    return double.tryParse(raw?.toString() ?? '') ?? 0;
  }

  String _objectId(dynamic raw) {
    if (raw is Map<String, dynamic>) return (raw['_id'] ?? raw['id'] ?? '').toString();
    return (raw ?? '').toString();
  }

  Future<List<LiveCamera>> getProductCameras(String productId) async {
    final response = await _dio.get('/products/$productId');
    final payload = response.data as Map<String, dynamic>;
    final product = payload['product'] as Map<String, dynamic>? ?? const {};
    final raw = product['live_cameras'] as List<dynamic>? ?? const [];

    return raw
        .whereType<Map<String, dynamic>>()
        .map(LiveCamera.fromJson)
        .toList();
  }

  Future<List<LiveCamera>> updateProductCameras({
    required String productId,
    required List<LiveCamera> cameras,
  }) async {
    final response = await _dio.patch(
      '/products/$productId/cameras',
      data: {
        'live_cameras': cameras
            .map(
              (camera) => {
                'name': camera.name.trim(),
                'stream_url': camera.streamUrl.trim(),
                'location': camera.location.trim(),
                'is_active': camera.isActive,
              },
            )
            .toList(),
      },
    );

    final payload = response.data as Map<String, dynamic>;
    final product = payload['product'] as Map<String, dynamic>? ?? const {};
    final raw = product['live_cameras'] as List<dynamic>? ?? const [];

    return raw
        .whereType<Map<String, dynamic>>()
        .map(LiveCamera.fromJson)
        .toList();
  }

  BatchEvent _mapTraceEvent(Map<String, dynamic> event) {
    return BatchEvent(
      id: (event['_id'] ?? '').toString(),
      actionType: (event['eventType'] ?? event['actionType'] ?? '').toString(),
      note: (event['description'] ?? event['note'] ?? '').toString(),
      details: event['details'] is Map<String, dynamic>
          ? (event['details'] as Map<String, dynamic>)
          : const {},
      imageUrls: (event['images'] as List<dynamic>? ?? const [])
          .map(
            (item) => item is Map<String, dynamic>
                ? _resolveMediaUrl(
                    (item['path'] ?? item['url'] ?? '').toString(),
                  )
                : _resolveMediaUrl(item.toString()),
          )
          .where((item) => item.isNotEmpty)
          .toList(),
      videoUrls: (event['videos'] as List<dynamic>? ?? const [])
          .map(
            (item) => item is Map<String, dynamic>
                ? _resolveMediaUrl(
                    (item['path'] ?? item['url'] ?? '').toString(),
                  )
                : _resolveMediaUrl(item.toString()),
          )
          .where((item) => item.isNotEmpty)
          .toList(),
      dataHash: event['dataHash']?.toString(),
      transactionHash:
          event['transactionHash']?.toString() ?? event['txHash']?.toString(),
      blockNumber: event['blockNumber'] is num
          ? (event['blockNumber'] as num).toInt()
          : null,
      actor:
          event['actor']?.toString() ??
          (event['recorded_by'] is Map<String, dynamic>
              ? (event['recorded_by']['first_name'] ?? '').toString()
              : null),
      onChainStatus: (event['onChainStatus'] ?? 'pending').toString(),
      createdAt:
          DateTime.tryParse((event['createdAt'] ?? '').toString()) ??
          DateTime.now(),
    );
  }

  Future<List<_UploadedMedia>> _uploadMediaFiles(List<XFile> files) async {
    if (files.isEmpty) return const [];

    final formData = FormData();
    for (final file in files) {
      final contentType = _guessMediaType(file.name);
      final bytes = await file.readAsBytes();
      formData.files.add(
        MapEntry(
          'files',
          MultipartFile.fromBytes(
            bytes,
            filename: file.name,
            contentType: contentType,
          ),
        ),
      );
    }

    final response = await _dio.post('/upload/media', data: formData);
    final payload = response.data;

    final list = payload is Map<String, dynamic>
        ? (payload['files'] as List<dynamic>? ?? const [])
        : const <dynamic>[];

    return list.map((item) {
      final map = item as Map<String, dynamic>;
      final path = (map['path'] ?? '').toString();
      final filename = (map['filename'] ?? '').toString();
      final mediaType = (map['mediaType'] ?? 'image').toString();
      final mimeType = map['mimeType']?.toString();

      return _UploadedMedia(
        path: path,
        filename: filename,
        mediaType: mediaType,
        mimeType: mimeType,
      );
    }).toList();
  }

  Future<List<Map<String, dynamic>>> _uploadProductImages(
    List<XFile> images,
  ) async {
    if (images.isEmpty) return const [];

    final uploaded = await _uploadMediaFiles(images);
    return uploaded
        .where((item) => item.mediaType == 'image')
        .map((item) => item.toTracePayload())
        .toList();
  }

  Map<String, dynamic> _mediaPayloadFromUrl(String url) {
    final uri = Uri.tryParse(url.trim());
    final path = uri == null
        ? url.trim()
        : (uri.hasScheme ? uri.path : uri.toString());
    final parts = path.split('/').where((part) => part.isNotEmpty).toList();
    final filename = parts.isEmpty ? null : parts.last;

    return {
      'path': path.startsWith('/') ? path : '/$path',
      'filename': filename ?? 'image',
    };
  }

  String _resolveMediaUrl(String value) {
    final trimmed = value.trim();
    if (trimmed.isEmpty) return '';

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }

    final baseUri = Uri.parse(_dio.options.baseUrl);
    final rootUri = baseUri.replace(path: '/', query: '', fragment: '');
    final normalized = trimmed.startsWith('/') ? trimmed : '/$trimmed';
    return rootUri.resolve(normalized).toString();
  }

  MediaType _guessMediaType(String fileName) {
    final ext = fileName.split('.').last.toLowerCase();

    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return MediaType('image', 'jpeg');
      case 'png':
        return MediaType('image', 'png');
      case 'gif':
        return MediaType('image', 'gif');
      case 'webp':
        return MediaType('image', 'webp');
      case 'mp4':
        return MediaType('video', 'mp4');
      case 'mov':
        return MediaType('video', 'quicktime');
      case 'avi':
        return MediaType('video', 'x-msvideo');
      case 'mkv':
        return MediaType('video', 'x-matroska');
      case 'webm':
        return MediaType('video', 'webm');
      default:
        return MediaType('application', 'octet-stream');
    }
  }
}
