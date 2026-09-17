import 'package:app/core/router.dart';
import 'package:app/core/theme.dart';
import 'package:app/models/batch.dart';
import 'package:app/providers/providers.dart';
import 'package:app/widgets/live_camera_section.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:video_player/video_player.dart';

class TimelineDashboardScreen extends ConsumerStatefulWidget {
  const TimelineDashboardScreen({super.key, this.initialBatchId});

  final String? initialBatchId;

  @override
  ConsumerState<TimelineDashboardScreen> createState() =>
      _TimelineDashboardScreenState();
}

class _TimelineDashboardScreenState
    extends ConsumerState<TimelineDashboardScreen> {
  final TextEditingController _batchController = TextEditingController();
  String? _activeBatchId;

  @override
  void initState() {
    super.initState();
    _activeBatchId = widget.initialBatchId;
    if (_activeBatchId != null && _activeBatchId!.isNotEmpty) {
      _batchController.text = _activeBatchId!;
    }
  }

  @override
  void dispose() {
    _batchController.dispose();
    super.dispose();
  }

  void _loadBatch() {
    final value = _batchController.text.trim();
    if (value.isEmpty) return;
    setState(() => _activeBatchId = value);
  }

  @override
  Widget build(BuildContext context) {
    final activeBatchId = _activeBatchId;

    return Scaffold(
      backgroundColor: const Color(0xFFF7FAF2),
      appBar: AppBar(
        title: const Text('Dòng thời gian truy xuất'),
        actions: [
          IconButton(
            onPressed: activeBatchId == null || activeBatchId.isEmpty
                ? null
                : () => ref.invalidate(batchTimelineProvider(activeBatchId)),
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: SafeArea(
        top: false,
        child: activeBatchId == null || activeBatchId.isEmpty
            ? _LookupEmptyState(
                controller: _batchController,
                onSubmit: _loadBatch,
              )
            : ref.watch(batchTimelineProvider(activeBatchId)).when(
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (error, _) => _DashboardErrorState(
                    message: 'Không tải được thông tin truy xuất.\n$error',
                    onRetry: () =>
                        ref.invalidate(batchTimelineProvider(activeBatchId)),
                  ),
                  data: (batch) => _TraceDashboard(
                    batch: batch,
                    controller: _batchController,
                    onSubmit: _loadBatch,
                  ),
                ),
      ),
    );
  }
}

class _TraceDashboard extends StatefulWidget {
  const _TraceDashboard({
    required this.batch,
    required this.controller,
    required this.onSubmit,
  });

  final Batch batch;
  final TextEditingController controller;
  final VoidCallback onSubmit;

  @override
  State<_TraceDashboard> createState() => _TraceDashboardState();
}

class _TraceDashboardState extends State<_TraceDashboard> {
  int _selectedTab = 1;
  String _query = '';
  String _typeFilter = 'ALL';
  String _statusFilter = 'ALL';
  String? _selectedEventId;

  @override
  Widget build(BuildContext context) {
    final allEvents = [...widget.batch.events]
      ..sort((a, b) => a.createdAt.compareTo(b.createdAt));
    final availableTypes =
        allEvents.map((event) => event.actionType).toSet().toList()..sort();
    final events = allEvents.where((event) {
      final matchesType = _typeFilter == 'ALL' || event.actionType == _typeFilter;
      final matchesStatus =
          _statusFilter == 'ALL' || event.onChainStatus == _statusFilter;
      final text = [
        _labelForAction(event.actionType),
        event.note,
        event.actor ?? '',
        event.details.entries.map((entry) => '${entry.key} ${entry.value}').join(' '),
      ].join(' ').toLowerCase();
      return matchesType &&
          matchesStatus &&
          (_query.trim().isEmpty || text.contains(_query.trim().toLowerCase()));
    }).toList();
    final selectedEvent = _selectedEvent(events);

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
      children: [
        _ProductHeaderCard(batch: widget.batch),
        const SizedBox(height: 14),
        _TraceTabs(
          selectedIndex: _selectedTab,
          onChanged: (value) => setState(() => _selectedTab = value),
        ),
        const SizedBox(height: 14),
        _FilterCard(
          controller: widget.controller,
          availableTypes: availableTypes,
          typeFilter: _typeFilter,
          statusFilter: _statusFilter,
          onQueryChanged: (value) => setState(() => _query = value),
          onTypeChanged: (value) => setState(() => _typeFilter = value),
          onStatusChanged: (value) => setState(() => _statusFilter = value),
          onSubmit: widget.onSubmit,
        ),
        const SizedBox(height: 14),
        if (_selectedTab == 0)
          _OverviewPanel(batch: widget.batch, events: allEvents)
        else if (_selectedTab == 2)
          LiveCameraSection(cameras: widget.batch.liveCameras)
        else if (_selectedTab == 3)
          _EvidencePanel(events: allEvents)
        else ...[
          _HorizontalTimeline(
            events: events,
            selectedEventId: selectedEvent?.id,
            onSelected: (event) => setState(() => _selectedEventId = event.id),
          ),
          const SizedBox(height: 14),
          if (selectedEvent != null) _EventDetailCard(event: selectedEvent),
          const SizedBox(height: 14),
          LiveCameraSection(cameras: widget.batch.liveCameras),
        ],
      ],
    );
  }

  BatchEvent? _selectedEvent(List<BatchEvent> events) {
    if (events.isEmpty) return null;
    for (final event in events) {
      if (event.id == _selectedEventId) return event;
    }
    return events.length >= 3 ? events[2] : events.last;
  }
}

class _ProductHeaderCard extends StatelessWidget {
  const _ProductHeaderCard({required this.batch});

  final Batch batch;

  @override
  Widget build(BuildContext context) {
    final batchCode = batch.batchCode.isNotEmpty ? batch.batchCode : batch.batchId;

    return _SoftCard(
      padding: const EdgeInsets.all(14),
      color: const Color(0xFFF0FAEF),
      borderColor: const Color(0xFFC6E4C4),
      child: Row(
        children: [
          _ProductImage(batch: batch),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  batch.productName.isEmpty ? 'Lô nông sản' : batch.productName,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.ink,
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                    height: 1.08,
                  ),
                ),
                const SizedBox(height: 10),
                _MetaLine(
                  icon: Icons.copy_rounded,
                  label: batchCode,
                ),
                const SizedBox(height: 12),
                const _StatusChip(label: 'Đã xác thực'),
              ],
            ),
          ),
          const SizedBox(width: 10),
          _QrPreview(batch: batch, data: batchCode),
        ],
      ),
    );
  }
}

