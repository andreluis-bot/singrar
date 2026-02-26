import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../data/services/supabase_service.dart';
import '../../map/providers/map_providers.dart';
import 'package:flutter/services.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final supabase = ref.watch(supabaseServiceProvider);
    final user = supabase.currentUser;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Configurações'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildSectionTitle('Geral'),
          _buildSettingsTile(
            icon: Icons.straighten,
            title: 'Unidades de Medida',
            subtitle: 'Náuticas (Milhas, Nós)',
            onTap: () {},
          ),
          _buildSettingsTile(
            icon: Icons.map,
            title: 'Aparência do Mapa',
            subtitle: 'Satélite',
            onTap: () {},
          ),
          const SizedBox(height: 24),
          _buildSectionTitle('Navegação'),
          _buildSettingsTile(
            icon: Icons.router,
            title: 'NMEA 0183 / Signal K',
            subtitle: 'Desconectado',
            onTap: () {},
          ),
          _buildRadarSwitch(context, ref, user),
          if (user != null)
            _buildSettingsTile(
              icon: Icons.share,
              title: 'Copiar Link de Rastreamento',
              subtitle: 'Compartilhe sua navegação ao vivo',
              onTap: () {
                final url = 'http://localhost:8008/#/tracking/${user.id}';
                Clipboard.setData(ClipboardData(text: url));
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Link copiado para a área de transferência!')),
                );
              },
            ),
          _buildSettingsTile(
            icon: Icons.import_export,
            title: 'Importar / Exportar GPX',
            onTap: () {},
          ),
          const SizedBox(height: 24),
          _buildSectionTitle('Conta'),
          _buildSettingsTile(
            icon: Icons.account_circle,
            title: user != null ? 'Logado' : 'Login / Cadastro',
            subtitle: user != null ? user.email : 'Entre para sincronizar rotas e planos',
            onTap: () {
              if (user != null) {
                // Logout action
                showDialog(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: const Text('Sair'),
                    content: const Text('Deseja realmente sair da sua conta?'),
                    actions: [
                      TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCELAR')),
                      TextButton(
                        onPressed: () {
                          Navigator.pop(ctx);
                          supabase.signOut();
                        }, 
                        child: const Text('SAIR', style: TextStyle(color: AppColors.error))
                      ),
                    ],
                  )
                );
              } else {
                context.push('/auth');
              }
            },
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12, left: 4),
      child: Text(
        title.toUpperCase(),
        style: const TextStyle(
          color: AppColors.primary,
          fontWeight: FontWeight.bold,
          letterSpacing: 1.2,
          fontSize: 12,
        ),
      ),
    );
  }

  Widget _buildSettingsTile({
    required IconData icon,
    required String title,
    String? subtitle,
    required VoidCallback onTap,
  }) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(icon, color: AppColors.textLight),
        title: Text(title, style: const TextStyle(color: Colors.white)),
        subtitle: subtitle != null ? Text(subtitle, style: const TextStyle(color: AppColors.textMuted)) : null,
        trailing: const Icon(Icons.chevron_right, color: AppColors.textMuted),
        onTap: onTap,
      ),
    );
  }

  Widget _buildRadarSwitch(BuildContext context, WidgetRef ref, dynamic user) {
    final isBroadcasting = ref.watch(broadcastingEnabledProvider);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: SwitchListTile(
        secondary: const Icon(Icons.cell_tower, color: Colors.orangeAccent),
        title: const Text('Radar (Tempo Real)', style: TextStyle(color: Colors.white)),
        subtitle: const Text('Transmitir localização anonimamente.', style: TextStyle(color: AppColors.textMuted)),
        value: isBroadcasting,
        activeColor: Colors.orangeAccent,
        onChanged: (bool value) {
          if (user == null && value) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Faça login primeiro para usar o Radar.')),
            );
            return;
          }
          ref.read(broadcastingEnabledProvider.notifier).state = value;
          if (value) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Radar ativado. Transmitindo a cada 5 segundos...')),
            );
          }
        },
      ),
    );
  }
}
