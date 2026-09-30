import 'package:app/core/api_client.dart';
import 'package:app/core/theme.dart';
import 'package:app/models/live_camera.dart';
import 'package:app/widgets/live_camera_section.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

class CameraCenterScreen extends StatefulWidget {
  const CameraCenterScreen({super.key, this.initialTask = 'monitor'});

  final String initialTask;

  @override
  State<CameraCenterScreen> createState() => _CameraCenterScreenState();
}

class _CameraCenterScreenState extends State<CameraCenterScreen> {
  final _picker = ImagePicker();
  List<_CameraRecord> _cameras = const [];
  List<Map<String, dynamic>> _runs = const [];
  String? _selectedId;
  late String _task;
  bool _loading = true;
  bool _running = false;
  String? _error;
  XFile? _frame;

  _CameraRecord? get _selected {
    if (_cameras.isEmpty) return null;
    return _cameras.firstWhere(
      (camera) => camera.id == _selectedId,
      orElse: () => _cameras.first,
    );
  }

  @override
  void initState() {
    super.initState();
    _task = widget.initialTask;
    _load();
  }

  Future<void> _load() async {
    try {
      final response = await ApiClient.instance.dio.get('/cameras');
      final raw = (response.data['cameras'] as List<dynamic>? ?? const []);
      final cameras = raw
          .whereType<Map<String, dynamic>>()
          .map(_CameraRecord.fromJson)
          .toList();
      if (!mounted) return;
      setState(() {
        _cameras = cameras;
        _selectedId ??= cameras.firstOrNull?.id;
        _loading = false;
        _error = null;
      });
      await _loadRuns();
    } on DioException catch (error) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = _message(error);
      });
    }
  }

  Future<void> _loadRuns() async {
    final camera = _selected;
    if (camera == null) return;
    try {
      final response = await ApiClient.instance.dio.get(
        '/cameras/${camera.id}/task-runs',
        queryParameters: {'task': 'plant-disease'},
      );
      if (!mounted) return;
      setState(() {
        _runs = (response.data['runs'] as List<dynamic>? ?? const [])
            .whereType<Map<String, dynamic>>()
            .toList();
      });
    } on DioException catch (error) {
      if (mounted) setState(() => _error = _message(error));
    }
  }

  Future<void> _pickFrame(ImageSource source) async {
    final frame = await _picker.pickImage(
      source: source,
      imageQuality: 90,
      maxWidth: 1920,
    );
    if (frame != null && mounted) setState(() => _frame = frame);
  }

  Future<void> _runDisease() async {
    final camera = _selected;
    if (camera == null) return;
    setState(() {
      _running = true;
      _error = null;
    });
    try {
      final form = FormData();
      if (_frame != null) {
        form.files.add(
          MapEntry('image', await MultipartFile.fromFile(_frame!.path)),
        );
      }
      await ApiClient.instance.dio.post(
        '/cameras/${camera.id}/tasks/plant-disease/run',
        data: form,
      );
      _frame = null;
      await _loadRuns();
    } on DioException catch (error) {
      if (mounted) setState(() => _error = _message(error));
    } finally {
      if (mounted) setState(() => _running = false);
    }
  }

  Future<void> _delete(_CameraRecord camera) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Xóa camera?'),
        content: Text('Camera “${camera.name}” sẽ bị xóa khỏi hệ thống.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Hủy')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Xóa')),
        ],
      ),
    );
    if (confirmed != true) return;
    await ApiClient.instance.dio.delete('/cameras/${camera.id}');
    setState(() => _selectedId = null);
    await _load();
  }

  Future<void> _edit([_CameraRecord? camera]) async {
    final name = TextEditingController(text: camera?.name ?? '');
    final playback = TextEditingController(text: camera?.playbackUrl ?? '');
    final snapshot = TextEditingController(text: camera?.snapshotUrl ?? '');
    final source = TextEditingController();
    final location = TextEditingController(text: camera?.location ?? '');
    var type = camera?.sourceType ?? 'mediamtx';
    var enabled = camera?.enabled ?? true;
    final payload = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text(camera == null ? 'Thêm camera' : 'Cấu hình camera'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(controller: name, decoration: const InputDecoration(labelText: 'Tên camera')),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  initialValue: type,
                  decoration: const InputDecoration(labelText: 'Loại nguồn'),
                  items: const [
                    DropdownMenuItem(value: 'mediamtx', child: Text('MediaMTX / RTSP')),
                    DropdownMenuItem(value: 'webrtc', child: Text('WebRTC')),
                    DropdownMenuItem(value: 'hls', child: Text('HLS')),
                    DropdownMenuItem(value: 'mjpeg', child: Text('MJPEG')),
                    DropdownMenuItem(value: 'phone', child: Text('Điện thoại qua Tailscale')),
                  ],
                  onChanged: (value) => setDialogState(() => type = value ?? type),
                ),
                if (type != 'phone') ...[
                  const SizedBox(height: 10),
                  TextField(controller: playback, decoration: const InputDecoration(labelText: 'Playback URL')),
                  const SizedBox(height: 10),
                  TextField(controller: source, decoration: const InputDecoration(labelText: 'RTSP/source URL')),
                  const SizedBox(height: 10),
                  TextField(controller: snapshot, decoration: const InputDecoration(labelText: 'Snapshot URL')),
                ],
                const SizedBox(height: 10),
                TextField(controller: location, decoration: const InputDecoration(labelText: 'Vị trí')),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Camera đang bật'),
                  value: enabled,
                  onChanged: (value) => setDialogState(() => enabled = value),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Hủy')),
            FilledButton(
              onPressed: () => Navigator.pop(context, {
                'name': name.text.trim(),
                'source_type': type,
                'playback_url': playback.text.trim(),
                'source_url': source.text.trim(),
                'snapshot_url': snapshot.text.trim(),
                'location': location.text.trim(),
                'is_enabled': enabled,
              }),
              child: const Text('Lưu'),
            ),
          ],
        ),
      ),
    );
    if (payload == null || (payload['name'] as String).isEmpty) return;
    if (camera == null) {
      await ApiClient.instance.dio.post('/cameras', data: payload);
    } else {
      await ApiClient.instance.dio.patch('/cameras/${camera.id}', data: payload);
    }
    await _load();
  }

  String _message(DioException error) =>
      error.response?.data is Map<String, dynamic>
          ? (error.response?.data['message']?.toString() ?? error.message ?? 'Có lỗi xảy ra')
          : (error.message ?? 'Có lỗi xảy ra');

  @override
  Widget build(BuildContext context) {
    final camera = _selected;
    final latest = _runs.firstOrNull;
    final result = latest?['result'] as Map<String, dynamic>?;
    final top = result?['top_disease'] as Map<String, dynamic>?;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Camera'),
        actions: [IconButton(onPressed: () => _edit(), icon: const Icon(Icons.add_a_photo_outlined))],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (_error != null) _MessageCard(message: _error!, color: Colors.red),
                  if (_cameras.isEmpty)
                    const _MessageCard(message: 'Chưa có camera. Hãy thêm MediaMTX, camera thật hoặc điện thoại qua Tailscale.')
                  else ...[
                    SizedBox(
                      height: 86,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: _cameras.length,
                        separatorBuilder: (_, _) => const SizedBox(width: 10),
                        itemBuilder: (context, index) {
                          final item = _cameras[index];
                          return ChoiceChip(
                            selected: item.id == camera?.id,
                            label: SizedBox(width: 150, child: Text('${item.name}\n${item.status}', maxLines: 2)),
                            onSelected: (_) async {
                              setState(() => _selectedId = item.id);
                              await _loadRuns();
                            },
                          );
                        },
                      ),
                    ),
                    if (camera != null) ...[
                      Row(
                        children: [
                          Expanded(child: Text(camera.name, style: Theme.of(context).textTheme.titleLarge)),
                          IconButton(onPressed: () => _edit(camera), icon: const Icon(Icons.settings_outlined)),
                          IconButton(onPressed: () => _delete(camera), icon: const Icon(Icons.delete_outline, color: Colors.red)),
                        ],
                      ),
                      LiveCameraSection(cameras: [camera.asLiveCamera]),
                      const SizedBox(height: 16),
                      SegmentedButton<String>(
                        segments: const [
                          ButtonSegment(value: 'monitor', label: Text('Xem live'), icon: Icon(Icons.videocam_outlined)),
                          ButtonSegment(value: 'plant-disease', label: Text('Chẩn đoán'), icon: Icon(Icons.eco_outlined)),
                        ],
                        selected: {_task},
                        onSelectionChanged: (value) => setState(() => _task = value.first),
                      ),
                      const SizedBox(height: 14),
                      if (_task == 'monitor')
                        const _MessageCard(message: 'Chế độ giám sát: không chạy AI và không gửi frame đi phân tích.')
                      else ...[
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            OutlinedButton.icon(onPressed: () => _pickFrame(ImageSource.camera), icon: const Icon(Icons.photo_camera), label: const Text('Chụp frame')),
                            OutlinedButton.icon(onPressed: () => _pickFrame(ImageSource.gallery), icon: const Icon(Icons.photo_library_outlined), label: const Text('Chọn ảnh')),
                            FilledButton.icon(onPressed: _running ? null : _runDisease, icon: const Icon(Icons.science_outlined), label: Text(_running ? 'Đang phân tích...' : 'Lấy frame và chẩn đoán')),
                          ],
                        ),
                        if (_frame != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text('Frame: ${_frame!.name}')),
                        if (top != null) ...[
                          const SizedBox(height: 14),
                          Card(
                            color: AppColors.pine.withValues(alpha: 0.08),
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(top['disease_name']?.toString() ?? 'Không xác định', style: Theme.of(context).textTheme.titleMedium),
                                  const SizedBox(height: 6),
                                  Text('Confidence: ${(((top['confidence'] as num?) ?? 0) * 100).toStringAsFixed(1)}%'),
                                  Text(top['description']?.toString() ?? ''),
                                ],
                              ),
                            ),
                          ),
                        ],
                        const SizedBox(height: 12),
                        Text('Lịch sử chẩn đoán', style: Theme.of(context).textTheme.titleMedium),
                        ..._runs.take(20).map((run) {
                          final runResult = run['result'] as Map<String, dynamic>?;
                          final runTop = runResult?['top_disease'] as Map<String, dynamic>?;
                          return ListTile(
                            contentPadding: EdgeInsets.zero,
                            leading: Icon(run['status'] == 'completed' ? Icons.check_circle_outline : Icons.error_outline),
                            title: Text(runTop?['disease_name']?.toString() ?? run['error']?.toString() ?? run['status'].toString()),
                            subtitle: Text(run['createdAt']?.toString() ?? ''),
                            trailing: run['confidence'] == null ? null : Text('${((run['confidence'] as num) * 100).toStringAsFixed(1)}%'),
                          );
                        }),
                      ],
                    ],
                  ],
                ],
              ),
            ),
    );
  }
}

