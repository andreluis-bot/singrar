import { useState, useEffect } from "react";
import { useStore } from "../store";
import { motion, AnimatePresence } from "motion/react";
import { Wind, Droplets, Thermometer, Compass, Waves, ArrowDown, ArrowUp, AlertTriangle, Calendar, MapPin, X } from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents
} from "react-leaflet";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

export function WeatherView() {
  const location = useStore((state) => state.location);
  const forecastLocation = useStore((state) => state.forecastLocation);
  const setForecastLocation = useStore((state) => state.setForecastLocation);
  const setWeatherAlert = useStore((state) => state.setWeatherAlert);
  
  const activeLocation = forecastLocation || location;

  const [weather, setWeather] = useState<any>(null);
  const [marine, setMarine] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"weather" | "waves" | "forecast" | "radar">("weather");
  const [simulatedAlert, setSimulatedAlert] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [pickerTempLocation, setPickerTempLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    if (!activeLocation) return;

    const fetchWeather = async () => {
      try {
        setLoading(true);
        const [weatherRes, marineRes] = await Promise.all([
          fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${activeLocation.lat}&longitude=${activeLocation.lng}&current=temperature_2m,wind_speed_10m,wind_direction_10m,weather_code,surface_pressure,precipitation&hourly=temperature_2m,wind_speed_10m,surface_pressure,wind_direction_10m,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,wind_direction_10m_dominant,precipitation_probability_max&wind_speed_unit=kn&timezone=auto`,
          ),
          fetch(
            `https://marine-api.open-meteo.com/v1/marine?latitude=${activeLocation.lat}&longitude=${activeLocation.lng}&current=wave_height,wave_direction,wave_period&hourly=wave_height`,
          ),
        ]);

        const weatherData = await weatherRes.json();
        const marineData = await marineRes.json();

        setWeather(weatherData);
        setMarine(marineData);
      } catch (err) {
        console.error("Failed to fetch weather", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [activeLocation]);

  useEffect(() => {
    if (weather) {
      const currentPressure = weather.current.surface_pressure;
      const currentHourIndex = weather.hourly.time.findIndex((t: string) => new Date(t).getTime() > Date.now()) - 1;
      const indexToUse = currentHourIndex > 0 ? currentHourIndex : 0;
      const pastPressureIndex = Math.max(0, indexToUse - 3);
      const pastPressure = weather.hourly.surface_pressure[pastPressureIndex];
      const pressureDiff = currentPressure - pastPressure;
      
      if (pressureDiff <= -3 || simulatedAlert) {
        setWeatherAlert(true);
      } else {
        setWeatherAlert(false);
      }
    }
  }, [weather, simulatedAlert, setWeatherAlert]);

  if (!activeLocation) {
    return (
      <div className="flex items-center justify-center h-full p-6 text-center">
        <div className="bg-[#112240] p-6 rounded-2xl border border-[#233554]">
          <Compass className="w-12 h-12 text-[#8892b0] mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-semibold mb-2">Aguardando Localização</h2>
          <p className="text-[#8892b0] text-sm">
            Por favor, ative os serviços de localização para ver o clima local e as condições marítimas.
          </p>
        </div>
      </div>
    );
  }

  if (loading || !weather) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-[#233554] border-t-[#64ffda] rounded-full animate-spin"></div>
      </div>
    );
  }

  const current = weather.current;
  const currentMarine = marine?.current;

  const currentPressure = current.surface_pressure;
  const currentHourIndex = weather.hourly.time.findIndex((t: string) => new Date(t).getTime() > Date.now()) - 1;
  const indexToUse = currentHourIndex > 0 ? currentHourIndex : 0;
  
  const pastPressureIndex = Math.max(0, indexToUse - 3);
  const pastPressure = weather.hourly.surface_pressure[pastPressureIndex];
  
  const pressureDiff = currentPressure - pastPressure;
  const isPressureDroppingFast = pressureDiff <= -3 || simulatedAlert;

  const windData = weather.hourly.time
    .slice(0, 24)
    .map((time: string, i: number) => ({
      time: format(new Date(time), "HH:mm"),
      wind: weather.hourly.wind_speed_10m[i],
      precip: weather.hourly.precipitation_probability[i] || 0
    }));

  function LocationPickerEvents() {
    useMapEvents({
      click(e) {
        setPickerTempLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
      },
    });
    return null;
  }

  return (
    <div className="h-full flex flex-col pb-4">
      <header className="p-6 shrink-0 bg-gradient-to-b from-[#0a192f] to-transparent">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold font-sans tracking-tight text-white">
            Meteorologia
          </h1>
          <button 
            onClick={() => {
              setPickerTempLocation(activeLocation);
              setShowLocationPicker(true);
            }}
            className="flex items-center gap-2 bg-[#112240]/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-sm text-[#64ffda] shadow-lg hover:bg-[#233554] transition-colors"
          >
            <MapPin size={16} />
            {forecastLocation ? "Local Selecionado" : "Local Atual"}
          </button>
        </div>
        
        <div className="flex p-1.5 bg-gradient-to-r from-[#112240]/90 to-[#0a192f]/90 backdrop-blur-xl rounded-2xl border border-white/10 overflow-x-auto hide-scrollbar shadow-2xl">
          <button
            onClick={() => setActiveTab("weather")}
            className={`flex-1 min-w-[80px] py-3 px-4 text-sm font-bold rounded-xl transition-all duration-300 whitespace-nowrap ${
              activeTab === "weather"
                ? "bg-gradient-to-br from-[#64ffda]/20 to-teal-400/10 text-[#64ffda] shadow-[0_0_15px_rgba(100,255,218,0.2)] border border-[#64ffda]/30"
                : "text-[#8892b0] hover:text-white hover:bg-white/5 border border-transparent"
            }`}
          >
            Tempo
          </button>
          <button
            onClick={() => setActiveTab("waves")}
            className={`flex-1 min-w-[80px] py-3 px-4 text-sm font-bold rounded-xl transition-all duration-300 whitespace-nowrap ${
              activeTab === "waves"
                ? "bg-gradient-to-br from-blue-500/20 to-indigo-500/10 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)] border border-blue-500/30"
                : "text-[#8892b0] hover:text-white hover:bg-white/5 border border-transparent"
            }`}
          >
            Ondas
          </button>
          <button
            onClick={() => setActiveTab("forecast")}
            className={`flex-1 min-w-[80px] py-3 px-4 text-sm font-bold rounded-xl transition-all duration-300 whitespace-nowrap ${
              activeTab === "forecast"
                ? "bg-gradient-to-br from-purple-500/20 to-fuchsia-500/10 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)] border border-purple-500/30"
                : "text-[#8892b0] hover:text-white hover:bg-white/5 border border-transparent"
            }`}
          >
            7 Dias
          </button>
          <button
            onClick={() => setActiveTab("radar")}
            className={`flex-1 min-w-[80px] py-3 px-4 text-sm font-bold rounded-xl transition-all duration-300 whitespace-nowrap ${
              activeTab === "radar"
                ? "bg-gradient-to-br from-rose-500/20 to-red-500/10 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.2)] border border-rose-500/30"
                : "text-[#8892b0] hover:text-white hover:bg-white/5 border border-transparent"
            }`}
          >
            Radar
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 pb-24 space-y-6 custom-scrollbar">
        {activeTab === "weather" && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-[#112240] to-[#0a192f] p-5 rounded-3xl border border-white/5 shadow-xl flex flex-col relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>
                <div className="flex items-center gap-2 text-[#8892b0] mb-4 relative z-10">
                  <Wind size={18} className="text-[#64ffda]" />
                  <span className="text-xs font-bold uppercase tracking-widest">
                    Vento
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mt-auto relative z-10">
                  <span className="text-5xl font-light text-white tracking-tighter">
                    {current.wind_speed_10m.toFixed(1)}
                  </span>
                  <span className="text-sm text-[#8892b0] font-bold">kt</span>
                </div>
                <div className="flex items-center gap-1.5 mt-3 text-sm text-[#64ffda] font-medium relative z-10 bg-[#64ffda]/10 w-fit px-2.5 py-1 rounded-full">
                  <Compass
                    size={14}
                    style={{ transform: `rotate(${current.wind_direction_10m}deg)` }}
                  />
                  <span>{current.wind_direction_10m}°</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#112240] to-[#0a192f] p-5 rounded-3xl border border-white/5 shadow-xl flex flex-col relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl pointer-events-none"></div>
                <div className="flex items-center gap-2 text-[#8892b0] mb-4 relative z-10">
                  <Thermometer size={18} className="text-orange-400" />
                  <span className="text-xs font-bold uppercase tracking-widest">
                    Temp
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mt-auto relative z-10">
                  <span className="text-5xl font-light text-white tracking-tighter">
                    {current.temperature_2m.toFixed(1)}
                  </span>
                  <span className="text-sm text-[#8892b0] font-bold">°C</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#112240] to-[#0a192f] p-5 rounded-3xl border border-white/5 shadow-xl flex flex-col relative overflow-hidden">
                {isPressureDroppingFast && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-red-600/40 to-red-500/20 text-red-200 text-[10px] font-bold text-center py-1 flex items-center justify-center gap-1 backdrop-blur-sm z-20 border-b border-red-500/30">
                    <AlertTriangle size={12} /> QUEDA BRUSCA
                  </div>
                )}
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
                <div className={`flex items-center gap-2 text-[#8892b0] mb-4 relative z-10 ${isPressureDroppingFast ? 'mt-4' : ''}`}>
                  <Droplets size={18} className="text-indigo-400" />
                  <span className="text-xs font-bold uppercase tracking-widest">
                    Pressão
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mt-auto relative z-10">
                  <span className="text-4xl font-light text-white tracking-tighter">
                    {current.surface_pressure.toFixed(0)}
                  </span>
                  <span className="text-sm text-[#8892b0] font-bold">hPa</span>
                </div>
                <div className={`flex items-center gap-1.5 mt-3 text-sm font-medium relative z-10 w-fit px-2.5 py-1 rounded-full ${pressureDiff > 0 ? 'bg-emerald-500/10 text-emerald-400' : pressureDiff < 0 ? 'bg-red-500/10 text-red-400' : 'bg-white/5 text-[#8892b0]'}`}>
                  {pressureDiff > 0 ? <ArrowUp size={14} /> : pressureDiff < 0 ? <ArrowDown size={14} /> : null}
                  <span>{Math.abs(pressureDiff).toFixed(1)} hPa (3h)</span>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-[#112240] to-[#0a192f] p-5 rounded-3xl border border-white/5 shadow-xl flex flex-col relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-sky-500/10 rounded-full blur-2xl pointer-events-none"></div>
                <div className="flex items-center gap-2 text-[#8892b0] mb-4 relative z-10">
                  <Wind size={18} className="text-sky-400" />
                  <span className="text-xs font-bold uppercase tracking-widest">
                    Clima
                  </span>
                </div>
                <div className="flex items-end gap-1 mt-auto relative z-10">
                  <span className="text-2xl font-medium text-white tracking-tight leading-tight">
                    {current.weather_code === 0 ? "Céu Limpo" : "Instável"}
                  </span>
                </div>
              </div>
            </div>

            {/* Wind Forecast Chart */}
            <div className="bg-gradient-to-br from-[#112240] to-[#0a192f] p-6 rounded-3xl border border-white/5 shadow-xl mt-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#8892b0] mb-6 flex items-center gap-2">
                <Wind size={16} className="text-[#64ffda]" />
                Previsão de Vento (24h)
              </h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={windData}
                    margin={{ top: 5, right: 0, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorWind" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#64ffda" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#64ffda" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="time"
                      stroke="#8892b0"
                      fontSize={10}
                      tickMargin={10}
                      minTickGap={20}
                    />
                    <YAxis stroke="#8892b0" fontSize={10} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#112240",
                        borderColor: "#233554",
                        borderRadius: "8px",
                      }}
                      itemStyle={{ color: "#64ffda" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="wind"
                      stroke="#64ffda"
                      fillOpacity={1}
                      fill="url(#colorWind)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <button 
              onClick={() => setSimulatedAlert(!simulatedAlert)} 
              className={`w-full py-4 rounded-2xl font-bold transition-all duration-300 border shadow-lg mt-6 ${simulatedAlert ? 'bg-red-500/20 text-red-400 border-red-500/50 shadow-red-500/10' : 'bg-gradient-to-r from-[#112240] to-[#0a192f] text-[#8892b0] border-white/5 hover:text-white hover:border-white/20'}`}
            >
              {simulatedAlert ? "Parar Simulação de Tempestade" : "Simular Alerta de Tempestade"}
            </button>
          </>
        )}

        {activeTab === "waves" && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-[#112240] to-[#0a192f] p-6 rounded-3xl border border-white/5 shadow-xl flex flex-col col-span-2 relative overflow-hidden">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="flex items-center gap-2 text-[#8892b0] mb-6 relative z-10">
                  <Waves size={20} className="text-blue-400" />
                  <span className="text-xs font-bold uppercase tracking-widest">
                    Ondas (Altura e Período)
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-auto relative z-10">
                  <span className="text-7xl font-light text-white tracking-tighter">
                    {currentMarine?.wave_height
                      ? currentMarine.wave_height.toFixed(1)
                      : "--"}
                  </span>
                  <span className="text-xl text-blue-400 font-bold mb-2">m</span>
                  
                  <div className="ml-auto text-right bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
                    <div className="text-3xl font-light text-white tracking-tight">
                      {currentMarine?.wave_period
                        ? `${currentMarine.wave_period}s`
                        : "--"}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest font-bold text-[#8892b0] mt-1">Período</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-6 text-sm text-blue-400 font-medium relative z-10 bg-blue-500/10 w-fit px-3 py-1.5 rounded-full">
                  <Compass
                    size={16}
                    style={{ transform: `rotate(${currentMarine?.wave_direction || 0}deg)` }}
                  />
                  <span>{currentMarine?.wave_direction || 0}° Direção</span>
                </div>
              </div>
            </div>
          </>
        )}
        {activeTab === "forecast" && (
          <div className="space-y-4">
            {weather.daily.time.map((time: string, i: number) => (
              <div key={time} className="bg-gradient-to-r from-[#112240] to-[#0a192f] p-5 rounded-2xl border border-white/5 shadow-lg flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-white font-bold text-lg">{format(new Date(time), "EEE, dd/MM")}</span>
                  <span className="text-xs font-medium text-[#8892b0] mt-1 uppercase tracking-wider">{weather.daily.weather_code[i] === 0 ? "Céu Limpo" : "Instável"}</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-end">
                    <span className="text-lg font-bold text-white">{weather.daily.temperature_2m_max[i].toFixed(0)}°</span>
                    <span className="text-sm font-medium text-[#8892b0]">{weather.daily.temperature_2m_min[i].toFixed(0)}°</span>
                  </div>
                  <div className="w-px h-10 bg-white/10"></div>
                  <div className="flex flex-col items-center min-w-[48px]">
                    <Compass size={20} className="text-[#64ffda] mb-1.5" style={{ transform: `rotate(${weather.daily.wind_direction_10m_dominant[i]}deg)` }} />
                    <span className="text-xs font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded-md">{weather.daily.wind_speed_10m_max[i].toFixed(0)}kt</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {activeTab === "radar" && (
          <div className="h-[450px] w-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
            <iframe 
              width="100%" 
              height="100%" 
              src={`https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=kt&zoom=8&overlay=wind&product=ecmwf&level=surface&lat=${activeLocation.lat}&lon=${activeLocation.lng}`}
              frameBorder="0"
            ></iframe>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showLocationPicker && (
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute inset-0 z-[100] bg-[#0a192f]/80 backdrop-blur-md flex flex-col"
          >
            <div className="p-5 bg-gradient-to-b from-[#112240] to-[#0a192f] flex justify-between items-center border-b border-white/10 shadow-lg">
              <h2 className="text-xl font-bold text-white tracking-tight">Escolher Local</h2>
              <button onClick={() => setShowLocationPicker(false)} className="p-2 bg-white/5 rounded-full text-[#8892b0] hover:text-white hover:bg-white/10 transition-all"><X size={20} /></button>
            </div>
            <div className="flex-1 relative">
              <MapContainer
                center={[pickerTempLocation?.lat || activeLocation.lat, pickerTempLocation?.lng || activeLocation.lng]}
                zoom={10}
                className="w-full h-full"
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationPickerEvents />
                {pickerTempLocation && (
                  <Marker position={[pickerTempLocation.lat, pickerTempLocation.lng]} />
                )}
              </MapContainer>
              <div className="absolute bottom-6 left-4 right-4 z-[400]">
                <button 
                  onClick={() => {
                    setForecastLocation(pickerTempLocation);
                    setShowLocationPicker(false);
                  }}
                  className="w-full py-4 bg-gradient-to-r from-[#64ffda] to-teal-400 text-[#0a192f] font-black rounded-2xl shadow-[0_0_20px_rgba(100,255,218,0.4)] hover:shadow-[0_0_30px_rgba(100,255,218,0.6)] transition-all hover:scale-[1.02] active:scale-[0.98] uppercase tracking-wider text-sm"
                >
                  Confirmar Local
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
