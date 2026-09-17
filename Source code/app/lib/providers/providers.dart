import 'package:app/models/batch.dart';
import 'package:app/models/full_trace.dart';
import 'package:app/models/notification.dart' as model;
import 'package:app/models/product.dart';
import 'package:app/services/auth_service.dart';
import 'package:app/services/batch_service.dart';
import 'package:app/services/disease_detection_service.dart';
import 'package:app/services/notification_service.dart';
import 'package:app/services/management_service.dart';
import 'package:app/services/trace_service.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final authServiceProvider = Provider((_) => AuthService());
final authStateProvider = StateProvider<Map<String, dynamic>?>((_) => null);

final batchServiceProvider = Provider<BatchService>((_) => BatchService());
final diseaseDetectionServiceProvider = Provider<DiseaseDetectionService>(
  (_) => DiseaseDetectionService(),
);
final traceServiceProvider = Provider<TraceService>((_) => TraceService());
final notificationServiceProvider = Provider<NotificationService>(
  (_) => NotificationService(),
);
final managementServiceProvider = Provider<ManagementService>(
  (_) => ManagementService(),
);

final batchListProvider = FutureProvider.autoDispose<List<Batch>>((ref) {
  return ref.read(batchServiceProvider).getBatches();
});

final batchTimelineProvider = FutureProvider.autoDispose.family<Batch, String>((
  ref,
  batchId,
) {
  return ref.read(batchServiceProvider).getTimeline(batchId);
});

final productListProvider = FutureProvider.autoDispose<List<Product>>((ref) {
  return ref.read(traceServiceProvider).getProducts();
});

final fullTraceProvider = FutureProvider.autoDispose.family<FullTrace, String>((
  ref,
  productId,
) {
  return ref.read(traceServiceProvider).getFullTrace(productId);
});

final verifyEventProvider = FutureProvider.autoDispose
    .family<Map<String, dynamic>, String>((ref, eventId) {
      return ref.read(traceServiceProvider).verifyEvent(eventId);
    });

final notificationListProvider =
    FutureProvider.autoDispose<model.NotificationResponse>((ref) {
      return ref.read(notificationServiceProvider).getNotifications();
    });

final unreadNotificationCountProvider = FutureProvider.autoDispose<int>((ref) {
  return ref.read(notificationServiceProvider).getUnreadCount();
});