class _CameraRecord {
  const _CameraRecord({required this.id, required this.name, required this.code, required this.sourceType, required this.playbackUrl, required this.snapshotUrl, required this.location, required this.enabled, required this.status});
  final String id;
  final String name;
  final String code;
  final String sourceType;
  final String playbackUrl;
  final String snapshotUrl;
  final String location;
  final bool enabled;
  final String status;

  factory _CameraRecord.fromJson(Map<String, dynamic> json) => _CameraRecord(
        id: json['_id']?.toString() ?? '',
        name: json['name']?.toString() ?? 'Camera',
        code: json['code']?.toString() ?? '',
        sourceType: json['source_type']?.toString() ?? 'mediamtx',
        playbackUrl: ((json['stream_urls'] as Map<String, dynamic>?)?['hls'] ??
                json['playback_url'])
            ?.toString() ??
            '',
        snapshotUrl: json['snapshot_url']?.toString() ?? '',
        location: json['location']?.toString() ?? '',
        enabled: json['is_enabled'] != false,
        status: json['status']?.toString() ?? 'offline',
      );

  LiveCamera get asLiveCamera => LiveCamera(
        id: id,
        name: name,
        streamUrl: playbackUrl,
        location: location,
        isActive: enabled,
      );
}

class _MessageCard extends StatelessWidget {
  const _MessageCard({required this.message, this.color});
  final String message;
  final Color? color;

  @override
  Widget build(BuildContext context) => Card(
        color: (color ?? AppColors.pine).withValues(alpha: 0.08),
        child: Padding(padding: const EdgeInsets.all(16), child: Text(message)),
      );
}
