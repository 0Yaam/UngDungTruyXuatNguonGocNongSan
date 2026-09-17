Map<String, dynamic> _asStringMap(dynamic value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) {
    return value.map((key, item) => MapEntry(key.toString(), item));
  }
  return const {};
}

List<String> _asStringList(dynamic value) {
  if (value is! List) return const [];
  return value
      .map((item) => item.toString().trim())
      .where((item) => item.isNotEmpty)
      .toList(growable: false);
}

double _asDouble(dynamic value, {double fallback = 0}) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString() ?? '') ?? fallback;
}

int _asInt(dynamic value, {required int fallback}) {
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? fallback;
}

class DiseaseSupportedCrop {
  const DiseaseSupportedCrop({
    required this.code,
    required this.label,
    required this.aliases,
  });

  final String code;
  final String label;
  final List<String> aliases;

  factory DiseaseSupportedCrop.fromJson(Map<String, dynamic> json) {
    return DiseaseSupportedCrop(
      code: (json['code'] ?? '').toString(),
      label: (json['label'] ?? '').toString(),
      aliases: _asStringList(json['aliases']),
    );
  }
}

class DiseaseModelCapability {
  const DiseaseModelCapability({
    required this.ready,
    required this.version,
    required this.inputSize,
    required this.inputWidth,
    required this.inputHeight,
    required this.maxImages,
    required this.minConfidence,
  });

  final bool ready;
  final String? version;
  final int inputSize;
  final int inputWidth;
  final int inputHeight;
  final int maxImages;
  final double minConfidence;

  factory DiseaseModelCapability.fromJson(Map<String, dynamic> json) {
    final inputSize = _asInt(json['inputSize'], fallback: 224);
    return DiseaseModelCapability(
      ready: json['ready'] == true,
      version: json['version']?.toString(),
      inputSize: inputSize,
      inputWidth: _asInt(json['inputWidth'], fallback: inputSize),
      inputHeight: _asInt(json['inputHeight'], fallback: inputSize),
      maxImages: _asInt(json['maxImages'], fallback: 3).clamp(1, 3).toInt(),
      minConfidence: _asDouble(json['minConfidence'], fallback: 0.65),
    );
  }
}

class DiseaseProductCapability {
  const DiseaseProductCapability({
    required this.id,
    required this.name,
    required this.type,
    required this.supported,
    this.cropCode,
    this.reason,
    this.detail,
  });

  final String id;
  final String name;
  final String type;
  final bool supported;
  final String? cropCode;
  final String? reason;
  final String? detail;

