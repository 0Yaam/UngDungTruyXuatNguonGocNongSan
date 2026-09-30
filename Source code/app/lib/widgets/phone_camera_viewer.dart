import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:app/core/api_client.dart';
import 'package:app/models/live_camera.dart';
import 'package:flutter/material.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

class PhoneCameraViewer extends StatefulWidget {
  const PhoneCameraViewer({super.key, required this.camera});
  final LiveCamera camera;

  @override
  State<PhoneCameraViewer> createState() => _PhoneCameraViewerState();
}

class _PhoneCameraViewerState extends State<PhoneCameraViewer> {
  WebSocketChannel? _channel;
  StreamSubscription? _subscription;
  Uint8List? _frame;
  bool _online = false;
  String? _error;
  String _disease = '';
  double? _confidence;
  Timer? _reconnectTimer;

  @override
  void initState() {
    super.initState();
    _connect();
  }

  Future<void> _connect() async {
    final key = widget.camera.pairingCode;
    if (key.isEmpty) return;
    try {
      final channel = WebSocketChannel.connect(
        phoneCameraWebSocketUri(mode: 'view', key: key),
      );
      await channel.ready;
      _channel = channel;
      _subscription = channel.stream.listen(
        _onMessage,
        onError: (Object e) => _scheduleReconnect(e.toString()),
        onDone: () => _scheduleReconnect('Mất kết nối camera'),
      );
      if (mounted) setState(() => _error = null);
    } catch (e) {
      _scheduleReconnect(e.toString());
    }
  }

  void _onMessage(dynamic message) {
    if (message is List<int>) {
      if (mounted) {
        setState(() {
          _frame = Uint8List.fromList(message);
          _online = true;
          _error = null;
        });
      }
      return;
    }
    if (message is! String) return;
    try {
      final data = jsonDecode(message);
      if (data is! Map<String, dynamic>) return;
      final type = data['type'];
      if (type == 'viewer_ready') {
        if (mounted) setState(() => _online = data['online'] == true);
      } else if (type == 'camera_online') {
        if (mounted) setState(() => _online = true);
      } else if (type == 'camera_offline') {
        if (mounted) setState(() => _online = false);
      } else if (type == 'ai_result') {
        final candidates = data['candidates'];
        if (candidates is List && candidates.isNotEmpty) {
          final top = Map<String, dynamic>.from(candidates.first as Map);
          if (mounted) {
            setState(() {
              _disease = (top['disease_name'] ?? '').toString();
              _confidence = (top['confidence'] as num?)?.toDouble();
            });
          }
        }
      } else if (type == 'ai_error') {
        if (mounted) setState(() => _error = data['message']?.toString());
      }
    } catch (_) {}
  }

  void _scheduleReconnect(String error) {
    if (!mounted) return;
    setState(() {
      _online = false;
      _error = error;
    });
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(const Duration(seconds: 2), _connect);
  }

  @override
  void dispose() {
    _reconnectTimer?.cancel();
    _subscription?.cancel();
    _channel?.sink.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        Container(
          color: Colors.black,
          alignment: Alignment.center,
          child: _frame == null
              ? Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      _online ? Icons.videocam_rounded : Icons.videocam_off_rounded,
                      color: Colors.white54,
                      size: 52,
                    ),
                    const SizedBox(height: 10),
                    Text(
                      _online ? 'Đang chờ frame...' : 'Camera đang offline',
                      style: const TextStyle(color: Colors.white70),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 6),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 18),
                        child: Text(
                          _error!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: Colors.white38, fontSize: 12),
                        ),
                      ),
                    ],
                  ],
                )
              : Image.memory(_frame!, fit: BoxFit.contain, gaplessPlayback: true),
        ),
        Positioned(
          top: 10,
          left: 10,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: _online ? Colors.red : Colors.black54,
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text(
              _online ? 'LIVE' : 'OFFLINE',
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w800,
                fontSize: 11,
              ),
            ),
          ),
        ),
        if (_disease.isNotEmpty)
          Positioned(
            left: 10,
            right: 10,
            bottom: 10,
            child: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.70),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                _confidence == null
                    ? _disease
                    : '$_disease • Độ tin cậy mô hình '
                      '${(_confidence! * 100).toStringAsFixed(1)}%',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
      ],
    );
  }
}
