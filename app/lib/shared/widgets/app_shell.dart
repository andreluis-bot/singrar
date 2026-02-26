import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/app_colors.dart';
import '../../features/map/providers/map_providers.dart';

class AppShell extends ConsumerWidget {
  final Widget child;
  const AppShell({super.key, required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final speed = ref.watch(currentSpeedProvider);
    final gForce = ref.watch(gForceProvider).value ?? 0.0;
    final currentPath = GoRouterState.of(context).uri.path;

    return LayoutBuilder(
      builder: (context, constraints) {
        final isDesktop = constraints.maxWidth >= 800;

        return Scaffold(
          extendBody: true, // Allows body to extend behind the bottom nav
          drawer: isDesktop ? null : _buildSidebar(currentPath, false),
          body: Row(
            children: [
              if (isDesktop)
                SizedBox(
                  width: 280,
                  child: _buildSidebar(currentPath, true),
                ),
              Expanded(child: child),
            ],
          ),
          bottomNavigationBar: isDesktop
              ? null
              : Container(
                  decoration: BoxDecoration(
                    color: AppColors.background.withOpacity(0.8),
                    border: const Border(top: BorderSide(color: AppColors.surfaceLight)),
                  ),
                  child: SafeArea(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Builder(
                            builder: (context) => IconButton(
                              icon: const Icon(Icons.menu, color: AppColors.textMuted, size: 28),
                              onPressed: () => Scaffold.of(context).openDrawer(),
                            ),
                          ),
                          Expanded(
                            child: _buildHudSpeed(context, speed),
                          ),
                          _buildHudGForce(gForce),
                        ],
                      ),
                    ),
                  ),
                ),
        );
      },
    );
  }

  Widget _buildHudSpeed(BuildContext context, double speed) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Text(
          'VELOCIDADE (SOG)',
          style: TextStyle(fontSize: 10, color: AppColors.textMuted, fontWeight: FontWeight.bold, letterSpacing: 1.2),
        ),
        const SizedBox(height: 2),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            Text(
              speed.toStringAsFixed(1),
              style: Theme.of(context).textTheme.displayLarge?.copyWith(fontSize: 24, color: Colors.white),
            ),
            const SizedBox(width: 4),
            const Text('kt', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
          ],
        ),
      ],
    );
  }

  Widget _buildHudGForce(double gForce) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        const Text(
          'IMPACTO (G)',
          style: TextStyle(fontSize: 10, color: AppColors.textMuted, fontWeight: FontWeight.bold, letterSpacing: 1.2),
        ),
        const SizedBox(height: 2),
        Text(
          gForce.toStringAsFixed(2),
          style: TextStyle(
            fontSize: 16,
            color: gForce > 1.5 ? AppColors.error : AppColors.textLight,
            fontWeight: FontWeight.bold,
            fontFamily: 'JetBrains Mono',
          ),
        ),
      ],
    );
  }

  Widget _buildSidebar(String currentPath, bool isDesktop) {
    return Drawer(
      backgroundColor: AppColors.background.withOpacity(0.95),
      elevation: isDesktop ? 0 : 16,
      child: Column(
        children: [
          Container(
            padding: EdgeInsets.only(top: isDesktop ? 32 : 60, bottom: 20, left: 16, right: 16),
            decoration: const BoxDecoration(
              border: Border(bottom: BorderSide(color: AppColors.surfaceLight, width: 2)),
            ),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(4.0),
                    child: Image.asset('assets/images/logo.png'),
                  ),
                ),
                const SizedBox(width: 16),
                const Text(
                  'Singrar',
                  style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(vertical: 8),
              children: [
                _DrawerItem(icon: Icons.map_outlined, label: 'Mapa', route: '/', currentPath: currentPath, isDesktop: isDesktop),
                _DrawerItem(icon: Icons.cloud_outlined, label: 'Tempo', route: '/weather', currentPath: currentPath, isDesktop: isDesktop),
                _DrawerItem(icon: Icons.explore_outlined, label: 'Previsões', route: '/tides', currentPath: currentPath, isDesktop: isDesktop),
                _DrawerItem(icon: Icons.people_outline, label: 'Eventos', route: '/events', currentPath: currentPath, isDesktop: isDesktop),
                _DrawerItem(icon: Icons.emoji_events_outlined, label: 'Conquistas', route: '/achievements', currentPath: currentPath, isDesktop: isDesktop),
                _DrawerItem(icon: Icons.menu_book_outlined, label: 'Diário', route: '/logbook', currentPath: currentPath, isDesktop: isDesktop),
                _DrawerItem(icon: Icons.settings_outlined, label: 'Opções', route: '/settings', currentPath: currentPath, isDesktop: isDesktop),
              ],
            ),
          ),
          // Sensores Fixos no canto inferior se for Desktop
          if (isDesktop)
            Consumer(
              builder: (context, ref, child) {
                final speed = ref.watch(currentSpeedProvider);
                final gForce = ref.watch(gForceProvider).value ?? 0.0;
                return Container(
                  padding: const EdgeInsets.all(16),
                  decoration: const BoxDecoration(border: Border(top: BorderSide(color: AppColors.surfaceLight))),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _buildHudSpeed(context, speed),
                      _buildHudGForce(gForce),
                    ],
                  ),
                );
              },
            ),
        ],
      ),
    );
  }
}

class _DrawerItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String route;
  final String currentPath;
  final bool isDesktop;

  const _DrawerItem({
    required this.icon,
    required this.label,
    required this.route,
    required this.currentPath,
    required this.isDesktop,
  });

  @override
  Widget build(BuildContext context) {
    final bool isActive = currentPath == route;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      child: ListTile(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        tileColor: isActive ? AppColors.primary.withOpacity(0.1) : Colors.transparent,
        leading: Icon(icon, color: isActive ? AppColors.primary : AppColors.textMuted),
        title: Text(
          label,
          style: TextStyle(
            color: isActive ? AppColors.primary : AppColors.textMuted,
            fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
          ),
        ),
        onTap: () {
          if (!isDesktop) {
            Navigator.pop(context); // Close drawer only on mobile
          }
          if (!isActive) {
            context.go(route);
          }
        },
      ),
    );
  }
}
