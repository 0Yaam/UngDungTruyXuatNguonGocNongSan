// ignore_for_file: unused_element, unused_element_parameter, unnecessary_underscores

import 'package:app/core/api_client.dart';
import 'package:app/core/router.dart';
import 'package:app/core/theme.dart';
import 'package:app/models/batch.dart';
import 'package:app/providers/providers.dart';
import 'package:app/widgets/liquid_glass.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class FarmerDashboardScreen extends ConsumerStatefulWidget {
  const FarmerDashboardScreen({super.key});

  @override
  ConsumerState<FarmerDashboardScreen> createState() =>
      _FarmerDashboardScreenState();
}

class _FarmerDashboardScreenState extends ConsumerState<FarmerDashboardScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final batchesAsync = ref.watch(batchListProvider);
    final authData = ref.watch(authStateProvider);
    final role =
        (authData?['user']?['role'] ?? authData?['role'] ?? '')
            .toString()
            .toLowerCase();
    final canUseDiseaseDetection = const {
      'admin',
      'manager',
      'farmer',
    }.contains(role);

    return GlassPageBackground(
      child: SafeArea(
        child: batchesAsync.when(
            loading: () => _DashboardLoading(
              userName: 'Nguyễn Văn An',
              roleLabel: _roleLabel(role),
              location: 'Cái Bè, Tiền Giang',
              controller: _searchController,
              onChanged: (value) => setState(() => _searchQuery = value),
              onScan: () => Navigator.pushNamed(context, AppRouter.scanner),
              canUseDiseaseDetection: canUseDiseaseDetection,
            ),
            error: (error, _) => _ErrorState(
              message: 'Không tải được danh sách lô nông sản.\n$error',
              onRetry: () => ref.invalidate(batchListProvider),
            ),
            data: (batches) {
              final normalizedQuery = _searchQuery.trim().toLowerCase();
              final activeBatches = batches
                  .where((batch) =>
                      batch.status != 'completed' &&
                      batch.currentQuantity > 0)
                  .toList();
              final displayedBatches = normalizedQuery.isEmpty
                  ? activeBatches
                  : activeBatches.where((batch) {
                      final haystack = [
                        batch.batchId,
                        batch.productName,
                        batch.productType,
                        batch.origin,
                        batch.status,
                      ].join(' ').toLowerCase();
                      return haystack.contains(normalizedQuery);
                    }).toList();

              final inventoryTotal = activeBatches.fold<double>(
                0,
                (sum, batch) => sum + batch.currentQuantity,
              );
              final newJournalCount = activeBatches
                  .expand((batch) => batch.events)
                  .where((event) =>
                      DateTime.now().difference(event.createdAt).inDays <= 7)
                  .length;
              final warningCount = activeBatches.where((batch) {
                if (batch.status == 'recalled') return true;
                if (batch.initialQuantity <= 0) return false;
                return batch.currentQuantity / batch.initialQuantity < 0.25;
              }).length;
              final canDeleteProduct = role == 'admin';
              final userMap = authData?['user'] is Map<String, dynamic>
                  ? authData!['user'] as Map<String, dynamic>
                  : authData;
              final userName =
                  (userMap?['name'] ??
                          [
                            userMap?['first_name'],
                            userMap?['last_name'],
                          ].whereType<Object>().join(' ') ??
                          'Nguyễn Văn An')
                      .toString()
                      .trim();
              final userRole = _roleLabel(role);
              final location = activeBatches
                  .map((batch) => batch.origin)
                  .firstWhere((origin) => origin.trim().isNotEmpty,
                      orElse: () => 'Cái Bè, Tiền Giang');

              return RefreshIndicator(
                onRefresh: () async => ref.invalidate(batchListProvider),
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(0, 0, 0, 104),
                  children: [
                    _DashboardHero(
                      userName: userName.isEmpty ? 'Nguyễn Văn An' : userName,
                      roleLabel: userRole,
                      location: location,
                      warningCount: warningCount,
                      onLogout: () {
                        final container = ProviderScope.containerOf(context);
                        Navigator.pushNamedAndRemoveUntil(
                          context,
                          AppRouter.home,
                          (_) => false,
                        );
                        Future.microtask(() {
                          container.read(authStateProvider.notifier).state =
                              null;
                          ApiClient.instance.setToken(null);
                        });
                      },
                      controller: _searchController,
                      onChanged: (value) => setState(() => _searchQuery = value),
                      onClear: _searchQuery.trim().isEmpty
                          ? null
                          : () {
                              _searchController.clear();
                              setState(() => _searchQuery = '');
                            },
                      onScan: () => Navigator.pushNamed(context, AppRouter.scanner),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 18),
                      child: _TodayOverviewCard(
                        batchCount: batches.length,
                        inventoryTotal: inventoryTotal,
                        newJournalCount: newJournalCount,
                        warningCount: warningCount,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 18),
                      child: Text(
                        'Thao tác nhanh',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w900,
                              color: AppColors.forest,
                              fontSize: 18,
                            ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Padding(
                      padding: const EdgeInsets.only(left: 18),
                      child: _QuickActionsGrid(
                        actions: _buildQuickActions(
                          context,
                          onInventoryTap: () => ref.invalidate(batchListProvider),
                          includeDiseaseDetection: canUseDiseaseDetection,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 18),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              'Lô nông sản của tôi',
                              style: Theme.of(context)
                                  .textTheme
                                  .titleLarge
                                  ?.copyWith(
                                    fontWeight: FontWeight.w900,
                                    color: AppColors.forest,
                                    fontSize: 18,
                                  ),
                            ),
                          ),
                          TextButton.icon(
                            onPressed: () => ref.invalidate(batchListProvider),
                            label: const Text('Xem tất cả'),
                            icon: const Icon(Icons.chevron_right_rounded),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    if (batches.isEmpty)
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 18),
                        child: GlassPanel(
                          child: Text(
                            'Chưa có lô nào để hiển thị. Hãy tạo trước vài lô mẫu để thuận tiện thao tác khi demo.',
                          ),
                        ),
                      )
                    else if (displayedBatches.isEmpty)
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 18),
                        child: GlassPanel(
                          child: Text(
                            'Không tìm thấy lô phù hợp với từ khóa "${_searchQuery.trim()}".',
                          ),
                        ),
                      )
                    else
                      ...displayedBatches.map(
                        (batch) => Padding(
                          padding: const EdgeInsets.fromLTRB(18, 0, 18, 12),
                          child: _BatchCard(
                            batch: batch,
                            allBatches: batches,
                            canDelete: canDeleteProduct,
                          ),
                        ),
                      ),
                  ],
                ),
              );
            },
          ),
        ),
      );
  }
}

