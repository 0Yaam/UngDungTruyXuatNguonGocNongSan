import 'package:app/core/router.dart';
import 'package:flutter/material.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFFFCF4),
      body: LayoutBuilder(
        builder: (context, constraints) {
          final compact = constraints.maxHeight < 760;
          final contentWidth = constraints.maxWidth.clamp(0.0, 560.0);
          final panelHeight = (constraints.maxHeight * 0.28)
              .clamp(compact ? 248.0 : 264.0, compact ? 276.0 : 292.0)
              .toDouble();
          final titleSize = constraints.maxWidth < 390 ? 31.0 : 35.0;

          return Stack(
            children: [
              Positioned.fill(
                child: Image.asset(
                  'assets/images/welcome-hero.png',
                  fit: BoxFit.cover,
                  alignment: const Alignment(0, 0.42),
                ),
              ),
              Positioned.fill(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.white.withValues(alpha: 0.08),
                        Colors.white.withValues(alpha: 0.04),
                        Colors.white.withValues(alpha: 0.84),
                      ],
                      stops: const [0, 0.55, 0.78],
                    ),
                  ),
                ),
              ),
              SafeArea(
                bottom: false,
                child: Align(
                  alignment: Alignment.topCenter,
                  child: SizedBox(
                    width: contentWidth,
                    child: Padding(
                      padding: EdgeInsets.fromLTRB(
                        24,
                        compact ? 26 : 42,
                        24,
                        0,
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const _LogoMark(),
                          const SizedBox(height: 10),
                          const Text(
                            'AgriTrace',
                            style: TextStyle(
                              color: Color(0xFF17671E),
                              fontSize: 25,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 0,
                            ),
                          ),
                          SizedBox(height: compact ? 16 : 24),
                          Text(
                            'Truy xuất\nnguồn gốc nông sản',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: const Color(0xFF17671E),
                              fontSize: titleSize,
                              fontWeight: FontWeight.w900,
                              height: 1.12,
                              letterSpacing: 0,
                            ),
                          ),
                          const SizedBox(height: 12),
                          const Text(
                            'Minh bạch từ nông trại đến bàn ăn',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: Color(0xFF6D6D6D),
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              height: 1.3,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              Align(
                alignment: Alignment.bottomCenter,
                child: Container(
                  width: double.infinity,
                  height: panelHeight,
                  decoration: const BoxDecoration(
                    color: Color(0xFFFFFCF7),
                    borderRadius:
                        BorderRadius.vertical(top: Radius.circular(34)),
                    boxShadow: [
                      BoxShadow(
                        color: Color(0x1F143F1E),
                        blurRadius: 28,
                        offset: Offset(0, -10),
                      ),
                    ],
                  ),
                  child: SafeArea(
                    top: false,
                    child: Center(
                      child: SizedBox(
                        width: contentWidth,
                        child: Padding(
                          padding: EdgeInsets.fromLTRB(
                            28,
                            compact ? 12 : 14,
                            28,
                            compact ? 6 : 8,
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              _WelcomeActionButton(
                                label: 'Đăng nhập',
                                icon: Icons.person_outline_rounded,
                                trailingIcon: Icons.chevron_right_rounded,
                                filled: true,
                                onTap: () => Navigator.pushNamed(
                                  context,
                                  AppRouter.login,
                                ),
                              ),
                              const SizedBox(height: 7),
                              _WelcomeActionButton(
                                label: 'Đăng ký',
                                icon: Icons.person_add_alt_1_outlined,
                                trailingIcon: Icons.chevron_right_rounded,
                                onTap: () => Navigator.pushNamed(
                                  context,
                                  AppRouter.register,
                                ),
                              ),
                              SizedBox(height: compact ? 6 : 8),
                              const _DividerLabel(),
                              SizedBox(height: compact ? 6 : 8),
                              _WelcomeActionButton(
                                label: 'Quét QR không cần tài khoản',
                                icon: Icons.qr_code_scanner_rounded,
                                soft: true,
                                onTap: () => Navigator.pushNamed(
                                  context,
                                  AppRouter.scanner,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _LogoMark extends StatelessWidget {
  const _LogoMark();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 76,
      height: 56,
      child: CustomPaint(painter: _LogoMarkPainter()),
    );
  }
}

class _LogoMarkPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final green = Paint()..color = const Color(0xFF17671E);
    final lightGreen = Paint()..color = const Color(0xFF4DA43A);
    final sun = Paint()..color = const Color(0xFFFFC300);

    canvas.drawCircle(Offset(size.width * 0.28, size.height * 0.56), 14, sun);

    final field = Path()
      ..moveTo(size.width * 0.22, size.height * 0.64)
      ..quadraticBezierTo(
        size.width * 0.48,
        size.height * 0.38,
        size.width * 0.88,
        size.height * 0.54,
      )
      ..lineTo(size.width * 0.74, size.height * 0.82)
      ..quadraticBezierTo(
        size.width * 0.48,
        size.height * 0.88,
        size.width * 0.18,
        size.height * 0.72,
      )
      ..close();
    canvas.drawPath(field, green);

    final stripe = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(
      Offset(size.width * 0.34, size.height * 0.68),
      Offset(size.width * 0.76, size.height * 0.58),
      stripe,
    );
    canvas.drawLine(
      Offset(size.width * 0.48, size.height * 0.80),
      Offset(size.width * 0.64, size.height * 0.52),
      stripe,
    );

    final stem = Paint()
      ..color = const Color(0xFF17671E)
      ..strokeWidth = 4
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(
      Offset(size.width * 0.55, size.height * 0.45),
      Offset(size.width * 0.55, size.height * 0.14),
      stem,
    );

    final leftLeaf = Path()
      ..moveTo(size.width * 0.55, size.height * 0.25)
      ..quadraticBezierTo(
        size.width * 0.34,
        size.height * 0.04,
        size.width * 0.32,
        size.height * 0.28,
      )
      ..quadraticBezierTo(
        size.width * 0.45,
        size.height * 0.32,
        size.width * 0.55,
        size.height * 0.25,
      );
    final rightLeaf = Path()
      ..moveTo(size.width * 0.57, size.height * 0.22)
      ..quadraticBezierTo(
        size.width * 0.82,
        size.height * 0.02,
        size.width * 0.78,
        size.height * 0.30,
      )
      ..quadraticBezierTo(
        size.width * 0.66,
        size.height * 0.34,
        size.width * 0.57,
        size.height * 0.22,
      );
    canvas.drawPath(leftLeaf, lightGreen);
    canvas.drawPath(rightLeaf, lightGreen);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _WelcomeActionButton extends StatelessWidget {
  const _WelcomeActionButton({
    required this.label,
    required this.icon,
    required this.onTap,
    this.trailingIcon,
    this.filled = false,
    this.soft = false,
  });

  final String label;
  final IconData icon;
  final IconData? trailingIcon;
  final bool filled;
  final bool soft;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final foreground = filled ? Colors.white : const Color(0xFF17671E);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Ink(
          height: soft ? 42 : 50,
          decoration: BoxDecoration(
            color: filled
                ? const Color(0xFF1F7A2E)
                : soft
                    ? const Color(0xFFF6F3EC)
                    : Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: filled || soft
                ? null
                : Border.all(color: const Color(0xFF1F7A2E), width: 1.6),
            boxShadow: soft
                ? const [
                    BoxShadow(
                      color: Color(0x12000000),
                      blurRadius: 18,
                      offset: Offset(0, 8),
                    ),
                  ]
                : null,
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 22),
            child: Row(
              children: [
                Icon(icon, color: foreground, size: soft ? 20 : 24),
                Expanded(
                  child: Text(
                    label,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: foreground,
                      fontSize: soft ? 13 : 15,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0,
                    ),
                  ),
                ),
                Icon(
                  trailingIcon,
                  color: trailingIcon == null ? Colors.transparent : foreground,
                  size: 30,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _DividerLabel extends StatelessWidget {
  const _DividerLabel();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: const [
        Expanded(child: Divider(color: Color(0xFFE7E1D6), thickness: 1)),
        Padding(
          padding: EdgeInsets.symmetric(horizontal: 16),
          child: Text(
            'hoặc',
            style: TextStyle(
              color: Color(0xFF7A7A7A),
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
        Expanded(child: Divider(color: Color(0xFFE7E1D6), thickness: 1)),
      ],
    );
  }
}
