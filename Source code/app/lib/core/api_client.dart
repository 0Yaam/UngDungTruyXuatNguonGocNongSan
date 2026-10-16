import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

String _resolveBaseUrl() {
  const configured = String.fromEnvironment('API_BASE_URL');
  if (configured.isNotEmpty) {
    return configured;
  }

  if (kIsWeb) {
    return 'http://localhost:5000/api/v1';
  }

  if (Platform.isAndroid) {
    return 'http://10.0.2.2:5000/api/v1';
  }

  if (Platform.isIOS || Platform.isMacOS || Platform.isWindows) {
    return 'http://localhost:5000/api/v1';
  }

  return 'http://localhost:5000/api/v1';
}

final String kBaseUrl = _resolveBaseUrl();

class ApiClient {
  ApiClient._();
  static final instance = ApiClient._();

  String? _token;

  late final Dio dio = Dio(
    BaseOptions(
      baseUrl: kBaseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {'Content-Type': 'application/json'},
    ),
  )..interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          if (_token != null && _token!.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $_token';
          }
          handler.next(options);
        },
      ),
    );

  void setToken(String? token) => _token = token;
}


Uri phoneCameraWebSocketUri({
  required String mode,
  required String key,
}) {
  final base = Uri.parse(kBaseUrl);
  final wsScheme = base.scheme == 'https' ? 'wss' : 'ws';
  return base.replace(
    scheme: wsScheme,
    path: '/api/v1/phone-cameras',
    queryParameters: {
      'mode': mode,
      'key': key.trim().toUpperCase(),
    },
  );
}
