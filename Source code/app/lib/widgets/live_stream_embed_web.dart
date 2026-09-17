// ignore_for_file: avoid_web_libraries_in_flutter, deprecated_member_use

import 'dart:convert';
import 'dart:html' as html;
import 'dart:ui_web' as ui_web;

import 'package:flutter/material.dart';

class LiveStreamEmbed extends StatefulWidget {
  const LiveStreamEmbed({super.key, required this.url});

  final String url;

  @override
  State<LiveStreamEmbed> createState() => _LiveStreamEmbedState();
}

class _LiveStreamEmbedState extends State<LiveStreamEmbed> {
  late final String _viewType;

  @override
  void initState() {
    super.initState();
    _viewType =
        'agritrace-live-${DateTime.now().microsecondsSinceEpoch}-${identityHashCode(this)}';
    ui_web.platformViewRegistry.registerViewFactory(
      _viewType,
      (_) => _createPlayer(widget.url),
    );
  }

  html.IFrameElement _createPlayer(String rawUrl) {
    final url = rawUrl.trim();
    final iframe = html.IFrameElement()
      ..style.border = '0'
      ..style.width = '100%'
      ..style.height = '100%'
      ..setAttribute(
        'allow',
        'autoplay; encrypted-media; picture-in-picture; fullscreen',
      )
      ..setAttribute('allowfullscreen', 'true');

    final youtubeId = _youtubeVideoId(url);
    if (youtubeId != null) {
      iframe.src =
          'https://www.youtube-nocookie.com/embed/$youtubeId?autoplay=1&mute=1&playsinline=1&rel=0';
      return iframe;
    }

    final vimeoId = _vimeoVideoId(url);
    if (vimeoId != null) {
      iframe.src =
          'https://player.vimeo.com/video/$vimeoId?autoplay=1&muted=1';
      return iframe;
    }

    final escapedUrl = const HtmlEscape(HtmlEscapeMode.attribute).convert(url);
    final lower = url.toLowerCase().split('?').first;

    if (lower.endsWith('.m3u8')) {
      iframe.src = url;
      return iframe;
    }

    if (lower.endsWith('.mjpg') ||
        lower.endsWith('.mjpeg') ||
        lower.contains('mjpeg')) {
      iframe.srcdoc = '''
<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;width:100%;height:100%;background:#000;overflow:hidden}img{width:100%;height:100%;object-fit:contain}</style></head>
<body><img src="$escapedUrl" alt="Live camera"></body></html>''';
      return iframe;
    }

    if (lower.endsWith('.mp4') ||
        lower.endsWith('.webm') ||
        lower.endsWith('.ogg')) {
      iframe.srcdoc = '''
<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body,video{margin:0;width:100%;height:100%;background:#000}video{object-fit:contain}</style></head>
<body><video src="$escapedUrl" controls autoplay muted playsinline></video></body></html>''';
      return iframe;
    }

    iframe.src = url;
    return iframe;
  }

  String? _youtubeVideoId(String value) {
    final uri = Uri.tryParse(value);
    if (uri == null) return null;
    final host = uri.host.toLowerCase().replaceFirst('www.', '');

    if (host == 'youtu.be' && uri.pathSegments.isNotEmpty) {
      return uri.pathSegments.first;
    }
    if (!host.endsWith('youtube.com')) return null;

    final queryId = uri.queryParameters['v'];
    if (queryId != null && queryId.isNotEmpty) return queryId;
    const prefixes = {'embed', 'live', 'shorts'};
    if (uri.pathSegments.length >= 2 && prefixes.contains(uri.pathSegments[0])) {
      return uri.pathSegments[1];
    }
    return null;
  }

  String? _vimeoVideoId(String value) {
    final uri = Uri.tryParse(value);
    if (uri == null || !uri.host.toLowerCase().contains('vimeo.com')) {
      return null;
    }
    for (final segment in uri.pathSegments.reversed) {
      if (RegExp(r'^\d+$').hasMatch(segment)) return segment;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) => HtmlElementView(viewType: _viewType);
}
