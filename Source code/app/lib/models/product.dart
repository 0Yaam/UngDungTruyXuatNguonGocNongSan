<<<<<<< HEAD
import 'package:app/models/live_camera.dart';
=======
import 'package:app/models/farming_area.dart';
>>>>>>> dan/main

class Product {
  final String id;
  final String name;
  final String? description;
  final String category;
  final String origin;
  final String type; // plant | animal
  final double initialQuantity;
  final double currentQuantity;
  final String unit;
  final List<String> images;
  final List<LiveCamera> liveCameras;
  final String? onChainBatchId;
<<<<<<< HEAD
  final String status; // draft | active | completed | recalled
  final Map<String, dynamic>? farmingArea;
=======
  final String? batchTxHash;
  final String status; // draft | active | completed
  final FarmingArea? farmingArea;
>>>>>>> dan/main
  final DateTime? cultivationTime;
  final Map<String, dynamic>? createdBy;
  final DateTime? createdAt;
  final bool isDeleted;
  final DateTime? deletedAt;
  final Map<String, dynamic>? deletedBy;

  Product({
    required this.id,
    required this.name,
    this.description,
    required this.category,
    required this.origin,
    required this.type,
    this.initialQuantity = 0,
    this.currentQuantity = 0,
    this.unit = 'kg',
    required this.images,
    this.liveCameras = const [],
    this.onChainBatchId,
    this.batchTxHash,
    required this.status,
    this.farmingArea,
    this.cultivationTime,
    this.createdBy,
    this.createdAt,
    this.isDeleted = false,
    this.deletedAt,
    this.deletedBy,
  });

  /// `batchId` dùng trên blockchain đang lấy trực tiếp từ `_id`.
  String get batchId => id;

  /// Nhãn hiển thị loại sản phẩm
  String get typeLabel => type == 'animal' ? 'Chăn nuôi' : 'Trồng trọt';
  String get typeIcon => type == 'animal' ? '🐄' : '🌾';

  /// Nhãn hiển thị trạng thái
  String get statusLabel {
    switch (status) {
<<<<<<< HEAD
      case 'active': return 'Đang sản xuất';
      case 'completed': return 'Hoàn thành';
      case 'recalled': return 'Đã thu hồi';
      default: return 'Nháp';
=======
      case 'active':
        return 'Đang sản xuất';
      case 'completed':
        return 'Hoàn thành';
      default:
        return 'Nháp';
>>>>>>> dan/main
    }
  }

  /// Tên người tạo
  String get createdByName {
    if (createdBy == null) return 'N/A';
    final first = createdBy!['first_name'] ?? '';
    final last = createdBy!['last_name'] ?? '';
    return '$first $last'.trim();
  }

  factory Product.fromJson(Map<String, dynamic> json) => Product(
    id: json['_id'] as String,
    name: json['name'] as String,
    description: json['description'] as String?,
    category: json['category'] as String? ?? '',
    origin: json['origin'] as String? ?? '',
    type: json['type'] as String? ?? 'plant',
    initialQuantity: _numToDouble(json['initial_quantity']),
    currentQuantity: _numToDouble(json['current_quantity']),
    unit: json['unit']?.toString() ?? 'kg',
    images: _parseImages(json['images']),
    liveCameras: (json['live_cameras'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(LiveCamera.fromJson)
        .toList(),
    onChainBatchId: json['onChainBatchId'] as String?,
    batchTxHash: json['batchTxHash'] as String?,
    status: json['status'] as String? ?? 'draft',
    farmingArea: json['farming_area'] is Map<String, dynamic>
        ? FarmingArea.fromJson(json['farming_area'] as Map<String, dynamic>)
        : null,
    cultivationTime: json['cultivation_time'] != null
        ? DateTime.tryParse(json['cultivation_time'] as String)
        : null,
    createdBy: json['created_by'] as Map<String, dynamic>?,
    createdAt: json['createdAt'] != null
        ? DateTime.tryParse(json['createdAt'] as String)
        : null,
    isDeleted: json['isDeleted'] == true,
    deletedAt: json['deletedAt'] != null
        ? DateTime.tryParse(json['deletedAt'] as String)
        : null,
    deletedBy: json['deleted_by'] as Map<String, dynamic>?,
  );

  static List<String> _parseImages(dynamic raw) {
    if (raw == null) return [];
    if (raw is! List) return [];
    return raw
        .map((e) {
          if (e is Map) return (e['path'] as String?) ?? '';
          return e.toString();
        })
        .where((s) => s.isNotEmpty)
        .toList();
  }

  static double _numToDouble(dynamic raw) {
    if (raw is num) return raw.toDouble();
    return double.tryParse(raw?.toString() ?? '') ?? 0;
  }
}
