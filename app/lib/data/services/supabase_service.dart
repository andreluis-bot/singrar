import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:latlong2/latlong.dart';

final supabaseProvider = Provider((ref) => Supabase.instance.client);

class SupabaseService {
  final SupabaseClient _client;
  late final RealtimeChannel radarChannel;

  SupabaseService(this._client) {
    radarChannel = _client.channel('room:radar');
    radarChannel.subscribe();
  }

  // Authentication
  User? get currentUser => _client.auth.currentUser;
  
  Stream<AuthState> get authStateChanges => _client.auth.onAuthStateChange;

  Future<void> signIn(String email, String password) async {
    await _client.auth.signInWithPassword(email: email, password: password);
  }

  Future<void> signUp(String email, String password) async {
    await _client.auth.signUp(email: email, password: password);
  }

  Future<void> signOut() async {
    await _client.auth.signOut();
  }

  // Position Broadcasting (Radar - Realtime Channels)
  Future<void> broadcastPosition({
    required String vesselId,
    required double lat,
    required double lng,
    required double speed,
    required double heading,
    bool emergency = false,
  }) async {
    if (currentUser == null) return;
    
    // Fire-and-forget broadcast explicitly for low latency Radar.
    await radarChannel.sendBroadcastMessage(
      event: 'position',
      payload: {
        'vessel_id': vesselId,
        'lat': lat,
        'lng': lng,
        'speed': speed,
        'heading': heading,
        'emergency': emergency,
        'timestamp': DateTime.now().toIso8601String(),
        'user_email': currentUser!.email ?? 'Unknown',
      },
    );
  }

  // Planned Routes SYNC
  Future<List<dynamic>> getPlannedRoutes() async {
    if (currentUser == null) return [];
    final res = await _client
        .from('planned_routes')
        .select()
        .eq('user_id', currentUser!.id)
        .order('created_at', ascending: false);
    return res as List<dynamic>;
  }

  Future<void> savePlannedRoute(String name, List<LatLng> points) async {
    if (currentUser == null) throw Exception('Não logado');
    
    final pointsJson = points.map((p) => {'lat': p.latitude, 'lng': p.longitude}).toList();
    
    await _client.from('planned_routes').insert({
      'user_id': currentUser!.id,
      'name': name,
      'points': pointsJson,
    });
  }

  // Generate Public Tracking Link
  Future<String> generateTrackingLink(String vesselId, {Duration? expiresIn}) async {
    if (currentUser == null) throw Exception('Não logado');
    
    final token = DateTime.now().millisecondsSinceEpoch.toRadixString(36);
    
    await _client.from('sharing_links').insert({
      'vessel_id': vesselId,
      'token': token,
      'expires_at': expiresIn != null ? DateTime.now().add(expiresIn).toIso8601String() : null,
      'active': true,
    });
    
    return token;
  }

  // Removed trackVessel (Database streaming) in favor of the Radar Channel on the provider side.
}

final supabaseServiceProvider = Provider((ref) => SupabaseService(ref.watch(supabaseProvider)));
