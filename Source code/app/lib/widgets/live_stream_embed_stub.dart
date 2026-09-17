import 'package:flutter/material.dart';

class LiveStreamEmbed extends StatelessWidget {
  const LiveStreamEmbed({super.key, required this.url});

  final String url;

  @override
  Widget build(BuildContext context) {
    return _UnsupportedStream(url: url);
  }
}

class _UnsupportedStream extends StatelessWidget {
  const _UnsupportedStream({required this.url});

  final String url;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black,
      alignment: Alignment.center,
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.live_tv_rounded, color: Colors.white, size: 42),
          const SizedBox(height: 12),
          const Text(
            'Nền tảng này chưa hỗ trợ WebView. Hãy dùng link HLS, MP4 hoặc mở bản web.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.white70),
          ),
          const SizedBox(height: 10),
          SelectableText(
            url,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.white, fontSize: 12),
          ),
        ],
      ),
    );
  }
}