class _ProductImage extends StatelessWidget {
  const _ProductImage({required this.batch});

  final Batch batch;

  @override
  Widget build(BuildContext context) {
    final url = batch.imageUrls.isNotEmpty ? batch.imageUrls.first : '';

    return ClipRRect(
      borderRadius: BorderRadius.circular(14),
      child: SizedBox(
        width: 126,
        height: 118,
        child: url.isEmpty
            ? const DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFFDFF4D4), Color(0xFFFFE7A8)],
                  ),
                ),
                child: Icon(Icons.spa_rounded, color: AppColors.pine, size: 46),
              )
            : Image.network(
                url,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => const DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Color(0xFFDFF4D4), Color(0xFFFFE7A8)],
                    ),
                  ),
                  child: Icon(
                    Icons.image_not_supported_outlined,
                    color: AppColors.pine,
                  ),
                ),
              ),
      ),
    );
  }
}

class _QrPreview extends StatelessWidget {
  const _QrPreview({required this.batch, required this.data});

  final Batch batch;
  final String data;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: Container(
            width: 82,
            height: 82,
            color: Colors.white,
            padding: const EdgeInsets.all(6),
            child: batch.qrCodeUrl.isNotEmpty
                ? Image.network(
                    batch.qrCodeUrl,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) =>
                        QrImageView(data: data, padding: EdgeInsets.zero),
                  )
                : QrImageView(data: data, padding: EdgeInsets.zero),
          ),
        ),
        const SizedBox(height: 8),
        SizedBox(
          width: 82,
          height: 38,
          child: FilledButton(
            onPressed: () {},
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.pine,
              padding: EdgeInsets.zero,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: const Text('Xem QR', style: TextStyle(fontSize: 12)),
          ),
        ),
      ],
    );
  }
}

class _TraceTabs extends StatelessWidget {
  const _TraceTabs({required this.selectedIndex, required this.onChanged});

  final int selectedIndex;
  final ValueChanged<int> onChanged;

