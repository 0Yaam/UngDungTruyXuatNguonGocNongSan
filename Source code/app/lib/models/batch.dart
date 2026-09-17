import 'package:app/models/live_camera.dart';

class BatchEvent {
  final String id;
  final String actionType;
  final String note;
  final Map<String, dynamic> details;
  final List<String> imageUrls;
  final List<String> videoUrls;
  final String? dataHash;
  final String? transactionHash;
  final int? blockNumber;
  final String? actor;
  final String onChainStatus;
  final DateTime createdAt;

  const BatchEvent({
    required this.id,
    required this.actionType,
    required this.note,
    required this.details,
    required this.imageUrls,
    required this.videoUrls,
    required this.dataHash,
    required this.transactionHash,
    required this.blockNumber,
    required this.actor,
    required this.onChainStatus,
    required this.createdAt,
  });

  factory BatchEvent.fromJson(Map<String, dynamic> json) {
    return BatchEvent(
      id: (json['_id'] ?? '').toString(),
      actionType: (json['actionType'] ?? '').toString(),
      note: (json['note'] ?? '').toString(),
      details: json['details'] is Map<String, dynamic>
          ? (json['details'] as Map<String, dynamic>)
          : const {},
      imageUrls: (json['imageUrls'] as List<dynamic>? ?? const [])
          .map((item) => item.toString())
          .toList(),
      videoUrls: (json['videoUrls'] as List<dynamic>? ?? const [])
          .map((item) => item.toString())
          .toList(),
      dataHash: json['dataHash']?.toString(),
      transactionHash: json['transactionHash']?.toString(),
      blockNumber: json['blockNumber'] is num
          ? (json['blockNumber'] as num).toInt()
          : null,
      actor: json['actor']?.toString(),
      onChainStatus: (json['onChainStatus'] ?? 'pending').toString(),
      createdAt:
          DateTime.tryParse((json['createdAt'] ?? '').toString()) ??
          DateTime.now(),
    );
  }
}

class Batch {
  final String id;
  final String batchId;
  final String batchCode;
  final String productName;
  final String productType;
  final String productKind;
  final String farmingAreaId;
  final String origin;
  final String cultivationTime;
  final String description;
  final String status;
  final double initialQuantity;
  final double currentQuantity;
  final String unit;
  final List<String> imageUrls;
  final String qrCodeUrl;
  final List<LiveCamera> liveCameras;
  final List<BatchEvent> events;

  const Batch({
    required this.id,
    required this.batchId,
    this.batchCode = '',
    required this.productName,
    required this.productType,
    this.productKind = 'Plant',
    this.farmingAreaId = '',
    required this.origin,
    this.cultivationTime = '',
    required this.description,
    required this.status,
    this.initialQuantity = 0,
    this.currentQuantity = 0,
    this.unit = 'kg',
    this.imageUrls = const [],
    required this.qrCodeUrl,
    required this.liveCameras,
    required this.events,
  });

  factory Batch.fromJson(Map<String, dynamic> json) {
    return Batch(
      id: (json['_id'] ?? '').toString(),
      batchId: (json['batchId'] ?? '').toString(),
      batchCode: (json['batchCode'] ?? json['batch_code'] ?? '').toString(),
      productName: (json['productName'] ?? '').toString(),
      productType: (json['productType'] ?? '').toString(),
      productKind: (json['productKind'] ?? json['type'] ?? 'Plant').toString(),
      farmingAreaId: _idToString(json['farmingAreaId'] ?? json['farming_area']),
      origin: (json['origin'] ?? '').toString(),
      cultivationTime:
          (json['cultivationTime'] ?? json['cultivation_time'] ?? '').toString(),
      description: (json['description'] ?? '').toString(),
      status: (json['status'] ?? 'active').toString(),
      initialQuantity: _numToDouble(json['initialQuantity'] ?? json['initial_quantity']),
      currentQuantity: _numToDouble(json['currentQuantity'] ?? json['current_quantity']),
      unit: (json['unit'] ?? 'kg').toString(),
      imageUrls: (json['imageUrls'] as List<dynamic>? ?? const [])
          .map((item) => item.toString())
          .where((item) => item.isNotEmpty)
          .toList(),
      qrCodeUrl: (json['qrCodeUrl'] ?? '').toString(),
      liveCameras: (json['liveCameras'] as List<dynamic>? ?? const [])
          .map((item) => LiveCamera.fromJson(item as Map<String, dynamic>))
          .toList(),
      events: (json['events'] as List<dynamic>? ?? const [])
          .map((item) => BatchEvent.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }

  static double _numToDouble(dynamic raw) {
    if (raw is num) return raw.toDouble();
    return double.tryParse(raw?.toString() ?? '') ?? 0;
  }

  static String _idToString(dynamic raw) {
    if (raw is Map<String, dynamic>) return (raw['_id'] ?? raw['id'] ?? '').toString();
    return (raw ?? '').toString();
  }
}

class CreateEventResult {
  final String message;
  final String batchId;
  final String transactionHash;
  final String? dataHash;
  final String onChainStatus;
  final String? warning;

  const CreateEventResult({
    required this.message,
    required this.batchId,
    required this.transactionHash,
    required this.dataHash,
    required this.onChainStatus,
    required this.warning,
  });

  factory CreateEventResult.fromJson(Map<String, dynamic> json) {
    return CreateEventResult(
      message: (json['message'] ?? '').toString(),
      batchId: (json['batchId'] ?? '').toString(),
      transactionHash: (json['transactionHash'] ?? '').toString(),
      dataHash: json['dataHash']?.toString(),
      onChainStatus: (json['onChainStatus'] ?? 'pending').toString(),
      warning: json['warning']?.toString(),
    );
  }
}
