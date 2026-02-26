import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../data/models/waypoint_model.dart';
import '../../../data/models/track_model.dart';
import '../../../data/services/supabase_service.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:flutter_compass/flutter_compass.dart';
import 'package:sensors_plus/sensors_plus.dart';
import 'dart:async';

final locationProvider = StreamProvider<Position>((ref) async* {
  bool serviceEnabled;
  LocationPermission permission;

  serviceEnabled = await Geolocator.isLocationServiceEnabled();
  if (!serviceEnabled) {
    throw Exception('Serviços de localização desativados.');
  }

  permission = await Geolocator.checkPermission();
  if (permission == LocationPermission.denied) {
    permission = await Geolocator.requestPermission();
    if (permission == LocationPermission.denied) {
      throw Exception('Permissões de localização negadas.');
    }
  }

  if (permission == LocationPermission.deniedForever) {
    throw Exception('Permissões de localização permanentemente negadas.');
  }

  // Stream com filtro de distância (bateria eficiente)
  yield* Geolocator.getPositionStream(
    locationSettings: const LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 5, // Atualiza a cada 5 metros
    ),
  );
});

final _currentCompassStreamProvider = StreamProvider<double>((ref) {
  return FlutterCompass.events!.map((event) => event.heading ?? 0.0).distinct();
});

final currentHeadingProvider = Provider<double>((ref) {
  return ref.watch(_currentCompassStreamProvider).value ?? 0.0;
});

final currentSpeedProvider = Provider<double>((ref) {
  final pos = ref.watch(locationProvider).value;
  // Convert m/s -> knots (SOG)
  return (pos?.speed ?? 0.0) * 1.94384;
});

// -- G-Force / Onda (Sensores) --
final gForceProvider = StreamProvider<double>((ref) {
  // Pega a aceleração no eixo Z (vertical, frente ao aparelho)
  // Para filtrar gravidade, usamos userAccelerometerEvents
  return userAccelerometerEventStream()
      .map((event) => event.z.abs())
      .distinct();
});

// -- Waypoints --
class WaypointsNotifier extends Notifier<List<Waypoint>> {
  @override
  List<Waypoint> build() {
    final box = Hive.box('waypoints');
    final List<Waypoint> loaded = [];
    for (var key in box.keys) {
      final data = box.get(key);
      if (data != null) {
        loaded.add(Waypoint.fromJson(Map<String, dynamic>.from(data)));
      }
    }
    return loaded;
  }

  void add(Waypoint wp) {
    Hive.box('waypoints').put(wp.id, wp.toJson());
    state = [...state, wp];
  }

  void remove(String id) {
    Hive.box('waypoints').delete(id);
    state = state.where((w) => w.id != id).toList();
  }
}

final waypointsProvider = NotifierProvider<WaypointsNotifier, List<Waypoint>>(WaypointsNotifier.new);

// -- Track Recording --
class TrackRecordingNotifier extends Notifier<List<TrackPoint>> {
  @override
  List<TrackPoint> build() {
    return [];
  }

  void addPoint(TrackPoint pt) {
    state = [...state, pt];
  }
  
  void clear() {
    state = [];
  }
}

final trackRecordingProvider = NotifierProvider<TrackRecordingNotifier, List<TrackPoint>>(TrackRecordingNotifier.new);

// -- Saved Tracks (Hive Storage) --
class SavedTracksNotifier extends Notifier<List<Track>> {
  @override
  List<Track> build() {
    final box = Hive.box('tracks');
    final List<Track> loaded = [];
    for (var key in box.keys) {
      final data = box.get(key);
      if (data != null) {
        loaded.add(Track.fromJson(Map<String, dynamic>.from(data)));
      }
    }
    return loaded;
  }

  void add(Track track) {
    Hive.box('tracks').put(track.id, track.toJson());
    state = [...state, track];
  }

  void remove(String id) {
    Hive.box('tracks').delete(id);
    state = state.where((t) => t.id != id).toList();
  }
}

final savedTracksProvider = NotifierProvider<SavedTracksNotifier, List<Track>>(SavedTracksNotifier.new);
class IsRecordingNotifier extends Notifier<bool> {
  @override
  bool build() => false;
}
final isRecordingProvider = NotifierProvider<IsRecordingNotifier, bool>(IsRecordingNotifier.new);

// -- Anchor Alarm --
class AnchorAlarm {
  final bool active;
  final LatLng? center;
  final double radius; // meters

  AnchorAlarm({this.active = false, this.center, this.radius = 50.0});

  AnchorAlarm copyWith({bool? active, LatLng? center, double? radius}) {
    return AnchorAlarm(
      active: active ?? this.active,
      center: center ?? this.center,
      radius: radius ?? this.radius,
    );
  }
}

class AnchorAlarmNotifier extends Notifier<AnchorAlarm> {
  @override
  AnchorAlarm build() => AnchorAlarm();
}
final anchorAlarmProvider = NotifierProvider<AnchorAlarmNotifier, AnchorAlarm>(AnchorAlarmNotifier.new);

