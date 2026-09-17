import 'package:app/core/api_client.dart';
import 'package:dio/dio.dart';

class AuthService {
  final _dio = ApiClient.instance.dio;

  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final res = await _dio.post(
        '/auth/login',
        data: {'email': email, 'password': password},
      );

      final data = res.data as Map<String, dynamic>;
      ApiClient.instance.setToken(data['token'] as String?);
      return data;
    } on DioException catch (error) {
      _handleDioError(error, 'Đăng nhập thất bại');
    }
  }

  Future<Map<String, dynamic>> register({
    required String firstName,
    required String lastName,
    required String email,
    required String password,
  }) async {
    try {
      final res = await _dio.post(
        '/auth/register',
        data: {
          'first_name': firstName,
          'last_name': lastName,
          'email': email,
          'password': password,
        },
      );

      final data = res.data as Map<String, dynamic>;
      return data;
    } on DioException catch (error) {
      _handleDioError(error, 'Đăng ký thất bại');
    }
  }

  Future<void> forgotPassword(String email) async {
    try {
      await _dio.post(
        '/auth/forgot-password',
        data: {'email': email},
      );
    } on DioException catch (error) {
      _handleDioError(error, 'Gửi yêu cầu thất bại');
    }
  }

  Never _handleDioError(DioException error, String defaultMessage) {
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

    if (error.type == DioExceptionType.connectionError ||
        error.type == DioExceptionType.connectionTimeout) {
      throw Exception(
        'Không kết nối được tới máy chủ. Base URL hiện tại: $kBaseUrl',
      );
    }

    throw Exception(error.message ?? defaultMessage);
  }
}
