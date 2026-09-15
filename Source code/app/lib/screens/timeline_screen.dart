import 'dart:math' as math;

import 'package:app/core/router.dart';
import 'package:app/core/theme.dart';
<<<<<<< HEAD
import 'package:app/models/batch.dart';
import 'package:app/providers/providers.dart';
import 'package:app/services/batch_service.dart';
import 'package:app/widgets/blockchain_badge.dart';
import 'package:app/widgets/live_camera_section.dart';
import 'package:app/widgets/liquid_glass.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:video_player/video_player.dart';
=======
import 'package:app/widgets/liquid_glass.dart';
import 'package:flutter/material.dart';
>>>>>>> dan/main

class TimelineScreen extends StatefulWidget {
  const TimelineScreen({super.key, this.initialBatchId});

  final String? initialBatchId;

  @override
  State<TimelineScreen> createState() => _TimelineScreenState();
}

class _TimelineScreenState extends State<TimelineScreen> {
  final TextEditingController _manualBatchIdController =
      TextEditingController();
  String? _errorText;

  @override
  void initState() {
    super.initState();
    final initialBatchId = widget.initialBatchId?.trim();
    if (initialBatchId != null && initialBatchId.isNotEmpty) {
      _manualBatchIdController.text = initialBatchId;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          _openTrace(initialBatchId);
        }
      });
    }
  }

  @override
  void dispose() {
    _manualBatchIdController.dispose();
    super.dispose();
  }

  void _submit() {
    final value = _manualBatchIdController.text.trim();
    if (value.isEmpty) {
      setState(() => _errorText = 'Vui long nhap ma lo hoac quet QR.');
      return;
    }

    setState(() => _errorText = null);
    _openTrace(value);
  }

  void _openTrace(String productId) {
    Navigator.pushReplacementNamed(
      context,
      '${AppRouter.trace}?productId=$productId',
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Tra cuu truy xuat')),
      body: GlassPageBackground(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
          children: [
            GlassPanel(
              padding: const EdgeInsets.all(0),
              colors: [
                Colors.white.withValues(alpha: 0.66),
                const Color(0xBDE4F2D8),
              ],
<<<<<<< HEAD
              child: ClipRRect(
                borderRadius: BorderRadius.circular(28),
                child: Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [Color(0xFF2A7F45), Color(0xFF5AA265)],
                    ),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(22),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Thông tin truy xuất lô nông sản',
                          style: TextStyle(
                            color: Color(0xFFEAF8EE),
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          'Nhập mã lô hoặc quét QR để xem lịch sử cập nhật.',
                          style: Theme.of(context).textTheme.headlineSmall
                              ?.copyWith(fontSize: 24, color: Colors.white),
                        ),
                        const SizedBox(height: 10),
                        const Text(
                          'Hiển thị đầy đủ thông tin lô, các công đoạn canh tác và minh chứng xác nhận nếu có.',
                          style: TextStyle(
                            color: Color(0xFFEFF8F0),
                            height: 1.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
=======
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Thong tin truy xuat lo nong san',
                    style: TextStyle(
                      color: AppColors.muted,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Nhap ma lo hoac quet QR de mo timeline moi.',
                    style: Theme.of(
                      context,
                    ).textTheme.headlineSmall?.copyWith(fontSize: 24),
                  ),
                  const SizedBox(height: 10),
                  const Text(
                    'Man hinh chi tiet se hien theo dang timeline doc gon, co node va cham de mo rong tung su kien.',
                  ),
                ],
>>>>>>> dan/main
              ),
            ),
            const SizedBox(height: 16),
            GlassPanel(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Tim lo nong san',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    controller: _manualBatchIdController,
                    decoration: InputDecoration(
                      labelText: 'Ma lo',
                      hintText: 'Nhap ma lo hoac ma doc tu QR',
                      prefixIcon: const Icon(Icons.search_rounded),
                      errorText: _errorText,
                    ),
                    onSubmitted: (_) => _submit(),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: FilledButton.icon(
                          onPressed: _submit,
                          icon: const Icon(Icons.timeline_rounded),
                          label: const Text('Xem truy xuat'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () =>
                              Navigator.pushNamed(context, AppRouter.scanner),
                          icon: const Icon(Icons.qr_code_scanner_rounded),
                          label: const Text('Quet QR'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            GlassPanel(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Neu chua tai duoc du lieu',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 12),
                  const _HintLine(
                    icon: Icons.wifi_tethering_rounded,
                    text: 'Kiem tra backend Node dang chay o cong 5000.',
                  ),
                  const SizedBox(height: 10),
                  const _HintLine(
                    icon: Icons.phone_android_rounded,
                    text:
                        'Neu dung dien thoai that, hay build voi --dart-define=API_BASE_URL=http://IP_MAY_TINH:5000/api/v1.',
                  ),
                  const SizedBox(height: 10),
                  const _HintLine(
                    icon: Icons.adb_rounded,
                    text:
                        'Neu dung Android emulator, 10.0.2.2 se tro ve may tinh cua ban.',
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

<<<<<<< HEAD
class _TimelineView extends StatefulWidget {
  const _TimelineView({required this.batch});
=======
class _HintLine extends StatelessWidget {
  const _HintLine({required this.icon, required this.text});
>>>>>>> dan/main

  final IconData icon;
  final String text;

  @override
  State<_TimelineView> createState() => _TimelineViewState();
}

class _TimelineViewState extends State<_TimelineView> {
  String? _selectedEventId;
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  String _selectedTypeFilter = 'ALL';
  String _selectedStatusFilter = 'ALL';
  final Map<String, BatchEvent> _eventOverrides = {};

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
<<<<<<< HEAD
    final allEvents =
        widget.batch.events
            .map((event) => _eventOverrides[event.id] ?? event)
            .toList()
          ..sort((a, b) => a.createdAt.compareTo(b.createdAt));
    final confirmedCount = allEvents
        .where((event) => event.onChainStatus == 'confirmed')
        .length;

    final availableTypes =
        allEvents.map((event) => event.actionType).toSet().toList()..sort();

    final events = allEvents.where((event) {
      final matchesType =
          _selectedTypeFilter == 'ALL' ||
          event.actionType == _selectedTypeFilter;
      final matchesStatus =
          _selectedStatusFilter == 'ALL' ||
          event.onChainStatus == _selectedStatusFilter;

      if (!matchesType || !matchesStatus) return false;
      if (_searchQuery.trim().isEmpty) return true;

      final q = _searchQuery.trim().toLowerCase();
      final detailsText = event.details.entries
          .map((entry) => '${entry.key} ${entry.value}')
          .join(' ')
          .toLowerCase();

      final textBlob = [
        _labelForAction(event.actionType),
        event.note,
        detailsText,
        event.actor ?? '',
      ].join(' ').toLowerCase();

      return textBlob.contains(q);
    }).toList();

    BatchEvent? selectedEvent;
    for (final item in events) {
      if (item.id == _selectedEventId) {
        selectedEvent = item;
        break;
      }
    }
    selectedEvent ??= events.isNotEmpty ? events.last : null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        GlassPanel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const GlassIconCapsule(
                    icon: Icons.inventory_2_rounded,
                    size: 56,
                    color: AppColors.pine,
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.batch.productName,
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        const SizedBox(height: 4),
                        Text('Mã lô: ${widget.batch.batchId}'),
                        if (widget.batch.origin.isNotEmpty) ...[
                          const SizedBox(height: 2),
                          Text('Xuất xứ: ${widget.batch.origin}'),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
              if (widget.batch.description.isNotEmpty) ...[
                const SizedBox(height: 16),
                Text(widget.batch.description),
              ],
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _SummaryStat(
                      value: '${events.length}',
                      label: 'Tổng sự kiện',
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _SummaryStat(
                      value: '$confirmedCount',
                      label: 'Đã xác nhận',
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 18),
        LiveCameraSection(cameras: widget.batch.liveCameras),
        Text('Dòng thời gian', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 8),
        const Text(
          'Dạng mốc công đoạn: mỗi mốc hiển thị icon + thời gian. Chạm vào mốc để xem đầy đủ thông tin.',
        ),
        const SizedBox(height: 14),
        GlassPanel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextField(
                controller: _searchController,
                onChanged: (value) {
                  setState(() => _searchQuery = value);
                },
                decoration: const InputDecoration(
                  labelText: 'Tìm kiếm nhật ký',
                  hintText:
                      'Theo công đoạn, ghi chú, người thực hiện, chi tiết...',
                  prefixIcon: Icon(Icons.search_rounded),
                ),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      initialValue: _selectedTypeFilter,
                      decoration: const InputDecoration(
                        labelText: 'Phân loại công đoạn',
                        prefixIcon: Icon(Icons.category_rounded),
                      ),
                      items: [
                        const DropdownMenuItem(
                          value: 'ALL',
                          child: Text('Tất cả công đoạn'),
                        ),
                        ...availableTypes.map(
                          (type) => DropdownMenuItem(
                            value: type,
                            child: Text(_labelForAction(type)),
                          ),
                        ),
                      ],
                      onChanged: (value) {
                        if (value == null) return;
                        setState(() => _selectedTypeFilter = value);
                      },
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      initialValue: _selectedStatusFilter,
                      decoration: const InputDecoration(
                        labelText: 'Trạng thái',
                        prefixIcon: Icon(Icons.verified_rounded),
                      ),
                      items: const [
                        DropdownMenuItem(
                          value: 'ALL',
                          child: Text('Tất cả trạng thái'),
                        ),
                        DropdownMenuItem(
                          value: 'confirmed',
                          child: Text('Đã xác nhận'),
                        ),
                        DropdownMenuItem(
                          value: 'pending',
                          child: Text('Đang chờ'),
                        ),
                        DropdownMenuItem(
                          value: 'failed',
                          child: Text('Thất bại'),
                        ),
                        DropdownMenuItem(
                          value: 'skipped',
                          child: Text('Bỏ qua blockchain'),
                        ),
                      ],
                      onChanged: (value) {
                        if (value == null) return;
                        setState(() => _selectedStatusFilter = value);
                      },
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        if (events.isEmpty)
          const GlassPanel(
            child: Text(
              'Không có nhật ký phù hợp với bộ lọc/từ khóa hiện tại.',
            ),
          )
        else ...[
          _InteractiveProcessTimeline(
            events: events,
            selectedEventId: selectedEvent?.id,
            onSelect: (event) {
              setState(() => _selectedEventId = event.id);
            },
          ),
          const SizedBox(height: 14),
          if (selectedEvent != null)
            _SelectedTimelineEventDetail(
              key: ValueKey(selectedEvent.id),
              event: selectedEvent,
              onRetry: () async {
                final messenger = ScaffoldMessenger.of(context);
                final updated = await BatchService().retryBlockchainEvent(
                  selectedEvent!.id,
                );
                if (!mounted) return;
                setState(() => _eventOverrides[updated.id] = updated);
                messenger.showSnackBar(
                  const SnackBar(
                    content: Text('Đã ghi lại sự kiện lên blockchain.'),
                  ),
                );
              },
            ),
        ],
      ],
    );
  }
}

class _InteractiveProcessTimeline extends StatefulWidget {
  const _InteractiveProcessTimeline({
    required this.events,
    required this.selectedEventId,
    required this.onSelect,
  });

  final List<BatchEvent> events;
  final String? selectedEventId;
  final ValueChanged<BatchEvent> onSelect;

  @override
  State<_InteractiveProcessTimeline> createState() =>
      _InteractiveProcessTimelineState();
}

class _InteractiveProcessTimelineState
    extends State<_InteractiveProcessTimeline> {
  final ScrollController _horizontalController = ScrollController();

  @override
  void dispose() {
    _horizontalController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const itemWidth = 124.0;
    const edgeInset = 20.0;
    final baseTimelineWidth = widget.events.length * itemWidth + edgeInset * 2;

    return GlassPanel(
      padding: const EdgeInsets.fromLTRB(10, 20, 10, 14),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final timelineWidth = math.max(
            constraints.maxWidth,
            baseTimelineWidth,
          );
          final hasHorizontalOverflow =
              timelineWidth - constraints.maxWidth > 0.5;

          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SingleChildScrollView(
                controller: _horizontalController,
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                child: SizedBox(
                  width: timelineWidth,
                  height: 214,
                  child: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      Positioned(
                        left: edgeInset + itemWidth / 2,
                        right: edgeInset + itemWidth / 2,
                        top: 106,
                        child: Container(
                          height: 5,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(999),
                            gradient: LinearGradient(
                              colors: [
                                AppColors.pine.withValues(alpha: 0.35),
                                AppColors.leaf.withValues(alpha: 0.6),
                                AppColors.pine.withValues(alpha: 0.35),
                              ],
                            ),
                          ),
                        ),
                      ),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SizedBox(width: edgeInset),
                          ...widget.events.asMap().entries.map((entry) {
                            final index = entry.key;
                            final event = entry.value;

                            return SizedBox(
                              width: itemWidth,
                              child: _TimelineMilestoneNode(
                                event: event,
                                isSelected: widget.selectedEventId == event.id,
                                showLabelAbove: index.isEven,
                                onTap: () => widget.onSelect(event),
                              ),
                            );
                          }),
                          const SizedBox(width: edgeInset),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              if (hasHorizontalOverflow) ...[
                const SizedBox(height: 10),
                AnimatedBuilder(
                  animation: _horizontalController,
                  builder: (context, _) {
                    final hasClients = _horizontalController.hasClients;
                    final position = hasClients
                        ? _horizontalController.position
                        : null;
                    final hasScrollMetrics =
                        position != null &&
                        position.hasPixels &&
                        position.hasContentDimensions;
                    final maxExtent = hasScrollMetrics
                        ? position.maxScrollExtent
                        : 0.0;
                    final currentOffset = hasScrollMetrics
                        ? position.pixels.clamp(0.0, maxExtent).toDouble()
                        : 0.0;

                    return SliderTheme(
                      data: SliderTheme.of(context).copyWith(
                        trackHeight: 6,
                        thumbShape: const RoundSliderThumbShape(
                          enabledThumbRadius: 8,
                        ),
                        overlayShape: const RoundSliderOverlayShape(
                          overlayRadius: 14,
                        ),
                        activeTrackColor: AppColors.pine.withValues(
                          alpha: 0.72,
                        ),
                        inactiveTrackColor: AppColors.pine.withValues(
                          alpha: 0.2,
                        ),
                        thumbColor: AppColors.pine,
                      ),
                      child: Slider(
                        value: currentOffset,
                        min: 0,
                        max: maxExtent <= 0 ? 1 : maxExtent,
                        onChanged: !hasScrollMetrics || maxExtent <= 0
                            ? null
                            : (value) {
                                _horizontalController.jumpTo(value);
                              },
                      ),
                    );
                  },
                ),
                const Text(
                  'Vuốt ngang hoặc kéo thanh trượt bên dưới để xem toàn bộ các mốc.',
                  style: TextStyle(
                    color: AppColors.muted,
                    fontWeight: FontWeight.w600,
                    fontSize: 12,
                  ),
                ),
              ],
            ],
          );
        },
      ),
    );
  }
}

class _TimelineMilestoneNode extends StatelessWidget {
  const _TimelineMilestoneNode({
    required this.event,
    required this.isSelected,
    required this.showLabelAbove,
    required this.onTap,
  });

  final BatchEvent event;
  final bool isSelected;
  final bool showLabelAbove;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final accentColor = _actionColor(event.actionType);
    final displayTime = DateFormat('HH:mm • dd/MM').format(event.createdAt);

    return Stack(
      children: [
        Positioned(
          top: showLabelAbove ? 6 : null,
          bottom: showLabelAbove ? null : 8,
          left: 8,
          right: 8,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 220),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: isSelected ? 0.5 : 0.3),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: isSelected
                    ? accentColor.withValues(alpha: 0.9)
                    : Colors.white.withValues(alpha: 0.68),
                width: isSelected ? 1.4 : 1,
              ),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  _labelForAction(event.actionType),
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: AppColors.ink,
                    fontWeight: isSelected ? FontWeight.w800 : FontWeight.w700,
                    fontSize: 12,
                    height: 1.25,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  displayTime,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: AppColors.muted.withValues(alpha: 0.95),
                    fontWeight: FontWeight.w600,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
        ),
        Positioned(
          top: showLabelAbove ? 86 : 110,
          left: 0,
          right: 0,
          child: Center(
            child: Container(
              width: 2,
              height: 20,
              color: accentColor.withValues(alpha: 0.35),
            ),
          ),
        ),
        Positioned(
          top: 90,
          left: 0,
          right: 0,
          child: Center(
            child: InkWell(
              onTap: onTap,
              borderRadius: BorderRadius.circular(999),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 240),
                width: isSelected ? 44 : 38,
                height: isSelected ? 44 : 38,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white,
                  border: Border.all(
                    color: isSelected
                        ? accentColor
                        : _statusColor(event.onChainStatus),
                    width: isSelected ? 3 : 2,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: accentColor.withValues(alpha: 0.26),
                      blurRadius: isSelected ? 18 : 12,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Icon(
                  _iconForAction(event.actionType),
                  size: isSelected ? 22 : 19,
                  color: accentColor,
                ),
              ),
            ),
=======
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        GlassIconCapsule(icon: icon, size: 40, color: AppColors.pine),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(color: AppColors.ink, height: 1.5),
>>>>>>> dan/main
          ),
        ),
      ],
    );
  }
<<<<<<< HEAD
}

class _SelectedTimelineEventDetail extends StatefulWidget {
  const _SelectedTimelineEventDetail({
    super.key,
    required this.event,
    required this.onRetry,
  });

  final BatchEvent event;
  final Future<void> Function() onRetry;

  @override
  State<_SelectedTimelineEventDetail> createState() =>
      _SelectedTimelineEventDetailState();
}

class _SelectedTimelineEventDetailState
    extends State<_SelectedTimelineEventDetail> {
  bool _retrying = false;

  @override
  Widget build(BuildContext context) {
    final event = widget.event;
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 240),
      switchInCurve: Curves.easeOut,
      switchOutCurve: Curves.easeIn,
      child: GlassPanel(
        key: ValueKey(event.id),
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
                    shape: BoxShape.circle,
                    color: _actionColor(
                      event.actionType,
                    ).withValues(alpha: 0.16),
                    border: Border.all(
                      color: _actionColor(
                        event.actionType,
                      ).withValues(alpha: 0.45),
                    ),
                  ),
                  child: Icon(
                    _iconForAction(event.actionType),
                    color: _actionColor(event.actionType),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _labelForAction(event.actionType),
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 17,
                          color: AppColors.ink,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        DateFormat(
                          'dd/MM/yyyy - HH:mm',
                        ).format(event.createdAt),
                        style: const TextStyle(
                          color: AppColors.muted,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                BlockchainBadge(
                  status: event.onChainStatus,
                  txHash: event.transactionHash,
                ),
              ],
            ),
            if (event.note.isNotEmpty) ...[
              const SizedBox(height: 14),
              Text(
                event.note,
                style: const TextStyle(color: AppColors.ink, height: 1.5),
              ),
            ],
            if (event.details.isNotEmpty) ...[
              const SizedBox(height: 14),
              const Text(
                'Chi tiết công đoạn',
                style: TextStyle(
                  color: AppColors.ink,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 8),
              ...event.details.entries
                  .where((entry) => entry.value.toString().trim().isNotEmpty)
                  .map(
                    (entry) => _DataLine(
                      label: _detailLabel(entry.key),
                      value: entry.value.toString(),
                    ),
                  ),
            ],
            if (event.imageUrls.isNotEmpty) ...[
              const SizedBox(height: 14),
              SizedBox(
                height: 90,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: event.imageUrls.length,
                  separatorBuilder: (context, index) =>
                      const SizedBox(width: 10),
                  itemBuilder: (context, index) {
                    return ClipRRect(
                      borderRadius: BorderRadius.circular(20),
                      child: Image.network(
                        event.imageUrls[index],
                        width: 90,
                        height: 90,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) => Container(
                          width: 90,
                          height: 90,
                          color: Colors.white.withValues(alpha: 0.22),
                          child: const Icon(
                            Icons.broken_image_outlined,
                            color: AppColors.muted,
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
            if (event.videoUrls.isNotEmpty) ...[
              const SizedBox(height: 14),
              const Text(
                'Video minh chứng',
                style: TextStyle(
                  color: AppColors.ink,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                height: 94,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: event.videoUrls.length,
                  separatorBuilder: (context, index) =>
                      const SizedBox(width: 10),
                  itemBuilder: (context, index) {
                    final videoUrl = event.videoUrls[index];

                    return _VideoPreviewChip(
                      videoUrl: videoUrl,
                      onTap: () {
                        showDialog<void>(
                          context: context,
                          barrierDismissible: true,
                          useSafeArea: true,
                          builder: (_) =>
                              _VideoPlayerDialog(videoUrl: videoUrl),
                        );
                      },
                    );
                  },
                ),
              ),
            ],
            if (event.onChainStatus == 'failed' ||
                event.onChainStatus == 'skipped') ...[
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: _retrying
                      ? null
                      : () async {
                          final messenger = ScaffoldMessenger.of(context);
                          try {
                            setState(() => _retrying = true);
                            await widget.onRetry();
                          } catch (error) {
                            if (!mounted) return;
                            messenger.showSnackBar(
                              SnackBar(
                                content: Text('Ghi lại thất bại: $error'),
                              ),
                            );
                          } finally {
                            if (mounted) setState(() => _retrying = false);
                          }
                        },
                  icon: const Icon(Icons.sync_rounded),
                  label: Text(
                    _retrying ? 'Đang ghi lại...' : 'Ghi lại lên blockchain',
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

Color _statusColor(String status) {
  switch (status) {
    case 'confirmed':
      return AppColors.pine;
    case 'failed':
      return AppColors.danger;
    default:
      return const Color(0xFFC9871B);
  }
}

Color _actionColor(String actionType) {
  switch (actionType) {
    case 'SEEDING':
      return const Color(0xFFC9871B);
    case 'FERTILIZING':
      return const Color(0xFF4C8E4A);
    case 'WATERING':
      return const Color(0xFF2D94CB);
    case 'PEST_CONTROL':
      return const Color(0xFF8B5ED8);
    case 'HARVESTING':
      return const Color(0xFFC2673A);
    case 'PACKAGING':
      return const Color(0xFF6A6EE5);
    case 'SHIPPING':
      return const Color(0xFF366DCE);
    case 'STATUS_UPDATE':
      return AppColors.pine;
    default:
      return AppColors.pine;
  }
}

IconData _iconForAction(String actionType) {
  switch (actionType) {
    case 'SEEDING':
      return Icons.grass_rounded;
    case 'FERTILIZING':
      return Icons.science_rounded;
    case 'WATERING':
      return Icons.water_drop_rounded;
    case 'PEST_CONTROL':
      return Icons.bug_report_rounded;
    case 'HARVESTING':
      return Icons.agriculture_rounded;
    case 'PACKAGING':
      return Icons.inventory_2_rounded;
    case 'SHIPPING':
      return Icons.local_shipping_rounded;
    case 'STATUS_UPDATE':
      return Icons.flag_circle_rounded;
    default:
      return Icons.timeline_rounded;
  }
}

String _labelForAction(String actionType) {
  switch (actionType) {
    case 'SEEDING':
      return 'Gieo hạt';
    case 'FERTILIZING':
      return 'Bón phân';
    case 'WATERING':
      return 'Tưới nước';
    case 'PEST_CONTROL':
      return 'Chăm sóc / Kiểm soát sâu bệnh';
    case 'HARVESTING':
      return 'Thu hoạch';
    case 'PACKAGING':
      return 'Đóng gói';
    case 'SHIPPING':
      return 'Vận chuyển';
    case 'STATUS_UPDATE':
      return 'Chuyển trạng thái';
    default:
      return actionType;
  }
}

String _detailLabel(String key) {
  const labels = {
    'seedType': 'Loại giống',
    'seedAmount': 'Lượng giống',
    'seedUnit': 'Đơn vị giống',
    'fertilizerType': 'Loại phân',
    'dosage': 'Lưu lượng / liều lượng',
    'dosageUnit': 'Đơn vị liều lượng',
    'method': 'Phương pháp',
    'waterVolume': 'Lượng nước',
    'waterUnit': 'Đơn vị nước',
    'wateringMethod': 'Phương pháp tưới',
    'pestName': 'Đối tượng sâu bệnh',
    'treatment': 'Biện pháp xử lý',
    'yield': 'Sản lượng',
    'yieldUnit': 'Đơn vị sản lượng',
    'qualityGrade': 'Phân hạng chất lượng',
    'packageType': 'Quy cách đóng gói',
    'packageCount': 'Số lượng kiện',
    'vehicle': 'Phương tiện vận chuyển',
    'destination': 'Điểm đến',
    'distanceKm': 'Quãng đường (km)',
  };

  return labels[key] ?? key;
}

class _VideoPreviewChip extends StatelessWidget {
  const _VideoPreviewChip({required this.videoUrl, required this.onTap});

  final String videoUrl;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final fileName = _videoName(videoUrl);

    return InkWell(
      borderRadius: BorderRadius.circular(20),
      onTap: onTap,
      child: GlassPanel(
        radius: 20,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        colors: [
          Colors.white.withValues(alpha: 0.34),
          Colors.white.withValues(alpha: 0.16),
        ],
        child: SizedBox(
          width: 200,
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.pine.withValues(alpha: 0.16),
                ),
                child: const Icon(
                  Icons.play_arrow_rounded,
                  color: AppColors.pine,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  fileName,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.ink,
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _videoName(String input) {
    final uri = Uri.tryParse(input);
    if (uri != null && uri.pathSegments.isNotEmpty) {
      return uri.pathSegments.last;
    }

    final parts = input.split('/');
    return parts.isNotEmpty ? parts.last : input;
  }
}

class _VideoPlayerDialog extends StatefulWidget {
  const _VideoPlayerDialog({required this.videoUrl});

  final String videoUrl;

  @override
  State<_VideoPlayerDialog> createState() => _VideoPlayerDialogState();
}

class _VideoPlayerDialogState extends State<_VideoPlayerDialog> {
  VideoPlayerController? _controller;
  String? _error;

  @override
  void initState() {
    super.initState();
    _initializePlayer();
  }

  Future<void> _initializePlayer() async {
    final controller = VideoPlayerController.networkUrl(
      Uri.parse(widget.videoUrl),
    );

    try {
      await controller.initialize();
      await controller.setLooping(true);
      if (!mounted) {
        controller.dispose();
        return;
      }
      setState(() => _controller = controller);
      await controller.play();
    } catch (_) {
      await controller.dispose();
      if (!mounted) return;
      setState(() {
        _error = 'Không thể phát video này.';
      });
    }
  }

  Future<void> _seekRelative(Duration delta) async {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) return;

    final duration = controller.value.duration;
    final current = controller.value.position;
    final target = current + delta;

    final clamped = target < Duration.zero
        ? Duration.zero
        : (target > duration ? duration : target);

    await controller.seekTo(clamped);
    if (mounted) {
      setState(() {});
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      insetPadding: const EdgeInsets.all(16),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 560),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  const Expanded(
                    child: Text(
                      'Video nhật ký',
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        color: AppColors.ink,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close_rounded),
                  ),
                ],
              ),
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 18),
                  child: Text(
                    _error!,
                    style: const TextStyle(color: AppColors.danger),
                  ),
                )
              else if (_controller == null)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 26),
                  child: CircularProgressIndicator(),
                )
              else
                Builder(
                  builder: (context) {
                    final controller = _controller!;

                    return Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(14),
                          child: AspectRatio(
                            aspectRatio: controller.value.aspectRatio == 0
                                ? 16 / 9
                                : controller.value.aspectRatio,
                            child: VideoPlayer(controller),
                          ),
                        ),
                        const SizedBox(height: 8),
                        VideoProgressIndicator(
                          controller,
                          allowScrubbing: true,
                          colors: VideoProgressColors(
                            playedColor: AppColors.pine,
                            backgroundColor: Colors.black.withValues(
                              alpha: 0.25,
                            ),
                            bufferedColor: AppColors.leaf.withValues(
                              alpha: 0.5,
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Wrap(
                          alignment: WrapAlignment.center,
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            _VideoActionChip(
                              icon: Icons.close_rounded,
                              label: 'Đóng',
                              onTap: () => Navigator.of(context).pop(),
                            ),
                            _VideoActionChip(
                              icon: Icons.replay_10_rounded,
                              label: '-10s',
                              onTap: () =>
                                  _seekRelative(const Duration(seconds: -10)),
                              filled: true,
                            ),
                            _VideoActionChip(
                              icon: controller.value.isPlaying
                                  ? Icons.pause_rounded
                                  : Icons.play_arrow_rounded,
                              label: controller.value.isPlaying
                                  ? 'Tạm dừng'
                                  : 'Phát',
                              onTap: () async {
                                if (controller.value.isPlaying) {
                                  await controller.pause();
                                } else {
                                  await controller.play();
                                }
                                if (mounted) {
                                  setState(() {});
                                }
                              },
                              filled: true,
                            ),
                            _VideoActionChip(
                              icon: Icons.forward_10_rounded,
                              label: '+10s',
                              onTap: () =>
                                  _seekRelative(const Duration(seconds: 10)),
                              filled: true,
                            ),
                          ],
                        ),
                      ],
                    );
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _VideoActionChip extends StatelessWidget {
  const _VideoActionChip({
    required this.icon,
    required this.label,
    required this.onTap,
    this.filled = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool filled;

  @override
  Widget build(BuildContext context) {
    final foreground = filled ? Colors.white : AppColors.ink;
    final background = filled
        ? AppColors.forest.withValues(alpha: 0.92)
        : Colors.white.withValues(alpha: 0.62);

    return Material(
      color: background,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 18, color: foreground),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  color: foreground,
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SummaryStat extends StatelessWidget {
  const _SummaryStat({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return GlassPanel(
      radius: 22,
      padding: const EdgeInsets.all(16),
      colors: [
        Colors.white.withValues(alpha: 0.34),
        Colors.white.withValues(alpha: 0.14),
      ],
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              color: AppColors.ink,
            ),
          ),
          const SizedBox(height: 4),
          Text(label),
        ],
      ),
    );
  }
}

class _DataLine extends StatelessWidget {
  const _DataLine({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: AppColors.muted,
              fontWeight: FontWeight.w700,
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 4),
          SelectableText(
            value,
            style: const TextStyle(
              fontSize: 12,
              fontFamily: 'monospace',
              color: AppColors.ink,
              height: 1.45,
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyTimelineState extends StatelessWidget {
  const _EmptyTimelineState();

  @override
  Widget build(BuildContext context) {
    return GlassPanel(
      child: Column(
        children: [
          const GlassIconCapsule(
            icon: Icons.qr_code_2_rounded,
            size: 66,
            color: AppColors.pine,
          ),
          const SizedBox(height: 16),
          Text(
            'Chưa có lô nào được chọn.',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          const Text(
            'Hãy quét QR hoặc nhập mã lô để xem toàn bộ thông tin truy xuất của lô nông sản.',
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _TimelineErrorState extends StatelessWidget {
  const _TimelineErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return GlassPanel(
      child: Column(
        children: [
          const GlassIconCapsule(
            icon: Icons.error_outline_rounded,
            size: 66,
            color: AppColors.danger,
          ),
          const SizedBox(height: 16),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(height: 1.5),
          ),
          const SizedBox(height: 16),
          FilledButton(onPressed: onRetry, child: const Text('Thử lại')),
        ],
      ),
    );
  }
=======
>>>>>>> dan/main
}
