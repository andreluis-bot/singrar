class LogEntry {
  final String id;
  final double lat;
  final double lng;
  final String type; // fishing, jetski, wakesurf, diving, other
  final String title;
  final String notes;
  final String? photo;
  final DateTime createdAt;
  
  // Específicos de pescaria
  final String? species;
  final double? weight;
  final double? length;

  LogEntry({
    required this.id,
    required this.lat,
    required this.lng,
    required this.type,
    required this.title,
    required this.notes,
    required this.createdAt,
    this.photo,
    this.species,
    this.weight,
    this.length,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'lat': lat,
    'lng': lng,
    'type': type,
    'title': title,
    'notes': notes,
    'createdAt': createdAt.millisecondsSinceEpoch,
    if (photo != null) 'photo': photo,
    if (species != null) 'species': species,
    if (weight != null) 'weight': weight,
    if (length != null) 'length': length,
  };

  factory LogEntry.fromJson(Map<String, dynamic> json) => LogEntry(
    id: json['id'],
    lat: (json['lat'] as num).toDouble(),
    lng: (json['lng'] as num).toDouble(),
    type: json['type'],
    title: json['title'],
    notes: json['notes'],
    createdAt: DateTime.fromMillisecondsSinceEpoch(json['createdAt'] as int),
    photo: json['photo'],
    species: json['species'],
    weight: json['weight'] != null ? (json['weight'] as num).toDouble() : null,
    length: json['length'] != null ? (json['length'] as num).toDouble() : null,
  );
}
