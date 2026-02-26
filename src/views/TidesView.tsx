import { useState, useEffect } from "react";
import { useStore } from "../store";
import { Compass, Moon, Sun, Fish, Waves, MapPin, X } from "lucide-react";
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
  ReferenceLine,
} from "recharts";
import { format } from "date-fns";

export function TidesView() {
  const location = useStore((state) => state.location);
  const forecastLocation = useStore((state) => state.forecastLocation);
  const setForecastLocation = useStore((state) => state.setForecastLocation);
  
  const activeLocation = forecastLocation || location;

  const [tides, setTides] = useState<any>(null);
  const [activity, setActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"activity" | "tides" | "sunmoon">("activity");
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [pickerTempLocation, setPickerTempLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    if (!activeLocation) return;

    const fetchTides = async () => {
      try {
        setLoading(true);
        // Simulating tide data based on current time
        const now = new Date();
        const tideData = [];
        const activityData = [];
        
        for (let i = 0; i < 24; i++) {
          const time = new Date(now.getTime() + i * 60 * 60 * 1000);
          // Simple sine wave for semi-diurnal tide (12.4 hours period)
          const hours = time.getTime() / (1000 * 60 * 60);
          const tideHeight = 1.5 + Math.sin((hours * Math.PI * 2) / 12.4) * 1.2;
          
          // Simulate fish activity (solunar theory approximation)
          const activityLevel = 50 + Math.sin((hours * Math.PI * 2) / 12.4 + Math.PI/4) * 40 + Math.sin((hours * Math.PI * 2) / 24) * 10;

          tideData.push({
            time: format(time, "HH:mm"),
            height: Number(tideHeight.toFixed(2)),
            rawTime: time,
          });
          
          activityData.push({
            time: format(time, "HH:mm"),
            level: Number(activityLevel.toFixed(0)),
            rawTime: time,
          });
        }

        setTides(tideData);
        setActivity(activityData);
      } catch (err) {
        console.error("Failed to fetch tides", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTides();
  }, [activeLocation]);

  if (!activeLocation) {
    return (
      <div className="flex items-center justify-center h-full p-6 text-center">
        <div className="bg-[#112240] p-6 rounded-2xl border border-[#233554]">
          <Compass className="w-12 h-12 text-[#8892b0] mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-semibold mb-2">Aguardando Localização</h2>
          <p className="text-[#8892b0] text-sm">
            Por favor, ative os serviços de localização para ver as previsões locais.
          </p>
        </div>
      </div>
    );
  }

  if (loading || !tides) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-[#233554] border-t-[#3b82f6] rounded-full animate-spin"></div>
      </div>
    );
  }

  // Find next high/low
  let nextHigh = null;
  let nextLow = null;
  for (let i = 1; i < tides.length - 1; i++) {
    if (
      tides[i].height > tides[i - 1].height &&
      tides[i].height > tides[i + 1].height &&
      !nextHigh
    ) {
      nextHigh = tides[i];
    }
    if (
      tides[i].height < tides[i - 1].height &&
      tides[i].height < tides[i + 1].height &&
      !nextLow
    ) {
      nextLow = tides[i];
    }
  }

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
            Previsões
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
            onClick={() => setActiveTab("activity")}
            className={`flex-1 min-w-[100px] py-3 px-4 text-sm font-bold rounded-xl transition-all duration-300 whitespace-nowrap ${
              activeTab === "activity"
                ? "bg-gradient-to-br from-[#64ffda]/20 to-teal-400/10 text-[#64ffda] shadow-[0_0_15px_rgba(100,255,218,0.2)] border border-[#64ffda]/30"
                : "text-[#8892b0] hover:text-white hover:bg-white/5 border border-transparent"
            }`}
          >
            Atividade
          </button>
          <button
            onClick={() => setActiveTab("tides")}
            className={`flex-1 min-w-[100px] py-3 px-4 text-sm font-bold rounded-xl transition-all duration-300 whitespace-nowrap ${
              activeTab === "tides"
                ? "bg-gradient-to-br from-blue-500/20 to-indigo-500/10 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)] border border-blue-500/30"
                : "text-[#8892b0] hover:text-white hover:bg-white/5 border border-transparent"
            }`}
          >
            Marés
          </button>
          <button
            onClick={() => setActiveTab("sunmoon")}
            className={`flex-1 min-w-[100px] py-3 px-4 text-sm font-bold rounded-xl transition-all duration-300 whitespace-nowrap ${
              activeTab === "sunmoon"
                ? "bg-gradient-to-br from-yellow-500/20 to-orange-500/10 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.2)] border border-yellow-500/30"
                : "text-[#8892b0] hover:text-white hover:bg-white/5 border border-transparent"
            }`}
          >
            Sol e Lua
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 pb-24 space-y-6 custom-scrollbar">
        {activeTab === "activity" && (
          <>
            <div className="bg-gradient-to-br from-[#112240] to-[#0a192f] p-6 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="flex justify-between items-center mb-6 relative z-10">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#8892b0] flex items-center gap-2">
                  <Fish size={16} className="text-emerald-400" />
                  Atividade de Peixes
                </h3>
                <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-lg text-xs font-bold border border-emerald-500/30">ALTA</span>
              </div>
              <div className="h-48 w-full relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activity} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" stroke="#8892b0" fontSize={10} tickMargin={10} minTickGap={20} />
                    <YAxis stroke="#8892b0" fontSize={10} domain={[0, 100]} hide />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#112240", borderColor: "#233554", borderRadius: "8px" }}
                      itemStyle={{ color: "#10b981" }}
                    />
                    <Area type="monotone" dataKey="level" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorActivity)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-[#112240] to-[#0a192f] p-5 rounded-3xl border border-white/5 shadow-xl">
                <div className="text-xs font-bold uppercase tracking-widest text-[#8892b0] mb-4">
                  Períodos Maiores
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                    <Fish size={18} className="text-emerald-400" />
                    <span className="text-sm font-bold text-white">04:30 - 06:30</span>
                  </div>
                  <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                    <Fish size={18} className="text-emerald-400" />
                    <span className="text-sm font-bold text-white">16:45 - 18:45</span>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-[#112240] to-[#0a192f] p-5 rounded-3xl border border-white/5 shadow-xl">
                <div className="text-xs font-bold uppercase tracking-widest text-[#8892b0] mb-4">
                  Períodos Menores
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                    <Fish size={18} className="text-blue-400" />
                    <span className="text-sm font-bold text-white">10:15 - 11:15</span>
                  </div>
                  <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                    <Fish size={18} className="text-blue-400" />
                    <span className="text-sm font-bold text-white">22:30 - 23:30</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "tides" && (
          <>
            <div className="bg-gradient-to-br from-[#112240] to-[#0a192f] p-6 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#8892b0] mb-6 flex items-center gap-2 relative z-10">
                <Waves size={16} className="text-[#3b82f6]" />
                Gráfico de Marés (24h)
              </h3>
              <div className="h-48 w-full relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={tides}
                    margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorTide" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="time"
                      stroke="#8892b0"
                      fontSize={10}
                      tickMargin={10}
                      minTickGap={20}
                    />
                    <YAxis
                      stroke="#8892b0"
                      fontSize={10}
                      domain={["dataMin - 0.5", "dataMax + 0.5"]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#112240",
                        borderColor: "#233554",
                        borderRadius: "8px",
                      }}
                      itemStyle={{ color: "#3b82f6" }}
                    />
                    <ReferenceLine y={1.5} stroke="#233554" strokeDasharray="3 3" />
                    <Area
                      type="monotone"
                      dataKey="height"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorTide)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-[#112240] to-[#0a192f] p-5 rounded-3xl border border-white/5 shadow-xl">
                <div className="text-xs font-bold uppercase tracking-widest text-[#8892b0] mb-2">
                  Próxima Preamar
                </div>
                <div className="text-3xl font-light text-white tracking-tighter">
                  {nextHigh ? nextHigh.time : "--:--"}
                </div>
                <div className="text-sm font-bold text-[#3b82f6] mt-2 bg-blue-500/10 w-fit px-3 py-1 rounded-lg border border-blue-500/20">
                  {nextHigh ? `${nextHigh.height}m` : "--"}
                </div>
              </div>
              <div className="bg-gradient-to-br from-[#112240] to-[#0a192f] p-5 rounded-3xl border border-white/5 shadow-xl">
                <div className="text-xs font-bold uppercase tracking-widest text-[#8892b0] mb-2">
                  Próxima Baixa-mar
                </div>
                <div className="text-3xl font-light text-white tracking-tighter">
                  {nextLow ? nextLow.time : "--:--"}
                </div>
                <div className="text-sm font-bold text-[#ff6b6b] mt-2 bg-red-500/10 w-fit px-3 py-1 rounded-lg border border-red-500/20">
                  {nextLow ? `${nextLow.height}m` : "--"}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "sunmoon" && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-[#112240] to-[#0a192f] p-6 rounded-3xl border border-white/5 shadow-xl flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center shadow-inner border border-yellow-500/20">
                <Sun className="text-yellow-400" size={32} />
              </div>
              <div className="flex-1">
                <div className="text-lg font-bold text-white tracking-tight">Sol</div>
                <div className="flex justify-between mt-3 text-xs font-bold text-[#8892b0] uppercase tracking-wider bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-400"></span>Nascer: 06:15</span>
                  <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-500"></span>Pôr: 18:45</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#112240] to-[#0a192f] p-6 rounded-3xl border border-white/5 shadow-xl flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center shadow-inner border border-blue-500/20">
                <Moon className="text-blue-200" size={32} />
              </div>
              <div className="flex-1">
                <div className="text-lg font-bold text-white tracking-tight">Lua</div>
                <div className="text-xs font-bold text-[#64ffda] mt-1 uppercase tracking-widest">Minguante • Ilum: 23%</div>
                <div className="flex justify-between mt-3 text-xs font-bold text-[#8892b0] uppercase tracking-wider bg-white/5 p-3 rounded-xl border border-white/5">
                  <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-300"></span>Nascer: 02:30</span>
                  <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-400"></span>Pôr: 14:15</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showLocationPicker && (
        <div className="absolute inset-0 z-[100] bg-[#0a192f]/80 backdrop-blur-md flex flex-col">
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
        </div>
      )}
    </div>
  );
}
