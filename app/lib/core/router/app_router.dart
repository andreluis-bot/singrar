import 'package:go_router/go_router.dart';
import 'dart:async';
import 'package:flutter/foundation.dart';

import '../../shared/widgets/app_shell.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../features/map/screens/map_screen.dart';
import '../../features/settings/screens/settings_screen.dart';
import '../../features/logbook/screens/logbook_screen.dart';
import '../../features/weather/screens/weather_screen.dart';
import '../../features/tides/screens/tides_screen.dart';
import '../../features/events/screens/events_screen.dart';
import '../../features/achievements/screens/achievements_screen.dart';
import '../../features/auth/screens/auth_screen.dart';
import '../../features/tracking/screens/tracking_screen.dart';

final goRouter = GoRouter(
  initialLocation: '/',
  refreshListenable: GoRouterRefreshStream(Supabase.instance.client.auth.onAuthStateChange),
  redirect: (context, state) {
    final session = Supabase.instance.client.auth.currentSession;
    final isAuth = session != null;
    final path = state.uri.path;
    final isGoingToAuth = path == '/auth';
    final isGoingToTracking = path.startsWith('/tracking/');

    print('GoRouter Redirect => isAuth: $isAuth | path: $path | isGoingToAuth: $isGoingToAuth | isGoingToTracking: $isGoingToTracking');

    if (!isAuth && !isGoingToAuth && !isGoingToTracking) {
      print('   -> Redirecting to /auth');
      return '/auth';
    }
    
    if (isAuth && isGoingToAuth) {
      print('   -> Redirecting to /');
      return '/';
    }
    
    print('   -> No redirect');
    return null;
  },
  routes: [
    GoRoute(
      path: '/tracking/:id',
      builder: (context, state) {
        final boatId = state.pathParameters['id'] ?? '1';
        return TrackingScreen(boatId: boatId);
      },
    ),
    ShellRoute(
      builder: (context, state, child) {
        final session = Supabase.instance.client.auth.currentSession;
        print('ShellRoute Builder => path: ${state.uri.path} | session: ${session != null}');
        return AppShell(child: child);
      },
      routes: [
        GoRoute(
          path: '/',
          builder: (context, state) => const MapScreen(),
        ),
        GoRoute(
          path: '/weather',
          builder: (context, state) => const WeatherScreen(),
        ),
        GoRoute(
          path: '/tides',
          builder: (context, state) => const TidesScreen(),
        ),
        GoRoute(
          path: '/events',
          builder: (context, state) => const EventsScreen(),
        ),
        GoRoute(
          path: '/achievements',
          builder: (context, state) => const AchievementsScreen(),
        ),
        GoRoute(
          path: '/logbook',
          builder: (context, state) => const LogbookScreen(),
        ),
        GoRoute(
          path: '/settings',
          builder: (context, state) => const SettingsScreen(),
        ),
        GoRoute(
          path: '/auth',
          builder: (context, state) => const AuthScreen(),
        ),
      ],
    ),
  ],
);

class GoRouterRefreshStream extends ChangeNotifier {
  GoRouterRefreshStream(Stream<dynamic> stream) {
    notifyListeners();
    _subscription = stream.asBroadcastStream().listen(
      (dynamic _) => notifyListeners(),
    );
  }

  late final StreamSubscription<dynamic> _subscription;

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}
