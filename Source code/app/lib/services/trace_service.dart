import 'package:app/core/api_client.dart';
import 'package:app/models/full_trace.dart';
import 'package:app/models/product.dart';
import 'package:app/models/trace_event.dart';

class TraceService {
  final _dio = ApiClient.instance.dio;

  Future<FullTrace> getFullTrace(String productId) async {
    final res = await _dio.get('/public/trace/$productId');
    final payload = res.data as Map<String, dynamic>;
    final tracePayload = payload['trace'];

    return FullTrace.fromJson(
      tracePayload is Map<String, dynamic> ? tracePayload : payload,
    );
  }

  Future<Map<String, dynamic>> verifyEvent(String eventId) async {
    final res = await _dio.get('/trace/verify/$eventId');
    return res.data as Map<String, dynamic>;
  }

  Future<List<Product>> getProducts() async {
    final res = await _dio.get('/products');
    final payload = res.data;
    final items = payload is List
        ? payload
        : (payload is Map<String, dynamic>
            ? (payload['products'] as List<dynamic>? ?? const [])
            : const <dynamic>[]);

    return items
        .map((e) => Product.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<TraceEvent> createEvent({
    required String productId,
    required String eventType,
    required String description,
    Map<String, dynamic>? details,
  }) async {
    final data = <String, dynamic>{
      'product': productId,
      'eventType': eventType,
      'description': description,
    };
    if (details != null) {
      data['details'] = details;
    }

    final res = await _dio.post('/trace/events', data: data);

    final payload = res.data as Map<String, dynamic>;
    final eventPayload = payload['event'] ?? payload['traceEvent'] ?? payload;

    return TraceEvent.fromJson(eventPayload as Map<String, dynamic>);
  }
}

