import 'package:app/core/theme.dart';
import 'package:app/models/live_camera.dart';
import 'package:app/providers/providers.dart';
import 'package:app/widgets/liquid_glass.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class CameraManagementScreen extends ConsumerStatefulWidget {
  const CameraManagementScreen({super.key, required this.batchId});

  final String batchId;

  @override
  ConsumerState<CameraManagementScreen> createState() =>
      _CameraManagementScreenState();
}

class _CameraManagementScreenState
    extends ConsumerState<CameraManagementScreen> {
  final List<_CameraForm> _forms = [];
  bool _loading = true;
  bool _saving = false;
  String? _error;
  String _productName = '';

  @override
  void initState() {
    super.initState();
    _loadCameras();
  }

  Future<void> _loadCameras() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final service = ref.read(batchServiceProvider);
      final batch = await service.getTimeline(widget.batchId);
      final cameras = await service.getProductCameras(widget.batchId);

      if (!mounted) return;
      setState(() {
        _productName = batch.productName;
        _forms
          ..clear()
          ..addAll(cameras.map(_CameraForm.fromCamera));
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  void _addCamera() {
    setState(() => _forms.add(_CameraForm.empty()));
  }

  void _removeCamera(int index) {
    setState(() => _forms.removeAt(index));
  }

  Future<void> _save() async {
    setState(() {
      _error = null;
      _saving = true;
    });

    for (final form in _forms) {
      if (form.nameController.text.trim().isEmpty ||
          form.streamUrlController.text.trim().isEmpty) {
        setState(() {
          _error = 'Mỗi camera cần có tên và URL live stream.';
          _saving = false;
        });
        return;
      }
    }

    try {
      final cameras = _forms
          .map(
            (form) => LiveCamera(
              id: form.id,
              name: form.nameController.text.trim(),
              streamUrl: form.streamUrlController.text.trim(),
              location: form.locationController.text.trim(),
              isActive: form.isActive,
            ),
          )
          .toList();

      await ref.read(batchServiceProvider).updateProductCameras(
            productId: widget.batchId,
            cameras: cameras,
          );

      ref.invalidate(batchListProvider);
      ref.invalidate(batchTimelineProvider(widget.batchId));

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Đã lưu danh sách camera.')),
      );
      Navigator.pop(context);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString().replaceFirst('Exception: ', '');
        _saving = false;
      });
    }
  }

  @override
  void dispose() {
    for (final form in _forms) {
      form.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Quản lý camera'),
        actions: [
          if (!_loading && !_saving)
            IconButton(
              onPressed: _save,
              icon: const Icon(Icons.save_rounded),
              tooltip: 'Lưu',
            ),
        ],
      ),
      body: GlassPageBackground(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : ListView(
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
                                'Camera trực tiếp',
                                style: TextStyle(
                                  color: Color(0xFFEAF8EE),
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                _productName.isEmpty
                                    ? 'Lô nông sản'
                                    : _productName,
                                style: Theme.of(context)
                                    .textTheme
                                    .headlineSmall
                                    ?.copyWith(
                                      fontSize: 22,
                                      color: Colors.white,
                                    ),
                              ),
                              const SizedBox(height: 8),
                              const Text(
                                'Thêm camera để người tra cứu QR xem live stream vùng sản xuất.',
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
                  if (_error != null) ...[
                    GlassPanel(
                      colors: [
                        AppColors.danger.withValues(alpha: 0.12),
                        Colors.white.withValues(alpha: 0.24),
                      ],
                      child: Text(
                        _error!,
                        style: const TextStyle(color: AppColors.danger),
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                  if (_forms.isEmpty)
                    const GlassPanel(
                      child: Text(
                        'Chưa có camera nào. Nhấn "Thêm camera" để bắt đầu.',
                      ),
                    )
                  else
                    ..._forms.asMap().entries.map(
                          (entry) => Padding(
                            padding: const EdgeInsets.only(bottom: 14),
                            child: _CameraFormCard(
                              index: entry.key,
                              form: entry.value,
                              onRemove: () => _removeCamera(entry.key),
                            ),
                          ),
                        ),
                  const SizedBox(height: 8),
                  OutlinedButton.icon(
                    onPressed: _saving ? null : _addCamera,
                    icon: const Icon(Icons.add_rounded),
                    label: const Text('Thêm camera'),
                  ),
                  const SizedBox(height: 16),
                  FilledButton.icon(
                    onPressed: _saving ? null : _save,
                    icon: _saving
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(Icons.save_rounded),
                    label: Text(_saving ? 'Đang lưu...' : 'Lưu camera'),
                  ),
                ],
              ),
      ),
    );
  }
}

class _CameraForm {
  _CameraForm({
    required this.id,
    required this.nameController,
    required this.locationController,
    required this.streamUrlController,
    required this.isActive,
  });

  final String id;
  final TextEditingController nameController;
  final TextEditingController locationController;
  final TextEditingController streamUrlController;
  bool isActive;

  factory _CameraForm.empty() => _CameraForm(
        id: '',
        nameController: TextEditingController(),
        locationController: TextEditingController(),
        streamUrlController: TextEditingController(),
        isActive: true,
      );

  factory _CameraForm.fromCamera(LiveCamera camera) => _CameraForm(
        id: camera.id,
        nameController: TextEditingController(text: camera.name),
        locationController: TextEditingController(text: camera.location),
        streamUrlController: TextEditingController(text: camera.streamUrl),
        isActive: camera.isActive,
      );

  void dispose() {
    nameController.dispose();
    locationController.dispose();
    streamUrlController.dispose();
  }
}

class _CameraFormCard extends StatefulWidget {
  const _CameraFormCard({
    required this.index,
    required this.form,
    required this.onRemove,
  });

  final int index;
  final _CameraForm form;
  final VoidCallback onRemove;

  @override
  State<_CameraFormCard> createState() => _CameraFormCardState();
}

class _CameraFormCardState extends State<_CameraFormCard> {
  @override
  Widget build(BuildContext context) {
    final form = widget.form;

    return GlassPanel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Camera #${widget.index + 1}',
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 16,
                    color: AppColors.ink,
                  ),
                ),
              ),
              TextButton.icon(
                onPressed: widget.onRemove,
                icon: const Icon(Icons.delete_outline_rounded, size: 18),
                label: const Text('Xóa'),
                style: TextButton.styleFrom(foregroundColor: AppColors.danger),
              ),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
            controller: form.nameController,
            decoration: const InputDecoration(
              labelText: 'Tên camera',
              hintText: 'Ví dụ: Camera nhà kính A',
              prefixIcon: Icon(Icons.videocam_rounded),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: form.streamUrlController,
            decoration: const InputDecoration(
              labelText: 'URL live stream',
              hintText: 'https://... hoặc link YouTube',
              prefixIcon: Icon(Icons.link_rounded),
            ),
            keyboardType: TextInputType.url,
          ),
          const SizedBox(height: 12),
          TextField(
            controller: form.locationController,
            decoration: const InputDecoration(
              labelText: 'Vị trí (tùy chọn)',
              hintText: 'Ví dụ: Khu vực thu hoạch',
              prefixIcon: Icon(Icons.place_outlined),
            ),
          ),
          const SizedBox(height: 8),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Đang hoạt động'),
            subtitle: const Text('Hiển thị trên trang truy xuất'),
            value: form.isActive,
            onChanged: (value) {
              setState(() => form.isActive = value);
            },
          ),
        ],
      ),
    );
  }
}
