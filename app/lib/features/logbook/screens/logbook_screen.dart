import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../map/providers/map_providers.dart';
import 'package:intl/intl.dart';
import 'camera_screen.dart';

class LogbookScreen extends ConsumerWidget {
  const LogbookScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final savedTracks = ref.watch(savedTracksProvider);
    final waypoints = ref.watch(waypointsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Diário de Bordo'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () {
              // TODO: Add new LogEntry
            },
          )
        ],
      ),
      body: savedTracks.isEmpty && waypoints.isEmpty
          ? const Center(
              child: Text(
                'Nenhuma rota ou marcação salva ainda.',
                style: TextStyle(color: AppColors.textMuted),
              ),
            )
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (savedTracks.isNotEmpty) ...[
                  const Padding(
                    padding: EdgeInsets.only(bottom: 8.0),
                    child: Text('Rotas Navegadas (Tracks)', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                  ),
                  ...savedTracks.map((track) => Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: ListTile(
                      leading: const Icon(Icons.route, color: AppColors.primary),
                      title: Text(track.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: Text('${track.points.length} pontos • ${DateFormat('dd/MM/yyyy HH:mm').format(track.createdAt.toLocal())}', style: const TextStyle(color: AppColors.textLight)),
                      trailing: IconButton(
                        icon: const Icon(Icons.delete_outline, color: AppColors.error),
                        onPressed: () => ref.read(savedTracksProvider.notifier).remove(track.id),
                      ),
                    ),
                  )),
                ],
                if (waypoints.isNotEmpty) ...[
                  const Padding(
                    padding: EdgeInsets.only(top: 16.0, bottom: 8.0),
                    child: Text('Marcações (Waypoints)', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                  ),
                  ...waypoints.map((wp) => Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: ListTile(
                      leading: const Icon(Icons.location_on, color: AppColors.error),
                      title: Text(wp.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: Text('Lat: ${wp.lat.toStringAsFixed(4)}, Lng: ${wp.lng.toStringAsFixed(4)}', style: const TextStyle(color: AppColors.textLight)),
                      trailing: IconButton(
                        icon: const Icon(Icons.delete_outline, color: AppColors.error),
                        onPressed: () => ref.read(waypointsProvider.notifier).remove(wp.id),
                      ),
                    ),
                  )),
                ],
              ],
            ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.edit_document, color: AppColors.background),
        label: const Text('Nova Entrada', style: TextStyle(color: AppColors.background, fontWeight: FontWeight.bold)),
        onPressed: () async {
          final photoPath = await Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const CameraScreen()),
          );
          if (photoPath != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Foto registrada: $photoPath')),
            );
          }
        },
      ),
    );
  }
}

