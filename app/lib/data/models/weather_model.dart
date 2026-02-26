class WeatherData {
  final List<DateTime> times;
  final List<double> temperatures;
  final List<double> pressures;
  final List<double> windSpeeds;

  WeatherData({
    required this.times,
    required this.temperatures,
    required this.pressures,
    required this.windSpeeds,
  });

  factory WeatherData.fromJson(Map<String, dynamic> json) {
    final hourly = json['hourly'];
    final times = (hourly['time'] as List).map((t) => DateTime.parse(t)).toList();
    final temps = (hourly['temperature_2m'] as List).map((t) => (t as num).toDouble()).toList();
    final press = (hourly['surface_pressure'] as List).map((p) => (p as num).toDouble()).toList();
    final winds = (hourly['wind_speed_10m'] as List).map((w) => (w as num).toDouble()).toList();

    return WeatherData(
      times: times,
      temperatures: temps,
      pressures: press,
      windSpeeds: winds,
    );
  }
}
