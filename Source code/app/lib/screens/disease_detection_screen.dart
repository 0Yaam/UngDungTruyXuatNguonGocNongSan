import 'package:app/core/theme.dart';
import 'package:app/models/batch.dart';
import 'package:app/models/disease_detection.dart';
import 'package:app/providers/providers.dart';
import 'package:app/widgets/liquid_glass.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

class DiseaseDetectionScreen extends ConsumerStatefulWidget {
  const DiseaseDetectionScreen({super.key});

  @override
  ConsumerState<DiseaseDetectionScreen> createState() =>
      _DiseaseDetectionScreenState();
}

class _DiseaseDetectionScreenState
    extends ConsumerState<DiseaseDetectionScreen> {
  static const _maxImageBytes = 5 * 1024 * 1024;
  static const _allowedExtensions = {'jpg', 'jpeg', 'png', 'webp'};
  static const _allowedMimeTypes = {
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  };
  static const _maxPickedImageDimension = 2048.0;
  static const _symptomOptions = [
    'Vàng lá',
    'Đốm nâu',
    'Cháy lá',
    'Héo rũ',
    'Thối rễ',
    'Phấn trắng',
    'Lỗ thủng trên lá',
    'Rệp hoặc côn trùng',
    'Xoăn lá',
    'Chậm lớn',
  ];

  final _notesController = TextEditingController();
  final _picker = ImagePicker();
  final List<String> _selectedSymptoms = [];
  final List<_SelectedImage> _images = [];

  bool _loading = true;
  bool _saving = false;
  bool _checkingProduct = false;
  String? _error;
  String _productId = '';
  String _historyFilter = 'all';
  List<Batch> _batches = [];
  List<DiseaseDetection> _detections = [];
  DiseaseDetectionCapabilities? _capabilities;
  DiseaseDetectionCapabilities? _productCapabilities;

  int get _maxImages {
    final configured = _capabilities?.model.maxImages ?? 3;
    return configured.clamp(1, 3).toInt();
  }

  String get _currentRole {
    final auth = ref.read(authStateProvider);
    return (auth?['user']?['role'] ?? auth?['role'] ?? '')
        .toString()
        .toLowerCase();
  }

  bool get _canUseFeature =>
      const {'admin', 'manager', 'farmer'}.contains(_currentRole);

  bool get _canDelete => _canUseFeature;

  bool get _cameraAvailable =>
      kIsWeb ||
      defaultTargetPlatform == TargetPlatform.android ||
      defaultTargetPlatform == TargetPlatform.iOS;

  List<Batch> get _supportedBatches {
    final crops = _capabilities?.supportedCrops ?? const [];
    return _batches.where((batch) {
      if (batch.productKind.toLowerCase() != 'plant') return false;
      if (crops.isEmpty) return false;
      final source = _normalize('${batch.productName} ${batch.productType}');
      return crops.any(
        (crop) =>
            crop.aliases.any((alias) => source.contains(_normalize(alias))),
      );
    }).toList();
  }

  List<DiseaseDetection> get _visibleDetections {
    if (_historyFilter == 'all') return _detections;
    return _detections
        .where((item) => item.analysisStatus == _historyFilter)
        .toList();
  }

  @override
  void initState() {
    super.initState();
    _initialize();
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _initialize() async {
    await _load();
    await _recoverLostImages();
  }

  Future<void> _load() async {
    if (_saving) return;
    if (!_canUseFeature) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = null;
        });
      }
      return;
    }
    try {
      setState(() {
        _loading = true;
        _error = null;
      });

      List<Batch>? loadedBatches;
      List<DiseaseDetection>? loadedDetections;
      DiseaseDetectionCapabilities? loadedCapabilities;
      Object? batchesError;
      Object? detectionsError;
      Object? capabilitiesError;

      await Future.wait([
        () async {
          try {
            loadedBatches = await ref.read(batchServiceProvider).getBatches();
          } catch (error) {
            batchesError = error;
          }
        }(),
        () async {
          try {
            loadedDetections = await ref
                .read(diseaseDetectionServiceProvider)
                .getDetections();
          } catch (error) {
            detectionsError = error;
          }
        }(),
        () async {
          try {
            loadedCapabilities = await ref
                .read(diseaseDetectionServiceProvider)
                .getCapabilities();
          } catch (error) {
            capabilitiesError = error;
          }
        }(),
      ]);
      if (!mounted) return;

      final loadErrors = <String>[
        if (batchesError != null)
          'Danh sách lô: ${_errorMessage(batchesError!)}',
        if (detectionsError != null)
          'Lịch sử nhận diện: ${_errorMessage(detectionsError!)}',
        if (capabilitiesError != null)
          'Trạng thái AI: ${_errorMessage(capabilitiesError!)}',
      ];

      setState(() {
        if (loadedBatches != null) _batches = loadedBatches!;
        if (loadedDetections != null) _detections = loadedDetections!;
        _capabilities = capabilitiesError == null ? loadedCapabilities : null;
        _productCapabilities = null;
        _error = loadErrors.isEmpty ? null : loadErrors.join('\n');
      });

      final supported = _supportedBatches;
      final currentStillAvailable = supported.any(
        (batch) => batch.batchId == _productId,
      );
      final nextProductId = currentStillAvailable
          ? _productId
          : supported.isNotEmpty
          ? supported.first.batchId
          : '';
      if (mounted) setState(() => _productId = nextProductId);
      if (nextProductId.isNotEmpty) {
        await _checkProductCapability(nextProductId, showProgress: false);
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _checkProductCapability(
    String productId, {
    bool showProgress = true,
  }) async {
    if (showProgress && mounted) {
      setState(() {
        _checkingProduct = true;
        _error = null;
      });
    }
    try {
      final result = await ref
          .read(diseaseDetectionServiceProvider)
          .getCapabilities(productId: productId);
      if (!mounted || _productId != productId) return;
      setState(() => _productCapabilities = result);
    } catch (error) {
      if (!mounted || _productId != productId) return;
      setState(() {
        _productCapabilities = null;
        _error = _errorMessage(error);
      });
    } finally {
      if (mounted && _productId == productId) {
        setState(() => _checkingProduct = false);
      }
    }
  }

  Future<void> _selectProduct(String productId) async {
    setState(() {
      _productId = productId;
      _productCapabilities = null;
      _images.clear();
      _selectedSymptoms.clear();
      _notesController.clear();
      _error = null;
    });
    await _checkProductCapability(productId);
  }

  Future<void> _pickFromGallery() async {
    try {
      final picked = await _picker.pickMultiImage(
        maxWidth: _maxPickedImageDimension,
        maxHeight: _maxPickedImageDimension,
        imageQuality: 88,
      );
      await _addImages(picked);
    } catch (error) {
      if (mounted) setState(() => _error = _errorMessage(error));
    }
  }

  Future<void> _pickFromCamera() async {
    try {
      final picked = await _picker.pickImage(
        source: ImageSource.camera,
        maxWidth: _maxPickedImageDimension,
        maxHeight: _maxPickedImageDimension,
        imageQuality: 88,
      );
      if (picked != null) await _addImages([picked]);
    } catch (error) {
      if (mounted) {
        setState(
          () => _error =
              'Không mở được máy ảnh. Hãy kiểm tra quyền camera hoặc chọn ảnh từ thư viện.',
        );
      }
    }
  }

  Future<void> _recoverLostImages() async {
    if (!_canUseFeature ||
        kIsWeb ||
        defaultTargetPlatform != TargetPlatform.android) {
      return;
    }
    try {
      final response = await _picker.retrieveLostData();
      if (response.isEmpty || response.type != RetrieveType.image) return;
      if (response.exception != null) {
        if (mounted) {
          setState(
            () => _error =
                'Không thể khôi phục ảnh camera trước đó. Vui lòng chọn lại ảnh.',
          );
        }
        return;
      }
      final recovered =
          response.files ?? [if (response.file != null) response.file!];
      await _addImages(recovered);
    } catch (_) {
      if (mounted) {
        setState(
          () => _error =
              'Không thể khôi phục ảnh camera trước đó. Vui lòng chọn lại ảnh.',
        );
      }
    }
  }

  Future<void> _addImages(List<XFile> picked) async {
    if (picked.isEmpty) return;
    final remaining = _maxImages - _images.length;
    if (remaining <= 0) {
      setState(() => _error = 'Chỉ được chọn tối đa $_maxImages ảnh.');
      return;
    }

    final accepted = <_SelectedImage>[];
    final rejected = <String>[];
    for (final image in picked) {
      if (accepted.length >= remaining) break;
      final extension = image.name.contains('.')
          ? image.name.split('.').last.toLowerCase()
          : '';
      final mimeType = image.mimeType?.toLowerCase().trim();
      final hasSupportedType =
          _allowedExtensions.contains(extension) ||
          (mimeType != null && _allowedMimeTypes.contains(mimeType));
      if (!hasSupportedType) {
        rejected.add('${image.name}: chỉ nhận JPEG, PNG hoặc WebP');
        continue;
      }
      final length = await image.length();
      if (length > _maxImageBytes) {
        rejected.add('${image.name}: vượt quá 5 MB');
        continue;
      }
      if (length == 0) {
        rejected.add('${image.name}: tệp rỗng');
        continue;
      }
      final duplicate = [..._images, ...accepted].any(
        (item) => item.file.path == image.path && item.file.name == image.name,
      );
      if (duplicate) continue;
      accepted.add(
        _SelectedImage(file: image, bytes: await image.readAsBytes()),
      );
    }

    if (!mounted) return;
    setState(() {
      _images.addAll(accepted);
      final messages = <String>[
        ...rejected,
        if (picked.length > accepted.length + rejected.length)
          'Một số ảnh trùng hoặc vượt quá giới hạn $_maxImages ảnh đã được bỏ qua.',
      ];
      _error = messages.isEmpty ? null : messages.join('\n');
    });
  }

  void _removeImage(int index) {
    setState(() => _images.removeAt(index));
  }

  Future<void> _submit() async {
    if (_productId.isEmpty) {
      setState(() => _error = 'Không có lô cây trồng phù hợp để phân tích.');
      return;
    }
    if (_checkingProduct) {
      setState(() => _error = 'Đang kiểm tra lô, vui lòng chờ trong giây lát.');
      return;
    }
    if (_capabilities?.model.ready != true) {
      setState(
        () => _error = 'Mô hình AI hiện chưa sẵn sàng. Vui lòng thử lại sau.',
      );
      return;
    }
    if (_productCapabilities?.product?.supported != true) {
      setState(
        () => _error =
            _productCapabilities?.product?.detail ??
            _productSupportMessage(_productCapabilities?.product?.reason),
      );
      return;
    }
    if (_images.isEmpty) {
      setState(() => _error = 'Vui lòng thêm ít nhất 1 ảnh cây cần nhận diện.');
      return;
    }

    try {
      setState(() {
        _saving = true;
        _error = null;
      });
      final detection = await ref
          .read(diseaseDetectionServiceProvider)
          .createDetection(
            productId: _productId,
            symptoms: _selectedSymptoms,
            notes: _notesController.text,
            images: _images.map((item) => item.file).toList(),
          );
      if (!mounted) return;
      setState(() {
        _detections = [
          detection,
          ..._detections.where((item) => item.id != detection.id),
        ];
        _selectedSymptoms.clear();
        _notesController.clear();
        _images.clear();
        _historyFilter = 'all';
      });
      final inconclusive = detection.analysisStatus == 'inconclusive';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            inconclusive
                ? 'Ảnh chưa đủ rõ để AI kết luận. Hãy xem cảnh báo bên dưới.'
                : 'Đã hoàn tất phân tích ảnh bằng AI.',
          ),
        ),
      );
    } catch (error) {
      if (mounted) setState(() => _error = _errorMessage(error));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _delete(String id) async {
    if (!_canDelete) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Xóa kết quả nhận diện?'),
        content: const Text('Thao tác này sẽ xóa bản ghi và ảnh khỏi lịch sử.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Xóa'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await ref.read(diseaseDetectionServiceProvider).deleteDetection(id);
      if (mounted) {
        setState(
          () => _detections = _detections
              .where((detection) => detection.id != id)
              .toList(),
        );
      }
    } catch (error) {
      if (mounted) setState(() => _error = _errorMessage(error));
    }
  }

  void _toggleSymptom(String symptom) {
    setState(() {
      if (_selectedSymptoms.contains(symptom)) {
        _selectedSymptoms.remove(symptom);
      } else {
        _selectedSymptoms.add(symptom);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authStateProvider);
    final role = (auth?['user']?['role'] ?? auth?['role'] ?? '')
        .toString()
        .toLowerCase();
    final canUseFeature = const {'admin', 'manager', 'farmer'}.contains(role);
    final canDelete = canUseFeature;
    final visibleDetections = _visibleDetections;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Nhận diện bệnh cây'),
        actions: [
          if (canUseFeature)
            IconButton(
              tooltip: 'Làm mới',
              onPressed: _loading || _saving ? null : _load,
              icon: const Icon(Icons.refresh_rounded),
            ),
        ],
      ),
      body: GlassPageBackground(
        child: !canUseFeature
            ? const _AccessDeniedPanel()
            : _loading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _saving ? () async {} : _load,
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    final wide = constraints.maxWidth >= 980;
                    return ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 36),
                      children: [
                        Center(
                          child: ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 1220),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                _HeaderCard(
                                  total: _detections.length,
                                  capabilities: _capabilities,
                                ),
                                const SizedBox(height: 14),
                                if (_error != null) ...[
                                  _ErrorPanel(
                                    message: _error!,
                                    onClose: () =>
                                        setState(() => _error = null),
                                  ),
                                  const SizedBox(height: 14),
                                ],
                                if (wide)
                                  Row(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Expanded(
                                        flex: 11,
                                        child: _buildAnalyzer(),
                                      ),
                                      const SizedBox(width: 18),
                                      Expanded(
                                        flex: 10,
                                        child: _buildHistory(
                                          visibleDetections,
                                          canDelete: canDelete,
                                        ),
                                      ),
                                    ],
                                  )
                                else ...[
                                  _buildAnalyzer(),
                                  const SizedBox(height: 20),
                                  _buildHistory(
                                    visibleDetections,
                                    canDelete: canDelete,
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                ),
              ),
      ),
    );
  }

  Widget _buildAnalyzer() {
    return _AnalyzerCard(
      batches: _supportedBatches,
      productId: _productId,
      capabilities: _capabilities,
      productCapabilities: _productCapabilities,
      checkingProduct: _checkingProduct,
      selectedSymptoms: _selectedSymptoms,
      symptomOptions: _symptomOptions,
      images: _images,
      notesController: _notesController,
      saving: _saving,
      cameraAvailable: _cameraAvailable,
      onProductChanged: _selectProduct,
      onToggleSymptom: _toggleSymptom,
      onPickGallery: _pickFromGallery,
      onPickCamera: _pickFromCamera,
      onRemoveImage: _removeImage,
      onSubmit: _submit,
    );
  }

  Widget _buildHistory(
    List<DiseaseDetection> visibleDetections, {
    required bool canDelete,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                'Lịch sử nhận diện',
                style: Theme.of(context).textTheme.titleLarge,
              ),
            ),
            _HistoryFilter(
              value: _historyFilter,
              onChanged: (value) => setState(() => _historyFilter = value),
            ),
          ],
        ),
        const SizedBox(height: 10),
        if (visibleDetections.isEmpty)
          const GlassPanel(
            child: Text('Chưa có kết quả phù hợp với bộ lọc hiện tại.'),
          )
        else
          ...visibleDetections.map(
            (detection) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _DetectionCard(
                detection: detection,
                onDelete: canDelete ? () => _delete(detection.id) : null,
              ),
            ),
          ),
      ],
    );
  }
}

