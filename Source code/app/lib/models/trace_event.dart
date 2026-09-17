class TraceEvent {
  final String id;
  final String product;
  final String batchId;
  final String eventType;
  final String description;
  final Map<String, dynamic>? details;
  final List<String> images;
  final List<String> videos;
  final String? dataHash;
  final String? txHash;
  final int? blockNumber;
  final String onChainStatus; // pending | confirmed | failed
  final DateTime createdAt;
  final Map<String, dynamic>? recordedBy;

  TraceEvent({
    required this.id,
    required this.product,
    required this.batchId,
    required this.eventType,
    required this.description,
    this.details,
    required this.images,
    this.videos = const [],
    this.dataHash,
    this.txHash,
    this.blockNumber,
    required this.onChainStatus,
    required this.createdAt,
    this.recordedBy,
  });

  factory TraceEvent.fromJson(Map<String, dynamic> json) => TraceEvent(
    id: json['_id'] as String,
    product: json['product'] is Map
        ? json['product']['_id'] as String
        : json['product'] as String,
    batchId: json['batchId'] as String? ?? '',
    eventType: json['eventType'] as String,
    description: json['description'] as String? ?? '',
    details: json['details'] as Map<String, dynamic>?,
    images: (json['images'] as List<dynamic>? ?? const [])
        .map(
          (item) => item is Map<String, dynamic>
              ? (item['path'] ?? item['url'] ?? '').toString()
              : item.toString(),
        )
        .where((item) => item.isNotEmpty)
        .toList(),
    videos: (json['videos'] as List<dynamic>? ?? const [])
        .map(
          (item) => item is Map<String, dynamic>
              ? (item['path'] ?? item['url'] ?? '').toString()
              : item.toString(),
        )
        .where((item) => item.isNotEmpty)
        .toList(),
    dataHash: json['dataHash'] as String?,
    txHash: json['txHash'] as String?,
    blockNumber: json['blockNumber'] as int?,
    onChainStatus: json['onChainStatus'] as String? ?? 'pending',
    createdAt: DateTime.parse(
      json['createdAt'] as String? ?? DateTime.now().toIso8601String(),
    ),
    recordedBy: json['recorded_by'] as Map<String, dynamic>?,
  );

  String get eventLabel => _eventLabels[eventType] ?? eventType;

  String get eventIcon => _eventIcons[eventType] ?? '📋';

  /// Tên người ghi nhận
  String get recordedByName {
    if (recordedBy == null) return '';
    final first = recordedBy!['first_name'] ?? '';
    final last = recordedBy!['last_name'] ?? '';
    return '$first $last'.trim();
  }

  static const _eventLabels = {
    'SEEDING': 'Gieo hạt',
    'FERTILIZING': 'Bón phân',
    'WATERING': 'Tưới nước',
    'PEST_CONTROL': 'Kiểm soát sâu bệnh',
    'PESTICIDE': 'Phun thuốc BVTV',
    'HARVESTING': 'Thu hoạch',
    'PROCESSING': 'Chế biến',
    'PACKAGING': 'Đóng gói',
    'SHIPPING': 'Vận chuyển',
    'QUALITY_CHECK': 'Kiểm tra chất lượng',
  };

  static const _eventIcons = {
    'SEEDING': '🌱',
    'FERTILIZING': '🧪',
    'WATERING': '💧',
    'PEST_CONTROL': '🐛',
    'PESTICIDE': '💊',
    'HARVESTING': '🌾',
    'PROCESSING': '🏭',
    'PACKAGING': '📦',
    'SHIPPING': '🚚',
    'QUALITY_CHECK': '✅',
  };
}
