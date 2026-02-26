import 'package:flutter/material.dart';

class AppColors {
  // Backgrounds - Sea/Night theme
  static const Color background = Color(0xFF0A192F);
  static const Color surface = Color(0xFF112240);
  static const Color surfaceLight = Color(0xFF233554);
  
  // Accents
  static const Color primary = Color(0xFF64FFDA); // Cyan/Green Accent
  static const Color secondary = Color(0xFF3B82F6); // Blue Accent
  
  // Text
  static const Color textLight = Color(0xFFE6F1FF);
  static const Color textMuted = Color(0xFF8892B0);
  
  // Status/Alerts
  static const Color error = Color(0xFFFF6B6B);
  static const Color warning = Color(0xFFFBBF24);
  static const Color success = Color(0xFF64FFDA);

  // Gradient helper for premium feel
  static const LinearGradient premiumGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFF233554),
      Color(0xFF112240),
    ],
  );
}