class _SelectedImage {
  const _SelectedImage({required this.file, required this.bytes});

  final XFile file;
  final Uint8List bytes;
}

class _AccessDeniedPanel extends StatelessWidget {
  const _AccessDeniedPanel();

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(24),
      children: [
        const SizedBox(height: 72),
        Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 560),
            child: const GlassPanel(
              child: Column(
                children: [
                  GlassIconCapsule(
                    icon: Icons.lock_outline_rounded,
                    color: AppColors.danger,
                    size: 58,
                  ),
                  SizedBox(height: 16),
                  Text(
                    'Tài khoản không có quyền sử dụng',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Nhận diện bệnh cây chỉ dành cho nông dân, quản lý và quản trị viên.',
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _HeaderCard extends StatelessWidget {
  const _HeaderCard({required this.total, required this.capabilities});

  final int total;
  final DiseaseDetectionCapabilities? capabilities;

  @override
  Widget build(BuildContext context) {
    final loaded = capabilities != null;
    final ready = capabilities?.model.ready == true;
    final statusIcon = !loaded
        ? Icons.cloud_sync_outlined
        : ready
        ? Icons.cloud_done_outlined
        : Icons.cloud_off_outlined;
    final statusLabel = !loaded
        ? 'Chưa tải được trạng thái AI'
        : ready
        ? 'AI sẵn sàng'
        : 'AI chưa sẵn sàng';
    final statusColor = !loaded
        ? const Color(0xFFB7791F)
        : ready
        ? AppColors.pine
        : AppColors.danger;
    return GlassPanel(
      colors: [
        const Color(0xFFEAF8EF).withValues(alpha: 0.9),
        Colors.white.withValues(alpha: 0.65),
      ],
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const GlassIconCapsule(
                icon: Icons.health_and_safety_outlined,
                size: 58,
                color: AppColors.pine,
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Sàng lọc bệnh bằng AI',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '$total kết quả đã lưu. Chụp cận cảnh lá, đủ sáng và không dùng ảnh sản phẩm đã thu hoạch.',
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _StatusPill(
                icon: statusIcon,
                label: statusLabel,
                color: statusColor,
              ),
              if ((capabilities?.model.version ?? '').isNotEmpty)
                _StatusPill(
                  icon: Icons.memory_rounded,
                  label: capabilities!.model.version!,
                  color: AppColors.forest,
                ),
              ...?capabilities?.supportedCrops.map(
                (crop) => _StatusPill(
                  icon: Icons.eco_outlined,
                  label: crop.label,
                  color: AppColors.pine,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _AnalyzerCard extends StatelessWidget {
  const _AnalyzerCard({
    required this.batches,
    required this.productId,
    required this.capabilities,
    required this.productCapabilities,
    required this.checkingProduct,
    required this.selectedSymptoms,
    required this.symptomOptions,
    required this.images,
    required this.notesController,
    required this.saving,
    required this.cameraAvailable,
    required this.onProductChanged,
    required this.onToggleSymptom,
    required this.onPickGallery,
    required this.onPickCamera,
    required this.onRemoveImage,
    required this.onSubmit,
  });

  final List<Batch> batches;
  final String productId;
  final DiseaseDetectionCapabilities? capabilities;
  final DiseaseDetectionCapabilities? productCapabilities;
  final bool checkingProduct;
  final List<String> selectedSymptoms;
  final List<String> symptomOptions;
  final List<_SelectedImage> images;
  final TextEditingController notesController;
  final bool saving;
  final bool cameraAvailable;
  final ValueChanged<String> onProductChanged;
  final ValueChanged<String> onToggleSymptom;
  final VoidCallback onPickGallery;
  final VoidCallback onPickCamera;
  final ValueChanged<int> onRemoveImage;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    final maxImages = (capabilities?.model.maxImages ?? 3).clamp(1, 3);
    final support = productCapabilities?.product;
    final modelReady = capabilities?.model.ready == true;
    final canSubmit =
        modelReady && support?.supported == true && images.isNotEmpty;

    return GlassPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Phân tích ảnh mới',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 5),
          const Text('AI hiện hỗ trợ ảnh lá cà chua và ớt chuông.'),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            key: ValueKey(productId),
            initialValue: productId.isEmpty ? null : productId,
            isExpanded: true,
            decoration: const InputDecoration(
              labelText: 'Lô cây trồng của bạn',
              prefixIcon: Icon(Icons.inventory_2_outlined),
            ),
            items: batches
                .map(
                  (batch) => DropdownMenuItem(
                    value: batch.batchId,
                    child: Text(
                      batch.batchCode.isEmpty
                          ? batch.productName
                          : '${batch.productName} • ${batch.batchCode}',
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                )
                .toList(),
            onChanged: saving
                ? null
                : (value) {
                    if (value != null) onProductChanged(value);
                  },
          ),
          const SizedBox(height: 10),
          _ProductSupportPanel(
            checking: checkingProduct,
            capabilitiesLoaded: capabilities != null,
            modelReady: modelReady,
            hasBatches: batches.isNotEmpty,
            supported: support?.supported,
            cropLabel: _cropLabel(capabilities, support?.cropCode),
            reason: support?.reason,
            detail: support?.detail,
          ),
          const SizedBox(height: 18),
          const Text(
            'Ảnh để AI phân tích *',
            style: TextStyle(fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 4),
          Text('Chọn 1–$maxImages ảnh JPEG, PNG hoặc WebP, tối đa 5 MB/ảnh.'),
          const SizedBox(height: 10),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              OutlinedButton.icon(
                onPressed: saving || images.length >= maxImages
                    ? null
                    : onPickGallery,
                icon: const Icon(Icons.photo_library_outlined),
                label: const Text('Thư viện'),
              ),
              if (cameraAvailable)
                OutlinedButton.icon(
                  onPressed: saving || images.length >= maxImages
                      ? null
                      : onPickCamera,
                  icon: const Icon(Icons.photo_camera_outlined),
                  label: const Text('Chụp ảnh'),
                ),
            ],
          ),
          if (images.isNotEmpty) ...[
            const SizedBox(height: 12),
            SizedBox(
              height: 104,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: images.length,
                separatorBuilder: (_, _) => const SizedBox(width: 10),
                itemBuilder: (context, index) => _ImageThumbnail(
                  image: images[index],
                  onRemove: saving ? null : () => onRemoveImage(index),
                ),
              ),
            ),
          ],
          const SizedBox(height: 18),
          ExpansionTile(
            tilePadding: EdgeInsets.zero,
            childrenPadding: EdgeInsets.zero,
            title: const Text(
              'Thông tin quan sát (không bắt buộc)',
              style: TextStyle(fontWeight: FontWeight.w900),
            ),
            children: [
              Align(
                alignment: Alignment.centerLeft,
                child: Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: symptomOptions
                      .map(
                        (symptom) => FilterChip(
                          label: Text(symptom),
                          selected: selectedSymptoms.contains(symptom),
                          onSelected: saving
                              ? null
                              : (_) => onToggleSymptom(symptom),
                        ),
                      )
                      .toList(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: notesController,
                enabled: !saving,
                minLines: 2,
                maxLines: 4,
                decoration: const InputDecoration(
                  labelText: 'Ghi chú thực địa',
                  hintText:
                      'Ví dụ: đốm xuất hiện sau mưa, lan nhanh ở lá dưới...',
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: saving || checkingProduct || !canSubmit
                  ? null
                  : onSubmit,
              icon: saving
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.auto_awesome_rounded),
              label: Text(
                saving ? 'AI đang phân tích...' : 'Phân tích bằng AI',
              ),
            ),
          ),
          const SizedBox(height: 12),
          const _Disclaimer(),
        ],
      ),
    );
  }
}

class _ProductSupportPanel extends StatelessWidget {
  const _ProductSupportPanel({
    required this.checking,
    required this.capabilitiesLoaded,
    required this.modelReady,
    required this.hasBatches,
    required this.supported,
    required this.cropLabel,
    required this.reason,
    required this.detail,
  });

  final bool checking;
  final bool capabilitiesLoaded;
  final bool modelReady;
  final bool hasBatches;
  final bool? supported;
  final String? cropLabel;
  final String? reason;
  final String? detail;

  @override
  Widget build(BuildContext context) {
    late final Color color;
    late final IconData icon;
    late final String message;
    if (!capabilitiesLoaded) {
      color = const Color(0xFFB7791F);
      icon = Icons.sync_problem_outlined;
      message =
          'Chưa tải được thông tin mô hình AI. Kiểm tra API rồi nhấn làm mới.';
    } else if (!modelReady) {
      color = AppColors.danger;
      icon = Icons.cloud_off_outlined;
      message = 'Mô hình AI trên máy chủ hiện chưa sẵn sàng.';
    } else if (!hasBatches) {
      color = const Color(0xFFB7791F);
      icon = Icons.info_outline_rounded;
      message = 'Không tìm thấy lô cà chua hoặc ớt chuông thuộc tài khoản này.';
    } else if (checking) {
      color = AppColors.muted;
      icon = Icons.hourglass_top_rounded;
      message = 'Đang kiểm tra khả năng hỗ trợ của lô...';
    } else if (supported == true) {
      color = AppColors.pine;
      icon = Icons.verified_outlined;
      message = 'Lô được hỗ trợ${cropLabel == null ? '' : ': $cropLabel'}.';
    } else if (supported == false) {
      color = AppColors.danger;
      icon = Icons.block_outlined;
      message = detail ?? _productSupportMessage(reason);
    } else {
      color = AppColors.muted;
      icon = Icons.info_outline_rounded;
      message = 'Chọn lô để kiểm tra trước khi phân tích.';
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.22)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (checking)
            SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(strokeWidth: 2, color: color),
            )
          else
            Icon(icon, size: 19, color: color),
          const SizedBox(width: 9),
          Expanded(
            child: Text(
              message,
              style: TextStyle(color: color, fontWeight: FontWeight.w800),
            ),
          ),
        ],
      ),
    );
  }
}

class _ImageThumbnail extends StatelessWidget {
  const _ImageThumbnail({required this.image, required this.onRemove});

  final _SelectedImage image;
  final VoidCallback? onRemove;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 104,
      child: Stack(
        children: [
          Positioned.fill(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Image.memory(
                image.bytes,
                cacheWidth: 384,
                cacheHeight: 384,
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => Container(
                  color: AppColors.moss,
                  alignment: Alignment.center,
                  child: const Icon(Icons.broken_image_outlined),
                ),
              ),
            ),
          ),
          Positioned(
            top: 5,
            right: 5,
            child: Material(
              color: Colors.black.withValues(alpha: 0.64),
              shape: const CircleBorder(),
              child: InkWell(
                customBorder: const CircleBorder(),
                onTap: onRemove,
                child: const Padding(
                  padding: EdgeInsets.all(5),
                  child: Icon(
                    Icons.close_rounded,
                    size: 17,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DetectionCard extends StatelessWidget {
  const _DetectionCard({required this.detection, this.onDelete});

  final DiseaseDetection detection;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    final top = detection.topDisease;
    final status = detection.analysisStatus;
    final inconclusive = status == 'inconclusive';
    final legacy = status == 'legacy';
    final healthy = top.isHealthy == true;
    final previewUrls = detection.imageUrls.take(3).toList(growable: false);
    final color = inconclusive
        ? const Color(0xFFB7791F)
        : healthy
        ? AppColors.pine
        : _riskColor(detection.overallRisk);

    return GlassPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              GlassIconCapsule(
                icon: healthy
                    ? Icons.verified_outlined
                    : inconclusive
                    ? Icons.help_outline_rounded
                    : Icons.eco_outlined,
                color: color,
                size: 50,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      inconclusive ? 'Chưa đủ tin cậy để kết luận' : top.name,
                      style: const TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      '${detection.productName} • ${_date(detection.createdAt)}',
                    ),
                  ],
                ),
              ),
              if (onDelete != null)
                IconButton(
                  tooltip: 'Xóa kết quả',
                  onPressed: onDelete,
                  icon: const Icon(Icons.delete_outline_rounded),
                ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _StatusPill(
                icon: _statusIcon(status),
                label: _statusLabel(status),
                color: color,
              ),
              _StatusPill(
                icon: Icons.photo_outlined,
                label: '${detection.imageUrls.length} ảnh',
                color: AppColors.forest,
              ),
              _StatusPill(
                icon: legacy
                    ? Icons.rule_folder_outlined
                    : Icons.memory_rounded,
                label: legacy ? 'Kết quả quy tắc cũ' : detection.modelVersion,
                color: AppColors.muted,
              ),
            ],
          ),
          if (previewUrls.isNotEmpty) ...[
            const SizedBox(height: 12),
            SizedBox(
              height: 86,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: previewUrls.length,
                separatorBuilder: (_, _) => const SizedBox(width: 8),
                itemBuilder: (context, index) => ClipRRect(
                  borderRadius: BorderRadius.circular(13),
                  child: Image.network(
                    previewUrls[index],
                    width: 96,
                    height: 86,
                    cacheWidth: 384,
                    cacheHeight: 344,
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => Container(
                      width: 96,
                      height: 86,
                      color: AppColors.moss,
                      alignment: Alignment.center,
                      child: const Icon(Icons.broken_image_outlined),
                    ),
                  ),
                ),
              ),
            ),
          ],
          if (inconclusive) ...[
            const SizedBox(height: 12),
            Text(
              'Gợi ý gần nhất: ${top.name} • điểm mô hình ${(top.confidence * 100).round()}%',
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
          ] else ...[
            const SizedBox(height: 12),
            Text(top.description),
          ],
          if (detection.candidates.isNotEmpty) ...[
            const SizedBox(height: 14),
            Text(
              legacy ? 'Kết quả khớp triệu chứng' : 'Các khả năng AI xếp hạng',
              style: const TextStyle(fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 8),
            ...detection.candidates
                .take(3)
                .toList()
                .asMap()
                .entries
                .map(
                  (entry) => _CandidateRow(
                    rank: entry.key + 1,
                    candidate: entry.value,
                    legacy: legacy,
                  ),
                ),
          ],
          if (detection.warnings.isNotEmpty) ...[
            const SizedBox(height: 12),
            ...detection.warnings.map(
              (warning) => Padding(
                padding: const EdgeInsets.only(bottom: 7),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(
                      Icons.warning_amber_rounded,
                      size: 18,
                      color: Color(0xFFB7791F),
                    ),
                    const SizedBox(width: 7),
                    Expanded(child: Text(warning)),
                  ],
                ),
              ),
            ),
          ],
          if (top.recommendations.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              inconclusive ? 'Gợi ý cần chuyên gia xác nhận' : 'Khuyến nghị',
              style: const TextStyle(fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 7),
            ...top.recommendations
                .take(3)
                .map(
                  (item) => Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(
                          Icons.check_circle_outline_rounded,
                          size: 16,
                          color: AppColors.pine,
                        ),
                        const SizedBox(width: 7),
                        Expanded(child: Text(item)),
                      ],
                    ),
                  ),
                ),
          ],
          const SizedBox(height: 10),
          const _Disclaimer(compact: true),
        ],
      ),
    );
  }
}

