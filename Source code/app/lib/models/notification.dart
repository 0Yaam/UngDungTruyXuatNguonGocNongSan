class Notification {
  final String id;
  final String recipient;
  final String title;
  final String message;
  final String type; // info | success | warning | error
  final String category; // product | trace_event | certification | system
  final RelatedEntity? relatedEntity;
  final bool isRead;
  final DateTime createdAt;
  final DateTime updatedAt;

  Notification({
    required this.id,
    required this.recipient,
    required this.title,
    required this.message,
    required this.type,
    required this.category,
    this.relatedEntity,
    required this.isRead,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Notification.fromJson(Map<String, dynamic> json) {
    return Notification(
      id: json['_id'] as String,
      recipient: json['recipient'] is String
          ? json['recipient'] as String
          : (json['recipient']?['_id'] as String?) ?? '',
      title: json['title'] as String,
      message: json['message'] as String,
      type: json['type'] as String? ?? 'info',
      category: json['category'] as String? ?? 'system',
      relatedEntity: json['relatedEntity'] != null
          ? RelatedEntity.fromJson(json['relatedEntity'] as Map<String, dynamic>)
          : null,
      isRead: json['isRead'] as bool? ?? false,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }

  Notification copyWith({
    String? id,
    String? recipient,
    String? title,
    String? message,
    String? type,
    String? category,
    RelatedEntity? relatedEntity,
    bool? isRead,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Notification(
      id: id ?? this.id,
      recipient: recipient ?? this.recipient,
      title: title ?? this.title,
      message: message ?? this.message,
      type: type ?? this.type,
      category: category ?? this.category,
      relatedEntity: relatedEntity ?? this.relatedEntity,
      isRead: isRead ?? this.isRead,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

class RelatedEntity {
  final String type;
  final String id;

  RelatedEntity({
    required this.type,
    required this.id,
  });

  factory RelatedEntity.fromJson(Map<String, dynamic> json) {
    return RelatedEntity(
      type: json['type'] as String? ?? '',
      id: json['id'] as String? ?? '',
    );
  }
}

class NotificationPagination {
  final int page;
  final int limit;
  final int total;
  final int pages;

  NotificationPagination({
    required this.page,
    required this.limit,
    required this.total,
    required this.pages,
  });

  factory NotificationPagination.fromJson(Map<String, dynamic> json) {
    return NotificationPagination(
      page: json['page'] as int,
      limit: json['limit'] as int,
      total: json['total'] as int,
      pages: json['pages'] as int,
    );
  }
}

class NotificationResponse {
  final List<Notification> notifications;
  final NotificationPagination pagination;

  NotificationResponse({
    required this.notifications,
    required this.pagination,
  });

  factory NotificationResponse.fromJson(Map<String, dynamic> json) {
    return NotificationResponse(
      notifications: (json['notifications'] as List<dynamic>)
          .map((e) => Notification.fromJson(e as Map<String, dynamic>))
          .toList(),
      pagination: NotificationPagination.fromJson(
          json['pagination'] as Map<String, dynamic>),
    );
  }
}