// -- Route Planning --
class PlannedRouteNotifier extends Notifier<List<LatLng>> {
  @override
  List<LatLng> build() => [];

  void addPoint(LatLng point) => state = [...state, point];
  
  void undo() {
    if (state.isNotEmpty) {
      state = state.sublist(0, state.length - 1);
    }
  }

  void clear() => state = [];
}

final plannedRouteProvider = NotifierProvider<PlannedRouteNotifier, List<LatLng>>(PlannedRouteNotifier.new);

// -- Radar (Real-time Supabase Channels) --
class BoatPosition {
  final String id;
  final String name;  // Or email
  final LatLng position;
  final double heading;
  final double speed;
  final bool hasEmergency;
  final DateTime lastUpdated;
  
  BoatPosition({
    required this.id, 
    required this.name, 
    required this.position, 
    required this.heading, 
    required this.speed,
    this.hasEmergency = false,
    required this.lastUpdated,
  });
}

class BroadcastingEnabledNotifier extends Notifier<bool> {
  @override
  bool build() => false;
}
final broadcastingEnabledProvider = NotifierProvider<BroadcastingEnabledNotifier, bool>(BroadcastingEnabledNotifier.new);

class RadarNotifier extends Notifier<List<BoatPosition>> {
  @override
  List<BoatPosition> build() {
    // Garbage Collection Timer (A cada 10 segundos varre barcos velhos)
    final gcTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      garbageCollect();
    });

    // Inscreve no canal do Supabase
    final supabaseService = ref.read(supabaseServiceProvider);
    final radarChannel = supabaseService.radarChannel;
    
    radarChannel.onBroadcast(
      event: 'position',
      callback: (payload) {
        // Evita ler a própria posição local sendo re-transmitida se tiver o mesmo ID
        final myUser = supabaseService.currentUser;
        if (myUser != null && payload['user_email'] == myUser.email) return;

        updatePosition(payload);
      },
    );

    ref.onDispose(() {
      gcTimer.cancel();
    });

    return [];
  }

  void updatePosition(Map<String, dynamic> payload) {
    try {
      final vesselId = payload['vessel_id'] as String;
      final lat = (payload['lat'] as num).toDouble();
      final lng = (payload['lng'] as num).toDouble();
      final speed = (payload['speed'] as num).toDouble();
      final heading = (payload['heading'] as num).toDouble();
      final email = payload['user_email'] as String? ?? 'Unknown';
      final isEmergency = payload['emergency'] as bool? ?? false;
      final timestamp = DateTime.tryParse(payload['timestamp'] as String? ?? '') ?? DateTime.now();

      final newPos = BoatPosition(
        id: vesselId,
        name: email,
        position: LatLng(lat, lng),
        heading: heading,
        speed: speed,
        hasEmergency: isEmergency,
        lastUpdated: timestamp,
      );

      final newList = List<BoatPosition>.from(state);
      final index = newList.indexWhere((b) => b.id == vesselId);
      if (index >= 0) {
        newList[index] = newPos;
      } else {
        newList.add(newPos);
      }
      state = newList;
    } catch (e) {
      print('Erro ao parsear broadcast do radar: $e');
    }
  }

  void garbageCollect() {
    final now = DateTime.now();
    // Remove barcos que não emitem payload há mais de 1 minuto
    final filtered = state.where((b) => now.difference(b.lastUpdated).inSeconds < 60).toList();
    if (filtered.length != state.length) {
      state = filtered;
    }
  }
}

final nearbyBoatsProvider = NotifierProvider<RadarNotifier, List<BoatPosition>>(RadarNotifier.new);

// Timer de Auto-Broadcasting que envia a posição real a cada 5s
final autoBroadcastProvider = Provider<void>((ref) {
  final isBroadcasting = ref.watch(broadcastingEnabledProvider);
  final supabaseService = ref.read(supabaseServiceProvider);
  
  Timer? timer;

  // Se o Radar estiver ativo, criamos um loop real de 5 segundos
  if (isBroadcasting) {
    timer = Timer.periodic(const Duration(seconds: 5), (_) {
      // Usamos ref.read para pegar a localização atual sem causar rebuilds neste Provider
      final locationAsync = ref.read(locationProvider);
      final heading = ref.read(currentHeadingProvider);
      
      if (locationAsync.hasValue && locationAsync.value != null) {
        final pos = locationAsync.value!;
        supabaseService.broadcastPosition(
          vesselId: supabaseService.currentUser?.id ?? 'guest-id',
          lat: pos.latitude,
          lng: pos.longitude,
          speed: (pos.speed) * 1.94384, // Knots
          heading: heading,
          emergency: false,
        );
      }
    });
  }

  // Quando o Provider for destruído ou a switch desligada, cancela o Timer
  ref.onDispose(() {
    timer?.cancel();
  });
});

class IsPlanningModeNotifier extends Notifier<bool> {
  @override
  bool build() => false;
}
final isPlanningModeProvider = NotifierProvider<IsPlanningModeNotifier, bool>(IsPlanningModeNotifier.new);
