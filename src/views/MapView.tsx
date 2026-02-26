import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
  Circle,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
import { format } from "date-fns";
import { useStore } from "../store";
import { useWakeLock } from "../hooks/useWakeLock";
import {
  Crosshair,
  Plus,
  Navigation,
  CircleDot,
  Square,
  Layers,
  Anchor,
  Fish,
  MapPin,
  Route,
  X,
  RefreshCw,
  Mic,
  Camera,
  Share2,
  AlertTriangle,
  LocateFixed,
  Minus,
  Video,
  PenTool,
  Download,
  Settings2,
  Users,
  Waves,
  Clock,
  Leaf,
  Wind,
  Pen,
  MousePointer2,
  Compass,
  Eye,
  EyeOff,
  BookOpen,
  Info
} from "lucide-react";

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const userIcon = L.divIcon({
  className: "bg-transparent",
  html: `<div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const waypointIcon = L.divIcon({
  className: "bg-transparent",
  html: `<div class="w-6 h-6 bg-[#ff6b6b] rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold">W</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const otherUserIcon = L.divIcon({
  className: "bg-transparent",
  html: `<div class="w-4 h-4 bg-orange-500 rounded-full border-2 border-white shadow-[0_0_10px_rgba(249,115,22,0.8)]"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function MapEvents({ 
  isPlanningRoute, 
  isDrawingMode,
  onAddPoint,
  onMove,
  onDrawPoints
}: { 
  isPlanningRoute: boolean, 
  isDrawingMode: boolean,
  onAddPoint: (lat: number, lng: number) => void,
  onMove: (center: L.LatLng) => void,
  onDrawPoints: (points: {lat: number, lng: number}[]) => void
}) {
  const isPlanningRef = useRef(isPlanningRoute);
  const isDrawingRef = useRef(isDrawingMode);
  const onAddPointRef = useRef(onAddPoint);
  const onMoveRef = useRef(onMove);
  const onDrawPointsRef = useRef(onDrawPoints);
  const map = useMap();
  const drawingPoints = useRef<{lat: number, lng: number}[]>([]);
  const isDrawing = useRef(false);
  const [tempDrawingPath, setTempDrawingPath] = useState<{lat: number, lng: number}[]>([]);

  useEffect(() => {
    isPlanningRef.current = isPlanningRoute;
    isDrawingRef.current = isDrawingMode;
    onAddPointRef.current = onAddPoint;
    onMoveRef.current = onMove;
    onDrawPointsRef.current = onDrawPoints;

    if (isPlanningRoute && isDrawingMode) {
      map.dragging.disable();
    } else {
      map.dragging.enable();
    }
  }, [isPlanningRoute, isDrawingMode, onAddPoint, onMove, onDrawPoints, map]);

  useMapEvents({
    click(e) {
      if (isPlanningRef.current && !isDrawingRef.current) {
        onAddPointRef.current(e.latlng.lat, e.latlng.lng);
      }
    },
    move(e) {
      if (onMoveRef.current) {
        onMoveRef.current(e.target.getCenter());
      }
    },
    mousedown(e) {
      if (isPlanningRef.current && isDrawingRef.current) {
        isDrawing.current = true;
        drawingPoints.current = [{lat: e.latlng.lat, lng: e.latlng.lng}];
        setTempDrawingPath([{lat: e.latlng.lat, lng: e.latlng.lng}]);
      }
    },
    mousemove(e) {
      if (isDrawing.current && isPlanningRef.current && isDrawingRef.current) {
        const newPoint = {lat: e.latlng.lat, lng: e.latlng.lng};
        drawingPoints.current.push(newPoint);
        setTempDrawingPath(prev => [...prev, newPoint]);
      }
    },
    mouseup() {
      if (isDrawing.current) {
        isDrawing.current = false;
        if (drawingPoints.current.length > 1) {
          // Simplify points: take every 5th point to reduce density
          const simplified = drawingPoints.current.filter((_, i) => i % 5 === 0);
          // Ensure last point is included
          if (simplified[simplified.length - 1] !== drawingPoints.current[drawingPoints.current.length - 1]) {
            simplified.push(drawingPoints.current[drawingPoints.current.length - 1]);
          }
          onDrawPointsRef.current(simplified);
        }
        drawingPoints.current = [];
        setTempDrawingPath([]);
      }
    }
  });

  return (
    <>
      {tempDrawingPath.length > 0 && (
        <Polyline
          positions={tempDrawingPath.map(p => [p.lat, p.lng])}
          color="#64ffda"
          weight={2}
          dashArray="5, 5"
          opacity={0.8}
        />
      )}
    </>
  );
}

function MapController({ centerOnUser }: { centerOnUser: boolean }) {
  const map = useMap();
  const location = useStore((state) => state.location);

  useEffect(() => {
    if (centerOnUser && location) {
      map.setView([location.lat, location.lng], map.getZoom(), {
        animate: true,
      });
    }
  }, [centerOnUser, location, map]);

  return null;
}

function CompassRibbon({ heading }: { heading: number | null }) {
  const h = heading || 0;
  
  const markers = [];
  for (let i = -180; i <= 540; i += 15) {
    let label = "";
    const normalized = (i + 360) % 360;
    if (normalized === 0) label = "N";
    else if (normalized === 45) label = "NE";
    else if (normalized === 90) label = "E";
    else if (normalized === 135) label = "SE";
    else if (normalized === 180) label = "S";
    else if (normalized === 225) label = "SW";
    else if (normalized === 270) label = "W";
    else if (normalized === 315) label = "NW";
    else if (normalized % 30 === 0) label = normalized.toString();

    markers.push(
      <div key={i} className="flex flex-col items-center justify-end h-full w-[60px] shrink-0 pb-1">
        <span className={`text-[10px] font-bold mb-0.5 ${label.match(/^[A-Z]+$/) ? 'text-white text-xs' : 'text-[#8892b0]'}`}>{label}</span>
        <div className={`w-0.5 bg-[#8892b0] ${normalized % 90 === 0 ? 'h-3' : 'h-1.5'}`}></div>
      </div>
    );
  }

  return (
    <div className="absolute top-0 left-0 right-0 h-14 bg-gradient-to-b from-[#0a192f]/80 to-[#0a192f]/20 backdrop-blur-md border-b border-white/5 z-20 overflow-hidden pointer-events-none shadow-lg">
      <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-red-500 z-30 transform -translate-x-1/2 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
      <div className="absolute left-1/2 top-0 flex items-start pt-0.5 z-30 transform -translate-x-1/2">
        <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-red-500 drop-shadow-md"></div>
      </div>
      
      <div 
        className="absolute top-0 bottom-0 flex transition-transform duration-200 ease-linear"
        style={{ 
          left: '50%',
          transform: `translateX(-${720 + h * 4}px)` 
        }}
      >
        {markers}
      </div>
    </div>
  );
}

export function MapView() {
  const {
    location,
    waypoints,
    tracks,
    currentTrack,
    isRecording,
    startRecording,
    stopRecording,
    settings,
    updateSettings,
    addWaypoint,
    addLogEntry,
    nmeaData,
    anchorAlarm,
    setAnchorAlarm,
    emergency,
    setEmergency,
    plannedRoutes,
    addPlannedRoute,
    communityMarkers,
    addCommunityMarker,
    events,
    onlineUsers: connectedUsers = {}
  } = useStore();

  useWakeLock(true); // Mantém a tela ligada enquanto estiver no mapa

  const [centerOnUser, setCenterOnUser] = useState(true);
  const [mapCenter, setMapCenter] = useState<[number, number]>([0, 0]);
  const [showLayers, setShowLayers] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [showAnchorModal, setShowAnchorModal] = useState(false);
  const [anchorRadius, setAnchorRadius] = useState(50);
  const [showStopRecordingModal, setShowStopRecordingModal] = useState(false);
  const [trackName, setTrackName] = useState("");
  const [showTideInfo, setShowTideInfo] = useState(false);
  const [routeSpeed, setRouteSpeed] = useState(15); // knots
  const [routeStartTime, setRouteStartTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [showCatchModal, setShowCatchModal] = useState(false);
  const [logType, setLogType] = useState<"fishing" | "jetski" | "wakesurf" | "diving" | "other">("fishing");
  const [logTitle, setLogTitle] = useState("");
  const [catchSpecies, setCatchSpecies] = useState("");
  const [catchWeight, setCatchWeight] = useState("");
  const [catchLength, setCatchLength] = useState("");
  const [catchPhoto, setCatchPhoto] = useState<string | undefined>(undefined);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [mapOrientation, setMapOrientation] = useState<"north" | "course">("north");
  const [showMediaDrawer, setShowMediaDrawer] = useState(false);
  const [isPlanningRoute, setIsPlanningRoute] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isEcoMode, setIsEcoMode] = useState(false);
  const [showHeadingTags, setShowHeadingTags] = useState(true);
  const [plannedRoutePoints, setPlannedRoutePoints] = useState<{lat: number, lng: number}[]>([]);
  const [showMarkerModal, setShowMarkerModal] = useState(false);
  const [showMapControls, setShowMapControls] = useState(false);
  const [markerType, setMarkerType] = useState<"hazard" | "ramp" | "gas" | "marina" | "hangout" | "fishing">("hazard");
  const [markerName, setMarkerName] = useState("");
  const [markerDesc, setMarkerDesc] = useState("");
  const mapRef = useRef<L.Map | null>(null);

  const defaultCenter: [number, number] = location
    ? [location.lat, location.lng]
    : [37.7749, -122.4194];

  const handleAddCommunityMarker = () => {
    if (!markerName) return;
    addCommunityMarker({
      lat: mapCenter[0],
      lng: mapCenter[1],
      type: markerType,
      name: markerName,
      description: markerDesc,
      createdBy: "Eu",
    });
    setShowMarkerModal(false);
    setMarkerName("");
    setMarkerDesc("");
  };

  const getMarkerIcon = (type: string) => {
    let color = "#3b82f6";
    let iconHtml = "📍";
    switch (type) {
      case "hazard": color = "#ef4444"; iconHtml = "⚠️"; break;
      case "ramp": color = "#8b5cf6"; iconHtml = "🚤"; break;
      case "gas": color = "#f59e0b"; iconHtml = "⛽"; break;
      case "marina": color = "#0ea5e9"; iconHtml = "⚓"; break;
      case "hangout": color = "#10b981"; iconHtml = "🍻"; break;
      case "fishing": color = "#14b8a6"; iconHtml = "🎣"; break;
    }
    return L.divIcon({
      className: "bg-transparent",
      html: `<div class="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-sm" style="background-color: ${color}">${iconHtml}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };
  const handleAddWaypoint = () => {
    addWaypoint({
      lat: mapCenter[0],
      lng: mapCenter[1],
      name: `Waypoint ${(waypoints || []).length + 1}`,
      icon: "anchor",
      color: "#ff6b6b",
    });
  };

  const toggleRecording = () => {
    if (isRecording) {
      setTrackName(`Rota ${(tracks || []).length + 1}`);
      setShowStopRecordingModal(true);
    } else {
      startRecording();
    }
  };

  const forceLocationUpdate = () => {
    setIsUpdatingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          useStore.getState().setLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            accuracy: pos.coords.accuracy,
          });
          setCenterOnUser(true);
          setIsUpdatingLocation(false);
        },
        (err) => {
          console.error(err);
          setIsUpdatingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setIsUpdatingLocation(false);
    }
  };

  const handleShareLocation = () => {
    if (!location) return;
    const text = `Acompanhe minha navegação! Estou em: https://maps.google.com/?q=${location.lat},${location.lng}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`);
  };

  const handleVoiceRecord = async () => {
    if (isRecordingVoice) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      mediaRecorder.addEventListener("dataavailable", event => {
        audioChunks.push(event.data);
      });

      mediaRecorder.addEventListener("stop", () => {
        const audioBlob = new Blob(audioChunks);
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          addWaypoint({
            lat: mapCenter[0],
            lng: mapCenter[1],
            name: `Áudio ${(waypoints || []).length + 1}`,
            icon: "mic",
            color: "#8b5cf6",
            audio: base64Audio
          });
          alert("Áudio salvo como marcador!");
        };
        stream.getTracks().forEach(track => track.stop());
      });

      mediaRecorder.start();
      setIsRecordingVoice(true);
      
      // Stop recording after 10 seconds
      setTimeout(() => {
        mediaRecorder.stop();
        setIsRecordingVoice(false);
      }, 10000);
      
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Erro ao acessar o microfone.");
    }
  };

  const handleSaveLogEntry = () => {
    if (!location) return;
    addLogEntry({
      lat: location.lat,
      lng: location.lng,
      type: logType,
      title: logTitle || (logType === 'fishing' ? catchSpecies : logType.charAt(0).toUpperCase() + logType.slice(1)),
      notes: "",
      photo: catchPhoto,
      species: logType === 'fishing' ? catchSpecies : undefined,
      weight: logType === 'fishing' ? Number(catchWeight) : undefined,
      length: logType === 'fishing' ? Number(catchLength) : undefined,
    });
    setShowCatchModal(false);
    setLogTitle("");
    setCatchSpecies("");
    setCatchWeight("");
    setCatchLength("");
    setCatchPhoto(undefined);
    alert("Registro salvo com sucesso!");
  };

  const calculateDistance = (points: {lat: number, lng: number}[]) => {
    if (points.length < 2) return 0;
    return points.reduce((acc, curr, i, arr) => {
      if (i === 0) return 0;
      const prev = arr[i - 1];
      const R = 6371e3;
      const f1 = prev.lat * Math.PI/180;
      const f2 = curr.lat * Math.PI/180;
      const df = (curr.lat-prev.lat) * Math.PI/180;
      const dl = (curr.lng-prev.lng) * Math.PI/180;
      const a = Math.sin(df/2) * Math.sin(df/2) + Math.cos(f1) * Math.cos(f2) * Math.sin(dl/2) * Math.sin(dl/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return acc + (R * c);
    }, 0);
  };

  const calculateHeading = (p1: {lat: number, lng: number}, p2: {lat: number, lng: number}) => {
    const f1 = p1.lat * Math.PI/180;
    const f2 = p2.lat * Math.PI/180;
    const dl = (p2.lng - p1.lng) * Math.PI/180;
    const y = Math.sin(dl) * Math.cos(f2);
    const x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
    const brng = Math.atan2(y, x);
    return (brng * 180 / Math.PI + 360) % 360;
  };

  const getTideAtTime = (time: Date) => {
    const hours = time.getTime() / (1000 * 60 * 60);
    return 1.5 + Math.sin((hours * Math.PI * 2) / 12.4) * 1.2;
  };

  const handleMapClick = (e: any) => {
    if (isPlanningRoute) {
      setPlannedRoutePoints(prev => [...prev, { lat: e.latlng.lat, lng: e.latlng.lng }]);
    }
  };

  const getGpsSignalInfo = () => {
    const acc = location?.accuracy || 0;
    if (!location) return { color: "bg-red-500", text: "Sem Sinal" };
    if (acc <= 10) return { color: "bg-emerald-500", text: "GPS Forte" };
    if (acc <= 30) return { color: "bg-yellow-500", text: "GPS Médio" };
    return { color: "bg-orange-500", text: "GPS Fraco" };
  };

  const gpsSignal = getGpsSignalInfo();

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* GPS Signal Indicator */}
      <div className="absolute top-[72px] left-4 z-[400] flex items-center gap-2 bg-[#112240]/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg">
        <div className={`w-2 h-2 rounded-full ${gpsSignal.color} animate-pulse`} />
        <span className="text-[10px] font-bold text-white uppercase tracking-wider">{gpsSignal.text}</span>
      </div>

      {anchorAlarm?.active && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-orange-500 to-red-500 backdrop-blur-md text-white px-5 py-2 rounded-full text-xs font-bold tracking-widest z-40 flex items-center gap-3 shadow-[0_0_20px_rgba(249,115,22,0.5)] border border-orange-400/50 uppercase">
          <Anchor size={16} className="animate-pulse drop-shadow-md" />
          Modo Âncora Ativo
        </div>
      )}

      {isPlanningRoute && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-500 to-indigo-500 backdrop-blur-md text-white px-5 py-2 rounded-full text-xs font-bold tracking-widest z-40 flex items-center gap-3 shadow-[0_0_20px_rgba(59,130,246,0.5)] border border-blue-400/50 uppercase">
          <PenTool size={16} className="animate-pulse drop-shadow-md" />
          Planejando Rota <span className="bg-white/20 px-2 py-0.5 rounded-md">{(plannedRoutePoints || []).length} pts</span>
        </div>
      )}

      <div 
        className={`absolute inset-[-50%] transition-transform duration-1000 ease-in-out ${isPlanningRoute ? 'cursor-crosshair' : ''}`}
        style={{
          transform: mapOrientation === "course" && location?.heading ? `rotate(${-location.heading}deg)` : 'none'
        }}
      >
      <MapContainer
        center={defaultCenter}
        zoom={13}
        className="w-full h-full z-0"
        zoomControl={false}
        attributionControl={false}
        ref={mapRef}
      >
        <MapEvents 
          isPlanningRoute={isPlanningRoute} 
          isDrawingMode={isDrawingMode}
          onAddPoint={(lat, lng) => setPlannedRoutePoints(prev => [...prev, {lat, lng}])} 
          onDrawPoints={(points) => setPlannedRoutePoints(prev => [...prev, ...points])}
          onMove={(center) => {
            setCenterOnUser(false);
            setMapCenter([center.lat, center.lng]);
          }}
        />
        {settings.mapType === "satellite" && (
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
          />
        )}
        {settings.mapType === "street" && (
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
        )}
        {settings.mapType === "nautical" && (
          <>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            <TileLayer
              url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"
              attribution="&copy; OpenSeaMap contributors"
            />
          </>
        )}

        {settings.showWeatherLayer && settings.weatherLayerType === 'wind' && (
          <TileLayer
            url="https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=9d14620a168b57790279c656608518ce" // Public demo key or visual placeholder
            opacity={0.6}
            attribution="&copy; OpenWeatherMap"
          />
        )}
        {settings.showWeatherLayer && settings.weatherLayerType === 'rain' && (
          <TileLayer
            url="https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=9d14620a168b57790279c656608518ce" // Public demo key or visual placeholder
            opacity={0.6}
            attribution="&copy; OpenWeatherMap"
          />
        )}

        {/* Anchor Alarm Visual */}
        {anchorAlarm?.active && (
          <Circle
            center={[anchorAlarm.lat, anchorAlarm.lng]}
            radius={anchorAlarm.radius}
            pathOptions={{
              color: "#f97316",
              fillColor: "#f97316",
              fillOpacity: 0.2,
              weight: 2,
              dashArray: "5, 5"
            }}
          />
        )}

        {/* Saved Tracks */}
        {tracks.filter(t => t.visible !== false).map((track) => (
          <Polyline
            key={track.id}
            positions={track.points.map((p) => [p.lat, p.lng])}
            color={track.color}
            weight={3}
            opacity={0.7}
          />
        ))}

        {/* Current Recording Track */}
        {isRecording && currentTrack.length > 0 && (
          <Polyline
            positions={currentTrack.map((p) => [p.lat, p.lng])}
            color="#ef4444"
            weight={4}
            dashArray="5, 10"
          />
        )}

        {/* Saved Planned Routes */}
        {(plannedRoutes || []).map((route) => (
          <Polyline
            key={route.id}
            positions={route.points.map((p) => [p.lat, p.lng])}
            color="#0ea5e9"
            weight={3}
            opacity={0.8}
            dashArray="10, 10"
          />
        ))}

        {/* Planned Route */}
        {(plannedRoutePoints || []).length > 0 && (
          <>
            <Polyline
              positions={plannedRoutePoints.map((p) => [p.lat, p.lng])}
              color="#fbbf24"
              weight={4}
            />
            {(plannedRoutePoints || []).map((p, i) => {
              if (i === 0 || i % 3 !== 0 || !showHeadingTags) return null;
              const prev = plannedRoutePoints[i - 1];
              const midLat = (prev.lat + p.lat) / 2;
              const midLng = (prev.lng + p.lng) / 2;
              const heading = calculateHeading(prev, p);
              const returnHeading = (heading + 180) % 360;
              
              const headingIcon = L.divIcon({
                className: "bg-transparent",
                html: `<div class="bg-[#0a192f]/90 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-yellow-500/50 shadow-lg whitespace-nowrap flex flex-row items-center gap-2" style="transform: translate(-50%, -50%); width: max-content;">
                  <span class="text-yellow-400">${Math.round(heading)}°</span>
                  <span class="text-white/30">|</span>
                  <span class="text-[#8892b0]">${Math.round(returnHeading)}°</span>
                </div>`,
                iconSize: [0, 0],
              });

              return (
                <Marker key={`heading-${i}`} position={[midLat, midLng]} icon={headingIcon} />
              );
            })}
          </>
        )}

        {location && (
          <>
            <Marker position={[location.lat, location.lng]} icon={userIcon} />
            <Circle
              center={[location.lat, location.lng]}
              radius={location.accuracy}
              pathOptions={{
                color: "#3b82f6",
                fillColor: "#3b82f6",
                fillOpacity: 0.1,
                weight: 1,
              }}
            />
          </>
        )}

        {waypoints.map((wp) => (
          <Marker key={wp.id} position={[wp.lat, wp.lng]} icon={waypointIcon}>
            <Popup className="custom-popup">
              <div className="font-sans font-semibold text-white">
                {wp.name}
              </div>
              <div className="text-xs text-[#8892b0]">
                {wp.lat.toFixed(4)}, {wp.lng.toFixed(4)}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Community Markers */}
        {(communityMarkers || []).map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={getMarkerIcon(m.type)}>
            <Popup className="custom-popup">
              <div className="font-sans font-semibold text-white">
                {m.name}
              </div>
              <div className="text-xs text-[#8892b0] mb-1">
                {m.type.toUpperCase()} • {m.createdBy}
              </div>
              {m.description && (
                <div className="text-sm text-white/80 mt-1">
                  {m.description}
                </div>
              )}
            </Popup>
          </Marker>
        ))}

        {/* Events */}
        {(events || []).map((event) => (
          <Marker 
            key={event.id} 
            position={[event.lat, event.lng]} 
            icon={L.divIcon({
              className: "bg-transparent",
              html: `<div class="w-10 h-10 bg-[#64ffda] rounded-xl flex items-center justify-center text-xl shadow-lg border-2 border-[#0a192f] transform -translate-x-1/2 -translate-y-1/2">
                ${event.type === 'jetski' ? '⚡' : event.type === 'boat' ? '⛵' : event.type === 'fishing' ? '🎣' : '🤝'}
              </div>`,
              iconSize: [0, 0],
            })}
          >
            <Popup className="custom-popup">
              <div className="font-sans font-bold text-white text-lg">
                {event.title}
              </div>
              <div className="text-xs text-[#64ffda] font-bold mb-2">
                EVENTO • {new Date(event.date).toLocaleString()}
              </div>
              <div className="text-sm text-white/80 mb-3">
                {event.description}
              </div>
              <div className="flex items-center gap-2 text-xs text-[#8892b0]">
                <Users size={12} />
                {event.attendees.length} participantes
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Online Users (Radar) */}
        {settings.radarEnabled && Object.values(connectedUsers).map((u) => (
          <Marker key={u.id} position={[u.lat, u.lng]} icon={otherUserIcon}>
            <Popup className="custom-popup">
              <div className="font-sans font-semibold text-white">
                Embarcação Próxima
              </div>
              <div className="text-xs text-[#8892b0]">
                Velocidade: {u.speed ? (u.speed * 1.94384).toFixed(1) : 0} nós
              </div>
            </Popup>
          </Marker>
        ))}

        <MapController centerOnUser={centerOnUser} />
      </MapContainer>
      </div>

      {emergency && (
        <div className="absolute top-0 left-0 right-0 bg-red-600 text-white font-bold text-center py-2 z-50 animate-pulse flex items-center justify-center gap-2 shadow-lg">
          <AlertTriangle size={20} />
          SINAL DE EMERGÊNCIA ATIVO
        </div>
      )}

      {/* Crosshair for center */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
        <Crosshair className="text-[#64ffda] opacity-70" size={24} />
      </div>

      <CompassRibbon heading={location?.heading || 0} />

      {/* Zoom Controls - Left Side */}
      {!isRecording && !isPlanningRoute && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-2 bg-gradient-to-b from-[#112240]/80 to-[#0a192f]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 shadow-2xl">
          <button
            onClick={() => mapRef.current?.zoomIn()}
            className="p-2.5 text-white hover:bg-white/10 rounded-xl transition-all flex justify-center hover:scale-105 active:scale-95"
          >
            <Plus size={22} />
          </button>
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <button
            onClick={() => mapRef.current?.zoomOut()}
            className="p-2.5 text-white hover:bg-white/10 rounded-xl transition-all flex justify-center hover:scale-105 active:scale-95"
          >
            <Minus size={22} />
          </button>
        </div>
      )}

      {/* Floating Action Buttons */}
      {!isRecording && !isPlanningRoute && (
        <div className="absolute bottom-28 right-4 z-10 flex flex-col gap-4">
          <button
            onClick={() => setEmergency(!emergency)}
            className={`p-3.5 rounded-2xl shadow-2xl backdrop-blur-xl border transition-all flex justify-center hover:scale-105 active:scale-95 ${emergency ? 'bg-red-600 text-white border-red-500 animate-pulse shadow-[0_0_30px_rgba(220,38,38,0.6)]' : 'bg-gradient-to-br from-[#112240]/80 to-[#0a192f]/80 text-red-400 border-white/10 hover:bg-white/10'}`}
          >
            <AlertTriangle size={26} />
          </button>

          <div className="relative z-50">
            <AnimatePresence>
              {showMediaDrawer && (
                <motion.div 
                  initial={{ opacity: 0, x: 20, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.8 }}
                  className="absolute right-full mr-4 top-1/2 -translate-y-1/2 flex gap-3 bg-gradient-to-r from-[#112240]/90 to-[#0a192f]/90 backdrop-blur-xl p-2.5 rounded-2xl border border-white/10 shadow-2xl"
                >
                  <button
                    onClick={() => { setShowCatchModal(true); setShowMediaDrawer(false); }}
                    className="p-3 bg-white/5 rounded-xl text-emerald-400 hover:bg-white/10 transition-all hover:scale-105 active:scale-95 border border-white/5"
                  >
                    <Camera size={22} />
                  </button>
                  <button
                    onClick={() => { handleVoiceRecord(); setShowMediaDrawer(false); }}
                    className={`p-3 rounded-xl transition-all hover:scale-105 active:scale-95 border border-white/5 ${isRecordingVoice ? 'bg-red-500/20 text-red-400 animate-pulse border-red-500/50' : 'bg-white/5 text-purple-400 hover:bg-white/10'}`}
                  >
                    <Mic size={22} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            <button
              onClick={() => setShowMediaDrawer(!showMediaDrawer)}
              className={`p-3.5 rounded-2xl shadow-2xl backdrop-blur-xl border transition-all flex justify-center hover:scale-105 active:scale-95 ${showMediaDrawer ? 'bg-white/20 text-white border-white/30' : 'bg-gradient-to-br from-[#112240]/80 to-[#0a192f]/80 text-[#8892b0] hover:text-white border-white/10 hover:bg-white/10'}`}
            >
              <Video size={26} />
            </button>
          </div>

          <div className="relative z-50">
            {showLayers && (
              <div className="absolute bottom-full right-0 mb-4 bg-gradient-to-b from-[#112240]/95 to-[#0a192f]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-2xl flex flex-col gap-2 w-48">
                <div className="text-[10px] font-bold text-[#8892b0] uppercase tracking-widest px-3 mb-1">Mapa Base</div>
                <button
                  onClick={() => updateSettings({ mapType: "nautical" })}
                  className={`text-left px-4 py-2.5 text-sm rounded-xl font-medium transition-colors ${settings.mapType === "nautical" ? "bg-[#64ffda]/10 text-[#64ffda] border border-[#64ffda]/20" : "text-white hover:bg-white/5"}`}
                >
                  Náutico
                </button>
                <button
                  onClick={() => updateSettings({ mapType: "satellite" })}
                  className={`text-left px-4 py-2.5 text-sm rounded-xl font-medium transition-colors ${settings.mapType === "satellite" ? "bg-[#64ffda]/10 text-[#64ffda] border border-[#64ffda]/20" : "text-white hover:bg-white/5"}`}
                >
                  Satélite
                </button>
                <button
                  onClick={() => updateSettings({ mapType: "street" })}
                  className={`text-left px-4 py-2.5 text-sm rounded-xl font-medium transition-colors ${settings.mapType === "street" ? "bg-[#64ffda]/10 text-[#64ffda] border border-[#64ffda]/20" : "text-white hover:bg-white/5"}`}
                >
                  Ruas
                </button>
                <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent my-2" />
                <div className="text-[10px] font-bold text-[#8892b0] uppercase tracking-widest px-3 mb-1">Camadas</div>
                <button
                  onClick={() =>
                    updateSettings({
                      showWeatherLayer: true,
                      weatherLayerType: 'wind'
                    })
                  }
                  className={`text-left px-4 py-2.5 text-sm rounded-xl font-medium transition-colors ${settings.showWeatherLayer && settings.weatherLayerType === 'wind' ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "text-white hover:bg-white/5"}`}
                >
                  Radar de Vento
                </button>
                <button
                  onClick={() =>
                    updateSettings({
                      showWeatherLayer: true,
                      weatherLayerType: 'rain'
                    })
                  }
                  className={`text-left px-4 py-2.5 text-sm rounded-xl font-medium transition-colors ${settings.showWeatherLayer && settings.weatherLayerType === 'rain' ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "text-white hover:bg-white/5"}`}
                >
                  Radar de Chuva
                </button>
                <button
                  onClick={() =>
                    updateSettings({
                      showWeatherLayer: false,
                    })
                  }
                  className={`text-left px-4 py-2.5 text-sm rounded-xl font-medium transition-colors ${!settings.showWeatherLayer ? "bg-white/10 text-white border border-white/10" : "text-white hover:bg-white/5"}`}
                >
                  Sem Camada
                </button>
              </div>
            )}
            <button
              onClick={() => setShowLayers(!showLayers)}
              className={`p-3.5 rounded-2xl shadow-2xl backdrop-blur-xl border transition-all flex justify-center hover:scale-105 active:scale-95 w-full ${showLayers ? 'bg-white/20 text-white border-white/30' : 'bg-gradient-to-br from-[#112240]/80 to-[#0a192f]/80 text-white border-white/10 hover:bg-white/10'}`}
            >
              <Layers size={26} />
            </button>
          </div>

          <div className="relative z-50">
            {/* Map Controls Drawer */}
            <AnimatePresence>
              {showMapControls && (
                <motion.div 
                  initial={{ opacity: 0, x: 20, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.8 }}
                  className="absolute right-full mr-4 top-1/2 -translate-y-1/2 flex gap-3 bg-gradient-to-r from-[#112240]/90 to-[#0a192f]/90 backdrop-blur-xl p-2.5 rounded-2xl border border-white/10 shadow-2xl"
                >
                  <button
                    onClick={() => {
                      setMapOrientation(prev => prev === "north" ? "course" : "north");
                      alert(mapOrientation === "north" ? "Modo: Curso Acima" : "Modo: Norte Acima");
                      setShowMapControls(false);
                    }}
                    className="p-3 bg-white/5 rounded-xl text-white hover:bg-white/10 transition-all hover:scale-105 active:scale-95 border border-white/5"
                  >
                    <LocateFixed size={22} className={mapOrientation === "course" ? "text-[#64ffda]" : ""} />
                  </button>
                  <button
                    onClick={() => { forceLocationUpdate(); setShowMapControls(false); }}
                    className="p-3 bg-white/5 rounded-xl text-white hover:bg-white/10 transition-all hover:scale-105 active:scale-95 border border-white/5"
                  >
                    <RefreshCw size={22} className={isUpdatingLocation ? "animate-spin" : ""} />
                  </button>
                  <button
                    onClick={() => { setCenterOnUser(true); setShowMapControls(false); }}
                    className={`p-3 rounded-xl transition-all hover:scale-105 active:scale-95 border ${centerOnUser ? "bg-[#64ffda] text-[#0a192f] border-[#64ffda]" : "bg-white/5 text-white hover:bg-white/10 border-white/5"}`}
                  >
                    <Navigation size={22} className={centerOnUser ? "fill-current" : ""} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            <button
              onClick={() => setShowMapControls(!showMapControls)}
              className={`p-3.5 rounded-2xl shadow-2xl backdrop-blur-xl border transition-all flex justify-center hover:scale-105 active:scale-95 ${showMapControls ? 'bg-white/20 text-white border-white/30' : 'bg-gradient-to-br from-[#112240]/80 to-[#0a192f]/80 text-[#8892b0] hover:text-white border-white/10 hover:bg-white/10'}`}
            >
              <Settings2 size={26} />
            </button>
          </div>

          <button
            onClick={() => setShowActionMenu(true)}
            className="p-4 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:shadow-[0_0_30px_rgba(59,130,246,0.7)] transition-all hover:scale-105 active:scale-95 border border-blue-300/50"
          >
            <Plus size={28} />
          </button>
        </div>
      )}

      {/* Recording HUD */}
      {isRecording && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-red-600/95 to-red-500/90 backdrop-blur-xl p-5 flex justify-between items-center z-50 animate-in slide-in-from-bottom-10 border-t border-red-400/30 shadow-[0_-10px_40px_rgba(239,68,68,0.3)] rounded-t-3xl">
          <div>
            <div className="text-[10px] text-white/80 uppercase font-bold tracking-widest mb-1 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Gravando Rota
            </div>
            <div className="text-4xl font-black text-white tracking-tighter drop-shadow-md">
              {currentTrack.length > 1 ? 
                (currentTrack.reduce((acc, curr, i, arr) => {
                  if (i === 0) return 0;
                  const prev = arr[i - 1];
                  const R = 6371e3;
                  const f1 = prev.lat * Math.PI/180;
                  const f2 = curr.lat * Math.PI/180;
                  const df = (curr.lat-prev.lat) * Math.PI/180;
                  const dl = (curr.lng-prev.lng) * Math.PI/180;
                  const a = Math.sin(df/2) * Math.sin(df/2) + Math.cos(f1) * Math.cos(f2) * Math.sin(dl/2) * Math.sin(dl/2);
                  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                  return acc + (R * c);
                }, 0) / 1000).toFixed(2) + " km"
                : "0.00 km"
              }
            </div>
          </div>
          <button onClick={toggleRecording} className="bg-white text-red-500 rounded-2xl px-6 py-4 shadow-xl hover:bg-red-50 transition-all hover:scale-105 active:scale-95 flex items-center gap-3 border border-white/50">
            <Square size={20} fill="currentColor" />
            <span className="font-black tracking-wider uppercase text-sm">Parar</span>
          </button>
        </div>
      )}

      {/* Planning Route HUD */}
      {isPlanningRoute && (
        <div className="absolute bottom-6 left-4 right-4 bg-gradient-to-b from-[#112240]/95 to-[#0a192f]/95 backdrop-blur-xl p-5 rounded-3xl border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.5)] z-50 flex flex-col gap-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400">
                <PenTool size={20} />
              </div>
              <div className="text-base text-white font-bold tracking-tight">Planejar Rota</div>
            </div>
            <div className="flex flex-col items-end">
              <div className="text-[10px] text-[#8892b0] font-bold uppercase tracking-widest mb-0.5">Distância Total</div>
              <div className="text-sm text-[#64ffda] font-mono font-bold">
                {(calculateDistance(plannedRoutePoints) / 1000).toFixed(2)} km <span className="text-white/30 mx-1">|</span> {(calculateDistance(plannedRoutePoints) / 1852).toFixed(2)} NM
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-2 mb-2">
            <button 
              onClick={() => setIsDrawingMode(!isDrawingMode)}
              className={`py-3 rounded-2xl text-[10px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-105 active:scale-95 border ${isDrawingMode ? 'bg-gradient-to-br from-[#64ffda] to-teal-400 text-[#0a192f] border-transparent shadow-[0_0_15px_rgba(100,255,218,0.4)]' : 'bg-white/5 text-[#8892b0] border-white/5 hover:bg-white/10 hover:text-white'}`}
            >
              {isDrawingMode ? <Pen size={18} /> : <MousePointer2 size={18} />}
              {isDrawingMode ? "Desenhar" : "Clicar"}
            </button>
            <button 
              onClick={() => setShowHeadingTags(!showHeadingTags)}
              className={`py-3 rounded-2xl text-[10px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-105 active:scale-95 border ${showHeadingTags ? 'bg-gradient-to-br from-[#64ffda] to-teal-400 text-[#0a192f] border-transparent shadow-[0_0_15px_rgba(100,255,218,0.4)]' : 'bg-white/5 text-[#8892b0] border-white/5 hover:bg-white/10 hover:text-white'}`}
            >
              {showHeadingTags ? <Eye size={18} /> : <EyeOff size={18} />}
              Tags
            </button>
            <button 
              onClick={() => setShowTideInfo(!showTideInfo)}
              className={`py-3 rounded-2xl text-[10px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-105 active:scale-95 border ${showTideInfo ? 'bg-gradient-to-br from-[#64ffda] to-teal-400 text-[#0a192f] border-transparent shadow-[0_0_15px_rgba(100,255,218,0.4)]' : 'bg-white/5 text-[#8892b0] border-white/5 hover:bg-white/10 hover:text-white'}`}
            >
              <Waves size={18} /> Marés
            </button>
            <button 
              onClick={() => setIsEcoMode(!isEcoMode)}
              className={`py-3 rounded-2xl text-[10px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-105 active:scale-95 border ${isEcoMode ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white border-transparent shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-white/5 text-[#8892b0] border-white/5 hover:bg-white/10 hover:text-white'}`}
            >
              <Leaf size={18} /> Eco
            </button>
          </div>

          <AnimatePresence>
            {isEcoMode && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-gradient-to-br from-emerald-500/10 to-emerald-900/10 border border-emerald-500/20 rounded-2xl p-4 space-y-3 shadow-inner"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <Wind size={16} /> Análise de Eficiência
                  </div>
                  <div className="bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                    <span className="text-[10px] text-emerald-300 uppercase font-bold tracking-wider">Vento: 12kt NE</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {(plannedRoutePoints || []).length > 1 ? (
                    (() => {
                      const windDir = 45; // North East
                      let totalEfficiency = 0;
                      const segments = [];
                      
                      for (let i = 1; i < plannedRoutePoints.length; i++) {
                        const heading = calculateHeading(plannedRoutePoints[i-1], plannedRoutePoints[i]);
                        const diff = Math.abs((heading - windDir + 180 + 360) % 360 - 180);
                        // 0 diff = headwind (bad), 180 diff = tailwind (good)
                        const efficiency = (diff / 180) * 100;
                        totalEfficiency += efficiency;
                        segments.push({ heading, efficiency });
                      }
                      
                      const avgEfficiency = totalEfficiency / (plannedRoutePoints.length - 1);
                      const fuelSaved = (avgEfficiency - 50) / 2; // Simple mock formula

                      return (
                        <>
                          <div className="flex justify-between items-end">
                            <span className="text-xs font-medium text-emerald-100/70">Score Eco Geral</span>
                            <span className="text-2xl font-black text-emerald-400 drop-shadow-sm">{Math.round(avgEfficiency)}%</span>
                          </div>
                          <div className="w-full bg-[#0a192f] h-2.5 rounded-full overflow-hidden border border-emerald-900/50">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${avgEfficiency}%` }}
                              className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full shadow-[0_0_10px_rgba(52,211,153,0.8)] relative"
                            >
                              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px] animate-[shimmer_2s_linear_infinite]" />
                            </motion.div>
                          </div>
                          <div className="bg-[#0a192f]/50 p-3 rounded-xl border border-emerald-500/10 mt-2">
                            <p className="text-[11px] text-emerald-300/90 leading-relaxed">
                              {fuelSaved > 0 
                                ? `✨ Rota favorável ao vento. Economia estimada de ${fuelSaved.toFixed(1)}% de combustível.`
                                : `⚠️ Trechos com vento de proa detectados. Consumo pode aumentar em ${Math.abs(fuelSaved).toFixed(1)}%.`}
                            </p>
                          </div>
                        </>
                      );
                    })()
                  ) : (
                    <div className="bg-[#0a192f]/50 p-4 rounded-xl border border-emerald-500/10 text-center">
                      <p className="text-xs text-emerald-400/60 font-medium">Adicione mais pontos para análise eco.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showTideInfo && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                    <label className="block text-[10px] text-[#8892b0] uppercase font-bold tracking-wider mb-1.5">Partida</label>
                    <input 
                      type="datetime-local" 
                      value={routeStartTime}
                      onChange={(e) => setRouteStartTime(e.target.value)}
                      className="w-full bg-transparent text-sm text-white outline-none font-medium"
                    />
                  </div>
                  <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                    <label className="block text-[10px] text-[#8892b0] uppercase font-bold tracking-wider mb-1.5">Velocidade (kt)</label>
                    <input 
                      type="number" 
                      value={routeSpeed}
                      onChange={(e) => setRouteSpeed(Number(e.target.value))}
                      className="w-full bg-transparent text-sm text-white outline-none font-medium"
                    />
                  </div>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {(plannedRoutePoints || []).map((p, i) => {
                    const distToPoint = calculateDistance(plannedRoutePoints.slice(0, i + 1));
                    const timeInHours = (distToPoint / 1852) / (routeSpeed || 1);
                    const startTs = new Date(routeStartTime).getTime();
                    const arrivalTime = isNaN(startTs) ? new Date() : new Date(startTs + timeInHours * 60 * 60 * 1000);
                    const tideHeight = getTideAtTime(arrivalTime);
                    
                    return (
                      <div key={i} className="flex justify-between items-center p-3 bg-gradient-to-r from-white/5 to-transparent rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-[#64ffda]/20 text-[#64ffda] flex items-center justify-center text-[10px] font-bold border border-[#64ffda]/30">
                            {i + 1}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs text-white font-bold">Ponto {i + 1}</span>
                            <span className="text-[10px] text-[#8892b0] font-mono">{format(arrivalTime, "HH:mm")}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-end">
                            <span className="text-sm text-[#64ffda] font-bold font-mono">{isNaN(tideHeight) ? "0.0" : tideHeight.toFixed(1)}m</span>
                            <span className="text-[9px] text-[#8892b0] uppercase tracking-wider">Maré</span>
                          </div>
                          <div className={`w-2 h-2 rounded-full shadow-lg ${tideHeight > 1.5 ? 'bg-blue-400 shadow-blue-400/50' : 'bg-yellow-400 shadow-yellow-400/50'}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex items-start gap-3">
            <Info size={16} className="text-blue-400 mt-0.5 shrink-0" />
            <div className="text-xs text-blue-200/80 leading-relaxed">
              {isDrawingMode ? "Desenhe livremente no mapa usando a S Pen ou o dedo para criar um traçado contínuo." : "Toque em pontos específicos no mapa para criar segmentos retos."}
            </div>
          </div>

          <div className="flex gap-3 mt-2">
            <button 
              onClick={() => {
                setPlannedRoutePoints([]);
                setIsPlanningRoute(false);
              }} 
              className="flex-1 py-3.5 bg-white/5 text-white rounded-2xl text-sm font-bold hover:bg-white/10 transition-all border border-white/10 hover:scale-[1.02] active:scale-[0.98]"
            >
              Cancelar
            </button>
            <button 
              onClick={() => {
                if ((plannedRoutePoints || []).length > 1) {
                  const name = prompt("Nome da rota:", `Rota ${new Date().toLocaleDateString()}`);
                  if (name) {
                    addPlannedRoute({
                      name,
                      points: plannedRoutePoints
                    });
                    alert("Rota salva com sucesso!");
                    setPlannedRoutePoints([]);
                    setIsPlanningRoute(false);
                  }
                } else {
                  alert("Adicione pelo menos 2 pontos para salvar a rota.");
                }
              }} 
              className="flex-1 py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl text-sm font-bold hover:from-blue-400 hover:to-indigo-500 transition-all shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] hover:scale-[1.02] active:scale-[0.98]"
            >
              Salvar Rota
            </button>
          </div>
        </div>
      )}

      {/* Top HUD - Integrates NMEA data if available */}
      <div className="absolute top-16 left-2 right-2 z-10 flex flex-wrap gap-3 pointer-events-none justify-center">

        {nmeaData.depth !== null && (
          <div className="bg-gradient-to-b from-[#112240]/90 to-[#0a192f]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-3 flex flex-col shadow-2xl flex-1 min-w-[80px] items-center">
            <span className="text-[10px] text-[#8892b0] uppercase font-bold tracking-widest mb-1">
              Profundidade
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-[#64ffda] drop-shadow-sm">
                {nmeaData.depth.toFixed(1)}
              </span>
              <span className="text-xs text-[#8892b0] font-bold">m</span>
            </div>
          </div>
        )}

        {nmeaData.aws !== null && (
          <div className="bg-gradient-to-b from-[#112240]/90 to-[#0a192f]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-3 flex flex-col shadow-2xl flex-1 min-w-[80px] items-center">
            <span className="text-[10px] text-[#8892b0] uppercase font-bold tracking-widest mb-1">
              Vento
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-red-400 drop-shadow-sm">
                {nmeaData.aws.toFixed(1)}
              </span>
              <span className="text-xs text-[#8892b0] font-bold">kt</span>
            </div>
          </div>
        )}

        <div className="bg-gradient-to-b from-[#112240]/90 to-[#0a192f]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-3 flex flex-col shadow-2xl flex-1 min-w-[80px] items-center">
          <span className="text-[10px] text-[#8892b0] uppercase font-bold tracking-widest mb-1">
            Rumo
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-white drop-shadow-sm">
              {location?.heading ? Math.round(location.heading) : "---"}
            </span>
            <span className="text-xs text-[#8892b0] font-bold">°</span>
          </div>
        </div>
      </div>

      {/* Action Menu Overlay */}
      <AnimatePresence>
        {showActionMenu && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-[#0a192f]/60 backdrop-blur-sm flex items-end justify-center pb-20 pointer-events-auto"
            onClick={() => setShowActionMenu(false)}
          >
            <motion.div 
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-gradient-to-b from-[#112240] to-[#0a192f] w-full max-w-md rounded-3xl p-5 flex flex-col gap-3 border border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] mx-4 mb-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-2 px-1">
                <h3 className="text-xl font-bold text-white tracking-tight">Ações do Mapa</h3>
                <button onClick={() => setShowActionMenu(false)} className="p-2 bg-white/5 rounded-full text-[#8892b0] hover:text-white transition-colors"><X size={20}/></button>
              </div>
              
              <button onClick={() => { handleAddWaypoint(); setShowActionMenu(false); }} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 text-white hover:bg-white/10 transition-all text-left group">
                <div className="bg-blue-500/20 p-3 rounded-xl text-blue-400 group-hover:scale-110 transition-transform shadow-inner"><MapPin size={22} /></div>
                <div>
                  <div className="font-bold text-base">Salvar posição atual</div>
                  <div className="text-xs text-[#8892b0] mt-0.5">Cria um marcador no centro do mapa</div>
                </div>
              </button>

              <button onClick={() => { toggleRecording(); setShowActionMenu(false); }} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 text-white hover:bg-white/10 transition-all text-left group">
                <div className="bg-red-500/20 p-3 rounded-xl text-red-400 group-hover:scale-110 transition-transform shadow-inner"><Route size={22} /></div>
                <div>
                  <div className="font-bold text-base">{isRecording ? "Parar gravação" : "Gravar corrico (Rota)"}</div>
                  <div className="text-xs text-[#8892b0] mt-0.5">Rastreia seu movimento no mapa</div>
                </div>
              </button>

              <button onClick={() => { 
                if (anchorAlarm?.active) {
                  setAnchorAlarm({ active: false });
                } else if (location) {
                  setShowAnchorModal(true);
                } else {
                  alert("Localização indisponível para lançar âncora.");
                }
                setShowActionMenu(false); 
              }} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 text-white hover:bg-white/10 transition-all text-left group">
                <div className="bg-orange-500/20 p-3 rounded-xl text-orange-400 group-hover:scale-110 transition-transform shadow-inner"><Anchor size={22} /></div>
                <div>
                  <div className="font-bold text-base">{anchorAlarm?.active ? "Desativar Âncora" : "Lance a âncora"}</div>
                  <div className="text-xs text-[#8892b0] mt-0.5">Alarme de garre</div>
                </div>
              </button>

              <button onClick={() => { 
                setIsPlanningRoute(true); 
                setShowActionMenu(false); 
              }} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 text-white hover:bg-white/10 transition-all text-left group">
                <div className="bg-blue-500/20 p-3 rounded-xl text-blue-400 group-hover:scale-110 transition-transform shadow-inner"><PenTool size={22} /></div>
                <div>
                  <div className="font-bold text-base">Planejar Rota</div>
                  <div className="text-xs text-[#8892b0] mt-0.5">Desenhe uma rota no mapa</div>
                </div>
              </button>

              <button onClick={() => { setShowCatchModal(true); setShowActionMenu(false); }} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 text-white hover:bg-white/10 transition-all text-left group">
                <div className="bg-emerald-500/20 p-3 rounded-xl text-emerald-400 group-hover:scale-110 transition-transform shadow-inner"><BookOpen size={22} /></div>
                <div>
                  <div className="font-bold text-base">Novo Registro no Diário</div>
                  <div className="text-xs text-[#8892b0] mt-0.5">Pesca, Jetski, Mergulho, etc.</div>
                </div>
              </button>

              <button onClick={() => { handleShareLocation(); setShowActionMenu(false); }} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 text-white hover:bg-white/10 transition-all text-left group">
                <div className="bg-blue-500/20 p-3 rounded-xl text-blue-400 group-hover:scale-110 transition-transform shadow-inner"><Share2 size={22} /></div>
                <div>
                  <div className="font-bold text-base">Compartilhar Posição</div>
                  <div className="text-xs text-[#8892b0] mt-0.5">Envia sua localização atual</div>
                </div>
              </button>

              <button onClick={() => { setShowMarkerModal(true); setShowActionMenu(false); }} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 text-white hover:bg-white/10 transition-all text-left group">
                <div className="bg-purple-500/20 p-3 rounded-xl text-purple-400 group-hover:scale-110 transition-transform shadow-inner"><MapPin size={22} /></div>
                <div>
                  <div className="font-bold text-base">Compartilhar Local</div>
                  <div className="text-xs text-[#8892b0] mt-0.5">Perigos, rampas, postos, marinas...</div>
                </div>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Marker Modal */}
      <AnimatePresence>
        {showMarkerModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#0a192f]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 pointer-events-auto"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-gradient-to-b from-[#112240] to-[#0a192f] w-full max-w-sm rounded-3xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden"
            >
              <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5">
                <h3 className="text-white font-bold text-lg tracking-tight">Compartilhar Local</h3>
                <button
                  onClick={() => setShowMarkerModal(false)}
                  className="p-2 bg-white/5 rounded-full text-[#8892b0] hover:text-white hover:bg-white/10 transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-5 flex flex-col gap-5">
                <div>
                  <label className="block text-[10px] font-bold text-[#8892b0] uppercase tracking-widest mb-3">
                    Tipo de Local
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "hazard", label: "Perigo", icon: "⚠️" },
                      { id: "ramp", label: "Rampa", icon: "🚤" },
                      { id: "gas", label: "Posto", icon: "⛽" },
                      { id: "marina", label: "Marina", icon: "⚓" },
                      { id: "hangout", label: "Encontro", icon: "🍻" },
                      { id: "fishing", label: "Pesca", icon: "🎣" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setMarkerType(t.id as any)}
                        className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all hover:scale-105 active:scale-95 ${
                          markerType === t.id
                            ? "bg-gradient-to-br from-[#64ffda]/20 to-[#64ffda]/5 border-[#64ffda]/50 text-[#64ffda] shadow-[0_0_15px_rgba(100,255,218,0.2)]"
                            : "bg-white/5 border-white/5 text-[#8892b0] hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <span className="text-2xl drop-shadow-md">{t.icon}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#8892b0] uppercase tracking-widest mb-2">
                    Nome do Local
                  </label>
                  <input
                    type="text"
                    value={markerName}
                    onChange={(e) => setMarkerName(e.target.value)}
                    placeholder="Ex: Banco de areia, Rampa pública..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-[#64ffda] focus:bg-white/10 transition-all placeholder:text-white/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#8892b0] uppercase tracking-widest mb-2">
                    Descrição (Opcional)
                  </label>
                  <textarea
                    value={markerDesc}
                    onChange={(e) => setMarkerDesc(e.target.value)}
                    placeholder="Detalhes adicionais..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-[#64ffda] focus:bg-white/10 transition-all h-24 resize-none placeholder:text-white/20 custom-scrollbar"
                  />
                </div>
                <button
                  onClick={handleAddCommunityMarker}
                  disabled={!markerName}
                  className="w-full py-4 bg-gradient-to-r from-[#64ffda] to-teal-400 text-[#0a192f] font-black rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-[0_0_20px_rgba(100,255,218,0.4)] hover:scale-[1.02] active:scale-[0.98] uppercase tracking-wider text-sm mt-2"
                >
                  Compartilhar no Mapa
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Anchor Modal */}
      <AnimatePresence>
        {showAnchorModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-[#0a192f]/80 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-gradient-to-b from-[#112240] to-[#0a192f] w-full max-w-sm rounded-3xl p-6 border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-orange-500/20 rounded-xl text-orange-400">
                  <Anchor size={24} />
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">Alarme de Âncora</h3>
              </div>
              
              <div className="mb-6 bg-white/5 p-4 rounded-2xl border border-white/5">
                <div className="flex justify-between items-end mb-4">
                  <label className="block text-[10px] font-bold text-[#8892b0] uppercase tracking-widest">Raio de segurança</label>
                  <span className="text-2xl font-black text-orange-400 drop-shadow-sm">{anchorRadius}m</span>
                </div>
                <input 
                  type="range" 
                  min="10"
                  max="200"
                  step="5"
                  value={anchorRadius} 
                  onChange={(e) => setAnchorRadius(Number(e.target.value))}
                  className="w-full accent-orange-500 h-2 bg-[#0a192f] rounded-full appearance-none cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-3 gap-3 mb-8">
                <button onClick={() => setAnchorRadius(20)} className={`py-3 rounded-xl text-sm font-bold transition-all ${anchorRadius === 20 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' : 'bg-white/5 text-[#8892b0] border border-white/5 hover:bg-white/10 hover:text-white'}`}>20m</button>
                <button onClick={() => setAnchorRadius(50)} className={`py-3 rounded-xl text-sm font-bold transition-all ${anchorRadius === 50 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' : 'bg-white/5 text-[#8892b0] border border-white/5 hover:bg-white/10 hover:text-white'}`}>50m</button>
                <button onClick={() => setAnchorRadius(100)} className={`py-3 rounded-xl text-sm font-bold transition-all ${anchorRadius === 100 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' : 'bg-white/5 text-[#8892b0] border border-white/5 hover:bg-white/10 hover:text-white'}`}>100m</button>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowAnchorModal(false)} className="flex-1 py-3.5 rounded-xl bg-white/5 text-white font-bold hover:bg-white/10 transition-all border border-white/10 hover:scale-[1.02] active:scale-[0.98]">Cancelar</button>
                <button onClick={() => {
                  if (location) {
                    setAnchorAlarm({ active: true, lat: location.lat, lng: location.lng, radius: anchorRadius });
                    setShowAnchorModal(false);
                  }
                }} className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-black hover:from-orange-400 hover:to-red-400 transition-all shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:shadow-[0_0_30px_rgba(249,115,22,0.6)] hover:scale-[1.02] active:scale-[0.98] uppercase tracking-wider">Ativar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Log Entry Modal (Expanded Logbook) */}
      <AnimatePresence>
        {showCatchModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-[#0a192f]/80 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-gradient-to-b from-[#112240] to-[#0a192f] w-full max-w-sm rounded-3xl p-6 border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)] max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">
                  <BookOpen size={24} />
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">Novo Registro</h3>
              </div>
            
            <div className="space-y-5 mb-8">
              <div>
                <label className="block text-[10px] font-bold text-[#8892b0] uppercase tracking-widest mb-3">Tipo de Atividade</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "fishing", label: "Pesca", icon: "🎣" },
                    { id: "jetski", label: "Jetski", icon: "⚡" },
                    { id: "wakesurf", label: "Surf", icon: "🏄" },
                    { id: "diving", label: "Mergulho", icon: "🤿" },
                    { id: "other", label: "Outro", icon: "📝" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setLogType(t.id as any)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all hover:scale-105 active:scale-95 ${
                        logType === t.id
                          ? "bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                          : "bg-white/5 border-white/5 text-[#8892b0] hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span className="text-2xl drop-shadow-md">{t.icon}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#8892b0] uppercase tracking-widest mb-2">Título / Nome</label>
                <input 
                  type="text" 
                  value={logTitle} 
                  onChange={(e) => setLogTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-emerald-500 focus:bg-white/10 transition-all placeholder:text-white/20"
                  placeholder="Ex: Passeio na Ilha"
                />
              </div>

              {logType === 'fishing' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4 bg-white/5 p-4 rounded-2xl border border-white/5"
                >
                  <div>
                    <label className="block text-[10px] font-bold text-[#8892b0] uppercase tracking-widest mb-2">Espécie</label>
                    <input 
                      type="text" 
                      value={catchSpecies} 
                      onChange={(e) => setCatchSpecies(e.target.value)}
                      className="w-full bg-[#0a192f] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500 transition-all placeholder:text-white/20"
                      placeholder="Ex: Robalo"
                    />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-[#8892b0] uppercase tracking-widest mb-2">Peso (kg)</label>
                      <input 
                        type="number" 
                        value={catchWeight} 
                        onChange={(e) => setCatchWeight(e.target.value)}
                        className="w-full bg-[#0a192f] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500 transition-all"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-[#8892b0] uppercase tracking-widest mb-2">Tamanho (cm)</label>
                      <input 
                        type="number" 
                        value={catchLength} 
                        onChange={(e) => setCatchLength(e.target.value)}
                        className="w-full bg-[#0a192f] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500 transition-all"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-[#8892b0] uppercase tracking-widest mb-2">Foto</label>
                <div className="relative w-full h-14 bg-white/5 border border-white/10 border-dashed rounded-xl flex items-center justify-center text-[#8892b0] overflow-hidden hover:bg-white/10 transition-colors">
                  {catchPhoto ? (
                    <span className="text-emerald-400 font-bold text-sm flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      Foto anexada
                    </span>
                  ) : (
                    <>
                      <Camera size={20} className="mr-2" />
                      <span className="text-sm font-medium">Tirar foto</span>
                    </>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => setCatchPhoto(reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCatchModal(false)} className="flex-1 py-3.5 rounded-xl bg-white/5 text-white font-bold hover:bg-white/10 transition-all border border-white/10 hover:scale-[1.02] active:scale-[0.98]">Cancelar</button>
              <button onClick={handleSaveLogEntry} className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black hover:from-emerald-400 hover:to-teal-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] hover:scale-[1.02] active:scale-[0.98] uppercase tracking-wider">Salvar</button>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stop Recording Modal */}
      <AnimatePresence>
        {showStopRecordingModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-[#0a192f]/80 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-gradient-to-b from-[#112240] to-[#0a192f] w-full max-w-sm rounded-3xl p-6 border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-red-500/20 rounded-xl text-red-400">
                  <Route size={24} />
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">Salvar Rota</h3>
              </div>
              <div className="mb-8">
                <label className="block text-[10px] font-bold text-[#8892b0] uppercase tracking-widest mb-2">Nome da rota</label>
                <input 
                  type="text" 
                  value={trackName} 
                  onChange={(e) => setTrackName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-red-500 focus:bg-white/10 transition-all placeholder:text-white/20"
                  placeholder="Ex: Corrico de Domingo"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowStopRecordingModal(false)} className="flex-1 py-3.5 rounded-xl bg-white/5 text-white font-bold hover:bg-white/10 transition-all border border-white/10 hover:scale-[1.02] active:scale-[0.98]">Cancelar</button>
                <button onClick={() => {
                  stopRecording(trackName || `Rota ${(tracks || []).length + 1}`);
                  setShowStopRecordingModal(false);
                  setTrackName("");
                }} className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-black hover:from-red-400 hover:to-rose-500 transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)] hover:scale-[1.02] active:scale-[0.98] uppercase tracking-wider">Salvar e Parar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