  factory DiseaseProductCapability.fromJson(Map<String, dynamic> json) {
    return DiseaseProductCapability(
      id: (json['_id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      type: (json['type'] ?? '').toString(),
      supported: json['supported'] == true,
      cropCode: json['cropCode']?.toString(),
      reason: json['reason']?.toString(),
      detail: json['detail']?.toString(),
    );
  }
}

class DiseaseDetectionCapabilities {
  const DiseaseDetectionCapabilities({
    required this.model,
    required this.supportedCrops,
    this.product,
  });

  final DiseaseModelCapability model;
  final List<DiseaseSupportedCrop> supportedCrops;
  final DiseaseProductCapability? product;

  factory DiseaseDetectionCapabilities.fromJson(Map<String, dynamic> json) {
    final product = _asStringMap(json['product']);
    return DiseaseDetectionCapabilities(
      model: DiseaseModelCapability.fromJson(_asStringMap(json['model'])),
      supportedCrops: (json['supportedCrops'] as List<dynamic>? ?? const [])
          .map(_asStringMap)
          .where((item) => item.isNotEmpty)
          .map(DiseaseSupportedCrop.fromJson)
          .toList(growable: false),
      product: product.isEmpty
          ? null
          : DiseaseProductCapability.fromJson(product),
    );
  }
}

class DiseaseCandidate {
  const DiseaseCandidate({
    required this.code,
    required this.name,
    required this.confidence,
    required this.riskLevel,
    required this.description,
    required this.recommendations,
    this.modelLabel,
    this.sourceLabel,
    this.cropCode,
    this.isHealthy,
  });

  final String code;
  final String name;
  final double confidence;
  final String riskLevel;
  final String description;
  final List<String> recommendations;
  final String? modelLabel;
  final String? sourceLabel;
  final String? cropCode;
  final bool? isHealthy;

  factory DiseaseCandidate.fromJson(Map<String, dynamic> json) {
    return DiseaseCandidate(
      code: (json['disease_code'] ?? '').toString(),
      name: (json['disease_name'] ?? '').toString(),
      confidence: _asDouble(json['confidence']),
      riskLevel: (json['risk_level'] ?? 'low').toString(),
      description: (json['description'] ?? '').toString(),
      recommendations: _asStringList(json['recommendations']),
      modelLabel: json['model_label']?.toString(),
      sourceLabel: json['source_label']?.toString(),
      cropCode: json['crop_code']?.toString(),
      isHealthy: json['is_healthy'] is bool ? json['is_healthy'] as bool : null,
    );
  }
}

class DiseaseDetection {
  const DiseaseDetection({
    required this.id,
    required this.productId,
    required this.productName,
    required this.cropName,
    required this.symptoms,
    required this.notes,
    required this.imageUrls,
    required this.candidates,
    required this.topDisease,
    required this.overallRisk,
    required this.modelVersion,
    required this.analysisStatus,
    required this.inferenceEngine,
    required this.warnings,
    required this.createdAt,
  });

  final String id;
  final String productId;
  final String productName;
  final String cropName;
  final List<String> symptoms;
  final String notes;
  final List<String> imageUrls;
  final List<DiseaseCandidate> candidates;
  final DiseaseCandidate topDisease;
  final String overallRisk;
  final String modelVersion;
  final String analysisStatus;
  final String inferenceEngine;
  final List<String> warnings;
  final DateTime createdAt;

  bool get isInconclusive => analysisStatus == 'inconclusive';
  bool get isLegacy => analysisStatus == 'legacy';
  bool get usesAi => inferenceEngine == 'onnx';

  factory DiseaseDetection.fromJson(
    Map<String, dynamic> json, {
    String? mediaBaseUrl,
  }) {
    final product = json['product'];
    final productMap = _asStringMap(product);
    final candidates = (json['candidates'] as List<dynamic>? ?? const [])
        .map(_asStringMap)
        .where((item) => item.isNotEmpty)
        .map(DiseaseCandidate.fromJson)
        .toList(growable: false);
    final topRaw = _asStringMap(json['top_disease']);
    final topDisease = topRaw.isNotEmpty
        ? DiseaseCandidate.fromJson(topRaw)
        : candidates.isNotEmpty
        ? candidates.first
        : DiseaseCandidate.fromJson(const {
            'disease_code': 'unknown',
            'disease_name': 'Chưa có kết quả',
            'confidence': 0,
            'risk_level': 'low',
            'description': '',
            'recommendations': <String>[],
          });
    final modelVersion = (json['model_version'] ?? 'ruleset-v1').toString();
    final inferredEngine = modelVersion.toLowerCase().contains('rule')
        ? 'rules'
        : 'onnx';
    final inferenceEngine = (json['inference_engine'] ?? inferredEngine)
        .toString();
    final analysisStatus =
        (json['analysis_status'] ??
                (inferenceEngine == 'rules' ? 'legacy' : 'completed'))
            .toString();

    return DiseaseDetection(
      id: (json['_id'] ?? '').toString(),
      productId: productMap.isEmpty
          ? (product ?? '').toString()
          : (productMap['_id'] ?? '').toString(),
      productName: productMap.isEmpty
          ? 'Lô nông sản'
          : (productMap['name'] ?? 'Lô nông sản').toString(),
      cropName: (json['crop_name'] ?? '').toString(),
      symptoms: _asStringList(json['symptoms']),
      notes: (json['notes'] ?? '').toString(),
      imageUrls: (json['images'] as List<dynamic>? ?? const [])
          .map(_asStringMap)
          .map((item) => (item['path'] ?? '').toString())
          .where((item) => item.isNotEmpty)
          .map((item) => _resolveMediaUrl(item, mediaBaseUrl))
          .toList(growable: false),
      candidates: candidates,
      topDisease: topDisease,
      overallRisk: (json['overall_risk'] ?? topDisease.riskLevel).toString(),
      modelVersion: modelVersion,
      analysisStatus: analysisStatus,
      inferenceEngine: inferenceEngine,
      warnings: _asStringList(json['warnings']),
      createdAt:
          DateTime.tryParse((json['createdAt'] ?? '').toString()) ??
          DateTime.now(),
    );
  }
}

String _resolveMediaUrl(String path, String? mediaBaseUrl) {
  final uri = Uri.tryParse(path);
  if (uri != null && uri.hasScheme) return path;
  if (mediaBaseUrl == null || mediaBaseUrl.isEmpty) return path;
  final base = Uri.tryParse(mediaBaseUrl);
  if (base == null) return path;
  return base.resolve(path).toString();
}