  static const _tabs = [
    (Icons.home_outlined, 'Tổng quan'),
    (Icons.timeline_rounded, 'Timeline'),
    (Icons.camera_alt_outlined, 'Camera'),
    (Icons.image_outlined, 'Minh chứng'),
  ];

  @override
  Widget build(BuildContext context) {
    return _SoftCard(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          for (var index = 0; index < _tabs.length; index++)
            Expanded(
              child: _TraceTabItem(
                icon: _tabs[index].$1,
                label: _tabs[index].$2,
                selected: selectedIndex == index,
                onTap: () => onChanged(index),
              ),
            ),
        ],
      ),
    );
  }
}

class _TraceTabItem extends StatelessWidget {
  const _TraceTabItem({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = selected ? AppColors.pine : AppColors.muted;

    return InkWell(
      onTap: onTap,
      child: SizedBox(
        height: 62,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 25),
            const SizedBox(height: 5),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: color,
                fontSize: 12,
                fontWeight: selected ? FontWeight.w900 : FontWeight.w700,
              ),
            ),
            const SizedBox(height: 5),
            AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              width: selected ? 34 : 0,
              height: 3,
              decoration: BoxDecoration(
                color: selected ? AppColors.pine : Colors.transparent,
                borderRadius: BorderRadius.circular(999),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FilterCard extends StatelessWidget {
  const _FilterCard({
    required this.controller,
    required this.availableTypes,
    required this.typeFilter,
    required this.statusFilter,
    required this.onQueryChanged,
    required this.onTypeChanged,
    required this.onStatusChanged,
    required this.onSubmit,
  });

  final TextEditingController controller;
  final List<String> availableTypes;
  final String typeFilter;
  final String statusFilter;
  final ValueChanged<String> onQueryChanged;
  final ValueChanged<String> onTypeChanged;
  final ValueChanged<String> onStatusChanged;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    return _SoftCard(
      padding: const EdgeInsets.all(14),
      child: Column(
        children: [
          TextField(
            controller: controller,
            onChanged: onQueryChanged,
            onSubmitted: (_) => onSubmit(),
            decoration: const InputDecoration(
              labelText: 'Tìm kiếm nhật ký',
              prefixIcon: Icon(Icons.search_rounded),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  initialValue: typeFilter,
                  isExpanded: true,
                  decoration: const InputDecoration(
                    labelText: 'Công đoạn',
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
                    if (value != null) onTypeChanged(value);
                  },
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: DropdownButtonFormField<String>(
                  initialValue: statusFilter,
                  isExpanded: true,
                  decoration: const InputDecoration(
                    labelText: 'Trạng thái',
                    prefixIcon: Icon(Icons.verified_rounded),
                  ),
                  items: const [
                    DropdownMenuItem(
                      value: 'ALL',
                      child: Text('Tất cả trạng thái'),
                    ),
                    DropdownMenuItem(value: 'confirmed', child: Text('Đã xác nhận')),
                    DropdownMenuItem(value: 'pending', child: Text('Đang chờ')),
                    DropdownMenuItem(value: 'failed', child: Text('Thất bại')),
                  ],
                  onChanged: (value) {
                    if (value != null) onStatusChanged(value);
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _HorizontalTimeline extends StatefulWidget {
  const _HorizontalTimeline({
    required this.events,
    required this.selectedEventId,
    required this.onSelected,
  });

  final List<BatchEvent> events;
  final String? selectedEventId;
  final ValueChanged<BatchEvent> onSelected;

  @override
  State<_HorizontalTimeline> createState() => _HorizontalTimelineState();
}

class _HorizontalTimelineState extends State<_HorizontalTimeline> {
  final ScrollController _controller = ScrollController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final visibleEvents = widget.events.isEmpty
        ? <BatchEvent>[]
        : widget.events.take(8).toList();

    return _SoftCard(
      padding: const EdgeInsets.fromLTRB(12, 18, 12, 10),
      child: visibleEvents.isEmpty
          ? const Text('Không có nhật ký phù hợp với bộ lọc hiện tại.')
          : ScrollConfiguration(
              behavior: const MaterialScrollBehavior().copyWith(
                dragDevices: {
                  PointerDeviceKind.touch,
                  PointerDeviceKind.mouse,
                  PointerDeviceKind.trackpad,
                  PointerDeviceKind.stylus,
                },
              ),
              child: Scrollbar(
                controller: _controller,
                thumbVisibility: true,
                trackVisibility: true,
                thickness: 4,
                radius: const Radius.circular(999),
                child: SingleChildScrollView(
                  controller: _controller,
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(
                    parent: AlwaysScrollableScrollPhysics(),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Row(
                      children: [
                        for (
                          var index = 0;
                          index < visibleEvents.length;
                          index++
                        ) ...[
                          _TimelineStep(
                            event: visibleEvents[index],
                            selected:
                                visibleEvents[index].id ==
                                widget.selectedEventId,
                            completed: index < visibleEvents.length - 1,
                            onTap: () => widget.onSelected(visibleEvents[index]),
                          ),
                          if (index < visibleEvents.length - 1)
                            Container(
                              width: 44,
                              height: 4,
                              margin: const EdgeInsets.only(bottom: 42),
                              decoration: BoxDecoration(
                                color: AppColors.pine.withValues(alpha: 0.36),
                                borderRadius: BorderRadius.circular(999),
                              ),
                            ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
    );
  }
}
class _TimelineStep extends StatelessWidget {
  const _TimelineStep({
    required this.event,
    required this.selected,
    required this.completed,
    required this.onTap,
  });

  final BatchEvent event;
  final bool selected;
  final bool completed;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = selected ? const Color(0xFFD99A14) : AppColors.pine;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: SizedBox(
        width: 88,
        child: Column(
          children: [
            Container(
              width: selected ? 70 : 62,
              height: selected ? 70 : 62,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: selected ? Colors.white : AppColors.moss,
                border: Border.all(color: color, width: selected ? 3 : 1.4),
              ),
              child: Icon(_iconForAction(event.actionType), color: color, size: 29),
            ),
            const SizedBox(height: 8),
            Text(
              _labelForAction(event.actionType),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: selected ? AppColors.pine : AppColors.ink,
                fontSize: 12,
                fontWeight: FontWeight.w900,
                height: 1.1,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              DateFormat('dd/MM/yyyy\nHH:mm').format(event.createdAt),
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: AppColors.muted,
                fontSize: 11,
                height: 1.25,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EventDetailCard extends StatelessWidget {
  const _EventDetailCard({required this.event});

  final BatchEvent event;

  @override
  Widget build(BuildContext context) {
    final statusColor = _statusColor(event.onChainStatus);
    final details = _readableDetails(event.details);

    return _SoftCard(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _LargeIconBubble(
                icon: _iconForAction(event.actionType),
                color: _actionColor(event.actionType),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _labelForAction(event.actionType),
                      style: const TextStyle(
                        color: AppColors.ink,
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 8),
                    _MetaLine(
                      icon: Icons.calendar_today_rounded,
                      label: DateFormat('dd/MM/yyyy - HH:mm').format(event.createdAt),
                    ),
                  ],
                ),
              ),
              _StatusChip(
                label: _statusText(event.onChainStatus),
                color: statusColor,
              ),
            ],
          ),
          if (event.note.isNotEmpty) ...[
            const SizedBox(height: 16),
            const _SectionTitle('Ghi chú nhật ký'),
            const SizedBox(height: 8),
            Text(
              event.note,
              style: const TextStyle(
                color: AppColors.ink,
                fontSize: 15,
                height: 1.45,
              ),
            ),
          ],
          const SizedBox(height: 16),
          const _SectionTitle('Thông tin thực hiện'),
          const SizedBox(height: 10),
          _InfoRow(icon: Icons.person_outline_rounded, label: 'Người thực hiện', value: event.actor ?? 'Chưa cập nhật'),
          const SizedBox(height: 8),
          _InfoRow(icon: Icons.category_outlined, label: 'Loại công đoạn', value: event.actionType),
          const SizedBox(height: 8),
          _InfoRow(icon: Icons.verified_outlined, label: 'Trạng thái blockchain', value: _statusText(event.onChainStatus)),
          if (event.transactionHash != null && event.transactionHash!.isNotEmpty) ...[
            const SizedBox(height: 8),
            _InfoRow(icon: Icons.receipt_long_outlined, label: 'TxHash', value: event.transactionHash!),
          ],
          if (event.dataHash != null && event.dataHash!.isNotEmpty) ...[
            const SizedBox(height: 8),
            _InfoRow(icon: Icons.fingerprint_rounded, label: 'DataHash', value: event.dataHash!),
          ],
          if (event.blockNumber != null) ...[
            const SizedBox(height: 8),
            _InfoRow(icon: Icons.view_in_ar_outlined, label: 'Block', value: '#${event.blockNumber}'),
          ],
          if (details.isNotEmpty) ...[
            const SizedBox(height: 16),
            const _SectionTitle('Chi tiết công đoạn'),
            const SizedBox(height: 10),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                for (final detail in details)
                  SizedBox(
                    width: 150,
                    child: _DetailBox(
                      label: detail.$1,
                      value: detail.$2,
                    ),
                  ),
              ],
            ),
          ],
          if (event.imageUrls.isNotEmpty) ...[
            const SizedBox(height: 16),
            _ImageEvidenceSection(images: event.imageUrls),
          ],
          if (event.videoUrls.isNotEmpty) ...[
            const SizedBox(height: 16),
            _VideoEvidenceSection(videos: event.videoUrls),
          ],
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(
        color: AppColors.ink,
        fontSize: 15,
        fontWeight: FontWeight.w900,
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: AppColors.pine, size: 18),
        const SizedBox(width: 8),
        SizedBox(
          width: 106,
          child: Text(
            label,
            style: const TextStyle(
              color: AppColors.muted,
              fontSize: 12,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
        Expanded(
          child: SelectableText(
            value,
            style: const TextStyle(
              color: AppColors.ink,
              fontSize: 13,
              height: 1.35,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }
}

class _ImageEvidenceSection extends StatelessWidget {
  const _ImageEvidenceSection({required this.images});

  final List<String> images;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _SectionTitle('Ảnh minh chứng'),
        const SizedBox(height: 10),
        SizedBox(
          height: 106,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: images.length,
            separatorBuilder: (context, index) => const SizedBox(width: 10),
            itemBuilder: (context, index) {
              final imageUrl = images[index];

              return Material(
                color: Colors.transparent,
                child: InkWell(
                  borderRadius: BorderRadius.circular(14),
                  onTap: () => showDialog<void>(
                    context: context,
                    barrierDismissible: true,
                    useSafeArea: true,
                    builder: (_) => _ImagePreviewDialog(imageUrl: imageUrl),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(14),
                    child: Image.network(
                      imageUrl,
                      width: 128,
                      height: 106,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => Container(
                        width: 128,
                        height: 106,
                        color: AppColors.moss,
                        child: const Icon(Icons.broken_image_outlined),
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _VideoEvidenceSection extends StatelessWidget {
  const _VideoEvidenceSection({required this.videos});

  final List<String> videos;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _SectionTitle('Video minh chứng'),
        const SizedBox(height: 10),
        SizedBox(
          height: 64,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: videos.length,
            separatorBuilder: (context, index) => const SizedBox(width: 10),
            itemBuilder: (context, index) {
              final videoUrl = videos[index];
              final name = _mediaName(videoUrl);

              return Material(
                color: Colors.transparent,
                child: InkWell(
                  borderRadius: BorderRadius.circular(14),
                  onTap: () => showDialog<void>(
                    context: context,
                    barrierDismissible: true,
                    useSafeArea: true,
                    builder: (_) => _VideoPlayerDialog(videoUrl: videoUrl),
                  ),
                  child: Container(
                    width: 210,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.pine.withValues(alpha: 0.09),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: AppColors.pine.withValues(alpha: 0.16),
                      ),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 38,
                          height: 38,
                          decoration: const BoxDecoration(
                            color: AppColors.pine,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.play_arrow_rounded,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            name,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: AppColors.ink,
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                            ),
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
      ],
    );
  }
}

class _ImagePreviewDialog extends StatelessWidget {
  const _ImagePreviewDialog({required this.imageUrl});

  final String imageUrl;

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
                      'Ảnh minh chứng',
                      style: TextStyle(
                        color: AppColors.ink,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close_rounded),
                  ),
                ],
              ),
              ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: InteractiveViewer(
                  minScale: 0.8,
                  maxScale: 4,
                  child: Image.network(
                    imageUrl,
                    fit: BoxFit.contain,
                    errorBuilder: (context, error, stackTrace) => Container(
                      height: 220,
                      alignment: Alignment.center,
                      color: AppColors.moss,
                      child: const Icon(Icons.broken_image_outlined),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
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
    if (mounted) setState(() {});
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
                        color: AppColors.ink,
                        fontWeight: FontWeight.w800,
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
                _VideoPlayerContent(
                  controller: _controller!,
                  onSeek: _seekRelative,
                  onTogglePlay: () async {
                    final controller = _controller!;
                    if (controller.value.isPlaying) {
                      await controller.pause();
                    } else {
                      await controller.play();
                    }
                    if (mounted) setState(() {});
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _VideoPlayerContent extends StatelessWidget {
  const _VideoPlayerContent({
    required this.controller,
    required this.onSeek,
    required this.onTogglePlay,
  });

  final VideoPlayerController controller;
  final ValueChanged<Duration> onSeek;
  final VoidCallback onTogglePlay;

  @override
  Widget build(BuildContext context) {
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
            backgroundColor: Colors.black.withValues(alpha: 0.25),
            bufferedColor: AppColors.leaf.withValues(alpha: 0.5),
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
              onTap: () => onSeek(const Duration(seconds: -10)),
              filled: true,
            ),
            _VideoActionChip(
              icon: controller.value.isPlaying
                  ? Icons.pause_rounded
                  : Icons.play_arrow_rounded,
              label: controller.value.isPlaying ? 'Tạm dừng' : 'Phát',
              onTap: onTogglePlay,
              filled: true,
            ),
            _VideoActionChip(
              icon: Icons.forward_10_rounded,
              label: '+10s',
              onTap: () => onSeek(const Duration(seconds: 10)),
              filled: true,
            ),
          ],
        ),
      ],
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

class _OverviewPanel extends StatelessWidget {
  const _OverviewPanel({required this.batch, required this.events});

  final Batch batch;
  final List<BatchEvent> events;

  @override
  Widget build(BuildContext context) {
    final confirmed =
        events.where((event) => event.onChainStatus == 'confirmed').length;
    final batchCode = batch.batchCode.isEmpty ? batch.batchId : batch.batchCode;

    return Column(
      children: [
        Row(
          children: [
            Expanded(child: _MetricCard(value: '${events.length}', label: 'Sự kiện')),
            const SizedBox(width: 10),
            Expanded(child: _MetricCard(value: '$confirmed', label: 'Xác thực')),
            const SizedBox(width: 10),
            Expanded(
              child: _MetricCard(
                value: batch.currentQuantity.toStringAsFixed(0),
                label: batch.unit,
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        _SoftCard(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const _SectionTitle('Thông tin lô'),
              const SizedBox(height: 12),
              _InfoRow(icon: Icons.qr_code_2_rounded, label: 'Mã lô', value: batchCode),
              const SizedBox(height: 8),
              _InfoRow(icon: Icons.inventory_2_outlined, label: 'Sản phẩm', value: batch.productName.isEmpty ? 'Chưa cập nhật' : batch.productName),
              const SizedBox(height: 8),
              _InfoRow(icon: Icons.category_outlined, label: 'Danh mục', value: batch.productType.isEmpty ? 'Chưa cập nhật' : batch.productType),
              const SizedBox(height: 8),
              _InfoRow(icon: Icons.eco_outlined, label: 'Loại', value: _productKindLabel(batch.productKind)),
              const SizedBox(height: 8),
              _InfoRow(icon: Icons.place_outlined, label: 'Xuất xứ', value: batch.origin.isEmpty ? 'Chưa cập nhật' : batch.origin),
              if (batch.cultivationTime.isNotEmpty) ...[
                const SizedBox(height: 8),
                _InfoRow(icon: Icons.calendar_month_outlined, label: 'Mùa vụ', value: batch.cultivationTime),
              ],
              const SizedBox(height: 8),
              _InfoRow(icon: Icons.scale_outlined, label: 'Ban đầu', value: '${_formatQuantity(batch.initialQuantity)} ${batch.unit}'),
              const SizedBox(height: 8),
              _InfoRow(icon: Icons.warehouse_outlined, label: 'Tồn hiện tại', value: '${_formatQuantity(batch.currentQuantity)} ${batch.unit}'),
              const SizedBox(height: 8),
              _InfoRow(icon: Icons.flag_outlined, label: 'Trạng thái', value: _productStatusLabel(batch.status)),
              const SizedBox(height: 14),
              const _SectionTitle('Mô tả'),
              const SizedBox(height: 8),
              Text(
                batch.description.isEmpty
                    ? 'Thông tin truy xuất được tổng hợp theo từng công đoạn của lô nông sản.'
                    : batch.description,
                style: const TextStyle(color: AppColors.ink, height: 1.45),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _EvidencePanel extends StatelessWidget {
  const _EvidencePanel({required this.events});

  final List<BatchEvent> events;

  @override
  Widget build(BuildContext context) {
    final images = events.expand((event) => event.imageUrls).take(6).toList();

    return _SoftCard(
      padding: const EdgeInsets.all(16),
      child: images.isEmpty
          ? const Text('Chưa có ảnh minh chứng cho lô này.')
          : Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                for (final image in images)
                  ClipRRect(
                    borderRadius: BorderRadius.circular(14),
                    child: Image.network(
                      image,
                      width: 96,
                      height: 96,
                      fit: BoxFit.cover,
                    ),
                  ),
              ],
            ),
    );
  }
}

class _LookupEmptyState extends StatelessWidget {
  const _LookupEmptyState({required this.controller, required this.onSubmit});

  final TextEditingController controller;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
      children: [
        _SoftCard(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Tra cứu lô nông sản',
                style: TextStyle(
                  color: AppColors.ink,
                  fontSize: 24,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: controller,
                onSubmitted: (_) => onSubmit(),
                decoration: const InputDecoration(
                  labelText: 'Nhập mã lô',
                  prefixIcon: Icon(Icons.search_rounded),
                ),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: onSubmit,
                      icon: const Icon(Icons.timeline_rounded),
                      label: const Text('Xem truy xuất'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => Navigator.pushNamed(context, AppRouter.scanner),
                      icon: const Icon(Icons.qr_code_scanner_rounded),
                      label: const Text('Quét QR'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _DashboardErrorState extends StatelessWidget {
  const _DashboardErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: _SoftCard(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline_rounded, color: AppColors.danger),
              const SizedBox(height: 12),
              Text(message, textAlign: TextAlign.center),
              const SizedBox(height: 14),
              FilledButton(onPressed: onRetry, child: const Text('Thử lại')),
            ],
          ),
        ),
      ),
    );
  }
}

class _SoftCard extends StatelessWidget {
  const _SoftCard({
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.color = Colors.white,
    this.borderColor = const Color(0xFFE6ECE2),
  });

  final Widget child;
  final EdgeInsets padding;
  final Color color;
  final Color borderColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.96),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: borderColor),
        boxShadow: [
          BoxShadow(
            color: AppColors.forest.withValues(alpha: 0.08),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: child,
    );
  }
}

class _LargeIconBubble extends StatelessWidget {
  const _LargeIconBubble({required this.icon, required this.color});

  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 58,
      height: 58,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        shape: BoxShape.circle,
      ),
      child: Icon(icon, color: color, size: 30),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.label, this.color = AppColors.pine});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.22)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.check_circle_outline_rounded, color: color, size: 18),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 13,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }
}

class _MetaLine extends StatelessWidget {
  const _MetaLine({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppColors.muted),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: AppColors.muted,
              fontSize: 14,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ],
    );
  }
}

class _DetailBox extends StatelessWidget {
  const _DetailBox({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFCFCFA),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE8E8E3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: AppColors.muted,
              fontWeight: FontWeight.w800,
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(color: AppColors.ink),
          ),
        ],
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({required this.value, required this.label});

  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return _SoftCard(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: AppColors.pine,
              fontSize: 22,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 4),
          Text(label, maxLines: 1, overflow: TextOverflow.ellipsis),
        ],
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

String _statusText(String status) {
  switch (status) {
    case 'confirmed':
      return 'Thành công';
    case 'failed':
      return 'Thất bại';
    case 'pending':
      return 'Đang chờ';
    default:
      return status;
  }
}

Color _actionColor(String actionType) {
  switch (actionType) {
    case 'HARVESTING':
      return const Color(0xFFC2673A);
    case 'PACKAGING':
      return const Color(0xFF2F8F4D);
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
      return Icons.local_florist_rounded;
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
      return Icons.sync_alt_rounded;
    default:
      return Icons.timeline_rounded;
  }
}

String _labelForAction(String actionType) {
  switch (actionType) {
    case 'SEEDING':
      return 'Canh tác';
    case 'FERTILIZING':
      return 'Ra hoa';
    case 'WATERING':
      return 'Tưới nước';
    case 'PEST_CONTROL':
      return 'Chăm sóc';
    case 'HARVESTING':
      return 'Thu hoạch';
    case 'PACKAGING':
      return 'Đóng gói';
    case 'SHIPPING':
      return 'Vận chuyển';
    case 'STATUS_UPDATE':
      return 'Chuyển trạng thái';
    default:
      return actionType.isEmpty ? 'Nhật ký' : actionType;
  }
}

String _productKindLabel(String value) {
  switch (value) {
    case 'Plant':
      return 'Cây trồng';
    case 'Animal':
      return 'Vật nuôi';
    default:
      return value.isEmpty ? 'Chưa cập nhật' : value;
  }
}

String _productStatusLabel(String value) {
  switch (value) {
    case 'draft':
      return 'Bản nháp';
    case 'active':
      return 'Đang theo dõi';
    case 'completed':
      return 'Đã hoàn tất';
    case 'recalled':
      return 'Đã thu hồi';
    default:
      return value.isEmpty ? 'Chưa cập nhật' : value;
  }
}

String _formatQuantity(double value) {
  if (value == value.roundToDouble()) return value.toStringAsFixed(0);
  return value.toStringAsFixed(2);
}

List<(String, String)> _readableDetails(Map<String, dynamic> details) {
  final items = <(String, String)>[];
  final operation = details['operation']?.toString();
  if (operation != null && operation.isNotEmpty) {
    items.add(('Thao tác', _operationLabel(operation)));
  }

  void add(String key, dynamic value) {
    if (value == null) return;
    if (value is Map) {
      for (final entry in value.entries) {
        add('${key}_${entry.key}', entry.value);
      }
      return;
    }
    if (value is List) {
      if (value.isEmpty) return;
      items.add((_detailLabel(key), value.map(_detailValue).join(', ')));
      return;
    }
    if (key == 'operation') return;
    items.add((_detailLabel(key), _detailValue(value)));
  }

  for (final entry in details.entries) {
    add(entry.key, entry.value);
  }

  return items;
}

String _operationLabel(String value) {
  switch (value) {
    case 'SPLIT_OUT':
      return 'Tách khỏi lô gốc';
    case 'SPLIT_IN':
      return 'Lô được tách ra';
    case 'MERGE_OUT':
      return 'Gộp sang lô khác';
    case 'MERGE_IN':
      return 'Nhận gộp từ lô khác';
    case 'SPLIT':
      return 'Tách lô';
    case 'MERGE':
      return 'Gộp lô';
    default:
      return value;
  }
}

String _detailLabel(String key) {
  switch (key) {
    case 'quantity':
      return 'Số lượng';
    case 'unit':
      return 'Đơn vị';
    case 'balance_before':
      return 'Tồn trước';
    case 'balance_after':
      return 'Tồn sau';
    case 'source_product':
      return 'Lô nguồn';
    case 'target_product':
      return 'Lô nhận';
    case 'children':
      return 'Lô con';
    case 'sources':
      return 'Lô nguồn';
    case 'loss_loss_quantity':
    case 'loss_quantity':
      return 'Hao hụt';
    case 'loss_loss_rate':
    case 'loss_rate':
      return 'Tỉ lệ hao hụt';
    case 'loss_loss_reason':
    case 'loss_reason':
      return 'Lý do hao hụt';
    case 'completed':
      return 'Hoàn tất lô';
    default:
      return key
          .replaceAll('_', ' ')
          .split(' ')
          .where((part) => part.isNotEmpty)
          .map((part) => part[0].toUpperCase() + part.substring(1))
          .join(' ');
  }
}

String _detailValue(dynamic value) {
  if (value is bool) return value ? 'Có' : 'Không';
  if (value is num) {
    final asDouble = value.toDouble();
    if (asDouble == asDouble.roundToDouble()) return asDouble.toStringAsFixed(0);
    return asDouble.toStringAsFixed(2);
  }
  if (value is Map) {
    final product = value['product']?.toString();
    final quantity = value['quantity'];
    if (product != null && quantity != null) {
      return '$product (${_detailValue(quantity)})';
    }
    return value.entries.map((entry) => '${entry.key}: ${_detailValue(entry.value)}').join(', ');
  }
  return value.toString();
}

String _mediaName(String input) {
  final uri = Uri.tryParse(input);
  if (uri != null && uri.pathSegments.isNotEmpty) {
    return uri.pathSegments.last;
  }

  final parts = input.split('/');
  return parts.isNotEmpty ? parts.last : input;
}
