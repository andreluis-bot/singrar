import { useState } from "react";
import { useStore } from "../store";
import { Fish, MapPin, Calendar, Plus, Trash2, Route, Eye, EyeOff, Mic, Camera, Waves, Zap, Anchor, Info, BookOpen } from "lucide-react";
import { format } from "date-fns";

export function LogbookView() {
  const {
    logEntries,
    waypoints,
    tracks,
    removeLogEntry,
    removeWaypoint,
    removeTrack,
    updateTrack,
  } = useStore();
  const [activeTab, setActiveTab] = useState<
    "logs" | "waypoints" | "tracks"
  >("logs");

  const getLogIcon = (type: string) => {
    switch (type) {
      case "fishing": return <Fish size={20} />;
      case "jetski": return <Zap size={20} />;
      case "wakesurf": return <Waves size={20} />;
      case "diving": return <Anchor size={20} />;
      default: return <Info size={20} />;
    }
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case "fishing": return "text-emerald-400 bg-emerald-400/10";
      case "jetski": return "text-blue-400 bg-blue-400/10";
      case "wakesurf": return "text-cyan-400 bg-cyan-400/10";
      case "diving": return "text-indigo-400 bg-indigo-400/10";
      default: return "text-slate-400 bg-slate-400/10";
    }
  };

  return (
    <div className="h-full flex flex-col pb-4">
      <header className="p-6 shrink-0 bg-gradient-to-b from-[#0a192f] to-transparent">
        <h1 className="text-3xl font-bold font-sans tracking-tight text-white mb-6">
          Diário de Bordo
        </h1>

        <div className="flex p-1.5 bg-gradient-to-r from-[#112240]/90 to-[#0a192f]/90 backdrop-blur-xl rounded-2xl border border-white/10 overflow-x-auto hide-scrollbar shadow-2xl">
          <button
            onClick={() => setActiveTab("logs")}
            className={`flex-1 min-w-[100px] py-3 px-4 text-sm font-bold rounded-xl transition-all duration-300 whitespace-nowrap ${
              activeTab === "logs"
                ? "bg-gradient-to-br from-[#64ffda]/20 to-teal-400/10 text-[#64ffda] shadow-[0_0_15px_rgba(100,255,218,0.2)] border border-[#64ffda]/30"
                : "text-[#8892b0] hover:text-white hover:bg-white/5 border border-transparent"
            }`}
          >
            Atividades ({(logEntries || []).length})
          </button>
          <button
            onClick={() => setActiveTab("waypoints")}
            className={`flex-1 min-w-[100px] py-3 px-4 text-sm font-bold rounded-xl transition-all duration-300 whitespace-nowrap ${
              activeTab === "waypoints"
                ? "bg-gradient-to-br from-blue-500/20 to-indigo-500/10 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)] border border-blue-500/30"
                : "text-[#8892b0] hover:text-white hover:bg-white/5 border border-transparent"
            }`}
          >
            Marcadores ({(waypoints || []).length})
          </button>
          <button
            onClick={() => setActiveTab("tracks")}
            className={`flex-1 min-w-[100px] py-3 px-4 text-sm font-bold rounded-xl transition-all duration-300 whitespace-nowrap ${
              activeTab === "tracks"
                ? "bg-gradient-to-br from-purple-500/20 to-fuchsia-500/10 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)] border border-purple-500/30"
                : "text-[#8892b0] hover:text-white hover:bg-white/5 border border-transparent"
            }`}
          >
            Rotas ({(tracks || []).length})
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 pb-24 space-y-4 custom-scrollbar">
        {activeTab === "logs" &&
          ((logEntries || []).length === 0 ? (
            <div className="text-center py-16 text-[#8892b0] bg-gradient-to-b from-[#112240]/50 to-transparent rounded-3xl border border-white/5">
              <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30 text-[#64ffda]" />
              <p className="font-medium text-lg text-white mb-1">Nenhuma atividade</p>
              <p className="text-sm">Seus registros aparecerão aqui.</p>
            </div>
          ) : (
            (logEntries || []).map((l) => (
              <div
                key={l.id}
                className="bg-gradient-to-br from-[#112240] to-[#0a192f] p-5 rounded-3xl border border-white/5 shadow-xl flex gap-5 relative overflow-hidden"
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${getLogColor(l.type)}`}>
                  {getLogIcon(l.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg text-white truncate pr-2">
                      {l.title}
                    </h3>
                    <button
                      onClick={() => removeLogEntry(l.id)}
                      className="text-[#8892b0] hover:text-red-400 p-1.5 bg-white/5 rounded-full transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-[#8892b0] mt-1.5 uppercase font-bold tracking-wider">
                    <span className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md">
                      <Calendar size={12} />{" "}
                      {l.createdAt ? format(l.createdAt, "dd/MM/yyyy") : "N/A"}
                    </span>
                    <span className="px-2 py-1 rounded-md bg-white/5 border border-white/5 text-[#64ffda]">{l.type}</span>
                  </div>
                  
                  {l.type === 'fishing' && (
                    <div className="flex gap-3 mt-3 text-xs text-[#64ffda] font-mono font-bold bg-[#64ffda]/10 w-fit px-3 py-1.5 rounded-lg border border-[#64ffda]/20">
                      <span>{l.species}</span>
                      <span className="w-1 h-1 rounded-full bg-[#64ffda] self-center"></span>
                      <span>{l.weight}kg</span>
                      <span className="w-1 h-1 rounded-full bg-[#64ffda] self-center"></span>
                      <span>{l.length}cm</span>
                    </div>
                  )}

                  {l.notes && (
                    <p className="text-sm text-[#ccd6f6] mt-3 line-clamp-2 bg-white/5 p-3 rounded-xl border border-white/5">
                      {l.notes}
                    </p>
                  )}
                  {l.photo && (
                    <div className="mt-4 rounded-xl overflow-hidden border border-white/10 shadow-lg">
                      <img src={l.photo} alt="Registro" className="w-full h-40 object-cover hover:scale-105 transition-transform duration-500" />
                    </div>
                  )}
                </div>
              </div>
            ))
          ))}

        {activeTab === "waypoints" &&
          ((waypoints || []).length === 0 ? (
            <div className="text-center py-16 text-[#8892b0] bg-gradient-to-b from-[#112240]/50 to-transparent rounded-3xl border border-white/5">
              <MapPin className="w-16 h-16 mx-auto mb-4 opacity-30 text-[#64ffda]" />
              <p className="font-medium text-lg text-white mb-1">Nenhum marcador</p>
              <p className="text-sm">Adicione-os através do Mapa.</p>
            </div>
          ) : (
            (waypoints || []).map((wp) => (
              <div
                key={wp.id}
                className="bg-gradient-to-br from-[#112240] to-[#0a192f] p-5 rounded-3xl border border-white/5 shadow-xl flex flex-col gap-4"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner"
                    style={{ backgroundColor: wp.color + "20", color: wp.color, border: `1px solid ${wp.color}40` }}
                  >
                    {wp.icon === 'mic' ? <Mic size={24} /> : <MapPin size={24} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-white truncate">
                      {wp.name}
                    </h3>
                    <div className="text-xs text-[#8892b0] font-mono mt-1 bg-white/5 w-fit px-2 py-1 rounded-md">
                      {wp.lat.toFixed(5)}, {wp.lng.toFixed(5)}
                    </div>
                  </div>
                  <button
                    onClick={() => removeWaypoint(wp.id)}
                    className="text-[#8892b0] hover:text-red-400 p-2 bg-white/5 rounded-full transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                
                {wp.audio && (
                  <div className="mt-1 bg-[#0a192f]/50 p-3 rounded-xl border border-white/5">
                    <audio controls src={wp.audio} className="w-full h-10" />
                  </div>
                )}
                
                {wp.photo && (
                  <div className="mt-1 rounded-xl overflow-hidden border border-white/10 shadow-lg">
                    <img src={wp.photo} alt="Marcador" className="w-full h-40 object-cover hover:scale-105 transition-transform duration-500" />
                  </div>
                )}
              </div>
            ))
          ))}

        {activeTab === "tracks" &&
          ((tracks || []).length === 0 ? (
            <div className="text-center py-16 text-[#8892b0] bg-gradient-to-b from-[#112240]/50 to-transparent rounded-3xl border border-white/5">
              <Route className="w-16 h-16 mx-auto mb-4 opacity-30 text-[#64ffda]" />
              <p className="font-medium text-lg text-white mb-1">Nenhuma rota</p>
              <p className="text-sm">Inicie a gravação no Mapa.</p>
            </div>
          ) : (
            (tracks || []).map((t) => (
              <div
                key={t.id}
                className="bg-gradient-to-br from-[#112240] to-[#0a192f] p-5 rounded-3xl border border-white/5 shadow-xl flex items-center gap-5"
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner"
                  style={{ backgroundColor: t.color + "20", color: t.color, border: `1px solid ${t.color}40` }}
                >
                  <Route size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-white truncate">
                    {t.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-[#8892b0] font-mono mt-1.5">
                    <span className="bg-white/5 px-2 py-1 rounded-md">{(t.points || []).length} pts</span>
                    <span className="bg-white/5 px-2 py-1 rounded-md">{format(t.createdAt, "dd/MM/yyyy")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-[#0a192f]/50 p-1.5 rounded-2xl border border-white/5">
                  <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-white/10">
                    <input 
                      type="color" 
                      value={t.color} 
                      onChange={(e) => updateTrack(t.id, { color: e.target.value })}
                      className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer bg-transparent border-0 p-0"
                    />
                  </div>
                  <button
                    onClick={() => updateTrack(t.id, { visible: t.visible === false ? true : false })}
                    className={`p-2 rounded-full transition-colors ${t.visible !== false ? 'text-[#64ffda] hover:bg-white/5' : 'text-[#8892b0] hover:bg-white/5'}`}
                  >
                    {t.visible !== false ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                  <button
                    onClick={() => removeTrack(t.id)}
                    className="text-[#8892b0] hover:text-red-400 hover:bg-white/5 p-2 rounded-full transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          ))}
      </div>

      {activeTab === "logs" && (
        <div className="absolute bottom-24 right-6">
          <button className="w-14 h-14 bg-gradient-to-br from-[#64ffda] to-blue-400 text-[#0a192f] rounded-full shadow-[0_0_20px_rgba(100,255,218,0.4)] flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200">
            <Plus size={28} />
          </button>
        </div>
      )}
    </div>
  );
}
