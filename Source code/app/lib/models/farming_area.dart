class FarmingAreaCoordinates {
  final double lat;
  final double lng;

  const FarmingAreaCoordinates({required this.lat, required this.lng});

  factory FarmingAreaCoordinates.fromJson(Map<String, dynamic> json) {
    final lat = _toDouble(json['lat']);
    final lng = _toDouble(json['lng']);

    if (lat == null || lng == null) {
      throw const FormatException('Invalid farming area coordinates');
    }

    return FarmingAreaCoordinates(lat: lat, lng: lng);
  }

  Object? operator [](String key) {
    switch (key) {
      case 'lat':
        return lat;
      case 'lng':
        return lng;
      default:
        return null;
    }
  }
}

class FarmingAreaOwner {
  final String? id;
  final String firstName;
  final String lastName;
  final String? email;

  const FarmingAreaOwner({
    this.id,
    required this.firstName,
    required this.lastName,
    this.email,
  });

  String get fullName => '$firstName $lastName'.trim();

  factory FarmingAreaOwner.fromJson(Map<String, dynamic> json) {
    return FarmingAreaOwner(
      id: json['_id'] as String?,
      firstName: json['first_name'] as String? ?? '',
      lastName: json['last_name'] as String? ?? '',
      email: json['email'] as String?,
    );
  }

  Object? operator [](String key) {
    switch (key) {
      case '_id':
        return id;
      case 'first_name':
        return firstName;
      case 'last_name':
        return lastName;
      case 'email':
        return email;
      default:
        return null;
    }
  }
}

class FarmingAreaCertification {
  final String? id;
  final String name;
  final String type;
  final String status;
  final String? certificateNumber;
  final String? issuingAuthority;
  final DateTime? expiryDate;
  final String? scope;

  const FarmingAreaCertification({
    this.id,
    required this.name,
    required this.type,
    required this.status,
    this.certificateNumber,
    this.issuingAuthority,
    this.expiryDate,
    this.scope,
  });

  bool get isValid => status == 'valid';

  factory FarmingAreaCertification.fromJson(Map<String, dynamic> json) {
    return FarmingAreaCertification(
      id: json['_id'] as String?,
      name: json['name'] as String? ?? '',
      type: json['type'] as String? ?? 'Other',
      status: json['status'] as String? ?? 'expired',
      certificateNumber: json['certificate_number'] as String?,
      issuingAuthority: json['issuing_authority'] as String?,
      expiryDate: json['expiry_date'] != null
          ? DateTime.tryParse(json['expiry_date'].toString())
          : null,
      scope: json['scope'] as String?,
    );
  }

  Object? operator [](String key) {
    switch (key) {
      case '_id':
        return id;
      case 'name':
        return name;
      case 'type':
        return type;
      case 'status':
        return status;
      case 'certificate_number':
        return certificateNumber;
      case 'issuing_authority':
        return issuingAuthority;
      case 'expiry_date':
        return expiryDate?.toIso8601String();
      case 'scope':
        return scope;
      default:
        return null;
    }
  }
}

class FarmingArea {
  final String id;
  final String name;
  final String address;
  final double? areaSize;
  final FarmingAreaCoordinates? coordinates;
  final FarmingAreaOwner? owner;
  final List<FarmingAreaCertification> certifications;

  const FarmingArea({
    required this.id,
    required this.name,
    required this.address,
    this.areaSize,
    this.coordinates,
    this.owner,
    this.certifications = const [],
  });

  factory FarmingArea.fromJson(Map<String, dynamic> json) {
    final coordinatesJson = json['coordinates'];
    final ownerJson = json['owner'];
    final certificationsJson = json['certifications'];

    return FarmingArea(
      id: json['_id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      address: json['address'] as String? ?? '',
      areaSize: _toDouble(json['area_size']),
      coordinates: coordinatesJson is Map<String, dynamic>
          ? _tryParseCoordinates(coordinatesJson)
          : null,
      owner: ownerJson is Map<String, dynamic>
          ? FarmingAreaOwner.fromJson(ownerJson)
          : null,
      certifications: certificationsJson is List
          ? certificationsJson
                .whereType<Map<String, dynamic>>()
                .map(FarmingAreaCertification.fromJson)
                .toList()
          : const [],
    );
  }

  Object? operator [](String key) {
    switch (key) {
      case '_id':
        return id;
      case 'name':
        return name;
      case 'address':
        return address;
      case 'area_size':
        return areaSize;
      case 'coordinates':
        return coordinates;
      case 'owner':
        return owner;
      case 'certifications':
        return certifications;
      default:
        return null;
    }
  }
}

FarmingAreaCoordinates? _tryParseCoordinates(Map<String, dynamic> json) {
  try {
    return FarmingAreaCoordinates.fromJson(json);
  } on FormatException {
    return null;
  }
}

double? _toDouble(dynamic value) {
  if (value == null) {
    return null;
  }

  if (value is num) {
    return value.toDouble();
  }

  return double.tryParse(value.toString());
}
