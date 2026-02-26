import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:wakelock_plus/wakelock_plus.dart';
import '../../../core/theme/app_colors.dart';
import '../providers/map_providers.dart';
import '../widgets/compass_ribbon.dart';
import '../../../data/models/waypoint_model.dart';
import '../../../data/models/track_model.dart';

class MapScreen extends ConsumerStatefulWidget {
  const MapScreen({super.key});

  @override
  ConsumerState<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends ConsumerState<MapScreen> {
  // Tile Providers URLs
  static const String streetUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  static const String satelliteUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  static const String nauticalUrl = 'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png';

  // Map State
  String currentMapStyle = satelliteUrl; // Satellite default
  bool showNauticalLayer = true;
  final MapController _mapController = MapController();
  final LatLng _initialCenter = const LatLng(-23.8, -45.4); 

  // GPS Tracking Optimization
  LatLng? _lastRecordedPosition;
  
  @override
  void initState() {
    super.initState();
    // Impede que a tela do Chartplotter apague sozinha
    WakelockPlus.enable();
  }

  @override
  void dispose() {
    // Permite que a tela apague ao sair do mapa
    WakelockPlus.disable();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final locationAsync = ref.watch(locationProvider);
    final waypoints = ref.watch(waypointsProvider);
    final isRecording = ref.watch(isRecordingProvider);
    final currentTrack = ref.watch(trackRecordingProvider);
    final savedTracks = ref.watch(savedTracksProvider);
    final anchorAlarm = ref.watch(anchorAlarmProvider);
    final isPlanning = ref.watch(isPlanningModeProvider);
    final plannedRoute = ref.watch(plannedRouteProvider);
    final currentHeading = ref.watch(currentHeadingProvider);
    final nearbyBoats = ref.watch(nearbyBoatsProvider);
    final isBroadcasting = ref.watch(broadcastingEnabledProvider);

    // Activa o Auto-Broadcast em background escutando o provider de loop (isso não gera re-build da UI, apenas prende o ciclo de vida ao MapScreen)
    ref.watch(autoBroadcastProvider);

    // Listeners for background tasks (Recording & Alarms)
    ref.listen(locationProvider, (previous, next) {
      if (next.hasValue && next.value != null) {
        final pos = next.value!;
        
        // Anti-glitch: Ignora GPS impreciso (maior que 30m de margem de erro)
        final bool isAccurate = pos.accuracy <= 30.0;
        
        // Track Recording (Somente se for preciso, e tiver movido 5m do último)
        if (ref.read(isRecordingProvider) && isAccurate) {
          bool shouldRecord = true;
          
          if (_lastRecordedPosition != null) {
            const distanceCalc = Distance();
            final movedDist = distanceCalc.as(LengthUnit.Meter, _lastRecordedPosition!, LatLng(pos.latitude, pos.longitude));
            if (movedDist < 5.0) {
              shouldRecord = false; // Não se moveu o suficiente, economiza storage
            }
          }
          
          if (shouldRecord) {
            final trackPt = TrackPoint(lat: pos.latitude, lng: pos.longitude, timestamp: DateTime.now());
            ref.read(trackRecordingProvider.notifier).addPoint(trackPt);
            _lastRecordedPosition = LatLng(pos.latitude, pos.longitude);
          }
        }

        // Anchor Geofencing
        final alarm = ref.read(anchorAlarmProvider);
        if (alarm.active && alarm.center != null) {
          const distance = Distance();
          final d = distance.as(
            LengthUnit.Meter, 
            alarm.center!, 
            LatLng(pos.latitude, pos.longitude)
          );
          if (d > alarm.radius) {
            // Trigger Alarm
            debugPrint('🚨 ALARME DE ÂNCORA ACIONADO! Distância: $d m');
          }
        }
      }
    });

    // Helper para determinar a cor do Sinal GPS
    Color _getGpsSignalColor(double accuracy) {
      if (accuracy <= 10.0) return Colors.green;
      if (accuracy <= 30.0) return Colors.amber;
      return Colors.orange;
    }
    String _getGpsSignalText(double accuracy) {
      if (accuracy <= 10.0) return 'GPS Forte';
      if (accuracy <= 30.0) return 'GPS Médio';
      return 'GPS Fraco';
    }

    return Stack(
      children: [
        FlutterMap(
          mapController: _mapController,
          options: MapOptions(
            initialCenter: locationAsync.value != null 
                ? LatLng(locationAsync.value!.latitude, locationAsync.value!.longitude) 
                : _initialCenter,
            initialZoom: 14.0,
            maxZoom: 18.0,
            onTap: (tapPosition, point) {
              if (ref.read(isPlanningModeProvider)) {
                ref.read(plannedRouteProvider.notifier).addPoint(point);
              }
            },
            onLongPress: (tapPosition, point) {
              // Add simple point on long press only if not planning
              if (!ref.read(isPlanningModeProvider)) {
                ref.read(waypointsProvider.notifier).add(
                  Waypoint(
                    id: DateTime.now().millisecondsSinceEpoch.toString(),
                    lat: point.latitude,
                    lng: point.longitude,
                    name: 'Novo Ponto',
                    icon: 'marker',
                    color: '#ff6b6b',
                    createdAt: DateTime.now(),
                  )
                );
              }
            },
          ),
          children: [
            TileLayer(
              urlTemplate: currentMapStyle,
              userAgentPackageName: 'br.com.interssan.singrar',
              maxZoom: 18,
            ),
            if (showNauticalLayer)
              TileLayer(
                urlTemplate: nauticalUrl,
                userAgentPackageName: 'br.com.interssan.singrar',
                maxZoom: 18,
              ),
            // Anchor Alarm Circle
            CircleLayer(
              circles: [
                if (anchorAlarm.active && anchorAlarm.center != null)
                  CircleMarker(
                    point: anchorAlarm.center!,
                    color: AppColors.error.withOpacity(0.15),
                    borderColor: AppColors.error,
                    borderStrokeWidth: 2,
                    useRadiusInMeter: true,
                    radius: anchorAlarm.radius,
                  ),
              ],
            ),
            // Recording Track & Saved Tracks Lines
            PolylineLayer(
              polylines: [
                ...savedTracks.map((t) => Polyline(
                  points: t.points.map((p) => LatLng(p.lat, p.lng)).toList(),
                  color: AppColors.primary.withOpacity(0.5),
                  strokeWidth: 4.0,
                )),
                if (currentTrack.isNotEmpty)
                  Polyline(
                    points: currentTrack.map((p) => LatLng(p.lat, p.lng)).toList(),
                    color: AppColors.primary,
                    strokeWidth: 4.0,
                  ),
              ],
            ),
            // Waypoints Layer
            MarkerLayer(
              markers: waypoints.map((wp) => Marker(
                point: LatLng(wp.lat, wp.lng),
                width: 40,
                height: 40,
                child: const Icon(Icons.location_on, color: AppColors.error, size: 40),
              )).toList(),
            ),
            // Planned Route Markers & Lines
            if (isPlanning || plannedRoute.isNotEmpty) ...[
              PolylineLayer(
                polylines: [
                  if (plannedRoute.length > 1)
                    Polyline(
                      points: plannedRoute,
                      color: AppColors.secondary,
                      strokeWidth: 3.0,
                    ),
                ],
              ),
              MarkerLayer(
                markers: plannedRoute.map((pt) => Marker(
                  point: pt,
                  width: 16,
                  height: 16,
                  child: Container(
                    decoration: BoxDecoration(
                      color: AppColors.secondary,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                    ),
                  ),
                )).toList(),
              ),
            ],
            // Radar (Nearby Boats) Layer
            MarkerLayer(
              markers: nearbyBoats.map((boat) => Marker(
                point: boat.position,
                width: 80,
                height: 80,
                child: GestureDetector(
                  onTap: () {
                    ScaffoldMessenger.of(context).clearSnackBars();
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('${boat.name}\nVelocidade: ${boat.speed.toStringAsFixed(1)} knots', textAlign: TextAlign.center,)),
                    );
                  },
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                        decoration: BoxDecoration(color: Colors.black87, borderRadius: BorderRadius.circular(4)),
                        child: Text(
                          boat.name.split('@').first, 
                          style: const TextStyle(color: Colors.white, fontSize: 10, overflow: TextOverflow.ellipsis),
                          maxLines: 1,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Transform.rotate(
                        angle: (boat.heading * 3.14159) / 180,
                        child: Container(
                          width: 16,
                          height: 16,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: boat.hasEmergency ? AppColors.error : Colors.orangeAccent,
                            boxShadow: [
                              BoxShadow(color: (boat.hasEmergency ? AppColors.error : Colors.orangeAccent).withOpacity(0.6), blurRadius: 10, spreadRadius: 3),
                            ],
                            border: Border.all(color: Colors.white, width: 2),
                          ),
                        ).animate(onPlay: (c) => c.repeat(reverse: true))
                         .scaleXY(begin: 0.8, end: 1.2, duration: 1000.ms),
                      ),
                    ],
                  ),
                ),
              )).toList(),
            ),
            // User Location Marker
            MarkerLayer(
              markers: [
                if (locationAsync.hasValue && locationAsync.value != null)
                  Marker(
                    point: LatLng(locationAsync.value!.latitude, locationAsync.value!.longitude),
                    width: 48,
                    height: 48,
                    alignment: Alignment.center,
                    child: Transform.rotate(
                      angle: (currentHeading * 3.14159) / 180,
                      child: Container(
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.secondary.withOpacity(0.3),
                          border: Border.all(color: Colors.white.withOpacity(0.8), width: 2),
                          boxShadow: [
                            BoxShadow(color: AppColors.secondary.withOpacity(0.5), blurRadius: 15, spreadRadius: 3),
                          ],
                        ),
                        child: const Center(
                          child: Icon(Icons.navigation, color: AppColors.primary, size: 24),
                        ),
                      ).animate(onPlay: (c) => c.repeat(reverse: true))
                       .scaleXY(begin: 0.9, end: 1.1, duration: 1500.ms, curve: Curves.easeInOut),
                    ),
                  ),
              ],
            ),
          ],
        ),
        
        // Floating Controls (Zoom, Map Style, Layers)
        Positioned(
          top: 60,
          right: 16,
          child: Column(
            children: [
              _MapControlButton(
                icon: Icons.edit_road,
                isActive: isPlanning,
                onPressed: () {
                  final willPlan = !ref.read(isPlanningModeProvider);
                  ref.read(isPlanningModeProvider.notifier).state = willPlan;
                  if (!willPlan) {
                    ref.read(plannedRouteProvider.notifier).clear();
                  }
                },
              ),
              if (isPlanning && plannedRoute.isNotEmpty) ...[
                const SizedBox(height: 8),
                _MapControlButton(
                  icon: Icons.undo,
                  onPressed: () => ref.read(plannedRouteProvider.notifier).undo(),
                ),
              ],
              const SizedBox(height: 8),
              _MapControlButton(
                icon: Icons.anchor,
                isActive: anchorAlarm.active,
                onPressed: () {
                  if (anchorAlarm.active) {
                    ref.read(anchorAlarmProvider.notifier).state = anchorAlarm.copyWith(active: false);
                  } else {
                    if (locationAsync.value != null) {
                      ref.read(anchorAlarmProvider.notifier).state = AnchorAlarm(
                        active: true,
                        center: LatLng(locationAsync.value!.latitude, locationAsync.value!.longitude),
                        radius: 50.0,
                      );
                    }
                  }
                },
              ),
              const SizedBox(height: 8),
              _MapControlButton(
                icon: Icons.layers_outlined,
                onPressed: () => setState(() => currentMapStyle = currentMapStyle == satelliteUrl ? streetUrl : satelliteUrl),
              ),
              const SizedBox(height: 8),
              _MapControlButton(
                icon: Icons.cell_tower,
                isActive: isBroadcasting,
                onPressed: () {
                  ref.read(broadcastingEnabledProvider.notifier).state = !isBroadcasting;
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(isBroadcasting ? 'Radar desligado.' : 'Radar ativo: buscando embarcações...')),
                  );
                },
              ),
              const SizedBox(height: 8),
              _MapControlButton(
                icon: Icons.sailing_outlined,
                isActive: showNauticalLayer,
                onPressed: () => setState(() => showNauticalLayer = !showNauticalLayer),
              ),
              const SizedBox(height: 8),
              _MapControlButton(
                icon: Icons.my_location,
                isActive: locationAsync.hasValue,
                onPressed: () {
                  if (locationAsync.value != null) {
                    _mapController.move(
                      LatLng(locationAsync.value!.latitude, locationAsync.value!.longitude),
                      15.0,
                    );
                  }
                },
              ),
            ],
          ),
        ),
        
        // Record Track Float Button
        Positioned(
          bottom: 100, // Above bottom navigation bar
          right: 16,
          child: FloatingActionButton(
            backgroundColor: isRecording ? AppColors.error : AppColors.primary,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            onPressed: () {
              if (isRecording) {
                // Save and clear logic
                final trackPoints = ref.read(trackRecordingProvider);
                if (trackPoints.isNotEmpty) {
                  final newTrack = Track(
                    id: DateTime.now().millisecondsSinceEpoch.toString(),
                    name: 'Rota ${DateTime.now().toIso8601String().split('T').first}',
                    points: trackPoints,
                    color: '#005BBB',
                    createdAt: DateTime.now(),
                  );
                  ref.read(savedTracksProvider.notifier).add(newTrack);
                }
                ref.read(trackRecordingProvider.notifier).clear();
              }
              ref.read(isRecordingProvider.notifier).state = !isRecording;
            },
            child: Icon(
              isRecording ? Icons.stop : Icons.fiber_manual_record,
              color: isRecording ? Colors.white : AppColors.background,
            ),
          ),
        ),

        // GPS Signal Indicator (Top-Left under Compass)
        Positioned(
          top: 60,
          left: 16,
          child: Builder(
            builder: (context) {
              final hasSignal = locationAsync.hasValue && locationAsync.value != null;
              final accuracy = hasSignal ? locationAsync.value!.accuracy : double.infinity;
              final color = hasSignal ? _getGpsSignalColor(accuracy) : Colors.red;
              final text = hasSignal ? _getGpsSignalText(accuracy) : 'Sem Sinal';

              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.surface.withOpacity(0.85),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.surfaceLight),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.3), blurRadius: 4, offset: const Offset(0, 2))
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(width: 10, height: 10, decoration: BoxDecoration(shape: BoxShape.circle, color: color)),
                    const SizedBox(width: 8),
                    Text(text, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                  ],
                ),
              );
            },
          ),
        ),

        // Compass Ribbon at Top HUD
        const Positioned(
          top: 0,
          left: 0,
          right: 0,
          child: CompassRibbon(),
        ),
      ],
    );
  }
}

class _MapControlButton extends StatelessWidget {
  final IconData icon;
  final bool isActive;
  final VoidCallback onPressed;

  const _MapControlButton({
    required this.icon,
    this.isActive = false,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface.withOpacity(0.85),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isActive ? AppColors.primary : AppColors.surfaceLight),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.3),
            blurRadius: 8,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: IconButton(
        icon: Icon(icon, color: isActive ? AppColors.primary : AppColors.textLight),
        onPressed: onPressed,
      ),
    );
  }
}
