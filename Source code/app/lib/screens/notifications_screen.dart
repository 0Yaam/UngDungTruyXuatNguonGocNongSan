import 'package:app/core/router.dart';
import 'package:app/core/theme.dart';
import 'package:app/models/notification.dart' as model;
import 'package:app/providers/providers.dart';
import 'package:app/widgets/liquid_glass.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  @override
  Widget build(BuildContext context) {
    final notificationsAsync = ref.watch(notificationListProvider);

    return Scaffold(
      body: GlassPageBackground(
        child: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 14, 20, 0),
                child: Row(
                  children: [
                    InkWell(
                      borderRadius: BorderRadius.circular(18),
                      onTap: () => Navigator.pop(context),
                      child: const GlassIconCapsule(
                        icon: Icons.arrow_back_rounded,
                        color: AppColors.ink,
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Text(
                        'Thông báo',
                        style: Theme.of(context).textTheme.headlineMedium,
                      ),
                    ),
                    TextButton.icon(
                      onPressed: () async {
                        try {
                          await ref.read(notificationServiceProvider).markAllAsRead();
                          ref.invalidate(notificationListProvider);
                          ref.invalidate(unreadNotificationCountProvider);
                        } catch (e) {
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Lỗi: $e')),
                            );
                          }
                        }
                      },
                      icon: const Icon(Icons.done_all_rounded, size: 18),
                      label: const Text('Đã đọc tất cả'),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Expanded(
                child: notificationsAsync.when(
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (error, _) => _ErrorState(
                    message: 'Không tải được thông báo.\n$error',
                    onRetry: () => ref.invalidate(notificationListProvider),
                  ),
                  data: (response) {
                    if (response.notifications.isEmpty) {
                      return Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: GlassPanel(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const GlassIconCapsule(
                                  icon: Icons.notifications_none_rounded,
                                  size: 62,
                                  color: AppColors.muted,
                                ),
                                const SizedBox(height: 16),
                                const Text(
                                  'Chưa có thông báo nào',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.muted,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    }

                    return RefreshIndicator(
                      onRefresh: () async {
                        ref.invalidate(notificationListProvider);
                        ref.invalidate(unreadNotificationCountProvider);
                      },
                      child: ListView.separated(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
                        itemCount: response.notifications.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          final notification = response.notifications[index];
                          return _NotificationCard(
                            notification: notification,
                            onTap: () => _handleNotificationTap(notification),
                            onDismiss: () => _handleNotificationDismiss(notification),
                          );
                        },
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _handleNotificationTap(model.Notification notification) async {
    if (!notification.isRead) {
      try {
        await ref.read(notificationServiceProvider).markAsRead(notification.id);
        ref.invalidate(notificationListProvider);
        ref.invalidate(unreadNotificationCountProvider);
      } catch (e) {
        debugPrint('Failed to mark notification as read: $e');
      }
    }

    if (!mounted) return;

    // Navigate to related entity if available
    if (notification.relatedEntity != null) {
      final entity = notification.relatedEntity!;
      switch (entity.type) {
        case 'product':
          Navigator.pushNamed(
            context,
            '${AppRouter.timeline}?batchId=${entity.id}',
          );
          break;
        case 'certification':
          // Could add certification detail route in the future
          break;
        default:
          break;
      }
    }
  }

  Future<void> _handleNotificationDismiss(model.Notification notification) async {
    try {
      await ref.read(notificationServiceProvider).deleteNotification(notification.id);
      ref.invalidate(notificationListProvider);
      ref.invalidate(unreadNotificationCountProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Không thể xóa thông báo: $e')),
        );
      }
    }
  }
}

class _NotificationCard extends StatelessWidget {
  const _NotificationCard({
    required this.notification,
    required this.onTap,
    required this.onDismiss,
  });

  final model.Notification notification;
  final VoidCallback onTap;
  final VoidCallback onDismiss;

  @override
  Widget build(BuildContext context) {
    final iconData = _getIconForCategory(notification.category);
    final iconColor = _getColorForType(notification.type);
    final timeAgo = _formatTimeAgo(notification.createdAt);

    return Dismissible(
      key: Key(notification.id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        decoration: BoxDecoration(
          color: AppColors.danger.withValues(alpha: 0.2),
          borderRadius: BorderRadius.circular(26),
        ),
        child: const Icon(
          Icons.delete_rounded,
          color: AppColors.danger,
        ),
      ),
      onDismissed: (_) => onDismiss(),
      child: InkWell(
        borderRadius: BorderRadius.circular(26),
        onTap: onTap,
        child: GlassPanel(
          colors: notification.isRead
              ? [
                  Colors.white.withValues(alpha: 0.4),
                  Colors.white.withValues(alpha: 0.2),
                ]
              : [
                  Colors.white.withValues(alpha: 0.7),
                  const Color(0xFFE8F0FF),
                ],
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              GlassIconCapsule(
                icon: iconData,
                size: 48,
                color: iconColor,
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            notification.title,
                            style: TextStyle(
                              fontWeight: notification.isRead
                                  ? FontWeight.w600
                                  : FontWeight.w800,
                              fontSize: 15,
                              color: AppColors.ink,
                            ),
                          ),
                        ),
                        if (!notification.isRead)
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: AppColors.pine,
                              shape: BoxShape.circle,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      notification.message,
                      style: TextStyle(
                        color: notification.isRead
                            ? AppColors.muted
                            : AppColors.ink.withValues(alpha: 0.8),
                        fontSize: 13,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      timeAgo,
                      style: const TextStyle(
                        color: AppColors.muted,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  IconData _getIconForCategory(String category) {
    switch (category) {
      case 'product':
        return Icons.inventory_2_outlined;
      case 'trace_event':
        return Icons.timeline_rounded;
      case 'certification':
        return Icons.verified_outlined;
      case 'system':
      default:
        return Icons.info_outline_rounded;
    }
  }

  Color _getColorForType(String type) {
    switch (type) {
      case 'success':
        return const Color(0xFF2E956A);
      case 'warning':
        return const Color(0xFFA46A1F);
      case 'error':
        return AppColors.danger;
      case 'info':
      default:
        return AppColors.pine;
    }
  }

  String _formatTimeAgo(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inMinutes < 1) {
      return 'Vừa xong';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes} phút trước';
    } else if (difference.inHours < 24) {
      return '${difference.inHours} giờ trước';
    } else if (difference.inDays < 7) {
      return '${difference.inDays} ngày trước';
    } else {
      return DateFormat('dd/MM/yyyy').format(dateTime);
    }
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
