import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../map/providers/map_providers.dart';

class AchievementsScreen extends ConsumerWidget {
  const AchievementsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Integração para contar total de rotas na estatística
    final savedTracks = ref.watch(savedTracksProvider);
    final totalRotas = savedTracks.length;

    return Scaffold(
      appBar: AppBar(title: const Text('Conquistas')),
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  const Icon(Icons.workspace_premium, size: 80, color: Colors.amber),
                  const SizedBox(height: 16),
                  const Text('Capitão Dedicado', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white)),
                  const SizedBox(height: 8),
                  Text('Você já registrou $totalRotas rotas concluídas!', style: const TextStyle(color: AppColors.textLight)),
                ],
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                _buildAchievementCard('Explorador Aprendiz', 'Registre sua primeira rota no mar', totalRotas >= 1),
                _buildAchievementCard('Mapeador dos Sete Mares', 'Registre mais de 10 rotas', totalRotas >= 10),
                _buildAchievementCard('Marinheiro Constante', 'Navegue por 3 dias seguidos', false),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAchievementCard(String title, String desc, bool unlocked) {
    return Card(
      color: unlocked ? AppColors.surface : AppColors.background,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: unlocked ? AppColors.primary : AppColors.surfaceLight, width: 1),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: Icon(
          unlocked ? Icons.lock_open : Icons.lock,
          color: unlocked ? AppColors.primary : AppColors.textMuted,
          size: 32,
        ),
        title: Text(title, style: TextStyle(color: unlocked ? Colors.white : AppColors.textMuted, fontWeight: FontWeight.bold)),
        subtitle: Text(desc, style: TextStyle(color: unlocked ? AppColors.textLight : AppColors.textMuted.withOpacity(0.5))),
      ),
    );
  }
}
