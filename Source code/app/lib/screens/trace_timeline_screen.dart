import 'package:app/core/theme.dart';
import 'package:app/models/full_trace.dart';
import 'package:app/models/product.dart';
import 'package:app/providers/providers.dart';
import 'package:app/widgets/farming_area_map_card.dart';
import 'package:app/widgets/liquid_glass.dart';
import 'package:app/widgets/trace_timeline_item.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:share_plus/share_plus.dart';

class TraceTimelineScreen extends ConsumerStatefulWidget {
  const TraceTimelineScreen({super.key, required this.productId});

  final String productId;

  @override
  ConsumerState<TraceTimelineScreen> createState() =>
      _TraceTimelineScreenState();
}

class _TraceTimelineScreenState extends ConsumerState<TraceTimelineScreen> {
  final Map<String, Map<String, dynamic>> _verifyResults = {};
  String? _verifyingEventId;

  Future<void> _verifyEvent(String eventId) async {
    setState(() => _verifyingEventId = eventId);
    try {
      final result = await ref.read(traceServiceProvider).verifyEvent(eventId);
      setState(() => _verifyResults[eventId] = result);
    } catch (_) {
      setState(() => _verifyResults[eventId] = {'verified': false});
    } finally {
      if (mounted) {
        setState(() => _verifyingEventId = null);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final traceAsync = ref.watch(fullTraceProvider(widget.productId));
    final dateTimeFormat = DateFormat('dd/MM/yyyy HH:mm');
    final shortDateFormat = DateFormat('dd/MM/yyyy');

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: GlassPageBackground(
        child: SafeArea(
          child: traceAsync.when(
            loading: () => const Center(
              child: _StatePanel(
                icon: Icons.hourglass_bottom_rounded,
                title: 'Dang tai du lieu truy xuat',
                message:
                    'He thong dang tap hop thong tin lo, ban do va lich su su kien.',
              ),
            ),
            error: (error, _) => Center(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: _StatePanel(
                  icon: Icons.error_outline_rounded,
                  title: 'Khong tai duoc thong tin',
                  message: '$error',
                ),
              ),
            ),
            data: (trace) => RefreshIndicator(
              onRefresh: () =>
                  ref.refresh(fullTraceProvider(widget.productId).future),
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(18, 14, 18, 28),
                children: [
                  _buildHero(
                    context,
                    product: trace.product,
                    shortDateFormat: shortDateFormat,
                  ),
                  const SizedBox(height: 18),
                  _buildMetrics(trace),
                  if (trace.product.farmingArea != null) ...[
                    const SizedBox(height: 18),
                    _SectionPanel(
                      icon: Icons.landscape_rounded,
                      title: 'Vung canh tac',
                      subtitle:
                          'Noi san xuat, chu so huu va vi tri tren ban do',
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              _InfoChip(
                                icon: Icons.place_outlined,
                                label: trace.product.farmingArea!.name,
                              ),
                              if (trace.product.farmingArea!.areaSize != null)
                                _InfoChip(
                                  icon: Icons.square_foot_outlined,
                                  label:
                                      '${trace.product.farmingArea!.areaSize} ha',
                                  tone: const Color(0xFFF6F1FF),
                                  textColor: const Color(0xFF6A48C6),
                                ),
                              if (trace.product.farmingArea!.owner != null &&
                                  trace
                                      .product
                                      .farmingArea!
                                      .owner!
                                      .fullName
                                      .isNotEmpty)
                                _InfoChip(
                                  icon: Icons.person_outline_rounded,
                                  label: trace
                                      .product
                                      .farmingArea!
                                      .owner!
                                      .fullName,
                                  tone: const Color(0xFFEAFBF3),
                                  textColor: const Color(0xFF166534),
                                ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Text(
                            trace.product.farmingArea!.address,
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                          const SizedBox(height: 16),
                          FarmingAreaMapCard(
                            farmingArea: trace.product.farmingArea!,
                            height: 260,
                          ),
                        ],
                      ),
                    ),
                  ],
                  if (trace.product.farmingArea?.certifications.isNotEmpty ==
                      true) ...[
                    const SizedBox(height: 18),
                    _SectionPanel(
                      icon: Icons.workspace_premium_outlined,
                      title: 'Chung nhan chat luong',
                      subtitle: 'Danh sach chung nhan dang gan voi vung trong',
                      child: Wrap(
                        spacing: 10,
                        runSpacing: 10,
                        children: trace.product.farmingArea!.certifications
                            .map(
                              (certification) => _CertificationTile(
                                title: certification.type,
                                subtitle: certification.name,
                                valid: certification.isValid,
                              ),
                            )
                            .toList(),
                      ),
                    ),
                  ],
                  if (trace.onChain != null) ...[
                    const SizedBox(height: 18),
                    _SectionPanel(
                      icon: Icons.link_rounded,
                      title: 'Lien ket blockchain',
                      subtitle: 'Trang thai neo du lieu va dau vet ghi nhan',
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _InfoChip(
                            icon: Icons.account_balance_wallet_outlined,
                            label: _shortHash(trace.onChain!.owner),
                            tone: const Color(0xFFE8F0FF),
                            textColor: AppColors.pine,
                          ),
                          const SizedBox(height: 12),
                          Text(
                            '${trace.onChain!.actionCount} su kien da duoc ghi len blockchain.',
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 18),
                  _SectionPanel(
                    icon: Icons.timeline_rounded,
                    title: 'Lich su truy xuat',
                    subtitle: 'Cham vao tung node de mo chi tiet va xac minh',
                    child: trace.events.isEmpty
                        ? const _StatePanel(
                            icon: Icons.history_toggle_off_rounded,
                            title: 'Chua co su kien nao',
                            message:
                                'Timeline se hien o day khi co su kien duoc ghi nhan.',
                            compact: true,
                          )
                        : Column(
                            children: List.generate(trace.events.length, (
                              index,
                            ) {
                              final event = trace.events[index];
                              return TraceTimelineItem(
                                event: event,
                                dateText: dateTimeFormat.format(
                                  event.createdAt,
                                ),
                                isLast: index == trace.events.length - 1,
                                onVerify: event.onChainStatus == 'confirmed'
                                    ? () => _verifyEvent(event.id)
                                    : null,
                                verifying: _verifyingEventId == event.id,
                                verifyResult: _verifyResults[event.id],
                              );
                            }),
                          ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHero(
    BuildContext context, {
    required Product product,
    required DateFormat shortDateFormat,
  }) {
    final image = product.images.isNotEmpty ? product.images.first : null;

    return GlassPanel(
      radius: 32,
      padding: EdgeInsets.zero,
      colors: [
        Colors.white.withValues(alpha: 0.34),
        Colors.white.withValues(alpha: 0.10),
      ],
      child: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF18305A), Color(0xFF3157B5), Color(0xFF63B9FF)],
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(18, 18, 18, 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  _ActionCapsule(
                    icon: Icons.arrow_back_rounded,
                    onTap: () => Navigator.of(context).pop(),
                  ),
                  const Spacer(),
                  _ActionCapsule(
                    icon: Icons.share_rounded,
                    onTap: () => _shareProduct(product),
                  ),
                  const SizedBox(width: 8),
                  _ActionCapsule(
                    icon: Icons.qr_code_rounded,
                    onTap: () =>
                        _showQRDialog(context, product.batchId, product.name),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(28),
                    child: image != null
                        ? Image.network(
                            image,
                            width: 110,
                            height: 110,
                            fit: BoxFit.cover,
                            errorBuilder: (_, _, _) => _heroPlaceholder(),
                          )
                        : _heroPlaceholder(),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            _HeroPill(label: product.typeLabel),
                            _HeroPill(label: product.category),
                            _HeroPill(label: product.statusLabel),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Text(
                          product.name,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 25,
                            fontWeight: FontWeight.w800,
                            height: 1.14,
                          ),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          product.origin,
                          style: const TextStyle(
                            color: Color(0xD9FFFFFF),
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        if (product.description != null &&
                            product.description!.isNotEmpty) ...[
                          const SizedBox(height: 8),
                          Text(
                            product.description!,
                            maxLines: 3,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Color(0xCFFFFFFF),
                              fontSize: 13,
                              height: 1.55,
                            ),
                          ),
                        ],
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            _HeroPill(
                              label: 'Ma lo ${_shortHash(product.batchId)}',
                            ),
                            if (product.createdAt != null)
                              _HeroPill(
                                label:
                                    'Ngay tao ${shortDateFormat.format(product.createdAt!)}',
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              InkWell(
                onTap: () {
                  Clipboard.setData(ClipboardData(text: product.batchId));
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Da sao chep ma truy xuat')),
                  );
                },
                borderRadius: BorderRadius.circular(20),
                child: Ink(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.12),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Ma truy xuat',
                        style: TextStyle(
                          color: Color(0xCCFFFFFF),
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        product.batchId,
                        style: const TextStyle(
                          color: Colors.white,
                          fontFamily: 'monospace',
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMetrics(FullTrace trace) {
    final confirmed = trace.events
        .where((event) => event.onChainStatus == 'confirmed')
        .length;

    return Row(
      children: [
        Expanded(
          child: _MetricTile(
            label: 'Su kien',
            value: '${trace.events.length}',
            icon: Icons.timeline_rounded,
            tone: const Color(0xFFE8F0FF),
            color: AppColors.pine,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _MetricTile(
            label: 'Da len chain',
            value: '$confirmed',
            icon: Icons.verified_rounded,
            tone: const Color(0xFFEAFBF3),
            color: const Color(0xFF166534),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _MetricTile(
            label: 'Trang thai',
            value: trace.product.statusLabel,
            icon: Icons.eco_outlined,
            tone: const Color(0xFFF6F1FF),
            color: const Color(0xFF6A48C6),
          ),
        ),
      ],
    );
  }

  Widget _heroPlaceholder() => Container(
    width: 110,
    height: 110,
    decoration: BoxDecoration(
      color: Colors.white.withValues(alpha: 0.12),
      borderRadius: BorderRadius.circular(28),
    ),
    child: const Icon(Icons.eco_rounded, color: Colors.white70, size: 42),
  );

  void _shareProduct(Product product) {
    final text =
        '''
Truy xuat nong san

San pham: ${product.name}
Ma lo: ${product.batchId}
Xuat xu: ${product.origin}
Danh muc: ${product.category}
''';

    Share.share(text, subject: 'Truy xuat ${product.name}');
  }

  void _showQRDialog(BuildContext context, String batchId, String productName) {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(productName),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            QrImageView(
              data: batchId,
              version: QrVersions.auto,
              size: 210,
              backgroundColor: Colors.white,
            ),
            const SizedBox(height: 16),
            SelectableText(
              batchId,
              textAlign: TextAlign.center,
              style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('Dong'),
          ),
        ],
      ),
    );
  }

  static String _shortHash(String value) {
    if (value.length <= 18) {
      return value;
    }
    return '${value.substring(0, 8)}...${value.substring(value.length - 6)}';
  }
}

class _SectionPanel extends StatelessWidget {
  const _SectionPanel({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.child,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return GlassPanel(
      radius: 30,
      padding: const EdgeInsets.all(18),
      colors: [
        Colors.white.withValues(alpha: 0.42),
        Colors.white.withValues(alpha: 0.18),
      ],
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.46),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Icon(icon, color: AppColors.pine),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}

class _MetricTile extends StatelessWidget {
  const _MetricTile({
    required this.label,
    required this.value,
    required this.icon,
    required this.tone,
    required this.color,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color tone;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return GlassPanel(
      radius: 24,
      padding: const EdgeInsets.all(16),
      colors: [
        Colors.white.withValues(alpha: 0.40),
        Colors.white.withValues(alpha: 0.18),
      ],
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: tone,
          borderRadius: BorderRadius.circular(22),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 18, color: color),
            const SizedBox(height: 12),
            Text(
              value,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: color,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                color: color.withValues(alpha: 0.78),
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  const _InfoChip({
    required this.icon,
    required this.label,
    this.tone = const Color(0xFFF4F7FF),
    this.textColor = AppColors.ink,
  });

  final IconData icon;
  final String label;
  final Color tone;
  final Color textColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
      decoration: BoxDecoration(
        color: tone,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 15, color: textColor),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: textColor,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CertificationTile extends StatelessWidget {
  const _CertificationTile({
    required this.title,
    required this.subtitle,
    required this.valid,
  });

  final String title;
  final String subtitle;
  final bool valid;

  @override
  Widget build(BuildContext context) {
    final tone = valid ? const Color(0xFFEAFBF3) : const Color(0xFFFEE2E2);
    final color = valid ? const Color(0xFF166534) : const Color(0xFFB91C1C);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: tone,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            title,
            style: TextStyle(fontWeight: FontWeight.w800, color: color),
          ),
          const SizedBox(height: 2),
          Text(
            subtitle,
            style: TextStyle(
              fontSize: 12,
              color: color.withValues(alpha: 0.82),
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroPill extends StatelessWidget {
  const _HeroPill({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.white.withValues(alpha: 0.14)),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _ActionCapsule extends StatelessWidget {
  const _ActionCapsule({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Ink(
        width: 42,
        height: 42,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Icon(icon, color: Colors.white),
      ),
    );
  }
}

class _StatePanel extends StatelessWidget {
  const _StatePanel({
    required this.icon,
    required this.title,
    required this.message,
    this.compact = false,
  });

  final IconData icon;
  final String title;
  final String message;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final content = Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 40, color: AppColors.pine),
        const SizedBox(height: 12),
        Text(
          title,
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 6),
        Text(
          message,
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.bodyMedium,
        ),
      ],
    );

    if (compact) {
      return content;
    }

    return GlassPanel(
      radius: 30,
      padding: const EdgeInsets.all(22),
      child: content,
    );
  }
}
