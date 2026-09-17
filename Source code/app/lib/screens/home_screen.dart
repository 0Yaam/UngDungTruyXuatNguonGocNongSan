import 'package:app/core/router.dart';
import 'package:app/core/theme.dart';
import 'package:app/widgets/liquid_glass.dart';
import 'package:flutter/material.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      body: GlassPageBackground(
        child: SafeArea(
          child: LayoutBuilder(
            builder: (context, constraints) {
              final compact = constraints.maxHeight < 760;
              final heroHeight = (constraints.maxHeight * 0.38).clamp(
                compact ? 286.0 : 310.0,
                compact ? 320.0 : 350.0,
              ).toDouble();
              final titleSize = constraints.maxWidth < 380 ? 25.0 : 28.0;

              return ListView(
                padding: EdgeInsets.fromLTRB(22, compact ? 12 : 16, 22, 16),
                children: [
                  const _BrandHeader(),
                  SizedBox(height: compact ? 12 : 16),
                  _HeroArtwork(height: heroHeight),
                  SizedBox(height: compact ? 14 : 18),
                  Text(
                    'Truy xuất nguồn gốc nông sản',
                    textAlign: TextAlign.center,
                    style: textTheme.displaySmall?.copyWith(
                      fontSize: titleSize,
                      height: 1.08,
                      letterSpacing: 0,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Minh bạch từ nông trại đến bàn ăn',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: AppColors.muted,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      height: 1.35,
                    ),
                  ),
                  SizedBox(height: compact ? 16 : 20),
                  SizedBox(
                    height: 48,
                    child: FilledButton.icon(
                      onPressed: () =>
                          Navigator.pushNamed(context, AppRouter.login),
                      icon: const Icon(Icons.login_rounded, size: 20),
                      label: const Text('Đăng nhập'),
                    ),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    height: 48,
                    child: OutlinedButton.icon(
                      onPressed: () =>
                          Navigator.pushNamed(context, AppRouter.register),
                      icon: const Icon(
                        Icons.person_add_alt_1_rounded,
                        size: 20,
                      ),
                      label: const Text('Đăng ký'),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Center(
                    child: TextButton.icon(
                      onPressed: () =>
                          Navigator.pushNamed(context, AppRouter.scanner),
                      icon: const Icon(Icons.qr_code_scanner_rounded, size: 19),
                      label: const Text('Quét QR không cần tài khoản'),
                      style: TextButton.styleFrom(
                        foregroundColor: AppColors.pine,
                        textStyle: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  const _OnboardingDots(),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class _BrandHeader extends StatelessWidget {
  const _BrandHeader();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const GlassIconCapsule(
          icon: Icons.eco_rounded,
          color: AppColors.pine,
          size: 42,
        ),
        const SizedBox(width: 12),
        Text(
          'AgriTrace',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontSize: 19,
                fontWeight: FontWeight.w900,
                letterSpacing: 0,
              ),
        ),
        const Spacer(),
        GlassPanel(
          radius: 999,
          blur: 14,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          colors: [
            Colors.white.withValues(alpha: 0.58),
            Colors.white.withValues(alpha: 0.26),
          ],
          child: const Text(
            '2026',
            style: TextStyle(
              color: AppColors.ink,
              fontWeight: FontWeight.w800,
              fontSize: 11,
            ),
          ),
        ),
      ],
    );
  }
}

class _HeroArtwork extends StatelessWidget {
  const _HeroArtwork({required this.height});

  final double height;

  @override
  Widget build(BuildContext context) {
    return GlassPanel(
      padding: EdgeInsets.zero,
      radius: 32,
      colors: [
        Colors.white.withValues(alpha: 0.72),
        const Color(0xDFF7E9C8),
      ],
      child: SizedBox(
        height: height,
        child: Stack(
          fit: StackFit.expand,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(32),
              child: Image.asset(
                'assets/images/landing-hero.png',
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) =>
                    const _HeroFallback(),
              ),
            ),
            DecoratedBox(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(32),
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.white.withValues(alpha: 0.04),
                    const Color(0xFF123222).withValues(alpha: 0.18),
                  ],
                ),
              ),
            ),
            Positioned(
              left: 18,
              right: 18,
              bottom: 16,
              child: GlassPanel(
                radius: 22,
                blur: 12,
                padding: const EdgeInsets.all(12),
                colors: [
                  Colors.white.withValues(alpha: 0.78),
                  Colors.white.withValues(alpha: 0.34),
                ],
                child: const Row(
                  children: [
                    GlassIconCapsule(
                      icon: Icons.verified_rounded,
                      size: 38,
                      color: AppColors.pine,
                    ),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Kiểm tra xuất xứ, chứng nhận và hành trình sản phẩm trong vài giây.',
                        style: TextStyle(
                          color: AppColors.ink,
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          height: 1.3,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HeroFallback extends StatelessWidget {
  const _HeroFallback();

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFF8F3DE), Color(0xFFE3F2D6)],
        ),
      ),
      child: Stack(
        children: [
          const Positioned(
            left: 22,
            top: 22,
            child: _SunBadge(),
          ),
          const Positioned(
            right: 28,
            top: 34,
            child: Icon(
              Icons.eco_rounded,
              color: Color(0x55368A51),
              size: 62,
            ),
          ),
          Positioned(
            left: 0,
            right: 0,
            bottom: 20,
            child: SizedBox(
              height: 190,
              child: CustomPaint(painter: _FieldPainter()),
            ),
          ),
          const Positioned(
            left: 24,
            right: 24,
            bottom: 96,
            child: _ProduceRow(),
          ),
        ],
      ),
    );
  }
}

class _SunBadge extends StatelessWidget {
  const _SunBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 58,
      height: 58,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: const Color(0xFFF5C95B),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFF5C95B).withValues(alpha: 0.35),
            blurRadius: 26,
            spreadRadius: 6,
          ),
        ],
      ),
    );
  }
}

