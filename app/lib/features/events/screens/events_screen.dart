import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';

class EventsScreen extends StatelessWidget {
  const EventsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Eventos e Torneios')),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          _buildEventCard('Torneio de Pesca de Outono', 'Guarujá, SP', '15 a 17 de Março', true),
          _buildEventCard('Regata de Velas do Litoral Norte', 'Ilhabela, SP', '12 de Maio', false),
          _buildEventCard('Encontro de Jet Skis', 'Angra dos Reis, RJ', 'Em Breve', false),
        ],
      ),
    );
  }

  Widget _buildEventCard(String title, String location, String date, bool isHighlighted) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      color: isHighlighted ? AppColors.primary.withOpacity(0.1) : AppColors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: isHighlighted ? const BorderSide(color: AppColors.primary, width: 2) : BorderSide(color: AppColors.surfaceLight, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            height: 120,
            width: double.infinity,
            decoration: const BoxDecoration(
              color: AppColors.surfaceLight,
              borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
            ),
            child: Icon(isHighlighted ? Icons.emoji_events : Icons.sailing, size: 48, color: AppColors.textMuted.withOpacity(0.5)),
          ),
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (isHighlighted)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    margin: const EdgeInsets.only(bottom: 8),
                    decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(4)),
                    child: const Text('EM DESTAQUE', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                  ),
                Text(title, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.location_on, size: 16, color: AppColors.secondary),
                    const SizedBox(width: 4),
                    Expanded(child: Text(location, style: const TextStyle(color: AppColors.textLight))),
                  ],
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.event, size: 16, color: AppColors.secondary),
                    const SizedBox(width: 4),
                    Expanded(child: Text(date, style: const TextStyle(color: AppColors.textLight))),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