class _CandidateRow extends StatelessWidget {
  const _CandidateRow({
    required this.rank,
    required this.candidate,
    required this.legacy,
  });

  final int rank;
  final DiseaseCandidate candidate;
  final bool legacy;

  @override
  Widget build(BuildContext context) {
    final percent = (candidate.confidence * 100).round();
    return Padding(
      padding: const EdgeInsets.only(bottom: 9),
      child: Row(
        children: [
          Container(
            width: 28,
            height: 28,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: AppColors.moss,
              borderRadius: BorderRadius.circular(9),
            ),
            child: Text(
              '$rank',
              style: const TextStyle(fontWeight: FontWeight.w900),
            ),
          ),
          const SizedBox(width: 9),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  candidate.name,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                if (!legacy && (candidate.modelLabel ?? '').isNotEmpty)
                  Text(
                    candidate.modelLabel!,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.muted,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Text(
            '$percent% ${legacy ? 'điểm khớp' : 'điểm mô hình'}',
            style: const TextStyle(fontWeight: FontWeight.w800),
          ),
        ],
      ),
    );
  }
}

class _HistoryFilter extends StatelessWidget {
  const _HistoryFilter({required this.value, required this.onChanged});

  final String value;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<String>(
      tooltip: 'Lọc lịch sử',
      initialValue: value,
      onSelected: onChanged,
      itemBuilder: (_) => const [
        PopupMenuItem(value: 'all', child: Text('Tất cả')),
        PopupMenuItem(value: 'completed', child: Text('Đã phân tích')),
        PopupMenuItem(value: 'inconclusive', child: Text('Chưa thể kết luận')),
        PopupMenuItem(value: 'legacy', child: Text('Dữ liệu cũ')),
      ],
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.62),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.glassLine),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.filter_list_rounded, size: 18),
            const SizedBox(width: 6),
            Text(
              _filterLabel(value),
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({
    required this.icon,
    required this.label,
    required this.color,
  });

  final IconData icon;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.16)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 15, color: color),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(color: color, fontWeight: FontWeight.w800),
          ),
        ],
      ),
    );
  }
}

