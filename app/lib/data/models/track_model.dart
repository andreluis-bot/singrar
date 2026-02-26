class TrackPoint {
  final double lat;
  final double lng;
  final DateTime timestamp;

  TrackPoint({
    required this.lat,
    required this.lng,
    required this.timestamp,
  });

  Map<String, dynamic> toJson() => {
    'lat': lat,
    'lng': lng,
    'timestamp': timestamp.millisecondsSinceEpoch,
  };

  factory TrackPoint.fromJson(Map<String, dynamic> json) => TrackPoint(
    lat: (json['lat'] as num).toDouble(),
    lng: (json['lng'] as num).toDouble(),
    timestamp: DateTime.fromMillisecondsSinceEpoch(json['timestamp'] as int),
  );
}

class Track {
  final String id;
  final String name;
  final List<TrackPoint> points;
  final String color;
  final DateTime createdAt;
  final bool visible;

  Track({
    required this.id,
    required this.name,
    required this.points,
    required this.color,
    required this.createdAt,
    this.visible = true,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'points': points.map((p) => p.toJson()).toList(),
    'color': color,
    'createdAt': createdAt.millisecondsSinceEpoch,
    'visible': visible,
  };

  factory Track.fromJson(Map<String, dynamic> json) => Track(
    id: json['id'],
    name: json['name'],
    points: (json['points'] as List).map((p) => TrackPoint.fromJson(p)).toList(),
    color: json['color'],
    createdAt: DateTime.fromMillisecondsSinceEpoch(json['createdAt'] as int),
    visible: json['visible'] ?? true,
  );
}