class _MetricTile extends StatelessWidget {
  const _MetricTile({
    required this.value,
    required this.label,
    required this.icon,
  });

  final String value;
  final String label;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 146,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withValues(alpha: 0.28)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: Colors.white, size: 18),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            label,
            style: const TextStyle(
              color: Color(0xFFEAF8EE),
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _DashboardLoading extends StatelessWidget {
  const _DashboardLoading({
    required this.userName,
    required this.roleLabel,
    required this.location,
    required this.controller,
    required this.onChanged,
    required this.onScan,
    required this.canUseDiseaseDetection,
  });

  final String userName;
  final String roleLabel;
  final String location;
  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final VoidCallback onScan;
  final bool canUseDiseaseDetection;

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(0, 0, 0, 104),
      children: [
        _DashboardHero(
          userName: userName,
          roleLabel: roleLabel,
          location: location,
          warningCount: 0,
          onLogout: () => Navigator.pushNamedAndRemoveUntil(
            context,
            AppRouter.home,
            (_) => false,
          ),
          controller: controller,
          onChanged: onChanged,
          onScan: onScan,
        ),
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 18),
          child: GlassPanel(
            radius: 18,
            padding: EdgeInsets.all(20),
            colors: [Colors.white, Color(0xFFF8FBF6)],
            child: Center(child: CircularProgressIndicator()),
          ),
        ),
        const SizedBox(height: 6),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 18),
          child: Text(
            'Thao tác nhanh',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w900,
                  color: AppColors.forest,
                  fontSize: 18,
                ),
          ),
        ),
        const SizedBox(height: 10),
        Padding(
          padding: const EdgeInsets.only(left: 18),
          child: _QuickActionsGrid(
            actions: _buildQuickActions(
              context,
              onInventoryTap: () {},
              includeDiseaseDetection: canUseDiseaseDetection,
            ),
          ),
        ),
      ],
    );
  }
}

class _QuickActionCard extends StatelessWidget {
  const _QuickActionCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.accentColor,
    required this.tag,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Color accentColor;
  final String tag;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(26),
      onTap: onTap,
      child: GlassPanel(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: accentColor.withValues(alpha: 0.14),
                border: Border.all(color: accentColor.withValues(alpha: 0.28)),
              ),
              child: Icon(icon, color: accentColor),
            ),
            const SizedBox(height: 18),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: accentColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                tag,
                style: TextStyle(
                  color: accentColor,
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            const SizedBox(height: 10),
            Text(
              title,
              style: const TextStyle(
                color: AppColors.ink,
                fontWeight: FontWeight.w800,
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 4),
            Text(subtitle),
          ],
        ),
      ),
    );
  }
}

class _BatchCard extends ConsumerWidget {
  const _BatchCard({
    required this.batch,
    required this.allBatches,
    required this.canDelete,
  });

  final Batch batch;
  final List<Batch> allBatches;
  final bool canDelete;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sortedEvents = [...batch.events]
      ..sort((a, b) => a.createdAt.compareTo(b.createdAt));
<<<<<<< HEAD
    final harvestEvents =
        sortedEvents.where((event) => event.actionType == 'HARVESTING').toList();
    final latestHarvestEvent = harvestEvents.isEmpty ? null : harvestEvents.last;
    final timelineRoute = '${AppRouter.timeline}?batchId=${batch.batchId}';
=======
    final latestEvent = sortedEvents.isEmpty ? null : sortedEvents.last;
    final timelineRoute = '${AppRouter.trace}?productId=${batch.batchId}';
>>>>>>> dan/main
    final addEventRoute = '${AppRouter.addEvent}?batchId=${batch.batchId}';
    final camerasRoute = '${AppRouter.cameras}?batchId=${batch.batchId}';
    final cameraCount = batch.liveCameras.length;
    final imageUrl = batch.imageUrls.isEmpty ? '' : batch.imageUrls.first;
    final batchCode = _displayBatchCode(
      batch.batchCode.isEmpty ? batch.batchId : batch.batchCode,
    );
    final typeLabel = batch.productType.isEmpty ? 'Lô nông sản' : batch.productType;
    final harvestDate = latestHarvestEvent == null
        ? ''
        : 'Thu hoạch: ${_formatShortDate(latestHarvestEvent.createdAt)}';

