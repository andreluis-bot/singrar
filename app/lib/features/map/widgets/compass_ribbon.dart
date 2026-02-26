import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/map_providers.dart';
import '../../../../core/theme/app_colors.dart';

class CompassRibbon extends ConsumerWidget {
  const CompassRibbon({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final heading = ref.watch(currentHeadingProvider);
    
    // Converte de 0-360 para texto direcional
    String _getDirection(double hdg) {
      if (hdg >= 337.5 || hdg < 22.5) return 'N';
      if (hdg >= 22.5 && hdg < 67.5) return 'NE';
      if (hdg >= 67.5 && hdg < 112.5) return 'E';
      if (hdg >= 112.5 && hdg < 157.5) return 'SE';
      if (hdg >= 157.5 && hdg < 202.5) return 'S';
      if (hdg >= 202.5 && hdg < 247.5) return 'SW';
      if (hdg >= 247.5 && hdg < 292.5) return 'W';
      if (hdg >= 292.5 && hdg < 337.5) return 'NW';
      return '';
    }

    return Container(
      height: 40,
      width: double.infinity,
      decoration: BoxDecoration(
        color: AppColors.background.withOpacity(0.85),
        border: const Border(bottom: BorderSide(color: AppColors.surfaceLight)),
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Simulated ribbon moving opposite to the heading
          Positioned(
            left: (MediaQuery.of(context).size.width / 2) - (heading * 2), // 2 pixels per degree
            child: Row(
              children: List.generate(720, (index) { // 2 full rotations to allow overlap
                final degree = index % 360;
                final isMajor = degree % 90 == 0;
                final isMinor = degree % 10 == 0;
                
                if (!isMinor && !isMajor) return const SizedBox.shrink();

                return Container(
                  width: isMinor ? 20 : 0, 
                  alignment: Alignment.bottomCenter,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      if (isMajor)
                        Text(
                          _getDirection(degree.toDouble()),
                          style: const TextStyle(
                            color: AppColors.primary,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      Container(
                        width: 2,
                        height: isMajor ? 12 : 6,
                        color: isMajor ? AppColors.primary : AppColors.textMuted.withOpacity(0.5),
                        margin: const EdgeInsets.only(top: 2),
                      ),
                    ],
                  ),
                );
              }),
            ),
          ),
          
          // Center Indicator Line
          Container(
            width: 4,
            height: double.infinity,
            color: AppColors.error,
          ),
          
          // Digital Readout
          Positioned(
            bottom: 4,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.surfaceLight),
              ),
              child: Text(
                '${heading.toStringAsFixed(0)}°',
                style: const TextStyle(
                  color: AppColors.textLight,
                  fontFamily: 'JetBrains Mono',
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
