import 'dart:math';
import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../../../core/theme/app_colors.dart';

class TidesScreen extends StatelessWidget {
  const TidesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Marés e Solunar')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildInfoCard(
            'Fase da Lua',
            'Lua Nova (2% Iluminada)',
            Icons.brightness_3, // Changed from brightness_2 to 3
            AppColors.textLight,
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(child: _buildInfoCard('Nascer do Sol', '05:42', Icons.wb_sunny_outlined, AppColors.warning)),
              const SizedBox(width: 16),
              Expanded(child: _buildInfoCard('Pôr do Sol', '18:15', Icons.wb_twilight, AppColors.error)),
            ],
          ),
          const SizedBox(height: 32),
          _buildSectionTitle('Previsão de Maré (Demonstração)'),
          const SizedBox(height: 16),
          SizedBox(
            height: 200,
            child: _buildTideChart(),
          ),
          const SizedBox(height: 32),
          _buildSectionTitle('Índice de Atividade (Peixes)'),
          const SizedBox(height: 16),
          _buildActivityBar('Atividade Atual', 0.8),
        ],
      ),
    );
  }

  Widget _buildInfoCard(String title, String value, IconData icon, Color iconColor) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, color: iconColor, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(value, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title.toUpperCase(),
      style: const TextStyle(
        color: AppColors.textMuted,
        fontWeight: FontWeight.bold,
        letterSpacing: 1.2,
        fontSize: 12,
      ),
    );
  }

  Widget _buildTideChart() {
    // Generate a simple sine wave for tides mock
    final spots = List.generate(24, (i) {
      final y = 1.0 + sin((i / 24) * 2 * pi) * 0.8;
      return FlSpot(i.toDouble(), y);
    });

    return LineChart(
      LineChartData(
        gridData: const FlGridData(show: false),
        titlesData: FlTitlesData(
          show: true,
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              interval: 4,
              reservedSize: 30,
              getTitlesWidget: (value, meta) {
                return Padding(
                  padding: const EdgeInsets.only(top: 8.0),
                  child: Text('${value.toInt()}h', style: const TextStyle(color: AppColors.textMuted, fontSize: 10)),
                );
              },
            ),
          ),
          leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        ),
        borderData: FlBorderData(show: false),
        minY: 0,
        maxY: 2,
        lineBarsData: [
          LineChartBarData(
            spots: spots,
            isCurved: true,
            color: AppColors.secondary,
            barWidth: 4,
            isStrokeCapRound: true,
            dotData: const FlDotData(show: false),
            belowBarData: BarAreaData(
              show: true,
              color: AppColors.secondary.withValues(alpha: 0.2), // Used withValues instead of withOpacity
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActivityBar(String label, double fillLevel) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: const TextStyle(color: Colors.white)),
            Text('${(fillLevel * 100).toInt()}%', style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
          ],
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: LinearProgressIndicator(
            value: fillLevel,
            backgroundColor: AppColors.surfaceLight,
            color: AppColors.primary,
            minHeight: 12,
          ),
        ),
      ],
    );
  }
}
