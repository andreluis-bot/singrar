import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'dart:async';
import '../../../data/services/supabase_service.dart';
import '../../map/providers/map_providers.dart';
import '../../../core/theme/app_colors.dart';

final publicTrackingProvider = StreamProvider.family<BoatPosition?, String>((ref, vesselId) {
  final supabaseService = ref.watch(supabaseServiceProvider);
  final radarChannel = supabaseService.radarChannel;
  
  // Creates an isolated stream for this specific vesselId
  final controller = StreamController<BoatPosition?>();
  
  final subscription = radarChannel.onBroadcast(
    event: 'position',
    callback: (payload) {
      if (payload['vessel_id'] == vesselId) {
        final pos = BoatPosition(
          id: payload['vessel_id'],
          name: payload['user_email'] as String? ?? 'Vessel $vesselId', // Uses email or fallback
          position: LatLng((payload['lat'] as num).toDouble(), (payload['lng'] as num).toDouble()),
          heading: (payload['heading'] as num).toDouble(),
          speed: (payload['speed'] as num).toDouble(),
          hasEmergency: payload['emergency'] == true,
          lastUpdated: DateTime.tryParse(payload['timestamp'] as String? ?? '') ?? DateTime.now(),
        );
        controller.add(pos);
      }
    },
  );

  ref.onDispose(() {
    controller.close();
  });

  return controller.stream;
});


class TrackingScreen extends ConsumerWidget {
  final String boatId;

  const TrackingScreen({super.key, required this.boatId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final boatStream = ref.watch(publicTrackingProvider(boatId));

    return boatStream.when(
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator())),
      error: (err, stack) => Scaffold(body: Center(child: Text('Erro ao carregar roteamento:\n$err', textAlign: TextAlign.center))),
      data: (targetBoat) {
        if (targetBoat == null) {
          return const Scaffold(
            body: Center(
              child: Text(
                'Embarcação não encontrada ou off-line.',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textLight),
              ),
            ),
          );
        }

        final isEmergency = targetBoat.hasEmergency;

        return Scaffold(
          appBar: AppBar(
            title: Text(isEmergency ? 'EMERGÊNCIA (SOS)' : 'Rastreamento: ${targetBoat.name}'),
            backgroundColor: isEmergency ? AppColors.error : AppColors.background.withOpacity(0.9),
          ),
      body: Stack(
        children: [
          FlutterMap(
            options: MapOptions(
              initialCenter: targetBoat.position,
              initialZoom: 15.0,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.singrar.singrar_app',
              ),
              MarkerLayer(
                markers: [
                  Marker(
                    point: targetBoat.position,
                    width: 100,
                    height: 100,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                          decoration: BoxDecoration(
                            color: isEmergency ? AppColors.error : Colors.black87,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            '${targetBoat.name.split('@').first}\n${targetBoat.speed.toStringAsFixed(1)} kts',
                            style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                            textAlign: TextAlign.center,
                          ),
                        ),
                        Transform.rotate(
                          angle: (targetBoat.heading * 3.14159) / 180,
                          child: Container(
                            width: 24,
                            height: 24,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: isEmergency ? AppColors.error : Colors.orangeAccent,
                              boxShadow: [
                                BoxShadow(color: (isEmergency ? AppColors.error : Colors.orangeAccent).withOpacity(0.6), blurRadius: 15, spreadRadius: 5),
                              ],
                              border: Border.all(color: Colors.white, width: 3),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
          
          // Painel SOS Simulado / Status overlay
          Positioned(
            bottom: 32,
            left: 16,
            right: 16,
            child: Card(
              color: isEmergency ? AppColors.error.withOpacity(0.9) : AppColors.surface.withOpacity(0.9),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: isEmergency ? Colors.redAccent : AppColors.surfaceLight)),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('STATUS DA EMBARCAÇÃO', style: TextStyle(color: isEmergency ? Colors.white70 : AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Container(width: 8, height: 8, decoration: BoxDecoration(color: isEmergency ? Colors.white : Colors.green, shape: BoxShape.circle)),
                            const SizedBox(width: 8),
                            Text(isEmergency ? 'PEDIDO DE SOCORRO' : 'Navegando Normal', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text('GPS', style: TextStyle(color: isEmergency ? Colors.white70 : AppColors.textMuted, fontSize: 10, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 4),
                        Text(
                          '${targetBoat.position.latitude.toStringAsFixed(4)}, ${targetBoat.position.longitude.toStringAsFixed(4)}',
                          style: const TextStyle(color: Colors.white, fontFamily: 'JetBrains Mono', fontSize: 12),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
      },
    );
  }
}
