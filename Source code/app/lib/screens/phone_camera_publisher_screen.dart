import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;
import 'dart:typed_data';

import 'package:app/core/api_client.dart';
import 'package:app/core/theme.dart';
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:image/image.dart' as imglib;
import 'package:web_socket_channel/web_socket_channel.dart';

class PhoneCameraPublisherScreen extends StatefulWidget {
  const PhoneCameraPublisherScreen({super.key});

  @override
  State<PhoneCameraPublisherScreen> createState() =>
      _PhoneCameraPublisherScreenState();
}

class _PhoneCameraPublisherScreenState
    extends State<PhoneCameraPublisherScreen>
    with WidgetsBindingObserver {
  final _codeController = TextEditingController();
  CameraController? _camera;
  WebSocketChannel? _channel;
  StreamSubscription? _subscription;

  bool _starting = false;
  bool _streaming = false;
  bool _encoding = false;
  int _fps = 3;
  DateTime _lastFrameAt = DateTime.fromMillisecondsSinceEpoch(0);
  String _status = 'Nhập mã ghép từ màn Quản lý camera.';
  String? _error;
  String _disease = '';
  double? _confidence;
  String _aiStatus = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _stop();
    _codeController.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.inactive ||
        state == AppLifecycleState.paused) {
      _stop();
    }
  }

  Future<void> _start() async {
    if (_starting || _streaming) return;
    final code = _codeController.text.trim().toUpperCase();
    if (code.length < 4) {
      setState(() => _error = 'Mã ghép camera không hợp lệ.');
      return;
    }

    setState(() {
      _starting = true;
      _error = null;
      _status = 'Đang kết nối server...';
    });

    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) throw Exception('Thiết bị không có camera.');
      final back = cameras.where(
        (item) => item.lensDirection == CameraLensDirection.back,
      );
      final selected = back.isNotEmpty ? back.first : cameras.first;

      final controller = CameraController(
        selected,
        ResolutionPreset.medium,
        enableAudio: false,
        imageFormatGroup: Platform.isAndroid
            ? ImageFormatGroup.yuv420
            : ImageFormatGroup.bgra8888,
      );
      await controller.initialize();

      final channel = WebSocketChannel.connect(
        phoneCameraWebSocketUri(mode: 'publish', key: code),
      );
      await channel.ready;

      _camera = controller;
      _channel = channel;
      _subscription = channel.stream.listen(
        _handleServerMessage,
        onError: (Object error) {
          if (!mounted) return;
          setState(() {
            _error = 'Mất kết nối camera: $error';
            _status = 'OFFLINE';
          });
        },
        onDone: () {
          if (!mounted) return;
          setState(() {
            _streaming = false;
            _status = 'Camera đã ngắt kết nối';
          });
        },
      );

      await controller.startImageStream(_onCameraFrame);
      if (!mounted) return;
      setState(() {
        _streaming = true;
        _starting = false;
        _status = 'LIVE • $_fps FPS';
      });
    } catch (error) {
      await _stop();
      if (!mounted) return;
      setState(() {
        _starting = false;
        _error = error.toString().replaceFirst('Exception: ', '');
        _status = 'Không kết nối được';
      });
    }
  }

  Future<void> _stop() async {
    final camera = _camera;
    _camera = null;
    _streaming = false;
    try {
      if (camera?.value.isStreamingImages == true) {
        await camera!.stopImageStream();
      }
    } catch (_) {}
    await camera?.dispose();
    await _subscription?.cancel();
    _subscription = null;
    try {
      await _channel?.sink.close();
    } catch (_) {}
    _channel = null;
    if (mounted) setState(() {});
  }

  void _handleServerMessage(dynamic message) {
    if (message is! String) return;
    try {
      final data = jsonDecode(message);
      if (data is! Map<String, dynamic>) return;
      if (data['type'] == 'paired') {
        if (!mounted) return;
        setState(() {
          _status = 'LIVE • $_fps FPS • ${data['cameraName'] ?? ''}';
        });
      } else if (data['type'] == 'ai_result') {
        final candidates = data['candidates'];
        if (candidates is List && candidates.isNotEmpty) {
          final first = Map<String, dynamic>.from(candidates.first as Map);
          if (!mounted) return;
          setState(() {
            _disease = (first['disease_name'] ?? '').toString();
            _confidence = (first['confidence'] as num?)?.toDouble();
            _aiStatus = (data['status'] ?? '').toString();
          });
        }
      } else if (data['type'] == 'ai_error') {
        if (!mounted) return;
        setState(() => _aiStatus = (data['message'] ?? 'AI error').toString());
      }
    } catch (_) {}
  }

  void _onCameraFrame(CameraImage frame) {
    if (!_streaming || _encoding || _channel == null) return;
    final now = DateTime.now();
    final intervalMs = (1000 / _fps).round();
    if (now.difference(_lastFrameAt).inMilliseconds < intervalMs) return;
    _lastFrameAt = now;
    _encoding = true;

    Future(() => _encodeJpeg(frame)).then((bytes) {
      if (bytes != null && _streaming) _channel?.sink.add(bytes);
    }).catchError((_) {}).whenComplete(() {
      _encoding = false;
    });
  }

  Uint8List? _encodeJpeg(CameraImage image) {
    if (image.planes.isEmpty) return null;
    imglib.Image rgb;

    if (image.format.group == ImageFormatGroup.bgra8888) {
      rgb = imglib.Image.fromBytes(
        width: image.width,
        height: image.height,
        bytes: image.planes.first.bytes.buffer,
        order: imglib.ChannelOrder.bgra,
      );
    } else {
      rgb = imglib.Image(width: image.width, height: image.height);
      final yPlane = image.planes[0];
      final uPlane = image.planes[1];
      final vPlane = image.planes[2];
      final uvRowStride = uPlane.bytesPerRow;
      final uvPixelStride = uPlane.bytesPerPixel ?? 1;

      for (var y = 0; y < image.height; y++) {
        final yRow = yPlane.bytesPerRow * y;
        final uvRow = uvRowStride * (y >> 1);
        for (var x = 0; x < image.width; x++) {
          final yp = yPlane.bytes[yRow + x];
          final uvIndex = uvRow + (x >> 1) * uvPixelStride;
          final up = uPlane.bytes[uvIndex];
          final vp = vPlane.bytes[uvIndex];
          final yf = yp.toDouble();
          final uf = up.toDouble() - 128.0;
          final vf = vp.toDouble() - 128.0;
          final r = (yf + 1.402 * vf).round().clamp(0, 255);
          final g = (yf - 0.344136 * uf - 0.714136 * vf)
              .round().clamp(0, 255);
          final b = (yf + 1.772 * uf).round().clamp(0, 255);
          rgb.setPixelRgb(x, y, r, g, b);
        }
      }
    }

    if (rgb.width > 640) {
      final h = (rgb.height * 640 / rgb.width).round();
      rgb = imglib.copyResize(
        rgb,
        width: 640,
        height: math.max(1, h),
        interpolation: imglib.Interpolation.linear,
      );
    }
    return Uint8List.fromList(imglib.encodeJpg(rgb, quality: 68));
  }

  @override
  Widget build(BuildContext context) {
    final camera = _camera;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Điện thoại làm camera'),
        actions: [
          if (_streaming)
            TextButton(onPressed: _stop, child: const Text('Dừng')),
        ],
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(18),
          children: [
            TextField(
              controller: _codeController,
              enabled: !_streaming && !_starting,
              textCapitalization: TextCapitalization.characters,
              decoration: const InputDecoration(
                labelText: 'Mã ghép camera',
                hintText: 'Ví dụ: A7K9M2QP',
                prefixIcon: Icon(Icons.link_rounded),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                const Text('Tốc độ:'),
                const SizedBox(width: 12),
                for (final fps in const [1, 3, 5])
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text('$fps FPS'),
                      selected: _fps == fps,
                      onSelected: _streaming
                          ? null
                          : (_) => setState(() => _fps = fps),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 14),
            AspectRatio(
              aspectRatio: camera?.value.isInitialized == true
                  ? camera!.value.aspectRatio
                  : 4 / 3,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  color: Colors.black,
                  child: camera?.value.isInitialized == true
                      ? CameraPreview(camera!)
                      : const Center(
                          child: Icon(
                            Icons.videocam_outlined,
                            color: Colors.white54,
                            size: 64,
                          ),
                        ),
                ),
              ),
            ),
            const SizedBox(height: 14),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _status,
                      style: TextStyle(
                        color: _streaming ? AppColors.pine : AppColors.muted,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    if (_disease.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      Text(
                        _disease,
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      if (_confidence != null)
                        Text(
                          'Độ tin cậy mô hình: '
                          '${(_confidence! * 100).toStringAsFixed(1)}%',
                        ),
                      if (_aiStatus.isNotEmpty)
                        Text(
                          _aiStatus,
                          style: const TextStyle(color: AppColors.muted),
                        ),
                    ],
                    if (_error != null) ...[
                      const SizedBox(height: 10),
                      Text(
                        _error!,
                        style: const TextStyle(color: AppColors.danger),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),
            FilledButton.icon(
              onPressed: _starting
                  ? null
                  : _streaming
                      ? _stop
                      : _start,
              icon: Icon(_streaming ? Icons.stop_rounded : Icons.videocam_rounded),
              label: Text(
                _starting
                    ? 'Đang kết nối...'
                    : _streaming
                        ? 'Dừng camera'
                        : 'Bắt đầu phát camera',
              ),
            ),
            const SizedBox(height: 10),
            const Text(
              'Điện thoại chỉ đóng vai camera. Không cần đăng nhập. '
              'Bật Tailscale và dùng 4G/5G bình thường.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.muted),
            ),
          ],
        ),
      ),
    );
  }
}
