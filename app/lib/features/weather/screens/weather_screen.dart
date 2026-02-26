import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_colors.dart';
import '../providers/weather_providers.dart';

class WeatherScreen extends ConsumerWidget {
  const WeatherScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final weatherAsync = ref.watch(weatherForecastProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Meteorologia')),
      body: weatherAsync.when(
        data: (data) {
          // Gráfico de Pressão (Barômetro vital para navegação)
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _buildSectionTitle('Barômetro (hPa) - Últimas/Próximas 24h'),
              const SizedBox(height: 8),
              SizedBox(
                height: 250,
                child: _buildChart(data.times, data.pressures, AppColors.secondary, 'hPa'),
              ),
              const SizedBox(height: 32),
              _buildSectionTitle('Vento (nós) - Últimas/Próximas 24h'),
              const SizedBox(height: 8),
              SizedBox(
                height: 250,
                // Converting km/h to knots
                child: _buildChart(data.times, data.windSpeeds.map((w) => w / 1.852).toList(), AppColors.error, 'kt'),
              ),
              const SizedBox(height: 32),
              _buildSectionTitle('Temperatura (°C) - Últimas/Próximas 24h'),
              const SizedBox(height: 8),
              SizedBox(
                height: 250,
                child: _buildChart(data.times, data.temperatures, AppColors.primary, '°C'),
              ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
        error: (err, stack) => Center(child: Text('Erro: $err', style: const TextStyle(color: AppColors.error))),
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

  Widget _buildChart(List<DateTime> times, List<double> values, Color color, String unit) {
    // Pegar um range razoável para o gráfico: agora - 12h até agora + 24h
    final now = DateTime.now();
    final startIndex = times.indexWhere((t) => t.isAfter(now.subtract(const Duration(hours: 12))));
    final endIndex = times.indexWhere((t) => t.isAfter(now.add(const Duration(hours: 24))));
    
    final validStart = startIndex == -1 ? 0 : startIndex;
    final validEnd = endIndex == -1 ? times.length : endIndex;

    final subTimes = times.sublist(validStart, validEnd);
    final subValues = values.sublist(validStart, validEnd);

    if (subTimes.isEmpty) return const SizedBox.shrink();

    double minY = subValues.reduce((a, b) => a < b ? a : b);
    double maxY = subValues.reduce((a, b) => a > b ? a : b);
    final padding = (maxY - minY) * 0.1;
    minY = minY == maxY ? minY - 1 : minY - padding;
    maxY = minY == maxY ? maxY + 1 : maxY + padding;
    if (minY == maxY) { minY -= 1; maxY += 1; }

    final spots = List.generate(subTimes.length, (i) {
      return FlSpot(i.toDouble(), subValues[i]);
    });

    return LineChart(
      LineChartData(
        gridData: FlGridData(
          show: true,
          drawVerticalLine: true,
          getDrawingHorizontalLine: (value) => const FlLine(color: AppColors.surfaceLight, strokeWidth: 1),
          getDrawingVerticalLine: (value) => const FlLine(color: AppColors.surfaceLight, strokeWidth: 1),
        ),
        titlesData: FlTitlesData(
          show: true,
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 30,
              interval: 6,
              getTitlesWidget: (value, meta) {
                if (value.toInt() >= 0 && value.toInt() < subTimes.length) {
                  return Padding(
                    padding: const EdgeInsets.only(top: 8.0),
                    child: Text(
                      DateFormat('HH:mm').format(subTimes[value.toInt()]),
                      style: const TextStyle(color: AppColors.textMuted, fontSize: 10),
                    ),
                  );
                }
                return const Text('');
              },
            ),
          ),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              interval: ((maxY - minY) / 4).abs() > 0 ? ((maxY - minY) / 4).abs() : 1,
              reservedSize: 42,
              getTitlesWidget: (value, meta) {
                return Text(
                  value.toStringAsFixed(1),
                  style: const TextStyle(color: AppColors.textMuted, fontSize: 10),
                );
              },
            ),
          ),
        ),
        borderData: FlBorderData(show: false),
        minX: 0,
        maxX: (subTimes.length - 1).toDouble(),
        minY: minY,
        maxY: maxY,
        lineBarsData: [
          LineChartBarData(
            spots: spots,
            isCurved: true,
            color: color,
            barWidth: 3,
            isStrokeCapRound: true,
            dotData: const FlDotData(show: false),
            belowBarData: BarAreaData(
              show: true,
              color: color.withOpacity(0.1),
            ),
          ),
        ],
        lineTouchData: LineTouchData(
          touchTooltipData: LineTouchTooltipData(
            getTooltipColor: (_) => AppColors.surface,
            getTooltipItems: (touchedSpots) {
              return touchedSpots.map((spot) {
                final time = DateFormat('dd/MM HH:mm').format(subTimes[spot.x.toInt()]);
                return LineTooltipItem(
                  '$time\n${spot.y.toStringAsFixed(1)} $unit',
                  const TextStyle(color: AppColors.textLight, fontWeight: FontWeight.bold),
                );
              }).toList();
            },
          ),
        ),
      ),
    );
  }
}