class _ProduceRow extends StatelessWidget {
  const _ProduceRow();

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: const [
        _ProduceIcon(
          color: Color(0xFFD74D3F),
          icon: Icons.local_florist,
          size: 84,
        ),
        _ProduceIcon(
          color: Color(0xFFEDA84A),
          icon: Icons.spa_rounded,
          size: 90,
        ),
        _ProduceIcon(
          color: Color(0xFF3D9A54),
          icon: Icons.grass_rounded,
          size: 84,
        ),
      ],
    );
  }
}

class _ProduceIcon extends StatelessWidget {
  const _ProduceIcon({
    required this.color,
    required this.icon,
    required this.size,
  });

  final Color color;
  final IconData icon;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: size,
      width: size,
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.76),
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white),
      ),
      child: Icon(icon, color: color, size: size * 0.48),
    );
  }
}

class _FieldPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final hillPaint = Paint()..color = const Color(0xFF8FCA75);
    final hillPath = Path()
      ..moveTo(0, size.height * 0.72)
      ..quadraticBezierTo(
        size.width * 0.28,
        size.height * 0.2,
        size.width * 0.58,
        size.height * 0.62,
      )
      ..quadraticBezierTo(
        size.width * 0.82,
        size.height * 0.92,
        size.width,
        size.height * 0.52,
      )
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();
    canvas.drawPath(hillPath, hillPaint);

    final frontPaint = Paint()..color = const Color(0xFF2F8F4D);
    final frontPath = Path()
      ..moveTo(0, size.height * 0.86)
      ..quadraticBezierTo(
        size.width * 0.35,
        size.height * 0.56,
        size.width,
        size.height * 0.8,
      )
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();
    canvas.drawPath(frontPath, frontPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _OnboardingDots extends StatelessWidget {
  const _OnboardingDots();

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _Dot(width: 24, color: AppColors.pine),
        const SizedBox(width: 7),
        _Dot(width: 8, color: AppColors.pine.withValues(alpha: 0.28)),
        const SizedBox(width: 7),
        _Dot(width: 8, color: AppColors.pine.withValues(alpha: 0.28)),
      ],
    );
  }
}

class _Dot extends StatelessWidget {
  const _Dot({required this.width, required this.color});

  final double width;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      width: width,
      height: 8,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(99),
      ),
    );
  }
}
