import React, { useRef } from "react";
import { useStore } from "../store";
import { Map as MapIcon, Ruler, Info, Wifi, Download, FileUp, X, Navigation, LayoutGrid, Radio, FileDown } from "lucide-react";
import { motion } from "motion/react";

export function SettingsView() {
  const settings = useStore((state) => state.settings);
  const updateSettings = useStore((state) => state.updateSettings);
  const addWaypoint = useStore((state) => state.addWaypoint);
  const addTrack = useStore((state) => state.addTrack);
  const addOfflineRegion = useStore((state) => state.addOfflineRegion);
  const removeOfflineRegion = useStore((state) => state.removeOfflineRegion);
  const waypoints = useStore((state) => state.waypoints);
  const tracks = useStore((state) => state.tracks);
  const navItems = useStore((state) => state.navItems);
  const setNavItems = useStore((state) => state.setNavItems);
  
  const location = useStore((state) => state.location);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [downloadProgress, setDownloadProgress] = React.useState(0);

  const lon2tile = (lon: number, zoom: number) => {
    return (Math.floor((lon + 180) / 360 * Math.pow(2, zoom)));
  };

  const lat2tile = (lat: number, zoom: number) => {
    return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)));
  };

  const handleRemoveRegion = async (id: string) => {
    removeOfflineRegion(id);
    // If it's the last region, clear the entire tile cache
    const remainingRegions = settings.offlineRegions?.filter(r => r.id !== id) || [];
    if (remainingRegions.length === 0) {
      try {
        await caches.delete('singrar-map-tiles-v1');
        console.log("Tile cache cleared");
      } catch (e) {
        console.error("Failed to clear tile cache", e);
      }
    }
  };

  const handleDownloadRegion = async () => {
    if (!location) {
      alert("Localização não disponível. Não é possível determinar a região para download.");
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);

    const { lat, lng } = location;
    // Radius roughly 10km (approximate degrees)
    const latDelta = 0.1;
    const lngDelta = 0.1;

    const minLat = lat - latDelta;
    const maxLat = lat + latDelta;
    const minLng = lng - lngDelta;
    const maxLng = lng + lngDelta;

    const zoomLevels = [10, 11, 12, 13, 14, 15];
    const urlsToCache: string[] = [];

    // Map types to download based on current setting
    const mapType = settings.mapType || 'nautical';

    zoomLevels.forEach(z => {
      const minX = lon2tile(minLng, z);
      const maxX = lon2tile(maxLng, z);
      const minY = lat2tile(maxLat, z);
      const maxY = lat2tile(minLat, z);

      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          if (mapType === 'street' || mapType === 'nautical') {
            urlsToCache.push(`https://a.tile.openstreetmap.org/${z}/${x}/${y}.png`);
            urlsToCache.push(`https://b.tile.openstreetmap.org/${z}/${x}/${y}.png`);
            urlsToCache.push(`https://c.tile.openstreetmap.org/${z}/${x}/${y}.png`);
          }
          if (mapType === 'nautical') {
            urlsToCache.push(`https://tiles.openseamap.org/seamark/${z}/${x}/${y}.png`);
          }
          if (mapType === 'satellite') {
            urlsToCache.push(`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`);
          }
        }
      }
    });

    // Deduplicate URLs
    const uniqueUrls = [...new Set(urlsToCache)];
    const totalTiles = uniqueUrls.length;
    let downloadedTiles = 0;

    try {
      const cache = await caches.open('singrar-map-tiles-v1');
      
      // Download in batches to avoid overwhelming the browser/network
      const batchSize = 20;
      for (let i = 0; i < uniqueUrls.length; i += batchSize) {
        const batch = uniqueUrls.slice(i, i + batchSize);
        await Promise.all(batch.map(async (url) => {
          try {
            const response = await fetch(url, { mode: 'no-cors' });
            // For no-cors, response.ok is false and status is 0, but we can still cache it
            if (response.type === 'opaque' || response.ok) {
              await cache.put(url, response);
            }
          } catch (e) {
            // Ignore individual tile failures
          }
          downloadedTiles++;
        }));
        setDownloadProgress(Math.round((downloadedTiles / totalTiles) * 100));
      }

      addOfflineRegion({
        name: `Região Atual (${mapType})`,
        size: `${(totalTiles * 0.02).toFixed(1)} MB` // Rough estimate: 20KB per tile
      });
    } catch (error) {
      console.error("Error downloading offline map:", error);
      alert("Erro ao baixar o mapa offline.");
    } finally {
      setIsDownloading(false);
      setDownloadProgress(100);
      setTimeout(() => setDownloadProgress(0), 1000);
    }
  };
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        parseGPX(content);
      }
    };
    reader.readAsText(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const parseGPX = (gpxString: string) => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(gpxString, "text/xml");

      // Parse Waypoints
      const wpts = xmlDoc.getElementsByTagName("wpt");
      let waypointsAdded = 0;
      for (let i = 0; i < wpts.length; i++) {
        const wpt = wpts[i];
        const lat = parseFloat(wpt.getAttribute("lat") || "0");
        const lon = parseFloat(wpt.getAttribute("lon") || "0");
        const nameNode = wpt.getElementsByTagName("name")[0];
        const name = nameNode ? nameNode.textContent || `Waypoint ${i+1}` : `Waypoint ${i+1}`;
        
        if (lat && lon) {
          addWaypoint({
            lat,
            lng: lon,
            name,
            icon: "anchor",
            color: "#ff6b6b"
          });
          waypointsAdded++;
        }
      }

      // Parse Tracks
      const trks = xmlDoc.getElementsByTagName("trk");
      let tracksAdded = 0;
      for (let i = 0; i < trks.length; i++) {
        const trk = trks[i];
        const nameNode = trk.getElementsByTagName("name")[0];
        const name = nameNode ? nameNode.textContent || `Track ${i+1}` : `Track ${i+1}`;
        
        const trkpts = trk.getElementsByTagName("trkpt");
        const points = [];
        for (let j = 0; j < trkpts.length; j++) {
          const pt = trkpts[j];
          const lat = parseFloat(pt.getAttribute("lat") || "0");
          const lon = parseFloat(pt.getAttribute("lon") || "0");
          if (lat && lon) {
            points.push({ lat, lng: lon, timestamp: Date.now() });
          }
        }
        
        if (points.length > 0) {
          addTrack({
            name,
            points,
            color: "#3b82f6",
            visible: true
          });
          tracksAdded++;
        }
      }

      alert(`Importação concluída: ${waypointsAdded} marcadores e ${tracksAdded} rotas importadas.`);
    } catch (error) {
      console.error("Error parsing GPX:", error);
      alert("Erro ao importar o arquivo GPX. Verifique se o formato é válido.");
    }
  };

  const handleExportGPX = () => {
    let gpx = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    gpx += `<gpx version="1.1" creator="Singrar Marine OS" xmlns="http://www.topografix.com/GPX/1/1">\n`;

    // Add waypoints
    (waypoints || []).forEach(wp => {
      gpx += `  <wpt lat="${wp.lat}" lon="${wp.lng}">\n`;
      gpx += `    <name>${wp.name}</name>\n`;
      gpx += `  </wpt>\n`;
    });

    // Add tracks
    (tracks || []).forEach(trk => {
      gpx += `  <trk>\n`;
      gpx += `    <name>${trk.name}</name>\n`;
      gpx += `    <trkseg>\n`;
      trk.points.forEach(pt => {
        gpx += `      <trkpt lat="${pt.lat}" lon="${pt.lng}">\n`;
        if (pt.timestamp) {
          gpx += `        <time>${new Date(pt.timestamp).toISOString()}</time>\n`;
        }
        gpx += `      </trkpt>\n`;
      });
      gpx += `    </trkseg>\n`;
      gpx += `  </trk>\n`;
    });

    gpx += `</gpx>`;

    const blob = new Blob([gpx], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Singrar_Export_${new Date().toISOString().split('T')[0]}.gpx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleNmeaChange = (field: string, value: any) => {
    updateSettings({
      nmea: {
        ...(settings.nmea || { enabled: false, ip: '192.168.1.100', port: '10110', useSimulator: true }),
        [field]: value,
      },
    });
  };

  const handleNavChange = (index: number, value: any) => {
    const newItems = [...navItems];
    newItems[index] = value;
    setNavItems(newItems);
  };

  const nmeaSettings = settings.nmea || { enabled: false, ip: '192.168.1.100', port: '10110', useSimulator: true };

  return (
    <div className="h-full overflow-y-auto pb-24 custom-scrollbar">
      <header className="p-6 shrink-0 bg-gradient-to-b from-[#0a192f] to-transparent">
        <h1 className="text-3xl font-bold font-sans tracking-tight text-white mb-2">
          Opções
        </h1>
      </header>

      <div className="px-6 space-y-8">
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#8892b0] mb-4 flex items-center gap-3">
            <span className="bg-white/5 p-2 rounded-lg"><LayoutGrid size={16} className="text-[#00e5ff]" /></span> Menu Principal
          </h2>
          <div className="bg-gradient-to-br from-[#112240] to-[#0a192f] rounded-3xl border border-white/5 overflow-hidden shadow-xl">
            {[0, 1, 2].map((index) => (
              <div key={index} className="p-5 border-b border-white/5 flex justify-between items-center hover:bg-white/5 transition-colors">
                <span className="text-sm font-bold text-white">Botão {index === 0 ? 'Esquerdo 1' : index === 1 ? 'Esquerdo 2' : 'Direito'}</span>
                <select
                  value={navItems[index] || 'weather'}
                  onChange={(e) => handleNavChange(index, e.target.value)}
                  className="bg-[#0a192f] border border-white/10 rounded-xl text-sm p-2.5 text-white outline-none focus:border-[#00e5ff] shadow-inner cursor-pointer"
                >
                  <option value="weather">Tempo</option>
                  <option value="tides">Marés</option>
                  <option value="logbook">Diário</option>
                  <option value="events">Eventos</option>
                  <option value="achievements">Conquistas</option>
                  <option value="settings">Ajustes</option>
                </select>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#8892b0] mb-4 flex items-center gap-3">
            <span className="bg-white/5 p-2 rounded-lg"><MapIcon size={16} className="text-[#64ffda]" /></span> Preferências do Mapa
          </h2>
          <div className="bg-gradient-to-br from-[#112240] to-[#0a192f] rounded-3xl border border-white/5 overflow-hidden shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-white/5 hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/20 text-orange-400 rounded-xl">
                  <Radio size={20} />
                </div>
                <div>
                  <div className="font-bold text-sm text-white">Radar (Tempo Real)</div>
                  <div className="text-[10px] text-[#8892b0] uppercase tracking-wider">Compartilhar e ver posições</div>
                </div>
              </div>
              <button
                onClick={() => updateSettings({ radarEnabled: !settings.radarEnabled })}
                className={`w-12 h-6 rounded-full transition-colors relative ${settings.radarEnabled ? 'bg-[#00e5ff]' : 'bg-[#233554]'}`}
              >
                <motion.div
                  animate={{ x: settings.radarEnabled ? 24 : 2 }}
                  className="w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-md"
                />
              </button>
            </div>

            <div className="p-5 border-b border-white/5 flex justify-between items-center hover:bg-white/5 transition-colors">
              <span className="text-sm font-bold text-white">Tipo de Mapa</span>
              <select
                value={settings.mapType || 'nautical'}
                onChange={(e) =>
                  updateSettings({ mapType: e.target.value as any })
                }
                className="bg-[#0a192f] border border-white/10 rounded-xl text-sm p-2.5 text-white outline-none focus:border-[#64ffda] shadow-inner cursor-pointer"
              >
                <option value="nautical">Náutico</option>
                <option value="street">Ruas</option>
                <option value="satellite">Satélite</option>
              </select>
            </div>
            <div className="p-5 flex justify-between items-center hover:bg-white/5 transition-colors">
              <span className="text-sm font-bold text-white">Camada de Clima</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={!!settings.showWeatherLayer}
                  onChange={(e) =>
                    updateSettings({ showWeatherLayer: e.target.checked })
                  }
                />
                <div className="w-12 h-6 bg-[#0a192f] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-[#64ffda] peer-checked:to-emerald-400 border border-white/10 shadow-inner"></div>
              </label>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#8892b0] mb-4 flex items-center gap-3">
            <span className="bg-white/5 p-2 rounded-lg"><Wifi size={16} className="text-blue-400" /></span> Instrumentos NMEA
          </h2>
          <div className="bg-gradient-to-br from-[#112240] to-[#0a192f] rounded-3xl border border-white/5 overflow-hidden shadow-xl">
            <div className="p-5 border-b border-white/5 flex justify-between items-center hover:bg-white/5 transition-colors">
              <span className="text-sm font-bold text-white">Ativar NMEA</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={nmeaSettings.enabled}
                  onChange={(e) =>
                    handleNmeaChange("enabled", e.target.checked)
                  }
                />
                <div className="w-12 h-6 bg-[#0a192f] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-400 peer-checked:to-indigo-400 border border-white/10 shadow-inner"></div>
              </label>
            </div>

            {nmeaSettings.enabled && (
              <>
                <div className="p-5 border-b border-white/5 flex justify-between items-center hover:bg-white/5 transition-colors">
                  <span className="text-sm font-bold text-white">Usar Simulador</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={nmeaSettings.useSimulator}
                      onChange={(e) =>
                        handleNmeaChange("useSimulator", e.target.checked)
                      }
                    />
                    <div className="w-12 h-6 bg-[#0a192f] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-400 peer-checked:to-indigo-400 border border-white/10 shadow-inner"></div>
                  </label>
                </div>

                {!nmeaSettings.useSimulator && (
                  <div className="p-5 space-y-4 bg-white/5">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[#8892b0] mb-2">
                        IP do Gateway
                      </label>
                      <input
                        type="text"
                        value={nmeaSettings.ip}
                        onChange={(e) => handleNmeaChange("ip", e.target.value)}
                        className="w-full bg-[#0a192f] border border-white/10 rounded-xl text-sm p-3 text-white outline-none focus:border-blue-400 shadow-inner transition-colors"
                        placeholder="192.168.1.100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[#8892b0] mb-2">
                        Porta (WebSocket)
                      </label>
                      <input
                        type="text"
                        value={nmeaSettings.port}
                        onChange={(e) =>
                          handleNmeaChange("port", e.target.value)
                        }
                        className="w-full bg-[#0a192f] border border-white/10 rounded-xl text-sm p-3 text-white outline-none focus:border-blue-400 shadow-inner transition-colors"
                        placeholder="10110"
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#8892b0] mb-4 flex items-center gap-3">
            <span className="bg-white/5 p-2 rounded-lg"><Download size={16} className="text-purple-400" /></span> Mapas Offline
          </h2>
          <div className="bg-gradient-to-br from-[#112240] to-[#0a192f] rounded-3xl border border-white/5 overflow-hidden shadow-xl">
            <div className="p-5 border-b border-white/5 flex justify-between items-center hover:bg-white/5 transition-colors">
              <span className="text-sm font-bold text-white">Modo Offline</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={!!settings.offlineMode}
                  onChange={(e) =>
                    updateSettings({ offlineMode: e.target.checked })
                  }
                />
                <div className="w-12 h-6 bg-[#0a192f] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-400 peer-checked:to-pink-400 border border-white/10 shadow-inner"></div>
              </label>
            </div>
            <div className="p-5">
              {isDownloading ? (
                <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/5">
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-white uppercase tracking-wider">Baixando mapa...</span>
                    <span className="text-purple-400">{downloadProgress}%</span>
                  </div>
                  <div className="w-full bg-[#0a192f] rounded-full h-2 border border-white/5 shadow-inner overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-purple-400 to-pink-400 h-full rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(192,132,252,0.5)]" 
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <button 
                  onClick={handleDownloadRegion}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <Download size={18} /> Baixar Região Atual
                </button>
              )}
              
              <div className="mt-5 space-y-3">
                {(settings.offlineRegions || []).length > 0 ? (
                  (settings.offlineRegions || []).map((region) => (
                    <div key={region.id} className="bg-white/5 p-4 rounded-2xl flex justify-between items-center border border-white/5 hover:bg-white/10 transition-colors group">
                      <div>
                        <div className="text-sm font-bold text-white mb-1">{region.name}</div>
                        <div className="text-[10px] font-bold text-[#8892b0] uppercase tracking-wider">
                          {region.size} • {new Date(region.downloadedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <button 
                        onClick={() => handleRemoveRegion(region.id)}
                        className="p-2 text-[#8892b0] hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))
                ) : (
                  !isDownloading && (
                    <p className="text-xs font-bold text-[#8892b0] text-center uppercase tracking-wider py-4">
                      Nenhuma região baixada.
                    </p>
                  )
                )}
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#8892b0] mb-4 flex items-center gap-3">
            <span className="bg-white/5 p-2 rounded-lg"><FileUp size={16} className="text-orange-400" /></span> Importar Dados
          </h2>
          <div className="bg-gradient-to-br from-[#112240] to-[#0a192f] rounded-3xl border border-white/5 overflow-hidden shadow-xl">
            <div className="p-5">
              <input 
                type="file" 
                accept=".gpx" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm mb-3"
              >
                <FileUp size={18} /> Importar arquivo GPX
              </button>
              <button 
                onClick={handleExportGPX}
                className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <FileDown size={18} /> Exportar arquivo GPX
              </button>
              <p className="text-xs font-bold text-[#8892b0] mt-4 text-center uppercase tracking-wider">
                Importe ou exporte rotas e marcadores.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#8892b0] mb-4 flex items-center gap-3">
            <span className="bg-white/5 p-2 rounded-lg"><Ruler size={16} className="text-emerald-400" /></span> Unidades
          </h2>
          <div className="bg-gradient-to-br from-[#112240] to-[#0a192f] rounded-3xl border border-white/5 overflow-hidden shadow-xl">
            <div className="p-5 flex justify-between items-center hover:bg-white/5 transition-colors">
              <span className="text-sm font-bold text-white">Sistema de Unidades</span>
              <select
                value={settings.unitSystem || 'metric'}
                onChange={(e) =>
                  updateSettings({ unitSystem: e.target.value as any })
                }
                className="bg-[#0a192f] border border-white/10 rounded-xl text-sm p-2.5 text-white outline-none focus:border-emerald-400 shadow-inner cursor-pointer"
              >
                <option value="metric">Métrico (m, °C, kg)</option>
                <option value="imperial">Imperial (ft, °F, lbs)</option>
              </select>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#8892b0] mb-4 flex items-center gap-3">
            <span className="bg-white/5 p-2 rounded-lg"><Info size={16} className="text-gray-400" /></span> Sobre
          </h2>
          <div className="bg-gradient-to-br from-[#112240] to-[#0a192f] rounded-3xl border border-white/5 p-8 text-sm text-[#8892b0] flex flex-col items-center text-center shadow-xl relative overflow-hidden">
            <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-[#00e5ff]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-[#ff6b00]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(0,229,255,0.3)] relative z-10 overflow-hidden bg-[#0a192f] border border-white/10">
              <img 
                src="/logo.png" 
                alt="Singrar Logo" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = '<span class="text-4xl text-[#00e5ff] font-bold">S</span>';
                }}
              />
            </div>
            <p className="mb-2 relative z-10">
              <strong className="text-white text-2xl tracking-tight">Singrar</strong>
            </p>
            <p className="mb-6 text-xs font-bold uppercase tracking-widest bg-white/5 px-3 py-1 rounded-lg border border-white/5 relative z-10 text-[#00e5ff]">v1.3.0</p>
            <p className="leading-relaxed relative z-10">
              Navegação especializada em pequenas embarcações, jetski e barcos com motor de popa.
            </p>
            <div className="mt-8 pt-6 border-t border-white/5 w-full relative z-10">
              <p className="text-[10px] uppercase tracking-widest font-bold opacity-50">Desenvolvido para a comunidade náutica</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