    return LayoutBuilder(
      builder: (context, constraints) {
        final compact = constraints.maxWidth < 560;
        final imageWidth = compact ? 104.0 : 160.0;
        final imageHeight = compact ? 82.0 : 112.0;

        return Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            boxShadow: [
              BoxShadow(
                color: AppColors.forest.withValues(alpha: 0.1),
                blurRadius: 18,
                offset: const Offset(0, 8),
              ),
            ],
            border: Border.all(color: const Color(0xFFECEFEA)),
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(14),
              onTap: () => Navigator.pushNamed(context, timelineRoute),
              onLongPress: () => _showBatchActions(
                context,
                ref,
                timelineRoute,
                addEventRoute,
                camerasRoute,
              ),
              child: Padding(
                padding: const EdgeInsets.all(8),
                child: Row(
                  children: [
                    _ProductThumb(
                      imageUrl: imageUrl,
                      label: typeLabel,
                      width: imageWidth,
                      height: imageHeight,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            batch.productName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: AppColors.ink,
                              fontSize: 16,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 9,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.moss.withValues(alpha: 0.82),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              batchCode,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: AppColors.pine,
                                fontSize: 11,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ),
                          const SizedBox(height: 5),
                          if (batch.origin.isNotEmpty)
                            _ProductMetaLine(
                              icon: Icons.place_outlined,
                              text: batch.origin,
                            ),
                          if (harvestDate.isNotEmpty)
                            _ProductMetaLine(
                              icon: Icons.calendar_today_outlined,
                              text: harvestDate,
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 6),
                    SizedBox(
                      width: compact ? 96 : 138,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _CompactStatusPill(status: batch.status),
                          const SizedBox(height: 10),
                          const Text(
                            'Tồn kho',
                            style: TextStyle(
                              color: AppColors.muted,
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 4),
                          FittedBox(
                            fit: BoxFit.scaleDown,
                            alignment: Alignment.centerLeft,
                            child: Text(
                              '${_formatQuantity(batch.currentQuantity)} ${batch.unit}',
                              style: TextStyle(
                                color: AppColors.pine,
                                fontSize: compact ? 19 : 22,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (cameraCount > 0)
                                _TinyIconButton(
                                  icon: Icons.videocam_rounded,
                                  onTap: () => Navigator.pushNamed(
                                    context,
                                    camerasRoute,
                                  ),
                                ),
                              _TinyIconButton(
                                icon: Icons.more_horiz_rounded,
                                onTap: () => _showBatchActions(
                                  context,
                                  ref,
                                  timelineRoute,
                                  addEventRoute,
                                  camerasRoute,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  void _showBatchActions(
    BuildContext context,
    WidgetRef ref,
    String timelineRoute,
    String addEventRoute,
    String camerasRoute,
  ) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (sheetContext) => SafeArea(
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.sizeOf(sheetContext).height * 0.82,
          ),
          child: GlassPanel(
            radius: 28,
            padding: const EdgeInsets.fromLTRB(18, 10, 18, 12),
            colors: [
              Colors.white.withValues(alpha: 0.96),
              const Color(0xFFEAF6E7),
            ],
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 42,
                    height: 5,
                    margin: const EdgeInsets.only(bottom: 8),
                    decoration: BoxDecoration(
                      color: AppColors.muted.withValues(alpha: 0.22),
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                  _BatchSheetAction(
                    icon: Icons.timeline_rounded,
                    label: 'Mở timeline',
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.pushNamed(context, timelineRoute);
                    },
                  ),
                  _BatchSheetAction(
                    icon: Icons.add_circle_outline_rounded,
                    label: 'Thêm nhật ký',
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.pushNamed(context, addEventRoute);
                    },
                  ),
                  _BatchSheetAction(
                    icon: Icons.edit_outlined,
                    label: 'Sửa thông tin lô',
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.pushNamed(
                        context,
                        AppRouter.editProduct,
                        arguments: batch,
                      );
                    },
                  ),
                  _BatchSheetAction(
                    icon: Icons.videocam_rounded,
                    label: 'Quản lý camera',
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.pushNamed(context, camerasRoute);
                    },
                  ),
                  _BatchSheetAction(
                    icon: Icons.account_tree_outlined,
                    label: 'Tách, gộp, thu hồi',
                    onTap: () {
                      Navigator.pop(context);
                      _showBatchWorkflowSheet(context, ref);
                    },
                  ),
                  if (canDelete)
                    _BatchSheetAction(
                      icon: Icons.delete_outline_rounded,
                      label: 'Xóa lô',
                      color: AppColors.danger,
                      onTap: () {
                        Navigator.pop(context);
                        _confirmDelete(context, ref);
                      },
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _runWorkflow(
    BuildContext context,
    WidgetRef ref,
    Future<void> Function() action,
    String successMessage,
  ) async {
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    try {
      await action();
      ref.invalidate(batchListProvider);
      if (navigator.canPop()) navigator.pop();
      messenger.showSnackBar(SnackBar(content: Text(successMessage)));
    } catch (error) {
      messenger.showSnackBar(
        SnackBar(content: Text(_friendlyError(error)), backgroundColor: AppColors.danger),
      );
    }
  }

  void _showBatchWorkflowSheet(BuildContext context, WidgetRef ref) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _WorkflowSheet(
        batch: batch,
        allBatches: allBatches,
        onSplit: (quantity, childName, note) => _runWorkflow(
          context,
          ref,
          () => ref.read(batchServiceProvider).splitProduct(
                productId: batch.id,
                quantity: quantity,
                childName: childName,
                note: note,
              ),
          'Đã tách lô thành công.',
        ),
        onMerge: (
          targetBatch,
          targetSourceQuantity,
          targetName,
          note,
        ) => _runWorkflow(
          context,
          ref,
          () => ref.read(batchServiceProvider).mergeProducts(
                targetProductId: batch.id,
                sourceProductId: targetBatch.id,
                sourceQuantity: targetSourceQuantity,
                targetName: targetName,
                note: note,
              ),
          'Đã gộp lô thành công.',
        ),
        onStatusChange: (status, reason, note) => _runWorkflow(
          context,
          ref,
          () => ref.read(batchServiceProvider).updateProductStatus(
                productId: batch.id,
                status: status,
                reason: reason,
                note: note,
              ),
          'Đã chuyển trạng thái lô.',
        ),
      ),
    );
  }

  Future<void> _confirmDelete(BuildContext context, WidgetRef ref) async {
    final messenger = ScaffoldMessenger.of(context);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Xóa lô?'),
        content: Text(
          'Lô "${batch.productName}" sẽ được chuyển vào thùng rác. Bạn có thể khôi phục lại nếu cần.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Hủy'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.danger),
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Xóa lô'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      await ref.read(batchServiceProvider).deleteProduct(batch.id);
      ref.invalidate(batchListProvider);
      messenger.showSnackBar(
        const SnackBar(content: Text('Đã chuyển lô vào thùng rác.')),
      );
    } catch (error) {
      messenger.showSnackBar(
        SnackBar(
          content: Text(error.toString()),
          backgroundColor: AppColors.danger,
        ),
      );
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
}

String _friendlyError(Object error) {
  final message = error.toString();
  if (message.startsWith('Exception: ')) {
    return message.substring('Exception: '.length);
  }
  if (message.startsWith('DioException')) {
    return 'Không thể xử lý yêu cầu. Vui lòng kiểm tra lại dữ liệu.';
  }
  return message;
}

String _roleLabel(String role) {
  switch (role) {
    case 'admin':
      return 'Quản trị';
    case 'manager':
      return 'Quản lý';
    case 'farmer':
      return 'Nông dân';
    case 'consumer':
      return 'Người dùng';
    default:
      return 'Nông dân';
  }
}

class _DashboardHeader extends StatelessWidget {
  const _DashboardHeader({
    required this.userName,
    required this.roleLabel,
    required this.location,
    required this.warningCount,
    required this.onLogout,
  });

  final String userName;
  final String roleLabel;
  final String location;
  final int warningCount;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(18, 26, 18, 58),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF063D21), Color(0xFF0B713B)],
        ),
        borderRadius: const BorderRadius.vertical(bottom: Radius.circular(32)),
        image: DecorationImage(
          image: const NetworkImage(
            'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=70',
          ),
          fit: BoxFit.cover,
          opacity: 0.16,
          alignment: Alignment.bottomCenter,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Xin chào',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text(
                      userName,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 27,
                        height: 1.05,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.18),
                        borderRadius: BorderRadius.circular(9),
                        border: Border.all(
                          color: Colors.white.withValues(alpha: 0.14),
                        ),
                      ),
                      child: Text(
                        roleLabel,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    const Icon(
                      Icons.location_on_rounded,
                      color: Colors.white,
                      size: 18,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        location,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          _HeaderIconButton(
            icon: Icons.notifications_none_rounded,
            badge: warningCount == 0 ? 3 : warningCount,
            onTap: () => Navigator.pushNamed(context, AppRouter.notifications),
          ),
          const SizedBox(width: 10),
          _AvatarButton(onTap: onLogout),
        ],
      ),
    );
  }
}

class _DashboardHero extends StatelessWidget {
  const _DashboardHero({
    required this.userName,
    required this.roleLabel,
    required this.location,
    required this.warningCount,
    required this.onLogout,
    required this.controller,
    required this.onChanged,
    required this.onScan,
    this.onClear,
  });

  final String userName;
  final String roleLabel;
  final String location;
  final int warningCount;
  final VoidCallback onLogout;
  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final VoidCallback onScan;
  final VoidCallback? onClear;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 254,
      width: double.infinity,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned(
            left: 0,
            top: 0,
            right: 0,
            height: 202,
            child: _DashboardHeader(
              userName: userName,
              roleLabel: roleLabel,
              location: location,
              warningCount: warningCount,
              onLogout: onLogout,
            ),
          ),
          Positioned(
            left: 18,
            right: 18,
            bottom: 8,
            child: _SearchScanBar(
              controller: controller,
              onChanged: onChanged,
              onClear: onClear,
              onScan: onScan,
            ),
          ),
        ],
      ),
    );
  }
}

