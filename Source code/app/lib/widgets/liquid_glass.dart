import 'dart:ui';

import 'package:app/core/theme.dart';
import 'package:flutter/material.dart';

class GlassPageBackground extends StatelessWidget {
  const GlassPageBackground({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFF7FAF2), Color(0xFFECF5E8), Color(0xFFF6F0DF)],
        ),
      ),
      child: Stack(
        children: [
          const Positioned(
            top: -100,
            right: -60,
            child: _GlowBubble(
              size: 260,
              colors: [Color(0x55A3D089), Color(0x00A3D089)],
            ),
          ),
          const Positioned(
            top: 180,
            left: -70,
            child: _GlowBubble(
              size: 220,
              colors: [Color(0x6DEDE3BE), Color(0x00EDE3BE)],
            ),
          ),
          const Positioned(
            bottom: -70,
            right: -30,
            child: _GlowBubble(
              size: 240,
              colors: [Color(0x55F3D89E), Color(0x00F3D89E)],
            ),
          ),
          Positioned.fill(child: child),
        ],
      ),
    );
  }
}

class GlassPanel extends StatelessWidget {
  const GlassPanel({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(20),
    this.radius = 28,
    this.blur = 20,
    this.borderColor,
    this.colors,
  });

  final Widget child;
  final EdgeInsets padding;
  final double radius;
  final double blur;
  final Color? borderColor;
  final List<Color>? colors;

  @override
  Widget build(BuildContext context) {
    final resolvedColors =
        colors ??
        [
          Colors.white.withValues(alpha: 0.52),
          Colors.white.withValues(alpha: 0.20),
        ];

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(radius),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1F1C3825),
            blurRadius: 34,
            offset: Offset(0, 14),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(radius),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
          child: Container(
            padding: padding,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(radius),
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: resolvedColors,
              ),
              border: Border.all(color: borderColor ?? AppColors.glassLine),
            ),
            child: child,
          ),
        ),
      ),
    );
  }
}

class GlassIconCapsule extends StatelessWidget {
  const GlassIconCapsule({
    super.key,
    required this.icon,
    this.size = 44,
    this.color = AppColors.ink,
  });

  final IconData icon;
  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return GlassPanel(
      padding: EdgeInsets.zero,
      radius: size * 0.46,
      blur: 18,
      colors: [
        Colors.white.withValues(alpha: 0.44),
        Colors.white.withValues(alpha: 0.2),
      ],
      child: SizedBox(
        width: size,
        height: size,
        child: Icon(icon, color: color),
      ),
    );
  }
}

class _GlowBubble extends StatelessWidget {
  const _GlowBubble({required this.size, required this.colors});

  final double size;
  final List<Color> colors;

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(colors: colors),
        ),
      ),
    );
  }
}
