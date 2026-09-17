import 'dart:convert';

import 'package:app/core/router.dart';
import 'package:app/core/theme.dart';
import 'package:app/models/batch.dart';
import 'package:app/providers/providers.dart';
import 'package:app/widgets/liquid_glass.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

class CreateProductScreen extends ConsumerStatefulWidget {
  const CreateProductScreen({super.key});

  @override
  ConsumerState<CreateProductScreen> createState() =>
      _CreateProductScreenState();
}

class _CreateProductScreenState extends ConsumerState<CreateProductScreen> {
  static const _categories = [
    'Xoài',
    'Lúa',
    'Rau thủy canh',
    'Cà chua',
    'Ớt chuông',
    'Sầu riêng',
    'Thanh long',
    'Cà phê',
    'Hồ tiêu',
  ];
  static const _units = ['kg', 'tấn', 'thùng', 'bao', 'bó', 'con'];

  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _origin = TextEditingController();
  final _cultivationTime = TextEditingController();
  final _description = TextEditingController();
  final _quantity = TextEditingController();
  final _picker = ImagePicker();

  String _category = _categories.first;
  String _type = 'Plant';
  String _unit = _units.first;
  String? _farmingArea;
  bool _loadingAreas = true;
  bool _saving = false;
  String? _error;
  List<Map<String, dynamic>> _areas = [];
  List<XFile> _images = [];

  @override
  void initState() {
    super.initState();
    _loadAreas();
  }

  @override
  void dispose() {
    _name.dispose();
    _origin.dispose();
    _cultivationTime.dispose();
    _description.dispose();
    _quantity.dispose();
    super.dispose();
  }

