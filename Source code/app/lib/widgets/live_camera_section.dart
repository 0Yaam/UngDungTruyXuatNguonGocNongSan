import 'package:app/core/theme.dart';
import 'package:app/models/live_camera.dart';
import 'package:app/widgets/live_stream_embed.dart';
import 'package:app/widgets/liquid_glass.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

class LiveCameraSection extends StatefulWidget {
  const LiveCameraSection({super.key, required this.cameras});

  final List<LiveCamera> cameras;

  @override
  State<LiveCameraSection> createState() => _LiveCameraSectionState();
}

class _LiveCameraSectionState extends State<LiveCameraSection> {
  int _selectedIndex = 0;
  final ScrollController _cameraListController = ScrollController();
  VideoPlayerController? _controller;
  String? _error;

  LiveCamera? get _selectedCamera =>
      widget.cameras.isEmpty ? null : widget.cameras[_selectedIndex];

  @override
  void initState() {
    super.initState();
    final camera = _selectedCamera;
    if (camera != null) {
      _initializePlayer(camera);
    }
  }

  @override
  void didUpdateWidget(covariant LiveCameraSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.cameras.isEmpty) return;

    if (_selectedIndex >= widget.cameras.length) {
      _selectedIndex = 0;
    }

    final camera = _selectedCamera;
    if (camera == null) return;

    final previousUrl = _selectedIndex < oldWidget.cameras.length
        ? oldWidget.cameras[_selectedIndex].streamUrl
        : null;
    if (oldWidget.cameras != widget.cameras ||
        previousUrl != camera.streamUrl) {
      _initializePlayer(camera);
    }
  }

  Future<void> _initializePlayer(LiveCamera camera) async {
    await _controller?.dispose();
    _controller = null;
    _error = null;

    if (kIsWeb || _isEmbedOnly(camera.streamUrl)) {
      if (mounted) setState(() {});
      return;
    }

    final controller = VideoPlayerController.networkUrl(
      Uri.parse(camera.streamUrl),
    );

    try {
      await controller.initialize();
      await controller.setLooping(true);
      if (!mounted) {
        await controller.dispose();
        return;
      }
      setState(() => _controller = controller);
      await controller.play();
    } catch (_) {
      await controller.dispose();
      if (!mounted) return;
      setState(() {
        _controller = null;
        _error = 'Không thể phát live stream này trên thiết bị.';
      });
    }
  }

  bool _isEmbedOnly(String url) {
    final lower = url.toLowerCase();
    return lower.contains('youtube.com') ||
        lower.contains('youtu.be') ||
        lower.contains('vimeo.com');
  }

  Future<void> _selectCamera(int index) async {
    if (index == _selectedIndex) return;
    setState(() => _selectedIndex = index);
    await _initializePlayer(widget.cameras[index]);
  }

  @override
  void dispose() {
    _cameraListController.dispose();
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final camera = _selectedCamera;
    if (camera == null) {
      return const SizedBox.shrink();
    }
    final useEmbeddedPlayer = kIsWeb || _isEmbedOnly(camera.streamUrl);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Camera trực tiếp', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 8),
        const Text(
          'Theo dõi trực tiếp vùng sản xuất của lô nông sản này.',
        ),
        const SizedBox(height: 14),
        GlassPanel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(18),
                child: AspectRatio(
                  aspectRatio: 16 / 9,
                  child: useEmbeddedPlayer
                      ? LiveStreamEmbed(
                          key: ValueKey(camera.streamUrl),
                          url: camera.streamUrl,
                        )
                      : _error != null
                      ? Container(
                          color: Colors.black,
                          alignment: Alignment.center,
                          padding: const EdgeInsets.all(20),
                          child: Text(
                            _error!,
                            textAlign: TextAlign.center,
                            style: const TextStyle(color: Colors.white70),
                          ),
                        )
                      : _controller == null
                      ? const Center(child: CircularProgressIndicator())
                      : Stack(
                          fit: StackFit.expand,
                          children: [
                            VideoPlayer(_controller!),
                            Positioned(
                              top: 10,
                              left: 10,
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 6,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.red,
                                  borderRadius: BorderRadius.circular(999),
                                ),
                                child: const Text(
                                  'LIVE',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w800,
                                    fontSize: 11,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                ),
              ),
              const SizedBox(height: 14),
              Text(
                camera.name,
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 17,
                  color: AppColors.ink,
                ),
              ),
              if (camera.location.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  '📍 ${camera.location}',
                  style: const TextStyle(color: AppColors.muted),
                ),
              ],
              const SizedBox(height: 14),
              SizedBox(
                height: 92,
                child: ScrollConfiguration(
                  behavior: const MaterialScrollBehavior().copyWith(
                    dragDevices: {
                      PointerDeviceKind.touch,
                      PointerDeviceKind.mouse,
                      PointerDeviceKind.trackpad,
                      PointerDeviceKind.stylus,
                    },
                  ),
                  child: Scrollbar(
                    controller: _cameraListController,
                    thumbVisibility: true,
                    trackVisibility: true,
                    child: ListView.separated(
                      controller: _cameraListController,
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.only(bottom: 10),
                      physics: const BouncingScrollPhysics(),
                      itemCount: widget.cameras.length,
                      separatorBuilder: (context, index) =>
                          const SizedBox(width: 10),
                      itemBuilder: (context, index) {
                        final item = widget.cameras[index];
                        final selected = index == _selectedIndex;

                        return InkWell(
                          borderRadius: BorderRadius.circular(18),
                          onTap: () => _selectCamera(index),
                          child: GlassPanel(
                            radius: 18,
                            padding: const EdgeInsets.all(14),
                            colors: selected
                                ? [
                                    AppColors.pine.withValues(alpha: 0.18),
                                    Colors.white.withValues(alpha: 0.24),
                                  ]
                                : [
                                    Colors.white.withValues(alpha: 0.34),
                                    Colors.white.withValues(alpha: 0.16),
                                  ],
                            child: SizedBox(
                              width: 160,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Container(
                                        width: 8,
                                        height: 8,
                                        decoration: const BoxDecoration(
                                          color: Colors.red,
                                          shape: BoxShape.circle,
                                        ),
                                      ),
                                      const SizedBox(width: 6),
                                      const Text(
                                        'LIVE',
                                        style: TextStyle(
                                          fontWeight: FontWeight.w800,
                                          fontSize: 11,
                                          color: AppColors.danger,
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    item.name,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontWeight: selected
                                          ? FontWeight.w800
                                          : FontWeight.w700,
                                      color: AppColors.ink,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ),
                      ),
            ],
          ),
        ),
        const SizedBox(height: 18),
      ],
    );
  }
}
