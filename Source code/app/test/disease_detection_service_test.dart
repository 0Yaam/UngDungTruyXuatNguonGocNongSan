import 'dart:convert';
import 'dart:typed_data';

import 'package:app/services/disease_detection_service.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('DiseaseDetectionService.getCapabilities', () {
    test('accepts the supported data envelope', () async {
      final service = _serviceWithResponse({
        'data': {
          'model': {
            'ready': true,
            'version': 'plant-disease-v1',
            'maxImages': 3,
          },
          'supportedCrops': [
            {
              'code': 'tomato',
              'label': 'Cà chua',
              'aliases': ['cà chua', 'tomato'],
            },
          ],
        },
      });

      final result = await service.getCapabilities();

      expect(result.model.ready, isTrue);
      expect(result.supportedCrops.single.code, 'tomato');
    });

    test(
      'keeps an explicit unavailable model distinct from a bad response',
      () async {
        final service = _serviceWithResponse({
          'model': {'ready': false, 'version': null, 'maxImages': 3},
          'supportedCrops': <Map<String, dynamic>>[],
        });

        final result = await service.getCapabilities();

        expect(result.model.ready, isFalse);
        expect(result.supportedCrops, isEmpty);
      },
    );

    test('rejects a successful response with the wrong contract', () async {
      final service = _serviceWithResponse({'status': 'ok'});

      await expectLater(
        service.getCapabilities(),
        throwsA(
          isA<DiseaseDetectionServiceException>()
              .having(
                (error) => error.code,
                'code',
                'INVALID_CAPABILITIES_RESPONSE',
              )
              .having(
                (error) => error.message,
                'message',
                contains('không đúng định dạng'),
              ),
        ),
      );
    });
  });
}

DiseaseDetectionService _serviceWithResponse(Object payload) {
  final dio = Dio(BaseOptions(baseUrl: 'http://localhost:5000/api/v1'));
  dio.httpClientAdapter = _JsonAdapter(payload);
  return DiseaseDetectionService(dio: dio);
}

class _JsonAdapter implements HttpClientAdapter {
  const _JsonAdapter(this.payload);

  final Object payload;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    return ResponseBody.fromString(
      jsonEncode(payload),
      200,
      headers: {
        Headers.contentTypeHeader: ['application/json'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}