class _Disclaimer extends StatelessWidget {
  const _Disclaimer({this.compact = false});

  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(compact ? 10 : 12),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF7E6),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.info_outline_rounded,
            size: 18,
            color: Color(0xFF8A5A13),
          ),
          const SizedBox(width: 8),
          const Expanded(
            child: Text(
              'Kết quả chỉ dùng để sàng lọc, không thay thế chẩn đoán của chuyên gia nông nghiệp hoặc kiểm nghiệm thực địa.',
              style: TextStyle(
                color: Color(0xFF6F4B15),
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ErrorPanel extends StatelessWidget {
  const _ErrorPanel({required this.message, required this.onClose});

  final String message;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) => GlassPanel(
    colors: [
      const Color(0xFFFFF1F2).withValues(alpha: 0.9),
      Colors.white.withValues(alpha: 0.58),
    ],
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Icon(Icons.error_outline_rounded, color: AppColors.danger),
        const SizedBox(width: 10),
        Expanded(child: Text(message)),
        IconButton(onPressed: onClose, icon: const Icon(Icons.close_rounded)),
      ],
    ),
  );
}

Color _riskColor(String risk) => switch (risk) {
  'high' => AppColors.danger,
  'medium' => const Color(0xFFB7791F),
  _ => AppColors.pine,
};

