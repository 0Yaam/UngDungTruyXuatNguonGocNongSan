import 'package:app/core/theme.dart';
import 'package:app/models/trace_event.dart';
import 'package:app/widgets/blockchain_badge.dart';
import 'package:app/widgets/liquid_glass.dart';
import 'package:flutter/material.dart';

class TraceTimelineItem extends StatefulWidget {
  const TraceTimelineItem({
    super.key,
    required this.event,
    required this.dateText,
    required this.isLast,
    this.onVerify,
    this.verifying = false,
    this.verifyResult,
  });

  final TraceEvent event;
  final String dateText;
  final bool isLast;
  final VoidCallback? onVerify;
  final bool verifying;
  final Map<String, dynamic>? verifyResult;

  @override
  State<TraceTimelineItem> createState() => _TraceTimelineItemState();
}

class _TraceTimelineItemState extends State<TraceTimelineItem> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final accent = _accentForEvent(widget.event.eventType);
    final detailsEntries = widget.event.details?.entries.toList() ?? const [];
    final verifyStatus = widget.verifyResult?['verified'];

    return Padding(
      padding: EdgeInsets.only(bottom: widget.isLast ? 0 : 18),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 42,
            child: Column(
              children: [
                Container(
                  width: 18,
                  height: 18,
                  decoration: BoxDecoration(
                    color: accent,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: accent.withValues(alpha: 0.24),
                        blurRadius: 16,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                ),
                if (!widget.isLast)
                  Container(
                    width: 2,
                    height: _expanded ? 160 : 120,
                    margin: const EdgeInsets.only(top: 8),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          accent.withValues(alpha: 0.36),
                          Colors.white.withValues(alpha: 0.18),
                        ],
                      ),
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: AnimatedSize(
              duration: const Duration(milliseconds: 220),
              curve: Curves.easeOutCubic,
              child: InkWell(
                borderRadius: BorderRadius.circular(26),
                onTap: () => setState(() => _expanded = !_expanded),
                child: GlassPanel(
                  radius: 26,
                  padding: const EdgeInsets.all(18),
                  colors: [
                    Colors.white.withValues(alpha: 0.44),
                    Colors.white.withValues(alpha: 0.18),
                  ],
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 46,
                            height: 46,
                            decoration: BoxDecoration(
                              color: accent.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(18),
                            ),
                            child: Icon(
                              _iconForEvent(widget.event.eventType),
                              color: accent,
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Wrap(
                                  spacing: 8,
                                  runSpacing: 8,
                                  children: [
                                    _MiniBadge(
                                      label: widget.event.eventLabel,
                                      background: accent.withValues(
                                        alpha: 0.12,
                                      ),
                                      foreground: accent,
                                    ),
                                    _MiniBadge(
                                      label: widget.dateText,
                                      background: Colors.white.withValues(
                                        alpha: 0.28,
                                      ),
                                      foreground: AppColors.muted,
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 10),
                                Text(
                                  widget.event.description.isEmpty
                                      ? 'Su kien khong co mo ta'
                                      : widget.event.description,
                                  maxLines: _expanded ? null : 2,
                                  overflow: _expanded
                                      ? TextOverflow.visible
                                      : TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 15,
                                    height: 1.55,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.ink,
                                  ),
                                ),
                                if (widget.event.recordedByName.isNotEmpty) ...[
                                  const SizedBox(height: 8),
                                  Text(
                                    'Ghi boi ${widget.event.recordedByName}',
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.muted,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                          const SizedBox(width: 10),
                          Icon(
                            _expanded
                                ? Icons.keyboard_arrow_up_rounded
                                : Icons.keyboard_arrow_down_rounded,
                            color: AppColors.muted,
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          BlockchainBadge(
                            status: widget.event.onChainStatus,
                            txHash: widget.event.txHash,
                          ),
                          if (detailsEntries.isNotEmpty)
                            _MiniBadge(
                              label: '${detailsEntries.length} chi tiet',
                              background: const Color(0xFFE8F0FF),
                              foreground: AppColors.pine,
                            ),
                          if (widget.event.blockNumber != null)
                            _MiniBadge(
                              label: 'Block ${widget.event.blockNumber}',
                              background: const Color(0xFFF6F1FF),
                              foreground: const Color(0xFF6A48C6),
                            ),
                        ],
                      ),
                      if (_expanded) ...[
                        const SizedBox(height: 16),
                        if (detailsEntries.isNotEmpty) ...[
                          const _SectionTitle('Thong tin chi tiet'),
                          const SizedBox(height: 10),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: detailsEntries
                                .map(
                                  (entry) => _MiniBadge(
                                    label:
                                        '${entry.key}: ${_stringify(entry.value)}',
                                    background: Colors.white.withValues(
                                      alpha: 0.34,
                                    ),
                                    foreground: AppColors.ink,
                                  ),
                                )
                                .toList(),
                          ),
                          const SizedBox(height: 14),
                        ],
                        if (widget.event.images.isNotEmpty) ...[
                          const _SectionTitle('Hinh anh dinh kem'),
                          const SizedBox(height: 10),
                          SizedBox(
                            height: 92,
                            child: ListView.separated(
                              scrollDirection: Axis.horizontal,
                              itemBuilder: (context, index) {
                                final image = widget.event.images[index];
                                return ClipRRect(
                                  borderRadius: BorderRadius.circular(18),
                                  child: Image.network(
                                    image,
                                    width: 112,
                                    height: 92,
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, _, _) => Container(
                                      width: 112,
                                      height: 92,
                                      color: Colors.white.withValues(
                                        alpha: 0.28,
                                      ),
                                      alignment: Alignment.center,
                                      child: const Icon(
                                        Icons.broken_image_rounded,
                                        color: AppColors.muted,
                                      ),
                                    ),
                                  ),
                                );
                              },
                              separatorBuilder: (_, _) =>
                                  const SizedBox(width: 10),
                              itemCount: widget.event.images.length,
                            ),
                          ),
                          const SizedBox(height: 14),
                        ],
                        if (widget.event.dataHash != null ||
                            widget.event.txHash != null ||
                            widget.event.blockNumber != null) ...[
                          const _SectionTitle('Dau vet blockchain'),
                          const SizedBox(height: 10),
                          _InfoLine(
                            label: 'Hash',
                            value: widget.event.dataHash ?? 'Khong co',
                            mono: true,
                          ),
                          if (widget.event.txHash != null) ...[
                            const SizedBox(height: 8),
                            _InfoLine(
                              label: 'Tx',
                              value: widget.event.txHash!,
                              mono: true,
                            ),
                          ],
                          if (widget.event.blockNumber != null) ...[
                            const SizedBox(height: 8),
                            _InfoLine(
                              label: 'Block',
                              value: widget.event.blockNumber.toString(),
                            ),
                          ],
                          const SizedBox(height: 14),
                        ],
                        if (widget.onVerify != null) ...[
                          Row(
                            children: [
                              FilledButton.icon(
                                onPressed: widget.verifying
                                    ? null
                                    : widget.onVerify,
                                icon: widget.verifying
                                    ? const SizedBox(
                                        width: 14,
                                        height: 14,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: Colors.white,
                                        ),
                                      )
                                    : const Icon(
                                        Icons.verified_outlined,
                                        size: 18,
                                      ),
                                label: Text(
                                  widget.verifying
                                      ? 'Dang kiem tra...'
                                      : 'Xac minh blockchain',
                                ),
                              ),
                              if (verifyStatus != null) ...[
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 12,
                                      vertical: 11,
                                    ),
                                    decoration: BoxDecoration(
                                      color:
                                          (verifyStatus == true
                                                  ? const Color(0xFFDCFCE7)
                                                  : const Color(0xFFFEE2E2))
                                              .withValues(alpha: 0.9),
                                      borderRadius: BorderRadius.circular(18),
                                    ),
                                    child: Text(
                                      verifyStatus == true
                                          ? 'Du lieu khop voi blockchain'
                                          : 'Du lieu khong khop voi blockchain',
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                        color: verifyStatus == true
                                            ? const Color(0xFF166534)
                                            : const Color(0xFFB91C1C),
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ],
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  static String _stringify(dynamic value) {
    if (value == null) {
      return 'N/A';
    }
    if (value is List) {
      return value.map(_stringify).join(', ');
    }
    if (value is Map) {
      return value.entries
          .map((entry) => '${entry.key}: ${entry.value}')
          .join(' | ');
    }
    return value.toString();
  }

  static Color _accentForEvent(String type) {
    switch (type) {
      case 'SEEDING':
        return const Color(0xFF22C55E);
      case 'FERTILIZING':
        return const Color(0xFFF59E0B);
      case 'WATERING':
        return const Color(0xFF06B6D4);
      case 'PEST_CONTROL':
      case 'PESTICIDE':
        return const Color(0xFFF97316);
      case 'HARVESTING':
        return const Color(0xFF8B5CF6);
      case 'PROCESSING':
        return const Color(0xFF4A7DFF);
      case 'PACKAGING':
        return const Color(0xFFEC4899);
      case 'SHIPPING':
        return const Color(0xFF14B8A6);
      case 'QUALITY_CHECK':
        return const Color(0xFF0EA5E9);
      default:
        return AppColors.pine;
    }
  }

  static IconData _iconForEvent(String type) {
    switch (type) {
      case 'SEEDING':
        return Icons.spa_rounded;
      case 'FERTILIZING':
        return Icons.science_outlined;
      case 'WATERING':
        return Icons.water_drop_outlined;
      case 'PEST_CONTROL':
      case 'PESTICIDE':
        return Icons.shield_moon_outlined;
      case 'HARVESTING':
        return Icons.agriculture_rounded;
      case 'PROCESSING':
        return Icons.precision_manufacturing_outlined;
      case 'PACKAGING':
        return Icons.inventory_2_outlined;
      case 'SHIPPING':
        return Icons.local_shipping_outlined;
      case 'QUALITY_CHECK':
        return Icons.fact_check_outlined;
      default:
        return Icons.timeline_rounded;
    }
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    return Text(
      label,
      style: const TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w800,
        color: AppColors.muted,
        letterSpacing: 0.2,
      ),
    );
  }
}

class _MiniBadge extends StatelessWidget {
  const _MiniBadge({
    required this.label,
    required this.background,
    required this.foreground,
  });

  final String label;
  final Color background;
  final Color foreground;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: foreground,
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _InfoLine extends StatelessWidget {
  const _InfoLine({
    required this.label,
    required this.value,
    this.mono = false,
  });

  final String label;
  final String value;
  final bool mono;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.26),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              color: AppColors.muted,
            ),
          ),
          const SizedBox(height: 4),
          SelectableText(
            value,
            style: TextStyle(
              fontSize: mono ? 11 : 13,
              fontWeight: FontWeight.w700,
              color: AppColors.ink,
              fontFamily: mono ? 'monospace' : null,
            ),
          ),
        ],
      ),
    );
  }
}
