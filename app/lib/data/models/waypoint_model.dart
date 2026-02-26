
class Waypoint {
  final String id;
  final double lat;
  final double lng;
  final String name;
  final String icon;
  final String color;
  final DateTime createdAt;
  final String? audio;
  final String? photo;

  Waypoint({
    required this.id,
    required this.lat,
    required this.lng,
    required this.name,
    required this.icon,
    required this.color,
    required this.createdAt,
    this.audio,
    this.photo,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'lat': lat,
    'lng': lng,
    'name': name,
    'icon': icon,
    'color': color,
    'createdAt': createdAt.millisecondsSinceEpoch,
    if (audio != null) 'audio': audio,
    if (photo != null) 'photo': photo,
  };

  factory Waypoint.fromJson(Map<String, dynamic> json) => Waypoint(
    id: json['id'],
    lat: (json['lat'] as num).toDouble(),
    lng: (json['lng'] as num).toDouble(),
    name: json['name'],
    icon: json['icon'],
    color: json['color'],
    createdAt: DateTime.fromMillisecondsSinceEpoch(json['createdAt'] as int),
    audio: json['audio'],
    photo: json['photo'],
  );
}
