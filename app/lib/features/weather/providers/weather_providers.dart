import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';
import '../../../data/services/weather_service.dart';
import '../../map/providers/map_providers.dart';
import '../../../data/models/weather_model.dart';

final weatherServiceProvider = Provider((ref) => WeatherService());

final weatherForecastProvider = FutureProvider<WeatherData>((ref) async {
  final pos = ref.watch(locationProvider).value;
  if (pos == null) {
    throw Exception('Aguardando sinal GPS...');
  }
  
  final service = ref.read(weatherServiceProvider);
  return service.getForecast(LatLng(pos.latitude, pos.longitude));
});
