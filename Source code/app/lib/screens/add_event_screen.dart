import 'dart:typed_data';

import 'package:app/core/theme.dart';
import 'package:app/models/batch.dart';
import 'package:app/providers/providers.dart';
import 'package:app/widgets/liquid_glass.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

class _DetailFieldSpec {
  const _DetailFieldSpec({
    required this.key,
    required this.label,
    required this.hint,
    this.keyboardType = TextInputType.text,
  });

  final String key;
  final String label;
  final String hint;
  final TextInputType keyboardType;
}

class _ActionSampleDraft {
  const _ActionSampleDraft({required this.note, required this.details});

  final String note;
  final Map<String, String> details;
}

const Map<String, List<_DetailFieldSpec>> _detailTemplateByAction = {
  'SEEDING': [
    _DetailFieldSpec(
      key: 'seedType',
      label: 'Loại giống',
      hint: 'VD: Lúa ST25',
    ),
    _DetailFieldSpec(
      key: 'seedAmount',
      label: 'Lượng giống',
      hint: 'VD: 18',
      keyboardType: TextInputType.numberWithOptions(decimal: true),
    ),
    _DetailFieldSpec(key: 'seedUnit', label: 'Đơn vị', hint: 'VD: kg/ha'),
  ],
  'FERTILIZING': [
    _DetailFieldSpec(
      key: 'fertilizerType',
      label: 'Loại phân',
      hint: 'VD: NPK 16-16-8',
    ),
    _DetailFieldSpec(
      key: 'dosage',
      label: 'Lưu lượng / Liều lượng',
      hint: 'VD: 30',
      keyboardType: TextInputType.numberWithOptions(decimal: true),
    ),
    _DetailFieldSpec(key: 'dosageUnit', label: 'Đơn vị', hint: 'VD: kg/ha'),
    _DetailFieldSpec(key: 'method', label: 'Phương pháp', hint: 'VD: Bón gốc'),
  ],
  'WATERING': [
    _DetailFieldSpec(
      key: 'waterVolume',
      label: 'Lượng nước',
      hint: 'VD: 1200',
      keyboardType: TextInputType.numberWithOptions(decimal: true),
    ),
    _DetailFieldSpec(key: 'waterUnit', label: 'Đơn vị', hint: 'VD: lít'),
    _DetailFieldSpec(
      key: 'wateringMethod',
      label: 'Phương pháp tưới',
      hint: 'VD: Tưới nhỏ giọt',
    ),
  ],
  'PEST_CONTROL': [
    _DetailFieldSpec(
      key: 'pestName',
      label: 'Đối tượng sâu bệnh',
      hint: 'VD: Rầy nâu',
    ),
    _DetailFieldSpec(
      key: 'treatment',
      label: 'Biện pháp xử lý',
      hint: 'VD: Phun sinh học',
    ),
    _DetailFieldSpec(
      key: 'dosage',
      label: 'Liều lượng',
      hint: 'VD: 0.5',
      keyboardType: TextInputType.numberWithOptions(decimal: true),
    ),
  ],
  'HARVESTING': [
    _DetailFieldSpec(
      key: 'yield',
      label: 'Sản lượng',
      hint: 'VD: 2.8',
      keyboardType: TextInputType.numberWithOptions(decimal: true),
    ),
    _DetailFieldSpec(key: 'yieldUnit', label: 'Đơn vị', hint: 'VD: tấn'),
    _DetailFieldSpec(
      key: 'qualityGrade',
      label: 'Phân hạng',
      hint: 'VD: Loại A',
    ),
  ],
  'PACKAGING': [
    _DetailFieldSpec(
      key: 'packageType',
      label: 'Quy cách đóng gói',
      hint: 'VD: Túi 5kg',
    ),
    _DetailFieldSpec(
      key: 'packageCount',
      label: 'Số lượng kiện',
      hint: 'VD: 120',
      keyboardType: TextInputType.number,
    ),
  ],
  'SHIPPING': [
    _DetailFieldSpec(
      key: 'vehicle',
      label: 'Phương tiện',
      hint: 'VD: Xe lạnh 2 tấn',
    ),
    _DetailFieldSpec(
      key: 'destination',
      label: 'Điểm đến',
      hint: 'VD: Kho Thủ Đức',
    ),
    _DetailFieldSpec(
      key: 'distanceKm',
      label: 'Quãng đường (km)',
      hint: 'VD: 45',
      keyboardType: TextInputType.numberWithOptions(decimal: true),
    ),
  ],
};