class _HeaderIconButton extends StatelessWidget {
  const _HeaderIconButton({
    required this.icon,
    required this.onTap,
    this.badge = 0,
  });

  final IconData icon;
  final VoidCallback onTap;
  final int badge;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(999),
      onTap: onTap,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: Colors.transparent,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: Colors.white, size: 30),
          ),
          if (badge > 0)
            Positioned(
              right: -4,
              top: -6,
              child: Container(
                width: 24,
                height: 24,
                alignment: Alignment.center,
                decoration: const BoxDecoration(
                  color: Color(0xFFFF4B4B),
                  shape: BoxShape.circle,
                ),
                child: Text(
                  badge > 9 ? '9+' : '$badge',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _AvatarButton extends StatelessWidget {
  const _AvatarButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(999),
      onTap: onTap,
      child: Container(
        width: 54,
        height: 54,
        padding: const EdgeInsets.all(3),
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: Colors.white.withValues(alpha: 0.85),
        ),
        child: const CircleAvatar(
          backgroundColor: Color(0xFFE4F4DF),
          backgroundImage: NetworkImage(
            'https://images.unsplash.com/photo-1607346256330-dee7af15f7c5?auto=format&fit=crop&w=240&q=80',
          ),
        ),
      ),
    );
  }
}

class _SearchScanBar extends StatelessWidget {
  const _SearchScanBar({
    required this.controller,
    required this.onChanged,
    required this.onScan,
    this.onClear,
  });

  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final VoidCallback onScan;
  final VoidCallback? onClear;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 58,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(15),
        boxShadow: [
          BoxShadow(
            color: AppColors.forest.withValues(alpha: 0.13),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Row(
        children: [
          const Icon(Icons.search_rounded, color: Color(0xFF102820), size: 30),
          const SizedBox(width: 12),
          Expanded(
            child: TextField(
              controller: controller,
              onChanged: onChanged,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
              decoration: const InputDecoration(
                hintText: 'Tìm lô, mã lô, loại nông sản...',
                hintStyle: TextStyle(
                  color: Color(0xFF6E6E6E),
                  fontSize: 15,
                  fontWeight: FontWeight.w500,
                ),
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                filled: false,
              ),
            ),
          ),
          if (onClear != null)
            IconButton(
              onPressed: onClear,
              icon: const Icon(Icons.close_rounded),
            ),
          IconButton(
            tooltip: 'Quét QR',
            onPressed: onScan,
            icon: const Icon(
              Icons.qr_code_scanner_rounded,
              color: AppColors.pine,
              size: 27,
            ),
          ),
        ],
      ),
    );
  }
}

class _TodayOverviewCard extends StatelessWidget {
  const _TodayOverviewCard({
    required this.batchCount,
    required this.inventoryTotal,
    required this.newJournalCount,
    required this.warningCount,
  });

  final int batchCount;
  final double inventoryTotal;
  final int newJournalCount;
  final int warningCount;

  @override
  Widget build(BuildContext context) {
    return GlassPanel(
      radius: 18,
      blur: 10,
      padding: const EdgeInsets.fromLTRB(18, 17, 18, 19),
      colors: [
        Colors.white.withValues(alpha: 0.99),
        Colors.white.withValues(alpha: 0.97),
      ],
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Tổng quan hôm nay',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: AppColors.forest,
                        fontWeight: FontWeight.w900,
                      ),
                ),
              ),
              const Icon(Icons.chevron_right_rounded, size: 26),
            ],
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: _OverviewMetric(
                  icon: Icons.eco_outlined,
                  value: '$batchCount',
                  label: 'Lô đang theo dõi',
                  color: AppColors.pine,
                ),
              ),
              const _OverviewDivider(),
              Expanded(
                child: _OverviewMetric(
                  icon: Icons.inventory_2_outlined,
                  value: _formatCompactKg(inventoryTotal),
                  label: 'Tồn kho',
                  color: const Color(0xFFE7A321),
                ),
              ),
              const _OverviewDivider(),
              Expanded(
                child: _OverviewMetric(
                  icon: Icons.assignment_turned_in_outlined,
                  value: '$newJournalCount',
                  label: 'Nhật ký mới',
                  color: AppColors.pine,
                ),
              ),
              const _OverviewDivider(),
              Expanded(
                child: _OverviewMetric(
                  icon: Icons.warning_amber_rounded,
                  value: '$warningCount',
                  label: 'Cảnh báo',
                  color: const Color(0xFFF17D18),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _OverviewDivider extends StatelessWidget {
  const _OverviewDivider();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 1,
      height: 66,
      margin: const EdgeInsets.symmetric(horizontal: 8),
      color: const Color(0xFFE6E6E6),
    );
  }
}

