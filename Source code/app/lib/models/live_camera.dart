class LiveCamera {
  final String id;
  final String name;
  final String streamUrl;
  final String location;
  final bool isActive;
  final String? thumbnail;

  const LiveCamera({
    required this.id,
    required this.name,
    required this.streamUrl,
    required this.location,
    required this.isActive,
    this.thumbnail,
  });

  factory LiveCamera.fromJson(Map<String, dynamic> json) => LiveCamera(
        id: (json['_id'] ?? '').toString(),
        name: (json['name'] ?? '').toString(),
        streamUrl: (json['stream_url'] ?? json['streamUrl'] ?? '').toString(),
        location: (json['location'] ?? '').toString(),
        isActive: json['is_active'] != false && json['isActive'] != false,
        thumbnail: json['thumbnail']?.toString(),
      );

  Map<String, dynamic> toJson() => {
        if (id.isNotEmpty) '_id': id,
        'name': name,
        'stream_url': streamUrl,
        'location': location,
        'is_active': isActive,
        if (thumbnail != null) 'thumbnail': thumbnail,
      };

  LiveCamera copyWith({
    String? id,
    String? name,
    String? streamUrl,
    String? location,
    bool? isActive,
    String? thumbnail,
  }) =>
      LiveCamera(
        id: id ?? this.id,
        name: name ?? this.name,
        streamUrl: streamUrl ?? this.streamUrl,
        location: location ?? this.location,
        isActive: isActive ?? this.isActive,
        thumbnail: thumbnail ?? this.thumbnail,
      );
}
