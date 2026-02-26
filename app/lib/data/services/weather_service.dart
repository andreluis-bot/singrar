import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';
import '../models/weather_model.dart';

class WeatherService {
  Future<WeatherData> getForecast(LatLng location) async {
    final url = Uri.parse(
        'https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&hourly=temperature_2m,surface_pressure,wind_speed_10m&timezone=auto');
    final response = await http.get(url);

    if (response.statusCode == 200) {
      return WeatherData.fromJson(json.decode(response.body));
    } else {
      throw Exception('Erro ao carregar previsão meteorológica.');
    }
  }
}
