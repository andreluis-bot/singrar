import 'package:flutter/material.dart';

import 'core/theme/app_theme.dart';
import 'core/router/app_router.dart';

class SingrarApp extends StatelessWidget {
  const SingrarApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Singrar',
      theme: AppTheme.darkTheme,
      routerConfig: goRouter,
      debugShowCheckedModeBanner: false,
    );
  }
}
