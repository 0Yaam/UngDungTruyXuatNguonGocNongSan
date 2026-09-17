import 'dart:ui';

import 'package:app/core/router.dart';
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

class QrScannerScreen extends StatefulWidget {
  const QrScannerScreen({super.key});

  @override
  State<QrScannerScreen> createState() => _QrScannerScreenState();
}

class _QrScannerScreenState extends State<QrScannerScreen> {
  final MobileScannerController _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    facing: CameraFacing.back,
    torchEnabled: false,
  );

  bool _navigated = false;
  bool _torchEnabled = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_navigated) return;

    final barcode = capture.barcodes.isEmpty ? null : capture.barcodes.first;
    final rawValue = barcode?.rawValue?.trim();
    if (rawValue == null || rawValue.isEmpty) return;

    final batchId = _extractBatchId(rawValue);
    if (batchId.isEmpty) return;

    _navigated = true;
    Navigator.pushReplacementNamed(
      context,
      '${AppRouter.trace}?batchId=$batchId',
    );
  }

  String _extractBatchId(String raw) {
    final trimmed = raw.trim();
    final keyMatch = RegExp(
      r'(?:batchId|productId)=([A-Za-z0-9_-]+)',
    ).firstMatch(trimmed);
    if (keyMatch != null) {
      return keyMatch.group(1) ?? trimmed;
    }

    final uri = Uri.tryParse(raw);
    if (uri == null) {
      return trimmed;
    }

    if (uri.queryParameters['batchId']?.isNotEmpty == true) {
      return uri.queryParameters['batchId']!;
    }

    if (uri.queryParameters['productId']?.isNotEmpty == true) {
      return uri.queryParameters['productId']!;
    }

    final fragmentUri = Uri.tryParse(uri.fragment);
    if (fragmentUri != null) {
      if (fragmentUri.queryParameters['batchId']?.isNotEmpty == true) {
        return fragmentUri.queryParameters['batchId']!;
      }
      if (fragmentUri.queryParameters['productId']?.isNotEmpty == true) {
        return fragmentUri.queryParameters['productId']!;
      }
      if (fragmentUri.pathSegments.isNotEmpty) {
        return fragmentUri.pathSegments.last;
      }
    }

    if (uri.pathSegments.isNotEmpty) {
      return uri.pathSegments.last;
    }

    return trimmed;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          MobileScanner(controller: _controller, onDetect: _onDetect),
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.black.withValues(alpha: 0.45),
                  Colors.transparent,
                  Colors.black.withValues(alpha: 0.65),
                ],
                stops: const [0, 0.35, 1],
              ),
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      _GlassScannerButton(
                        icon: Icons.arrow_back_rounded,
                        onTap: () => Navigator.pop(context),
                      ),
                      const Spacer(),
                      _GlassScannerButton(
                        icon: _torchEnabled
                            ? Icons.flash_on_rounded
                            : Icons.flash_off_rounded,
                        onTap: () async {
                          await _controller.toggleTorch();
                          if (!mounted) return;
                          setState(() => _torchEnabled = !_torchEnabled);
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  const _GlassScannerPanel(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Quét mã QR',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 28,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        SizedBox(height: 8),
                        Text(
                          'Đưa camera vào QR của lô nông sản để mở trang truy xuất.',
                          style: TextStyle(
                            color: Color(0xFFE6EEFF),
                            height: 1.45,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Spacer(),
                  Center(
                    child: Container(
                      width: 270,
                      height: 270,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(34),
                        border: Border.all(
                          color: Colors.white.withValues(alpha: 0.88),
                          width: 1.8,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.white.withValues(alpha: 0.18),
                            blurRadius: 32,
                            spreadRadius: 2,
                          ),
                        ],
                      ),
                      child: Stack(
                        children: const [
                          Positioned(
                            top: 18,
                            left: 18,
                            child: _CornerMarker(alignment: Alignment.topLeft),
                          ),
                          Positioned(
                            top: 18,
                            right: 18,
                            child: _CornerMarker(alignment: Alignment.topRight),
                          ),
                          Positioned(
                            bottom: 18,
                            left: 18,
                            child: _CornerMarker(
                              alignment: Alignment.bottomLeft,
                            ),
                          ),
                          Positioned(
                            bottom: 18,
                            right: 18,
                            child: _CornerMarker(
                              alignment: Alignment.bottomRight,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const Spacer(),
                  const _GlassScannerPanel(
                    child: Row(
                      children: [
                        Icon(Icons.info_outline_rounded, color: Colors.white),
                        SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'Nếu QR chứa đường dẫn, ứng dụng sẽ tự tách mã lô. Nếu chỉ là mã thường, app dùng chính giá trị đó để mở thông tin truy xuất.',
                            style: TextStyle(color: Colors.white, height: 1.45),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _GlassScannerButton extends StatelessWidget {
  const _GlassScannerButton({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
        child: Material(
          color: Colors.white.withValues(alpha: 0.14),
          child: InkWell(
            onTap: onTap,
            child: SizedBox(
              width: 48,
              height: 48,
              child: Icon(icon, color: Colors.white),
            ),
          ),
        ),
      ),
    );
  }
}

class _GlassScannerPanel extends StatelessWidget {
  const _GlassScannerPanel({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(28),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.10),
            borderRadius: BorderRadius.circular(28),
            border: Border.all(color: Colors.white.withValues(alpha: 0.18)),
          ),
          child: child,
        ),
      ),
    );
  }
}

class _CornerMarker extends StatelessWidget {
  const _CornerMarker({required this.alignment});

  final Alignment alignment;

  @override
  Widget build(BuildContext context) {
    final isTop = alignment.y < 0;
    final isLeft = alignment.x < 0;

    return SizedBox(
      width: 30,
      height: 30,
      child: CustomPaint(
        painter: _CornerPainter(isTop: isTop, isLeft: isLeft),
      ),
    );
  }
}

class _CornerPainter extends CustomPainter {
  const _CornerPainter({required this.isTop, required this.isLeft});

  final bool isTop;
  final bool isLeft;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white
      ..strokeWidth = 4
      ..strokeCap = StrokeCap.round;

    final startX = isLeft ? 0.0 : size.width;
    final endX = isLeft ? size.width : 0.0;
    final startY = isTop ? 0.0 : size.height;
    final endY = isTop ? size.height : 0.0;

    canvas.drawLine(Offset(startX, startY), Offset(endX * 0.52, startY), paint);
    canvas.drawLine(Offset(startX, startY), Offset(startX, endY * 0.52), paint);
  }

  @override
  bool shouldRepaint(covariant _CornerPainter oldDelegate) {
    return oldDelegate.isTop != isTop || oldDelegate.isLeft != isLeft;
  }
}