const Map<String, List<_ActionSampleDraft>> _sampleDraftByAction = {
  'SEEDING': [
    _ActionSampleDraft(
      note:
          'Gieo giống ST25 đợt 1 trên diện tích 1.2ha, đất đủ ẩm và đã xử lý cỏ nền trước 24 giờ.',
      details: {
        'seedType': 'Lua ST25',
        'seedAmount': '120',
        'seedUnit': 'kg/ha',
      },
    ),
    _ActionSampleDraft(
      note:
          'Gieo dặm bổ sung tại các điểm thưa để đồng đều mật độ, hoàn tất trước 09:30 sáng.',
      details: {
        'seedType': 'Lua ST25 (gieo dam)',
        'seedAmount': '18',
        'seedUnit': 'kg/ha',
      },
    ),
  ],
  'FERTILIZING': [
    _ActionSampleDraft(
      note:
          'Bon phan lot NPK 16-16-8, ket hop voi xu ly goc de tang kha nang hap thu dau vu.',
      details: {
        'fertilizerType': 'NPK 16-16-8',
        'dosage': '35',
        'dosageUnit': 'kg/ha',
        'method': 'Bon goc dong deu',
      },
    ),
    _ActionSampleDraft(
      note:
          'Bon bo sung huu co vi sinh sau mua nhe, giup phuc hoi bo re va giu am dat.',
      details: {
        'fertilizerType': 'Huu co vi sinh',
        'dosage': '420',
        'dosageUnit': 'kg/ha',
        'method': 'Rai quanh goc + tuoi bo tro',
      },
    ),
  ],
  'WATERING': [
    _ActionSampleDraft(
      note:
          'Tuoi buoi sang luc 05:40, du tri muc am dat on dinh trong giai doan sinh truong manh.',
      details: {
        'waterVolume': '1400',
        'waterUnit': 'lit/ha',
        'wateringMethod': 'Tuoi nho giot',
      },
    ),
    _ActionSampleDraft(
      note:
          'Dieu chinh lich tuoi sau dot nang nong, chia lam 2 luot de tranh soc nhiet cho cay.',
      details: {
        'waterVolume': '1650',
        'waterUnit': 'lit/ha',
        'wateringMethod': 'Phun mua ap luc thap',
      },
    ),
  ],
  'PEST_CONTROL': [
    _ActionSampleDraft(
      note:
          'Phat hien ray nau mat do thap, xu ly bang che pham sinh hoc vao buoi chieu mat troi.',
      details: {
        'pestName': 'Ray nau',
        'treatment': 'Phun che pham neem + theo doi 48h',
        'dosage': '0.45 lit/ha',
      },
    ),
    _ActionSampleDraft(
      note:
          'Kiem soat nam dao o giai doan de nhanh, uu tien bien phap tong hop han che ton du.',
      details: {
        'pestName': 'Nam dao on',
        'treatment': 'Phun sinh hoc ket hop tia tan la benh',
        'dosage': '0.6 lit/ha',
      },
    ),
  ],
  'HARVESTING': [
    _ActionSampleDraft(
      note:
          'Thu hoach dot 1 khi do chin dat yeu cau, tach lo A/B de de truy vet va bao quan.',
      details: {'yield': '2.8', 'yieldUnit': 'tan', 'qualityGrade': 'Loai A'},
    ),
    _ActionSampleDraft(
      note:
          'Thu hoach hoan tat, kiem tra nhanh do am truoc khi dua vao cong doan dong goi.',
      details: {'yield': '3.1', 'yieldUnit': 'tan', 'qualityGrade': 'Loai A+'},
    ),
  ],
  'PACKAGING': [
    _ActionSampleDraft(
      note:
          'Dong goi theo quy cach 5kg/bao, dan ma lot va tem truy xuat cho tung kien hang.',
      details: {'packageType': 'Bao hut am 5kg', 'packageCount': '560'},
    ),
    _ActionSampleDraft(
      note:
          'Dong goi bo sung cho kenh sieu thi, bo tri khay lot va ma QR ben ngoai thung.',
      details: {'packageType': 'Thung carton 10kg', 'packageCount': '220'},
    ),
  ],
  'SHIPPING': [
    _ActionSampleDraft(
      note:
          'Ban giao lo hang cho kho trung chuyen, xe lanh duy tri nhiet do on dinh trong suot hanh trinh.',
      details: {
        'vehicle': 'Xe tai lanh 2 tan',
        'destination': 'Kho Thu Duc - TP.HCM',
        'distanceKm': '42',
      },
    ),
    _ActionSampleDraft(
      note:
          'Van chuyen den diem phan phoi mien Dong, da niem phong kien va doi chieu so luong truoc khi xuat ben.',
      details: {
        'vehicle': 'Xe tai kin 3.5 tan',
        'destination': 'Trung tam phan phoi Bien Hoa',
        'distanceKm': '68',
      },
    ),
  ],
};