  Future<void> _loadAreas() async {
    try {
      final areas = await ref.read(managementServiceProvider).getFarmingAreas();
      if (!mounted) return;
      setState(() {
        _areas = areas;
        if (_farmingArea == null && areas.isNotEmpty) {
          final firstId = _areaId(areas.first);
          _farmingArea = firstId;
          final address = _areaAddress(firstId);
          if (address != null && address.isNotEmpty) _origin.text = address;
        }
        _loadingAreas = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loadingAreas = false);
    }
  }

  Future<void> _pickImages() async {
    final picked = await _picker.pickMultiImage(imageQuality: 82);
    if (picked.isEmpty) return;
    setState(() => _images = [..._images, ...picked].take(5).toList());
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (_farmingArea == null || _farmingArea!.isEmpty) {
      setState(() => _error = 'Vui lòng chọn vùng trồng.');
      return;
    }
    final quantity = double.parse(_quantity.text.trim().replaceAll(',', '.'));

    try {
      setState(() {
        _saving = true;
        _error = null;
      });
      final batch = await ref.read(batchServiceProvider).createProduct(
            name: _name.text,
            category: _category,
            type: _type,
            description: _description.text,
            origin: _origin.text,
            cultivationTime: _cultivationTime.text,
            initialQuantity: quantity,
            unit: _unit,
            farmingArea: _farmingArea,
            images: _images,
          );
      ref.invalidate(batchListProvider);
      if (!mounted) return;
      await _showCreatedSheet(batch);
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _showCreatedSheet(Batch batch) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _CreatedProductSheet(batch: batch),
    );
    if (!mounted) return;
    Navigator.pushReplacementNamed(
      context,
      '${AppRouter.timeline}?batchId=${batch.batchId}',
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Thêm lô mới')),
      body: GlassPageBackground(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 112),
            children: [
              GlassPanel(
                colors: [
                  const Color(0xFFEAF8EF).withValues(alpha: 0.78),
                  Colors.white.withValues(alpha: 0.52),
                ],
                child: Row(
                  children: [
                    const GlassIconCapsule(
                      icon: Icons.add_box_outlined,
                      color: AppColors.pine,
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Tạo lô nông sản',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Nhập thông tin ban đầu để hệ thống sinh mã QR và hồ sơ truy xuất.',
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              GlassPanel(
                child: Column(
                  children: [
                    TextFormField(
                      controller: _name,
                      decoration: const InputDecoration(
                        labelText: 'Tên lô / sản phẩm',
                        prefixIcon: Icon(Icons.inventory_2_outlined),
                      ),
                      validator: _required,
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: _category,
                      decoration: const InputDecoration(
                        labelText: 'Danh mục',
                        prefixIcon: Icon(Icons.category_outlined),
                      ),
                      items: _categories
                          .map(
                            (item) => DropdownMenuItem(
                              value: item,
                              child: Text(item),
                            ),
                          )
                          .toList(),
                      onChanged: (value) =>
                          setState(() => _category = value ?? _category),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: _type,
                      decoration: const InputDecoration(
                        labelText: 'Loại sản phẩm',
                        prefixIcon: Icon(Icons.eco_outlined),
                      ),
                      items: const [
                        DropdownMenuItem(
                          value: 'Plant',
                          child: Text('Cây trồng'),
                        ),
                        DropdownMenuItem(
                          value: 'Animal',
                          child: Text('Vật nuôi'),
                        ),
                      ],
                      onChanged: (value) =>
                          setState(() => _type = value ?? 'Plant'),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _origin,
                      decoration: const InputDecoration(
                        labelText: 'Xuất xứ',
                        hintText: 'Để trống nếu đã chọn vùng trồng',
                        prefixIcon: Icon(Icons.place_outlined),
                      ),
                      validator: (value) {
                        if (_farmingArea != null) return null;
                        return _required(value);
                      },
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: _farmingArea,
                      decoration: InputDecoration(
                        labelText: _loadingAreas
                            ? 'Đang tải vùng trồng...'
                            : 'Vùng trồng',
                        prefixIcon: const Icon(Icons.landscape_outlined),
                      ),
                      items: [
                        ..._areas.map(
                          (area) => DropdownMenuItem<String>(
                            value: _areaId(area),
                            child: Text(
                              (area['name'] ?? 'Vùng trồng').toString(),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ),
                      ],
                      onChanged: _loadingAreas
                          ? null
                          : (value) => setState(() {
                                _farmingArea = value;
                                final address = _areaAddress(value);
                                if (address != null && address.isNotEmpty) {
                                  _origin.text = address;
                                }
                              }),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _cultivationTime,
                      decoration: const InputDecoration(
                        labelText: 'Thời gian canh tác / mùa vụ',
                        hintText: 'VD: Vụ hè thu 2026',
                        prefixIcon: Icon(Icons.calendar_month_outlined),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          flex: 2,
                          child: TextFormField(
                            controller: _quantity,
                            keyboardType: const TextInputType.numberWithOptions(
                              decimal: true,
                            ),
                            decoration: const InputDecoration(
                              labelText: 'Số lượng ban đầu',
                              prefixIcon: Icon(Icons.scale_outlined),
                            ),
                            validator: _quantityValidator,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            initialValue: _unit,
                            decoration: const InputDecoration(
                              labelText: 'Đơn vị',
                            ),
                            items: _units
                                .map(
                                  (unit) => DropdownMenuItem(
                                    value: unit,
                                    child: Text(unit),
                                  ),
                                )
                                .toList(),
                            onChanged: (value) =>
                                setState(() => _unit = value ?? _unit),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _description,
                      minLines: 3,
                      maxLines: 6,
                      decoration: const InputDecoration(
                        labelText: 'Mô tả',
                        alignLabelWithHint: true,
                        prefixIcon: Icon(Icons.description_outlined),
                      ),
                      validator: _required,
                    ),
                    const SizedBox(height: 12),
                    _imagePickerField(),
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      Text(
                        _error!,
                        style: const TextStyle(color: AppColors.danger),
                      ),
                    ],
                    const SizedBox(height: 18),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        onPressed: _saving ? null : _save,
                        icon: _saving
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Icon(Icons.add_rounded),
                        label: Text(_saving ? 'Đang tạo...' : 'Tạo lô mới'),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String? _required(String? value) =>
      value == null || value.trim().isEmpty ? 'Vui lòng nhập thông tin' : null;

  String? _quantityValidator(String? value) {
    final parsed = double.tryParse((value ?? '').trim().replaceAll(',', '.'));
    if (parsed == null || parsed < 0) return 'Số lượng không hợp lệ';
    return null;
  }

  String? _areaAddress(String? areaId) {
    if (areaId == null || areaId.isEmpty) return null;
    for (final area in _areas) {
      if (_areaId(area) == areaId) {
        return area['address']?.toString();
      }
    }
    return null;
  }

  String _areaId(Map<String, dynamic> area) =>
      (area['_id'] ?? area['id'] ?? '').toString();

  Widget _imagePickerField() {
    return InputDecorator(
      decoration: const InputDecoration(
        labelText: 'Ảnh lô',
        prefixIcon: Icon(Icons.image_outlined),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              _images.isEmpty ? 'Chưa chọn ảnh' : 'Đã chọn ${_images.length}/5 ảnh',
              overflow: TextOverflow.ellipsis,
            ),
          ),
          TextButton.icon(
            onPressed: _images.length >= 5 ? null : _pickImages,
            icon: const Icon(Icons.add_photo_alternate_outlined),
            label: const Text('Thêm ảnh'),
          ),
        ],
      ),
    );
  }
}

class _CreatedProductSheet extends StatelessWidget {
  const _CreatedProductSheet({required this.batch});

  final Batch batch;

  @override
  Widget build(BuildContext context) {
    final code = batch.batchCode.isEmpty ? batch.batchId : batch.batchCode;
    return GlassPanel(
      radius: 30,
      padding: const EdgeInsets.fromLTRB(22, 18, 22, 22),
      colors: [
        Colors.white.withValues(alpha: 0.96),
        const Color(0xFFEAF6E7),
      ],
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 44,
              height: 5,
              decoration: BoxDecoration(
                color: AppColors.muted.withValues(alpha: 0.28),
                borderRadius: BorderRadius.circular(999),
              ),
            ),
            const SizedBox(height: 18),
            const GlassIconCapsule(
              icon: Icons.check_circle_outline_rounded,
              color: AppColors.pine,
              size: 58,
            ),
            const SizedBox(height: 12),
            Text('Đã tạo lô mới', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            SelectableText(
              code,
              style: const TextStyle(
                color: AppColors.ink,
                fontWeight: FontWeight.w900,
                fontSize: 18,
              ),
            ),
            const SizedBox(height: 14),
            if (batch.qrCodeUrl.startsWith('data:image'))
              ClipRRect(
                borderRadius: BorderRadius.circular(18),
                child: Image.memory(
                  base64Decode(batch.qrCodeUrl.split(',').last),
                  width: 150,
                  height: 150,
                  fit: BoxFit.cover,
                ),
              )
            else if (batch.qrCodeUrl.isNotEmpty)
              ClipRRect(
                borderRadius: BorderRadius.circular(18),
                child: Image.network(
                  batch.qrCodeUrl,
                  width: 150,
                  height: 150,
                  fit: BoxFit.cover,
                ),
              ),
            const SizedBox(height: 14),
            Text(
              batch.qrCodeUrl.isEmpty
                  ? 'QR chưa sẵn sàng. Bạn vẫn có thể mở timeline để tiếp tục cập nhật nhật ký.'
                  : 'QR đã sẵn sàng để in, dán nhãn hoặc chia sẻ truy xuất.',
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.timeline_rounded),
                label: const Text('Mở timeline lô'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
