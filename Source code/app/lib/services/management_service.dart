import 'package:app/core/api_client.dart';
import 'package:dio/dio.dart';

class ManagementService {
  ManagementService({Dio? dio}) : _dio = dio ?? ApiClient.instance.dio;
  final Dio _dio;

  Future<List<Map<String, dynamic>>> getQualityInspections() async {
    final response = await _dio.get('/quality-inspections/my/inspections');
    return _list(response.data, 'inspections');
  }

  Future<void> createQualityInspection(Map<String, dynamic> data) async {
    await _dio.post('/quality-inspections', data: data);
  }

  Future<List<Map<String, dynamic>>> getFarmingAreas() async {
    final response = await _dio.get('/farming-areas/my/areas');
    return _list(response.data, 'farmingAreas');
  }

  Future<void> createFarmingArea(Map<String, dynamic> data) async {
    await _dio.post('/farming-areas', data: data);
  }

  Future<void> updateFarmingArea(String id, Map<String, dynamic> data) async {
    await _dio.patch('/farming-areas/$id', data: data);
  }

  Future<List<Map<String, dynamic>>> getCertifications() async {
    final response = await _dio.get('/certifications');
    return _list(response.data, 'certifications');
  }

  Future<void> createCertification(Map<String, dynamic> data) async {
    await _dio.post('/certifications', data: data);
  }

  List<Map<String, dynamic>> _list(dynamic payload, String key) {
    final raw = payload is Map<String, dynamic>
        ? (payload[key] as List<dynamic>? ?? const [])
        : (payload is List ? payload : const <dynamic>[]);
    return raw.whereType<Map<String, dynamic>>().toList();
  }
}