class AddEventScreen extends ConsumerStatefulWidget {
  const AddEventScreen({super.key, this.initialBatchId});

  final String? initialBatchId;

  @override
  ConsumerState<AddEventScreen> createState() => _AddEventScreenState();
}

class _AddEventScreenState extends ConsumerState<AddEventScreen> {
  static const _actionTypes = <String>[
    'SEEDING',
    'FERTILIZING',
    'WATERING',
    'PEST_CONTROL',
    'HARVESTING',
    'PACKAGING',
    'SHIPPING',
  ];

  final _formKey = GlobalKey<FormState>();
  final _noteController = TextEditingController();
  final _picker = ImagePicker();
  final Map<String, TextEditingController> _detailControllers = {};
  final Map<String, int> _sampleCursorByAction = {};

  String? _selectedBatchId;
  String _selectedActionType = _actionTypes.first;
  List<XFile> _selectedImages = const [];
  List<XFile> _selectedVideos = const [];
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _selectedBatchId = widget.initialBatchId;
    _syncDetailControllersForAction();
  }

  @override
  void dispose() {
    _noteController.dispose();
    for (final controller in _detailControllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _pickFromCamera() async {
    final file = await _picker.pickImage(
      source: ImageSource.camera,
      imageQuality: 80,
    );
    if (file == null) return;

    setState(() {
      _selectedImages = [..._selectedImages, file];
    });
  }

  Future<void> _pickFromGallery() async {
    final files = await _picker.pickMultiImage(imageQuality: 80);
    if (files.isEmpty) return;

    setState(() {
      _selectedImages = [..._selectedImages, ...files];
    });
  }

  Future<void> _pickVideoFromGallery() async {
    final file = await _picker.pickVideo(source: ImageSource.gallery);
    if (file == null) return;

    setState(() {
      _selectedVideos = [..._selectedVideos, file];
    });
  }

  Future<void> _pickVideoFromCamera() async {
    final file = await _picker.pickVideo(source: ImageSource.camera);
    if (file == null) return;

    setState(() {
      _selectedVideos = [..._selectedVideos, file];
    });
  }

  void _syncDetailControllersForAction() {
    final previousValues = _detailControllers.map(
      (key, value) => MapEntry(key, value.text.trim()),
    );

    for (final controller in _detailControllers.values) {
      controller.dispose();
    }
    _detailControllers.clear();

    final specs = _detailTemplateByAction[_selectedActionType] ?? const [];
    for (final spec in specs) {
      _detailControllers[spec.key] = TextEditingController(
        text: previousValues[spec.key] ?? '',
      );
    }
  }

  Map<String, dynamic> _buildDetailsPayload() {
    final payload = <String, dynamic>{};
    _detailControllers.forEach((key, controller) {
      final value = controller.text.trim();
      if (value.isNotEmpty) {
        payload[key] = value;
      }
    });
    return payload;
  }

  void _fillWithSampleDraft() {
    final samples = _sampleDraftByAction[_selectedActionType] ?? const [];
    if (samples.isEmpty) return;

    final cursor = _sampleCursorByAction[_selectedActionType] ?? 0;
    final sampleIndex = cursor % samples.length;
    final sample = samples[sampleIndex];

    _sampleCursorByAction[_selectedActionType] = cursor + 1;

    _noteController.text = sample.note;
    for (final entry in _detailControllers.entries) {
      entry.value.text = sample.details[entry.key] ?? '';
    }

    setState(() {});

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Đã điền mẫu ${sampleIndex + 1}/${samples.length} cho ${_labelForAction(_selectedActionType)}.',
        ),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedBatchId == null || _selectedBatchId!.isEmpty) return;

    setState(() => _submitting = true);

    final details = _buildDetailsPayload();

    try {
      final result = await ref
          .read(batchServiceProvider)
          .addFarmingEvent(
            batchId: _selectedBatchId!,
            actionType: _selectedActionType,
            note: _noteController.text.trim(),
            images: _selectedImages,
            videos: _selectedVideos,
            details: details.isEmpty ? null : details,
          );

      if (!mounted) return;

      ref.invalidate(batchTimelineProvider(_selectedBatchId!));
      ref.invalidate(batchListProvider);

      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(28),
          ),
          title: const Text('Đã lưu nhật ký thành công'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(result.message),
              if (result.warning != null && result.warning!.isNotEmpty) ...[
                const SizedBox(height: 12),
                Text(
                  result.warning!,
                  style: const TextStyle(color: AppColors.muted, height: 1.45),
                ),
              ],
              const SizedBox(height: 16),
              const Text(
                'Trạng thái xác nhận',
                style: TextStyle(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              Text(
                result.onChainStatus == 'confirmed'
                    ? 'Đã xác nhận'
                    : result.onChainStatus == 'skipped'
                    ? 'Chưa cấu hình blockchain'
                    : result.onChainStatus == 'failed'
                    ? 'Gửi xác nhận thất bại'
                    : 'Đang chờ xử lý',
              ),
              const SizedBox(height: 16),
              const Text(
                'Mã giao dịch',
                style: TextStyle(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              SelectableText(
                result.transactionHash.isEmpty
                    ? 'Chưa có mã giao dịch'
                    : result.transactionHash,
                style: const TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 12,
                  color: AppColors.ink,
                ),
              ),
            ],
          ),
          actions: [
            FilledButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Đóng'),
            ),
          ],
        ),
      );

      setState(() {
        _noteController.clear();
        _selectedImages = const [];
        _selectedVideos = const [];
        _selectedActionType = _actionTypes.first;
        _syncDetailControllersForAction();
      });
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Không lưu được nhật ký: $error')));
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final batchesAsync = ref.watch(batchListProvider);
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Thêm nhật ký canh tác')),
      body: GlassPageBackground(
        child: Stack(
          children: [
            batchesAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: GlassPanel(
                    child: Text(
                      'Không tải được danh sách lô.\n$error',
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
              ),
              data: (batches) {
                final editableBatches = batches
                    .where((batch) => batch.status != 'completed')
                    .toList();
                final selectedBatch = _findBatchById(batches, _selectedBatchId);
                final canSubmit =
                    editableBatches.isNotEmpty &&
                    selectedBatch != null &&
                    selectedBatch.status != 'completed';

                if ((_selectedBatchId == null ||
                        selectedBatch?.status == 'completed') &&
                    editableBatches.isNotEmpty) {
                  WidgetsBinding.instance.addPostFrameCallback((_) {
                    if (!mounted) return;
                    final current = _findBatchById(batches, _selectedBatchId);
                    if (_selectedBatchId != null &&
                        current?.status != 'completed') {
                      return;
                    }
                    setState(
                      () => _selectedBatchId = editableBatches.first.batchId,
                    );
                  });
                }

                return ListView(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
                  children: [
                    GlassPanel(
                      padding: const EdgeInsets.all(0),
                      colors: [
                        Colors.white.withValues(alpha: 0.66),
                        const Color(0xBDE4F2D8),
                      ],
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(28),
                        child: Container(
                          decoration: const BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [Color(0xFF2A7F45), Color(0xFF5AA265)],
                            ),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(22),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Ghi nhận nhật ký canh tác',
                                  style: TextStyle(
                                    color: Color(0xFFEAF8EE),
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                const SizedBox(height: 10),
                                Text(
                                  'Cập nhật thông tin mới cho lô nông sản.',
                                  style: textTheme.headlineSmall?.copyWith(
                                    fontSize: 24,
                                    color: Colors.white,
                                  ),
                                ),
                                const SizedBox(height: 10),
                                const Text(
                                  'Ghi chú, ảnh và video minh chứng sẽ được lưu cùng sự kiện để phục vụ truy xuất và đối chiếu về sau.',
                                  style: TextStyle(
                                    color: Color(0xFFEFF8F0),
                                    height: 1.5,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    GlassPanel(
                      radius: 22,
                      padding: const EdgeInsets.all(14),
                      colors: [
                        Colors.white.withValues(alpha: 0.44),
                        Colors.white.withValues(alpha: 0.18),
                      ],
                      child: Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          _DraftPill(
                            icon: Icons.track_changes_rounded,
                            label: _labelForAction(_selectedActionType),
                          ),
                          _DraftPill(
                            icon: Icons.perm_media_rounded,
                            label:
                                '${_selectedImages.length + _selectedVideos.length} media',
                          ),
                          _DraftPill(
                            icon: Icons.inventory_2_outlined,
                            label: selectedBatch != null
                                ? 'Lô ${selectedBatch.batchId}'
                                : 'Chưa chọn lô',
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    if (selectedBatch != null)
                      GlassPanel(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Lô đang thao tác',
                              style: TextStyle(
                                color: AppColors.muted,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              selectedBatch.productName,
                              style: textTheme.titleLarge,
                            ),
                            const SizedBox(height: 4),
                            Text('Mã lô: ${selectedBatch.batchId}'),
                            if (selectedBatch.origin.isNotEmpty) ...[
                              const SizedBox(height: 2),
                              Text('Xuất xứ: ${selectedBatch.origin}'),
                            ],
                          ],
                        ),
                      ),
                    const SizedBox(height: 16),
                    GlassPanel(
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Thông tin nhật ký',
                              style: textTheme.titleLarge,
                            ),
                            const SizedBox(height: 14),
                            _BatchDropdown(
                              batches: editableBatches,
                              selectedBatchId: _selectedBatchId,
                              onChanged: (value) {
                                setState(() => _selectedBatchId = value);
                              },
                            ),
                            if (batches.isNotEmpty &&
                                editableBatches.isEmpty) ...[
                              const SizedBox(height: 12),
                              const Text(
                                'Tất cả lô đã hoàn thành. Muốn bổ sung nhật ký, hãy chuyển trạng thái lô về đang sản xuất/đang theo dõi.',
                                style: TextStyle(
                                  color: AppColors.danger,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                            const SizedBox(height: 14),
                            DropdownButtonFormField<String>(
                              initialValue: _selectedActionType,
                              decoration: const InputDecoration(
                                labelText: 'Công đoạn canh tác',
                                prefixIcon: Icon(Icons.track_changes_rounded),
                              ),
                              items: _actionTypes
                                  .map(
                                    (value) => DropdownMenuItem(
                                      value: value,
                                      child: Text(_labelForAction(value)),
                                    ),
                                  )
                                  .toList(),
                              onChanged: (value) {
                                if (value == null) return;
                                setState(() {
                                  _selectedActionType = value;
                                  _syncDetailControllersForAction();
                                });
                              },
                            ),
                            const SizedBox(height: 10),
                            Align(
                              alignment: Alignment.centerRight,
                              child: OutlinedButton.icon(
                                onPressed: _fillWithSampleDraft,
                                icon: const Icon(Icons.auto_awesome_rounded),
                                label: const Text('Điền dữ liệu mẫu thực tế'),
                              ),
                            ),
                            const SizedBox(height: 8),
                            const Text(
                              'Gợi ý: có thể bấm nhiều lần để xoay qua các bộ dữ liệu mẫu theo công đoạn.',
                              style: TextStyle(
                                color: AppColors.muted,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            if ((_detailTemplateByAction[_selectedActionType] ??
                                    const <_DetailFieldSpec>[])
                                .isNotEmpty) ...[
                              const SizedBox(height: 14),
                              Text(
                                'Chi tiết công đoạn',
                                style: textTheme.titleMedium,
                              ),
                              const SizedBox(height: 8),
                              ...(_detailTemplateByAction[_selectedActionType] ??
                                      const <_DetailFieldSpec>[])
                                  .map(
                                    (spec) => Padding(
                                      padding: const EdgeInsets.only(
                                        bottom: 10,
                                      ),
                                      child: TextFormField(
                                        controller:
                                            _detailControllers[spec.key],
                                        keyboardType: spec.keyboardType,
                                        decoration: InputDecoration(
                                          labelText: spec.label,
                                          hintText: spec.hint,
                                          prefixIcon: const Icon(
                                            Icons.tune_rounded,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                            ],
                            const SizedBox(height: 14),
                            TextFormField(
                              controller: _noteController,
                              minLines: 5,
                              maxLines: 7,
                              decoration: const InputDecoration(
                                labelText: 'Ghi chú chi tiết',
                                hintText:
                                    'Ví dụ: Tưới nước lúc 6h sáng, bón phân hữu cơ 5kg, ghi nhận tình trạng cây trồng...',
                                alignLabelWithHint: true,
                                prefixIcon: Icon(Icons.description_outlined),
                              ),
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) {
                                  return 'Vui lòng nhập ghi chú cho nhật ký';
                                }
                                return null;
                              },
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    GlassPanel(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Media minh chứng', style: textTheme.titleLarge),
                          const SizedBox(height: 8),
                          const Text(
                            'Đính kèm ảnh/video thực tế để hồ sơ truy xuất không bị mất khi mở lại ứng dụng.',
                          ),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: _pickFromCamera,
                                  icon: const Icon(Icons.camera_alt_rounded),
                                  label: const Text('Chụp ảnh'),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: _pickFromGallery,
                                  icon: const Icon(Icons.photo_library_rounded),
                                  label: const Text('Thư viện'),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: _pickVideoFromCamera,
                                  icon: const Icon(Icons.videocam_rounded),
                                  label: const Text('Quay video'),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: _pickVideoFromGallery,
                                  icon: const Icon(Icons.video_library_rounded),
                                  label: const Text('Chọn video'),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          if (_selectedImages.isEmpty &&
                              _selectedVideos.isEmpty)
                            GlassPanel(
                              radius: 22,
                              padding: const EdgeInsets.all(16),
                              colors: [
                                Colors.white.withValues(alpha: 0.26),
                                Colors.white.withValues(alpha: 0.12),
                              ],
                              child: const Text(
                                'Chưa chọn media. Bạn vẫn có thể lưu nhật ký chỉ với ghi chú và chi tiết công đoạn.',
                              ),
                            )
                          else ...[
                            if (_selectedImages.isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 8),
                                child: Text(
                                  'Ảnh đã chọn (${_selectedImages.length})',
                                  style: textTheme.titleMedium,
                                ),
                              ),
                            if (_selectedImages.isNotEmpty)
                              SizedBox(
                                height: 110,
                                child: ListView.separated(
                                  scrollDirection: Axis.horizontal,
                                  itemCount: _selectedImages.length,
                                  separatorBuilder: (context, index) =>
                                      const SizedBox(width: 10),
                                  itemBuilder: (context, index) {
                                    final image = _selectedImages[index];
                                    return Stack(
                                      children: [
                                        ClipRRect(
                                          borderRadius: BorderRadius.circular(
                                            22,
                                          ),
                                          child: FutureBuilder<Uint8List>(
                                            future: image.readAsBytes(),
                                            builder: (context, snapshot) {
                                              if (snapshot.connectionState !=
                                                  ConnectionState.done) {
                                                return Container(
                                                  width: 110,
                                                  height: 110,
                                                  color: Colors.white
                                                      .withValues(alpha: 0.22),
                                                  child: const Center(
                                                    child:
                                                        CircularProgressIndicator(
                                                          strokeWidth: 2,
                                                        ),
                                                  ),
                                                );
                                              }

                                              if (!snapshot.hasData) {
                                                return Container(
                                                  width: 110,
                                                  height: 110,
                                                  color: Colors.white
                                                      .withValues(alpha: 0.22),
                                                  child: const Icon(
                                                    Icons.broken_image_outlined,
                                                    color: AppColors.muted,
                                                  ),
                                                );
                                              }

                                              return Image.memory(
                                                snapshot.data!,
                                                width: 110,
                                                height: 110,
                                                fit: BoxFit.cover,
                                              );
                                            },
                                          ),
                                        ),
                                        Positioned(
                                          top: 8,
                                          right: 8,
                                          child: InkWell(
                                            onTap: () {
                                              setState(() {
                                                _selectedImages = [
                                                  ..._selectedImages,
                                                ]..removeAt(index);
                                              });
                                            },
                                            child: const GlassIconCapsule(
                                              icon: Icons.close_rounded,
                                              size: 30,
                                              color: AppColors.ink,
                                            ),
                                          ),
                                        ),
                                      ],
                                    );
                                  },
                                ),
                              ),
                            if (_selectedVideos.isNotEmpty) ...[
                              const SizedBox(height: 12),
                              Padding(
                                padding: const EdgeInsets.only(bottom: 8),
                                child: Text(
                                  'Video đã chọn (${_selectedVideos.length})',
                                  style: textTheme.titleMedium,
                                ),
                              ),
                              SizedBox(
                                height: 96,
                                child: ListView.separated(
                                  scrollDirection: Axis.horizontal,
                                  itemCount: _selectedVideos.length,
                                  separatorBuilder: (context, index) =>
                                      const SizedBox(width: 10),
                                  itemBuilder: (context, index) {
                                    final video = _selectedVideos[index];
                                    return SizedBox(
                                      width: 190,
                                      child: GlassPanel(
                                        radius: 20,
                                        padding: const EdgeInsets.fromLTRB(
                                          12,
                                          10,
                                          8,
                                          10,
                                        ),
                                        colors: [
                                          Colors.white.withValues(alpha: 0.3),
                                          Colors.white.withValues(alpha: 0.14),
                                        ],
                                        child: Row(
                                          children: [
                                            Container(
                                              width: 36,
                                              height: 36,
                                              decoration: BoxDecoration(
                                                shape: BoxShape.circle,
                                                color: AppColors.pine
                                                    .withValues(alpha: 0.16),
                                              ),
                                              child: const Icon(
                                                Icons.play_arrow_rounded,
                                                color: AppColors.pine,
                                              ),
                                            ),
                                            const SizedBox(width: 10),
                                            Expanded(
                                              child: Text(
                                                video.name,
                                                maxLines: 2,
                                                overflow: TextOverflow.ellipsis,
                                                style: const TextStyle(
                                                  color: AppColors.ink,
                                                  fontWeight: FontWeight.w700,
                                                ),
                                              ),
                                            ),
                                            IconButton(
                                              onPressed: () {
                                                setState(() {
                                                  _selectedVideos = [
                                                    ..._selectedVideos,
                                                  ]..removeAt(index);
                                                });
                                              },
                                              icon: const Icon(
                                                Icons.close_rounded,
                                                color: AppColors.muted,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    );
                                  },
                                ),
                              ),
                            ],
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 18),
                    FilledButton.icon(
                      onPressed: _submitting || !canSubmit ? null : _submit,
                      icon: const Icon(Icons.cloud_upload_rounded),
                      label: const Text('Lưu nhật ký và gửi xác nhận'),
                    ),
                  ],
                );
              },
            ),
            if (_submitting)
              Positioned.fill(
                child: ColoredBox(
                  color: Colors.black.withValues(alpha: 0.22),
                  child: Center(
                    child: GlassPanel(
                      padding: const EdgeInsets.all(24),
                      child: const Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          CircularProgressIndicator(),
                          SizedBox(height: 16),
                          Text(
                            'Đang gửi dữ liệu và chờ hệ thống xác nhận...',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              color: AppColors.ink,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Batch? _findBatchById(List<Batch> batches, String? batchId) {
    if (batchId == null || batchId.isEmpty) return null;
    for (final batch in batches) {
      if (batch.batchId == batchId) return batch;
    }
    return null;
  }

  String _labelForAction(String actionType) {
    switch (actionType) {
      case 'SEEDING':
        return 'Gieo hạt';
      case 'FERTILIZING':
        return 'Bón phân';
      case 'WATERING':
        return 'Tưới nước';
      case 'PEST_CONTROL':
        return 'Chăm sóc / Kiểm soát sâu bệnh';
      case 'HARVESTING':
        return 'Thu hoạch';
      case 'PACKAGING':
        return 'Đóng gói';
      case 'SHIPPING':
        return 'Vận chuyển';
      default:
        return actionType;
    }
  }
}

class _BatchDropdown extends StatelessWidget {
  const _BatchDropdown({
    required this.batches,
    required this.selectedBatchId,
    required this.onChanged,
  });

  final List<Batch> batches;
  final String? selectedBatchId;
  final ValueChanged<String?> onChanged;

  @override
  Widget build(BuildContext context) {
    final currentValue = batches.any((item) => item.batchId == selectedBatchId)
        ? selectedBatchId
        : null;

    return DropdownButtonFormField<String>(
      initialValue: currentValue,
      decoration: const InputDecoration(
        labelText: 'Lô nông sản',
        prefixIcon: Icon(Icons.inventory_2_outlined),
      ),
      items: batches
          .map(
            (batch) => DropdownMenuItem(
              value: batch.batchId,
              child: Text('${batch.productName} (${batch.batchId})'),
            ),
          )
          .toList(),
      onChanged: onChanged,
      validator: (value) {
        if (value == null || value.isEmpty) {
          return 'Vui lòng chọn lô nông sản';
        }
        return null;
      },
    );
  }
}

class _DraftPill extends StatelessWidget {
  const _DraftPill({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.24),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.white.withValues(alpha: 0.45)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: AppColors.muted),
          const SizedBox(width: 6),
          Text(
            label,
            style: const TextStyle(
              color: AppColors.ink,
              fontWeight: FontWeight.w700,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}
