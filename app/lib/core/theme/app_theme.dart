import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

class AppTheme {
  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppColors.background,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.primary,
        secondary: AppColors.secondary,
        surface: AppColors.surface,
        error: AppColors.error,
        onPrimary: AppColors.background,
        onSecondary: Colors.white,
        onSurface: AppColors.textLight,
        onError: Colors.white,
      ),
      // Fonts
      textTheme: GoogleFonts.jetBrainsMonoTextTheme(ThemeData.dark().textTheme).copyWith(
        displayLarge: GoogleFonts.jetBrainsMono(color: AppColors.textLight, fontWeight: FontWeight.bold),
        displayMedium: GoogleFonts.jetBrainsMono(color: AppColors.textLight, fontWeight: FontWeight.bold),
        displaySmall: GoogleFonts.jetBrainsMono(color: AppColors.textLight, fontWeight: FontWeight.bold),
        bodyLarge: const TextStyle(color: AppColors.textLight),
        bodyMedium: const TextStyle(color: AppColors.textMuted),
      ),
      // Cards
      cardTheme: CardThemeData(
        color: AppColors.surface,
        elevation: 8,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
          side: const BorderSide(color: AppColors.surfaceLight, width: 1),
        ),
      ),
      // Bottom Navigation
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: AppColors.background,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.textMuted,
        elevation: 0,
      ),
      // App Bar
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        iconTheme: IconThemeData(color: AppColors.textLight),
        titleTextStyle: TextStyle(
          color: AppColors.textLight,
          fontSize: 20,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
