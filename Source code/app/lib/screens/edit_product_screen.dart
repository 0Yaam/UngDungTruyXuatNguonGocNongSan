import 'package:app/core/theme.dart';
import 'package:app/models/batch.dart';
import 'package:app/providers/providers.dart';
import 'package:app/widgets/liquid_glass.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

class EditProductScreen extends ConsumerStatefulWidget {
  const EditProductScreen({super.key, required this.batch});
  final Batch batch;

  @override
  ConsumerState<EditProductScreen> createState() => _EditProductScreenState();
}

class _EditProductScreenState extends ConsumerState<EditProductScreen> {
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
  late final TextEditingController _name;
  late final TextEditingController _description;
  late final TextEditingController _origin;
  late final TextEditingController _cultivationTime;
  late final TextEditingController _quantity;
  final _picker = ImagePicker();
  String _category = _categories.first;
  String _type = 'Plant';
  String _unit = _units.first;
  String? _farmingArea;
  bool _loadingAreas = true;
  bool _saving = false;
  String? _error;
  List<Map<String, dynamic>> _areas = [];
  late List<String> _existingImages;
  List<XFile> _newImages = [];

  @override
  void initState() {
    super.initState();
    _name = TextEditingController(text: widget.batch.productName);
    _description = TextEditingController(text: widget.batch.description);
    _origin = TextEditingController(text: widget.batch.origin);
    _cultivationTime = TextEditingController(text: widget.batch.cultivationTime);
    _quantity = TextEditingController(text: _formatQuantity(widget.batch.initialQuantity));
    _category = _categories.contains(widget.batch.productType)
        ? widget.batch.productType
        : widget.batch.productType.isEmpty
            ? _categories.first
            : widget.batch.productType;
    _type = widget.batch.productKind == 'Animal' ? 'Animal' : 'Plant';
    _unit = widget.batch.unit.trim().isEmpty ? _units.first : widget.batch.unit;
    _existingImages = [...widget.batch.imageUrls];
    _loadAreas();
  }

  @override
  void dispose() {
    _name.dispose();
    _description.dispose();
    _origin.dispose();
    _cultivationTime.dispose();
    _quantity.dispose();
    super.dispose();
  }

  Future<void> _loadAreas() async {
    try {
      final areas = await ref.read(managementServiceProvider).getFarmingAreas();
      if (!mounted) return;
      setState(() {
        _areas = areas;
        if (_farmingArea == null || _farmingArea!.isEmpty) {
          final currentArea = areas.where((area) => _areaId(area) == widget.batch.farmingAreaId);
          final selected = currentArea.isNotEmpty
              ? currentArea.first
              : areas.isNotEmpty
                  ? areas.first
                  : null;
          if (selected != null) {
            final selectedId = _areaId(selected);
            _farmingArea = selectedId;
            final address = _areaAddress(selectedId);
            if (address != null && address.isNotEmpty) _origin.text = address;
          }
        }
        _loadingAreas = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loadingAreas = false);
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (_farmingArea == null || _farmingArea!.isEmpty) {
      setState(() => _error = 'Vui lòng chọn vùng trồng.');
      return;
    }
    try {
      setState(() {
        _saving = true;
        _error = null;
      });
      await ref
          .read(batchServiceProvider)
          .updateProduct(
            productId: widget.batch.batchId,
            name: _name.text,
            category: _category,
            type: _type,
            description: _description.text,
            origin: _origin.text,
            cultivationTime: _cultivationTime.text,
            farmingArea: _farmingArea,
            existingImageUrls: _existingImages,
            newImages: _newImages,
          );
      ref.invalidate(batchListProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Đã cập nhật thông tin lô.')),
        );
        Navigator.pop(context, true);
      }
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _pickImages() async {
    final picked = await _picker.pickMultiImage(imageQuality: 82);
    if (picked.isEmpty) return;
    final available = 5 - _existingImages.length - _newImages.length;
    if (available <= 0) return;
    setState(() => _newImages = [..._newImages, ...picked.take(available)]);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Chỉnh sửa lô')),
      body: GlassPageBackground(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              GlassPanel(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const GlassIconCapsule(
                      icon: Icons.edit_note_rounded,
                      color: AppColors.pine,
                    ),
                    const SizedBox(height: 14),
                    Text(
                      'Thông tin lô',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 6),
                    Text('Mã lô: ${widget.batch.batchId}'),
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
                      items: {
                        ..._categories,
                        if (_category.trim().isNotEmpty) _category,
                      }
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
                            readOnly: true,
                            decoration: const InputDecoration(
                              labelText: 'Số lượng ban đầu',
                              prefixIcon: Icon(Icons.scale_outlined),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            initialValue: _unit,
                            decoration: const InputDecoration(
                              labelText: 'Đơn vị',
                            ),
                            items: {
                              ..._units,
                              if (_unit.trim().isNotEmpty) _unit,
                            }
                                .map(
                                  (unit) => DropdownMenuItem(
                                    value: unit,
                                    child: Text(unit),
                                  ),
                                )
                                .toList(),
                            onChanged: null,
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
                    FilledButton.icon(
                      onPressed: _saving ? null : _save,
                      icon: const Icon(Icons.save_outlined),
                      label: Text(_saving ? 'Đang lưu...' : 'Lưu thay đổi'),
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

  String _formatQuantity(double value) {
    if (value == value.roundToDouble()) return value.toStringAsFixed(0);
    return value.toString();
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
    final count = _existingImages.length + _newImages.length;
    return InputDecorator(
      decoration: const InputDecoration(
        labelText: 'Ảnh lô',
        prefixIcon: Icon(Icons.image_outlined),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  count == 0 ? 'Chưa có ảnh' : 'Đang có $count/5 ảnh',
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              TextButton.icon(
                onPressed: count >= 5 ? null : _pickImages,
                icon: const Icon(Icons.add_photo_alternate_outlined),
                label: const Text('Thêm ảnh'),
              ),
            ],
          ),
          Wrap(
            spacing: 8,
            children: [
              for (var i = 0; i < _existingImages.length; i++)
                InputChip(
                  label: Text(_existingImages[i].split('/').last),
                  onDeleted: () => setState(
                    () => _existingImages = [
                      for (var j = 0; j < _existingImages.length; j++)
                        if (j != i) _existingImages[j],
                    ],
                  ),
                ),
              for (var i = 0; i < _newImages.length; i++)
                InputChip(
                  label: Text(_newImages[i].name),
                  onDeleted: () => setState(
                    () => _newImages = [
                      for (var j = 0; j < _newImages.length; j++)
                        if (j != i) _newImages[j],
                    ],
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
