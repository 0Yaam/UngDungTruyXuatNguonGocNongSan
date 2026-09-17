import 'package:app/core/api_client.dart';
import 'package:app/models/notification.dart';
import 'package:dio/dio.dart';

class NotificationService {
  final _dio = ApiClient.instance.dio;

  Future<NotificationResponse> getNotifications({int page = 1, int limit = 20}) async {
    try {
      final res = await _dio.get(
        '/notifications',
        queryParameters: {'page': page, 'limit': limit},
      );

      final data = res.data as Map<String, dynamic>;
      return NotificationResponse.fromJson(data);
    } on DioException catch (error) {
      final responseData = error.response?.data;

      if (responseData is Map<String, dynamic>) {
        final message =
            responseData['msg'] ??
            responseData['message'] ??
            responseData['error'];
        if (message != null) {
          throw Exception(message.toString());
        }
      }

      throw Exception(error.message ?? 'Không thể tải thông báo');
    }
  }

  Future<int> getUnreadCount() async {
    try {
      final res = await _dio.get('/notifications/unread-count');
      final data = res.data as Map<String, dynamic>;
      return data['count'] as int? ?? 0;
    } on DioException catch (error) {
      final responseData = error.response?.data;

      if (responseData is Map<String, dynamic>) {
        final message =
            responseData['msg'] ??
            responseData['message'] ??
            responseData['error'];
        if (message != null) {
          throw Exception(message.toString());
        }
      }

      throw Exception(error.message ?? 'Không thể tải số thông báo chưa đọc');
    }
  }

  Future<Notification> markAsRead(String notificationId) async {
    try {
      final res = await _dio.patch('/notifications/$notificationId/read');
      final data = res.data as Map<String, dynamic>;
      return Notification.fromJson(data['notification'] as Map<String, dynamic>);
    } on DioException catch (error) {
      final responseData = error.response?.data;

      if (responseData is Map<String, dynamic>) {
        final message =
            responseData['msg'] ??
            responseData['message'] ??
            responseData['error'];
        if (message != null) {
          throw Exception(message.toString());
        }
      }

      throw Exception(error.message ?? 'Không thể đánh dấu đã đọc');
    }
  }

  Future<void> markAllAsRead() async {
    try {
      await _dio.patch('/notifications/read-all');
    } on DioException catch (error) {
      final responseData = error.response?.data;

      if (responseData is Map<String, dynamic>) {
        final message =
            responseData['msg'] ??
            responseData['message'] ??
            responseData['error'];
        if (message != null) {
          throw Exception(message.toString());
        }
      }

      throw Exception(error.message ?? 'Không thể đánh dấu tất cả đã đọc');
    }
  }

  Future<void> deleteNotification(String notificationId) async {
    try {
      await _dio.delete('/notifications/$notificationId');
    } on DioException catch (error) {
      final responseData = error.response?.data;

      if (responseData is Map<String, dynamic>) {
        final message =
            responseData['msg'] ??
            responseData['message'] ??
            responseData['error'];
        if (message != null) {
          throw Exception(message.toString());
        }
      }

      throw Exception(error.message ?? 'Không thể xóa thông báo');
    }
  }
}