class _OverviewMetric extends StatelessWidget {
  const _OverviewMetric({
    required this.icon,
    required this.value,
    required this.label,
    required this.color,
  });

  final IconData icon;
  final String value;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 50,
          height: 50,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: color.withValues(alpha: 0.13),
          ),
          child: Icon(icon, color: color, size: 26),
        ),
        const SizedBox(height: 10),
        FittedBox(
          fit: BoxFit.scaleDown,
          child: Text(
            value,
            style: const TextStyle(
              color: AppColors.forest,
                fontSize: 22,
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          textAlign: TextAlign.center,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            color: AppColors.muted,
            fontSize: 11,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}

class _QuickActionTile extends StatelessWidget {
  const _QuickActionTile({
    required this.icon,
    required this.label,
    required this.onTap,
    this.width = 118,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final double width;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(13),
        shadowColor: AppColors.forest.withValues(alpha: 0.18),
        elevation: 3,
        child: InkWell(
          borderRadius: BorderRadius.circular(13),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 14),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, color: AppColors.pine, size: 35),
                const SizedBox(height: 11),
                Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: AppColors.ink,
                    fontWeight: FontWeight.w800,
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _QuickActionData {
  const _QuickActionData({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
}

List<_QuickActionData> _buildQuickActions(
  BuildContext context, {
  required VoidCallback onInventoryTap,
  required bool includeDiseaseDetection,
}) {
  return [
    _QuickActionData(
      icon: Icons.add_circle_outline_rounded,
      label: 'Tạo lô',
      onTap: () => Navigator.pushNamed(context, AppRouter.createProduct),
    ),
    _QuickActionData(
      icon: Icons.qr_code_scanner_rounded,
      label: 'Quét QR',
      onTap: () => Navigator.pushNamed(context, AppRouter.scanner),
    ),
    _QuickActionData(
      icon: Icons.edit_note_rounded,
      label: 'Nhật ký',
      onTap: () => Navigator.pushNamed(context, AppRouter.addEvent),
    ),
    _QuickActionData(
      icon: Icons.inventory_2_outlined,
      label: 'Tồn kho',
      onTap: onInventoryTap,
    ),
    _QuickActionData(
      icon: Icons.landscape_outlined,
      label: 'Vùng trồng',
      onTap: () => Navigator.pushNamed(context, '${AppRouter.management}?tab=1'),
    ),
    _QuickActionData(
      icon: Icons.science_outlined,
      label: 'Kiểm nghiệm',
      onTap: () => Navigator.pushNamed(context, '${AppRouter.management}?tab=0'),
    ),
    _QuickActionData(
      icon: Icons.verified_outlined,
      label: 'Chứng nhận',
      onTap: () => Navigator.pushNamed(context, '${AppRouter.management}?tab=2'),
    ),
    _QuickActionData(
      icon: Icons.videocam_outlined,
      label: 'Camera',
      onTap: () => Navigator.pushNamed(context, AppRouter.farmer),
    ),
    if (includeDiseaseDetection)
      _QuickActionData(
        icon: Icons.health_and_safety_outlined,
        label: 'Bệnh cây',
        onTap: () => Navigator.pushNamed(context, AppRouter.diseaseDetection),
      ),
    _QuickActionData(
      icon: Icons.delete_outline_rounded,
      label: 'Thùng rác',
      onTap: () => Navigator.pushNamed(context, AppRouter.productTrash),
    ),
  ];
}

class _QuickActionsGrid extends StatelessWidget {
  const _QuickActionsGrid({required this.actions});

  final List<_QuickActionData> actions;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final gap = constraints.maxWidth >= 700 ? 20.0 : 10.0;
        final itemWidth = constraints.maxWidth >= 700
            ? (constraints.maxWidth - gap * 4) / 5
            : constraints.maxWidth >= 520
                ? 128.0
                : 104.0;

        return SizedBox(
          height: 106,
          child: ScrollConfiguration(
            behavior: const _DragScrollBehavior(),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              clipBehavior: Clip.none,
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.only(right: 20),
              child: Row(
                children: [
                  for (var index = 0; index < actions.length; index++) ...[
                    _QuickActionTile(
                      icon: actions[index].icon,
                      label: actions[index].label,
                      onTap: actions[index].onTap,
                      width: itemWidth,
                    ),
                    if (index != actions.length - 1)
                      SizedBox(width: gap),
                  ],
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _DragScrollBehavior extends MaterialScrollBehavior {
  const _DragScrollBehavior();

  @override
  Set<PointerDeviceKind> get dragDevices => {
        PointerDeviceKind.touch,
        PointerDeviceKind.mouse,
        PointerDeviceKind.trackpad,
        PointerDeviceKind.stylus,
      };
}

class _ProductImageFallback extends StatelessWidget {
  const _ProductImageFallback({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF2A7F45), Color(0xFFF0D58D)],
        ),
      ),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.image_outlined,
              color: Colors.white,
              size: 36,
            ),
            const SizedBox(height: 8),
            Text(
              label,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HeroChip extends StatelessWidget {
  const _HeroChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(maxWidth: 210),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.white.withValues(alpha: 0.26)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: Colors.white),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _InventorySnapshot extends StatelessWidget {
  const _InventorySnapshot({
    required this.currentQuantity,
    required this.initialQuantity,
    required this.unit,
    required this.percent,
  });

  final double currentQuantity;
  final double initialQuantity;
  final String unit;
  final double percent;

  @override
  Widget build(BuildContext context) {
    final percentLabel = (percent * 100).round();
    final barColor = percentLabel < 25 ? const Color(0xFFEAA739) : AppColors.pine;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.28),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: Colors.white.withValues(alpha: 0.52)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: _QuantityLabel(
                  label: 'Tồn hiện tại',
                  value: '${_formatQuantity(currentQuantity)} $unit',
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _QuantityLabel(
                  label: 'Ban đầu',
                  value: '${_formatQuantity(initialQuantity)} $unit',
                  alignEnd: true,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(999),
                  child: LinearProgressIndicator(
                    minHeight: 9,
                    value: percent,
                    backgroundColor: Colors.white.withValues(alpha: 0.58),
                    valueColor: AlwaysStoppedAnimation<Color>(barColor),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Text(
                '$percentLabel%',
                style: TextStyle(
                  color: barColor,
                  fontWeight: FontWeight.w900,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _QuantityLabel extends StatelessWidget {
  const _QuantityLabel({
    required this.label,
    required this.value,
    this.alignEnd = false,
  });

  final String label;
  final String value;
  final bool alignEnd;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment:
          alignEnd ? CrossAxisAlignment.end : CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: AppColors.muted,
            fontSize: 11,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 3),
        Text(
          value,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            color: AppColors.ink,
            fontSize: 15,
            fontWeight: FontWeight.w900,
          ),
        ),
      ],
    );
  }
}

String _formatQuantity(double value) {
  if (value == value.roundToDouble()) return value.toStringAsFixed(0);
  return value.toStringAsFixed(2);
}

String _formatShortDate(DateTime date) {
  final day = date.day.toString().padLeft(2, '0');
  final month = date.month.toString().padLeft(2, '0');
  return '$day/$month/${date.year}';
}

String _formatCompactKg(double value) {
  final rounded = value.round();
  final text = rounded.toString().replaceAllMapped(
        RegExp(r'\B(?=(\d{3})+(?!\d))'),
        (_) => '.',
      );
  return '$text kg';
}

String _displayBatchCode(String value) {
  final trimmed = value.trim();
  if (trimmed.length <= 14) return trimmed;
  return '${trimmed.substring(0, 12)}...';
}

class _ProductThumb extends StatelessWidget {
  const _ProductThumb({
    required this.imageUrl,
    required this.label,
    this.width = 118,
    this.height = 92,
  });

  final String imageUrl;
  final String label;
  final double width;
  final double height;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: SizedBox(
        width: width,
        height: height,
        child: imageUrl.isEmpty
            ? _ProductImageFallback(label: label)
            : Image.network(
                imageUrl,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => _ProductImageFallback(
                  label: label,
                ),
              ),
      ),
    );
  }
}

class _CompactStatusPill extends StatelessWidget {
  const _CompactStatusPill({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final color = switch (status) {
      'completed' => const Color(0xFF2E956A),
      'draft' => const Color(0xFFF17D18),
      'recalled' => AppColors.danger,
      _ => AppColors.pine,
    };
    final label = switch (status) {
      'completed' => 'Hoàn tất',
      'draft' => 'Sắp thu hoạch',
      'recalled' => 'Thu hồi',
      _ => 'Đang theo dõi',
    };

    return FittedBox(
      fit: BoxFit.scaleDown,
      alignment: Alignment.centerLeft,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 11,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProductMetaLine extends StatelessWidget {
  const _ProductMetaLine({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 3),
      child: Row(
        children: [
          Icon(icon, size: 14, color: AppColors.muted),
          const SizedBox(width: 5),
          Expanded(
            child: Text(
              text,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: AppColors.muted,
                fontSize: 12,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TinyIconButton extends StatelessWidget {
  const _TinyIconButton({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 6),
      child: Material(
        color: AppColors.pine.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(999),
        child: InkWell(
          borderRadius: BorderRadius.circular(999),
          onTap: onTap,
          child: SizedBox(
            width: 34,
            height: 34,
            child: Icon(icon, color: AppColors.pine, size: 19),
          ),
        ),
      ),
    );
  }
}

class _BatchSheetAction extends StatelessWidget {
  const _BatchSheetAction({
    required this.icon,
    required this.label,
    required this.onTap,
    this.color = AppColors.pine,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 7),
          child: Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(13),
                ),
                child: Icon(icon, color: color, size: 21),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(
                    color: color == AppColors.danger ? color : AppColors.ink,
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              Icon(Icons.chevron_right_rounded, color: color),
            ],
          ),
        ),
      ),
    );
  }
}

class _InlineInfoChip extends StatelessWidget {
  const _InlineInfoChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.26),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.white.withValues(alpha: 0.42)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: AppColors.muted),
          const SizedBox(width: 6),
          Text(
            label,
            style: const TextStyle(
              color: AppColors.ink,
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _BatchNavItemData {
  const _BatchNavItemData({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
    this.badge,
    this.isPrimary = false,
  });

  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  final String? badge;
  final bool isPrimary;
}

class _BatchActionNavBar extends StatelessWidget {
  const _BatchActionNavBar({required this.items});

  final List<_BatchNavItemData> items;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(7),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.34),
        borderRadius: BorderRadius.circular(26),
        border: Border.all(color: Colors.white.withValues(alpha: 0.52)),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          const gap = 6.0;
          final available = constraints.maxWidth - gap * (items.length - 1);
          final fittedWidth = available / items.length;
          final itemWidth = fittedWidth.clamp(58.0, 82.0);
          final needsScroll = fittedWidth < 58;
          final row = Row(
            mainAxisSize: needsScroll ? MainAxisSize.min : MainAxisSize.max,
            children: [
              for (var index = 0; index < items.length; index++) ...[
                _BatchActionNavItem(item: items[index], width: itemWidth),
                if (index != items.length - 1) const SizedBox(width: gap),
              ],
            ],
          );

          if (!needsScroll) return row;
          return SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            child: row,
          );
        },
      ),
    );
  }
}

class _BatchActionNavItem extends StatelessWidget {
  const _BatchActionNavItem({required this.item, required this.width});

  final _BatchNavItemData item;
  final double width;

  @override
  Widget build(BuildContext context) {
    final background = item.isPrimary
        ? item.color
        : item.color.withValues(alpha: item.color == AppColors.danger ? 0.08 : 0.1);
    final foreground = item.isPrimary ? Colors.white : item.color;

    return Material(
      color: background,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: item.onTap,
        child: SizedBox(
          width: width,
          height: 64,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  Icon(item.icon, color: foreground, size: 21),
                  if (item.badge != null)
                    Positioned(
                      right: -13,
                      top: -9,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 5,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: foreground.withValues(alpha: item.isPrimary ? 0.22 : 0.12),
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(
                            color: foreground.withValues(alpha: 0.22),
                          ),
                        ),
                        child: Text(
                          item.badge!,
                          style: TextStyle(
                            color: foreground,
                            fontSize: 9,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                item.label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: foreground,
                  fontSize: width < 64 ? 9.5 : 10.5,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LatestEventStrip extends StatelessWidget {
  const _LatestEventStrip({required this.title, required this.note});

  final String title;
  final String note;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.28),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withValues(alpha: 0.5)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: AppColors.pine.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(
              Icons.update_rounded,
              color: AppColors.pine,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Cập nhật gần nhất',
                  style: TextStyle(
                    color: AppColors.muted,
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  title,
                  style: const TextStyle(
                    color: AppColors.ink,
                    fontWeight: FontWeight.w800,
                    fontSize: 14,
                  ),
                ),
                if (note.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    note,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 13),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _WorkflowSheet extends StatefulWidget {
  const _WorkflowSheet({
    required this.batch,
    required this.allBatches,
    required this.onSplit,
    required this.onMerge,
    required this.onStatusChange,
  });

  final Batch batch;
  final List<Batch> allBatches;
  final Future<void> Function(
    double quantity,
    String childName,
    String note,
  ) onSplit;
  final Future<void> Function(
    Batch targetBatch,
    double? targetSourceQuantity,
    String targetName,
    String note,
  ) onMerge;
  final Future<void> Function(
    String status,
    String reason,
    String note,
  ) onStatusChange;

  @override
  State<_WorkflowSheet> createState() => _WorkflowSheetState();
}

class _WorkflowSheetState extends State<_WorkflowSheet> {
  String _mode = 'split';
  bool _submitting = false;
  Batch? _mergeTarget;
  late String _targetStatus;
  final _splitQuantity = TextEditingController();
  final _childName = TextEditingController();
  final _splitNote = TextEditingController();
  final _mergeName = TextEditingController();
  final _mergeTargetSourceQuantity = TextEditingController();
  final _mergeNote = TextEditingController();
  final _statusReason = TextEditingController();
  final _statusNote = TextEditingController();

  @override
  void initState() {
    super.initState();
    final candidates = widget.allBatches.where((item) => item.id != widget.batch.id);
    _mergeTarget = candidates.isEmpty ? null : candidates.first;
    if (_mergeTarget != null) {
      _mergeTargetSourceQuantity.text = _formatQuantity(_mergeTarget!.currentQuantity);
    }
    final options = _nextStatusOptions();
    _targetStatus = options.isEmpty ? widget.batch.status : options.first;
  }

  @override
  void dispose() {
    _splitQuantity.dispose();
    _childName.dispose();
    _splitNote.dispose();
    _mergeName.dispose();
    _mergeTargetSourceQuantity.dispose();
    _mergeNote.dispose();
    _statusReason.dispose();
    _statusNote.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_submitting) return;
    setState(() => _submitting = true);
    try {
      if (_mode == 'split') {
        final quantity = _parseRequired(_splitQuantity.text, 'Số lượng tách');
        _ensureAtMost(
          quantity,
          widget.batch.currentQuantity,
          'Số lượng tách không được lớn hơn tồn hiện tại',
        );
        await widget.onSplit(
          quantity,
          _childName.text,
          _splitNote.text,
        );
      } else if (_mode == 'merge') {
        final target = _mergeTarget;
        if (target == null) throw Exception('Vui lòng chọn lô để gộp');
        final targetSourceQuantity =
            _parseOptional(_mergeTargetSourceQuantity.text) ?? target.currentQuantity;
        _ensureAtMost(
          targetSourceQuantity,
          target.currentQuantity,
          'Lượng lấy từ lô gộp cùng không được lớn hơn tồn của lô đó',
        );
        await widget.onMerge(
          target,
          targetSourceQuantity,
          _mergeName.text,
          _mergeNote.text,
        );
      } else {
        if (_statusReason.text.trim().isEmpty) {
          throw Exception('Vui lòng nhập lý do chuyển trạng thái');
        }
        await widget.onStatusChange(
          _targetStatus,
          _statusReason.text,
          _statusNote.text,
        );
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(_friendlyError(error)),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  double _parseRequired(String raw, String label) {
    final value = double.tryParse(raw.trim().replaceAll(',', '.'));
    if (value == null || value <= 0) {
      throw Exception('$label phải lớn hơn 0');
    }
    return value;
  }

  double? _parseOptional(String raw) {
    final trimmed = raw.trim();
    if (trimmed.isEmpty) return null;
    final value = double.tryParse(trimmed.replaceAll(',', '.'));
    if (value == null || value <= 0) {
      throw Exception('Số lượng phải lớn hơn 0');
    }
    return value;
  }

  void _ensureAtMost(double value, double max, String message) {
    if (value - max > 0.000001) {
      throw Exception('$message. Tối đa: ${_formatQuantity(max)} ${widget.batch.unit}');
    }
  }

  @override
  Widget build(BuildContext context) {
    final viewInsets = MediaQuery.viewInsetsOf(context);
    return Padding(
      padding: EdgeInsets.only(bottom: viewInsets.bottom),
      child: GlassPanel(
        radius: 30,
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
        colors: [
          Colors.white.withValues(alpha: 0.94),
          const Color(0xFFEAF6E7),
        ],
        child: SafeArea(
          top: false,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 44,
                    height: 5,
                    decoration: BoxDecoration(
                      color: AppColors.muted.withValues(alpha: 0.28),
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  widget.batch.productName,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 4),
                Text(
                  'Tồn: ${_formatQuantity(widget.batch.currentQuantity)} ${widget.batch.unit}',
                  style: const TextStyle(
                    color: AppColors.muted,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 16),
                SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(
                      value: 'split',
                      icon: Icon(Icons.call_split_rounded),
                      label: Text('Tách'),
                    ),
                    ButtonSegment(
                      value: 'merge',
                      icon: Icon(Icons.merge_type_rounded),
                      label: Text('Gộp'),
                    ),
                    ButtonSegment(
                      value: 'status',
                      icon: Icon(Icons.flag_circle_outlined),
                      label: Text('Trạng thái'),
                    ),
                  ],
                  selected: {_mode},
                  onSelectionChanged: (value) => setState(() => _mode = value.first),
                ),
                const SizedBox(height: 16),
                if (_mode == 'split') _buildSplitForm(),
                if (_mode == 'merge') _buildMergeForm(),
                if (_mode == 'status') _buildStatusForm(),
                const SizedBox(height: 18),
                FilledButton.icon(
                  onPressed: _submitting ? null : _submit,
                  icon: _submitting
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.check_rounded),
                  label: Text(_submitting ? 'Đang xử lý...' : 'Xác nhận'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSplitForm() {
    return Column(
      children: [
        _NumberField(
          controller: _splitQuantity,
          label: 'Số lượng tách',
          hint: 'Ví dụ: 25',
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _childName,
          decoration: const InputDecoration(
            labelText: 'Tên lô con',
            hintText: 'Để trống để hệ thống tự đặt tên',
            prefixIcon: Icon(Icons.inventory_2_outlined),
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _splitNote,
          minLines: 2,
          maxLines: 4,
          decoration: const InputDecoration(
            labelText: 'Ghi chú',
            prefixIcon: Icon(Icons.notes_rounded),
          ),
        ),
      ],
    );
  }

  Widget _buildMergeForm() {
    final candidates = widget.allBatches
        .where((item) => item.id != widget.batch.id)
        .toList();
    return Column(
      children: [
        DropdownButtonFormField<Batch>(
          initialValue: _mergeTarget,
          items: candidates
              .map(
                (item) => DropdownMenuItem(
                  value: item,
                  child: Text(
                    '${item.productName} - ${_formatQuantity(item.currentQuantity)} ${item.unit}',
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              )
              .toList(),
          onChanged: (value) => setState(() {
            _mergeTarget = value;
            _mergeTargetSourceQuantity.text =
                value == null ? '' : _formatQuantity(value.currentQuantity);
          }),
          decoration: const InputDecoration(
            labelText: 'Lô sẽ gộp vào lô hiện tại',
            prefixIcon: Icon(Icons.inventory_rounded),
          ),
        ),
        const SizedBox(height: 12),
        _NumberField(
          controller: _mergeTargetSourceQuantity,
          label: 'Số lượng lấy từ lô này',
          hint: 'Để trống để gộp toàn bộ tồn',
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _mergeName,
          decoration: const InputDecoration(
            labelText: 'Tên lô hiện tại sau gộp',
            hintText: 'Để trống để giữ tên hiện tại',
            prefixIcon: Icon(Icons.label_outline_rounded),
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _mergeNote,
          minLines: 2,
          maxLines: 4,
          decoration: const InputDecoration(
            labelText: 'Ghi chú',
            prefixIcon: Icon(Icons.notes_rounded),
          ),
        ),
      ],
    );
  }

  Widget _buildStatusForm() {
    final options = _nextStatusOptions();
    if (options.isEmpty) {
      return const Text(
        'Lô đang ở trạng thái cuối. Chỉ quản trị viên mới có thể xử lý trường hợp đặc biệt.',
        style: TextStyle(color: AppColors.muted, fontWeight: FontWeight.w700),
      );
    }

    if (!options.contains(_targetStatus)) _targetStatus = options.first;

    return Column(
      children: [
        DropdownButtonFormField<String>(
          initialValue: _targetStatus,
          items: options
              .map(
                (status) => DropdownMenuItem(
                  value: status,
                  child: Text(_statusLabel(status)),
                ),
              )
              .toList(),
          onChanged: (value) => setState(() => _targetStatus = value ?? _targetStatus),
          decoration: const InputDecoration(
            labelText: 'Trạng thái mới',
            prefixIcon: Icon(Icons.flag_circle_outlined),
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _statusReason,
          minLines: 2,
          maxLines: 4,
          decoration: const InputDecoration(
            labelText: 'Lý do chuyển trạng thái',
            prefixIcon: Icon(Icons.fact_check_outlined),
          ),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _statusNote,
          minLines: 2,
          maxLines: 4,
          decoration: const InputDecoration(
            labelText: 'Ghi chú',
            prefixIcon: Icon(Icons.notes_rounded),
          ),
        ),
      ],
    );
  }

  List<String> _nextStatusOptions() {
    switch (widget.batch.status) {
      case 'draft':
        return const ['active'];
      case 'active':
        return const ['completed'];
      default:
        return const [];
    }
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'draft':
        return 'Bản nháp';
      case 'active':
        return 'Đang theo dõi';
      case 'completed':
        return 'Hoàn tất';
      case 'recalled':
        return 'Thu hồi';
      default:
        return status;
    }
  }

  String _formatQuantity(double value) {
    if (value == value.roundToDouble()) return value.toStringAsFixed(0);
    return value.toStringAsFixed(2);
  }
}

class _NumberField extends StatelessWidget {
  const _NumberField({
    required this.controller,
    required this.label,
    this.hint,
    this.onChanged,
  });

  final TextEditingController controller;
  final String label;
  final String? hint;
  final ValueChanged<String>? onChanged;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      onChanged: onChanged,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        prefixIcon: const Icon(Icons.scale_outlined),
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    final color = switch (status) {
      'completed' => const Color(0xFF2E956A),
      'draft' => const Color(0xFFA46A1F),
      'recalled' => AppColors.danger,
      _ => AppColors.pine,
    };

    final label = switch (status) {
      'completed' => 'HOÀN TẤT',
      'draft' => 'BẢN NHÁP',
      'active' => 'ĐANG THEO DÕI',
      'recalled' => 'THU HỒI',
      _ => status.toUpperCase(),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.18)),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.w800,
          fontSize: 11,
          letterSpacing: 0.4,
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: GlassPanel(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const GlassIconCapsule(
                icon: Icons.cloud_off_rounded,
                size: 62,
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
        ),
      ),
    );
  }
}

class _NotificationBellButton extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final unreadCountAsync = ref.watch(unreadNotificationCountProvider);

    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: () => Navigator.pushNamed(context, AppRouter.notifications),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          const GlassIconCapsule(
            icon: Icons.notifications_outlined,
            color: AppColors.ink,
          ),
          unreadCountAsync.when(
            loading: () => const SizedBox.shrink(),
<<<<<<< HEAD
            error: (error, stackTrace) => const SizedBox.shrink(),
=======
            error: (_, _) => const SizedBox.shrink(),
>>>>>>> dan/main
            data: (count) {
              if (count == 0) return const SizedBox.shrink();
              return Positioned(
                right: -4,
                top: -4,
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: const BoxDecoration(
                    color: AppColors.danger,
                    shape: BoxShape.circle,
                  ),
                  constraints: const BoxConstraints(
                    minWidth: 18,
                    minHeight: 18,
                  ),
                  child: Text(
                    count > 99 ? '99+' : count.toString(),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