String _statusLabel(String status) => switch (status) {
  'completed' => 'Đã phân tích',
  'inconclusive' => 'Chưa thể kết luận',
  'legacy' => 'Dữ liệu cũ',
  _ => 'Đã phân tích',
};

IconData _statusIcon(String status) => switch (status) {
  'completed' => Icons.verified_outlined,
  'inconclusive' => Icons.help_outline_rounded,
  'legacy' => Icons.history_rounded,
  _ => Icons.check_circle_outline_rounded,
};

String _filterLabel(String value) => switch (value) {
  'completed' => 'Đã phân tích',
  'inconclusive' => 'Chưa kết luận',
  'legacy' => 'Dữ liệu cũ',
  _ => 'Tất cả',
};

String _productSupportMessage(String? reason) => switch (reason) {
  'animal_product' => 'AI nhận diện bệnh hiện chỉ áp dụng cho cây trồng.',
  'unsupported_crop' => 'Loại cây của lô này chưa được mô hình hỗ trợ.',
  _ => 'Lô này chưa sẵn sàng để phân tích bằng AI.',
};

String? _cropLabel(
  DiseaseDetectionCapabilities? capabilities,
  String? cropCode,
) {
  if (cropCode == null) return null;
  for (final crop in capabilities?.supportedCrops ?? const []) {
    if (crop.code == cropCode) return crop.label;
  }
  return cropCode;
}

String _normalize(String value) => value
    .toLowerCase()
    .replaceAll(RegExp('[àáạảãâầấậẩẫăằắặẳẵ]'), 'a')
    .replaceAll(RegExp('[èéẹẻẽêềếệểễ]'), 'e')
    .replaceAll(RegExp('[ìíịỉĩ]'), 'i')
    .replaceAll(RegExp('[òóọỏõôồốộổỗơờớợởỡ]'), 'o')
    .replaceAll(RegExp('[ùúụủũưừứựửữ]'), 'u')
    .replaceAll(RegExp('[ỳýỵỷỹ]'), 'y')
    .replaceAll('đ', 'd')
    .replaceAll(RegExp('[^a-z0-9]+'), ' ')
    .trim();

String _errorMessage(Object error) {
  final message = error.toString().replaceFirst(RegExp(r'^Exception:\s*'), '');
  return message.isEmpty ? 'Đã xảy ra lỗi. Vui lòng thử lại.' : message;
}

String _date(DateTime date) =>
    '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
