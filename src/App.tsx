/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Map, Compass, CloudRain, BookOpen, Settings, AlertTriangle, Menu, X, Navigation, Users, Trophy, Anchor, Waves, BellRing } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useStore, NavItem as NavItemType } from "./store";
import { RealtimeChannel } from "@supabase/supabase-js";
import { MapView } from "./views/MapView";
import { WeatherView } from "./views/WeatherView";
import { TidesView } from "./views/TidesView";
import { LogbookView } from "./views/LogbookView";
import { SettingsView } from "./views/SettingsView";
import { EventsView } from "./views/EventsView";
import { AchievementsView } from "./views/AchievementsView";
import { AuthView } from "./views/AuthView";
import { InstallPrompt } from "./components/InstallPrompt";
import { useNMEA } from "./hooks/useNMEA";
import { supabase } from "./lib/supabase";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Capacitor } from "@capacitor/core";

type Tab = "map" | "weather" | "tides" | "logbook" | "settings" | "events" | "achievements";

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180; // φ, λ in radians
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
}

function playAlarmSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'square';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc.frequency.setValueAtTime(1108.73, ctx.currentTime + 0.2); // C#6
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.4);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);

    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch (e) {
    console.error("Audio play failed", e);
  }
}

const NAV_CONFIG: Record<NavItemType, { icon: React.ReactNode; label: string }> = {
  weather: { icon: <CloudRain size={22} />, label: "Tempo" },
  tides: { icon: <Waves size={22} />, label: "Marés" },
  logbook: { icon: <BookOpen size={22} />, label: "Diário" },
  events: { icon: <Users size={22} />, label: "Eventos" },
  achievements: { icon: <Trophy size={22} />, label: "Conquistas" },
  settings: { icon: <Settings size={22} />, label: "Ajustes" },
};

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("map");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const setLocation = useStore((state) => state.setLocation);
  const isRecording = useStore((state) => state.isRecording);
  const addTrackPoint = useStore((state) => state.addTrackPoint);
  const anchorAlarm = useStore((state) => state.anchorAlarm);
  const setCollisionCountdown = useStore((state) => state.setCollisionCountdown);
  const collisionCountdown = useStore((state) => state.collisionCountdown);
  const setEmergency = useStore((state) => state.setEmergency);
  const emergency = useStore((state) => state.emergency);
  const weatherAlert = useStore((state) => state.weatherAlert);
  const location = useStore((state) => state.location);
  const nmeaData = useStore((state) => state.nmeaData);
  const checkAchievements = useStore((state) => state.checkAchievements);
  const tracksCount = useStore((state) => (state.tracks || []).length);
  const waypointsCount = useStore((state) => (state.waypoints || []).length);
  const logEntriesCount = useStore((state) => (state.logEntries || []).length);
  const eventsCount = useStore((state) => (state.events || []).length);
  const settingsNmea = useStore((state) => state.settings?.nmea);
  const speedUnit = useStore((state) => state.speedUnit);
  const setSpeedUnit = useStore((state) => state.setSpeedUnit);
  const navItems = useStore((state) => state.navItems);
  const setDeviceHeading = useStore((state) => state.setDeviceHeading);
  const user = useStore((state) => state.user);
  const isOfflineMode = useStore((state) => state.isOfflineMode);
  const radarEnabled = useStore((state) => state.settings?.radarEnabled);
  const setOnlineUsers = useStore((state) => state.setOnlineUsers);
  const connectedUsers = useStore((state) => state.onlineUsers) || {};

  useNMEA();

  // Supabase Auth Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      useStore.getState().setUser(session?.user || null);
      if (session?.user) {
        useStore.getState().syncData();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      useStore.getState().setUser(session?.user || null);
      if (session?.user) {
        useStore.getState().syncData();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Setup StatusBar on Mobile
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.setOverlaysWebView({ overlay: true }).catch(() => { });
      StatusBar.setStyle({ style: Style.Dark }).catch(() => { });
    }
  }, []);

  // Realtime Radar Subscription
  const radarChannelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!user || !radarEnabled || isOfflineMode) {
      if (radarChannelRef.current) {
        supabase.removeChannel(radarChannelRef.current);
        radarChannelRef.current = null;
      }
      return;
    }

    const channel = supabase.channel('radar', {
      config: {
        broadcast: { self: false },
      },
    });

    channel
      .on('broadcast', { event: 'location' }, (payload) => {
        setOnlineUsers((prev) => ({
          ...prev,
          [payload.payload.id]: {
            ...payload.payload,
            updatedAt: Date.now(),
          },
        }));
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          radarChannelRef.current = channel;
        }
      });

    return () => {
      supabase.removeChannel(channel);
      radarChannelRef.current = null;
    };
  }, [user, radarEnabled, isOfflineMode, setOnlineUsers]);

  // Broadcast location periodically
  useEffect(() => {
    if (!user || !radarEnabled || isOfflineMode || !location) return;

    const interval = setInterval(() => {
      if (radarChannelRef.current) {
        radarChannelRef.current.send({
          type: 'broadcast',
          event: 'location',
          payload: {
            id: user.id,
            lat: location.lat,
            lng: location.lng,
            heading: location.heading,
            speed: location.speed,
          },
        });
      }
    }, 5000); // Broadcast every 5 seconds

    return () => clearInterval(interval);
  }, [user, radarEnabled, isOfflineMode, location]);

  // Cleanup stale users
  useEffect(() => {
    const interval = setInterval(() => {
      setOnlineUsers((prev) => {
        const now = Date.now();
        const next = { ...prev };
        let changed = false;
        for (const id in next) {
          if (now - next[id].updatedAt > 60000) { // 1 minute timeout
            delete next[id];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [setOnlineUsers]);

  // Real-time Collision Detection
  useEffect(() => {
    if (!location || !radarEnabled || isOfflineMode || emergency || collisionCountdown !== null) return;

    const checkCollisions = () => {
      let imminentCollision = false;
      Object.values(connectedUsers).forEach(otherUser => {
        if (otherUser.id === user?.id) return;

        const dist = getDistance(location.lat, location.lng, otherUser.lat, otherUser.lng);
        // If another vessel is within 50 meters and moving
        if (dist < 50 && (otherUser.speed || 0) > 1) {
          imminentCollision = true;
        }
      });

      if (imminentCollision) {
        setCollisionCountdown(30);
        playAlarmSound();
      }
    };

    const interval = setInterval(checkCollisions, 3000);
    return () => clearInterval(interval);
  }, [location, connectedUsers, radarEnabled, isOfflineMode, emergency, collisionCountdown, setCollisionCountdown, user?.id]);

  // Weather Alert Audio
  useEffect(() => {
    if (weatherAlert) {
      playAlarmSound();
    }
  }, [weatherAlert]);

  // Auto-check achievements when relevant data changes
  useEffect(() => {
    checkAchievements();
  }, [tracksCount, waypointsCount, logEntriesCount, eventsCount, checkAchievements]);

  const lastRecordedPos = useRef<{ lat: number; lng: number } | null>(null);
  const anchorAlerted = useRef(false);

  useEffect(() => {
    let interval: number;
    if (collisionCountdown !== null && collisionCountdown > 0) {
      interval = window.setInterval(() => {
        setCollisionCountdown(collisionCountdown - 1);
      }, 1000);
    } else if (collisionCountdown === 0) {
      setEmergency(true);
      setCollisionCountdown(null);
    }
    return () => clearInterval(interval);
  }, [collisionCountdown, setCollisionCountdown, setEmergency]);

  useEffect(() => {
    const handleMotion = (event: DeviceMotionEvent) => {
      if (collisionCountdown !== null || emergency) return; // Already counting or in emergency
      const acc = event.acceleration;
      if (!acc) return;
      const totalAcc = Math.sqrt((acc.x || 0) ** 2 + (acc.y || 0) ** 2 + (acc.z || 0) ** 2);
      if (totalAcc > 25) { // Threshold for collision
        setCollisionCountdown(30);
      }
    };

    const handleOrientation = (event: any) => {
      if (event.webkitCompassHeading) {
        setDeviceHeading(event.webkitCompassHeading); // iOS
      } else if (event.alpha !== null) {
        setDeviceHeading(360 - event.alpha); // Android (approximate)
      }
    };

    window.addEventListener("devicemotion", handleMotion);
    window.addEventListener("deviceorientationabsolute", handleOrientation as any);
    window.addEventListener("deviceorientation", handleOrientation as any);

    return () => {
      window.removeEventListener("devicemotion", handleMotion);
      window.removeEventListener("deviceorientationabsolute", handleOrientation as any);
      window.removeEventListener("deviceorientation", handleOrientation as any);
    };
  }, [collisionCountdown, emergency, setCollisionCountdown, setDeviceHeading]);

  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newLoc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          accuracy: pos.coords.accuracy,
        };
        setLocation(newLoc);

        // Check Anchor Alarm
        if (anchorAlarm?.active) {
          const dist = getDistance(
            anchorAlarm.lat,
            anchorAlarm.lng,
            newLoc.lat,
            newLoc.lng
          );
          if (dist > anchorAlarm.radius) {
            if (!anchorAlerted.current) {
              playAlarmSound();
              // Keep playing sound every 3 seconds until dismissed
              const alarmInterval = setInterval(playAlarmSound, 3000);

              if (window.confirm(`🚨 ALARME DE ÂNCORA! Você se moveu ${Math.round(dist)}m (Limite: ${anchorAlarm.radius}m)\n\nClique em OK para silenciar.`)) {
                clearInterval(alarmInterval);
              } else {
                clearInterval(alarmInterval);
              }
              anchorAlerted.current = true;
            }
          } else {
            anchorAlerted.current = false;
          }
        }

        if (isRecording) {
          // Ignorar pontos com precisão muito ruim (ex: > 30 metros) para evitar "pulos" no mapa
          if (pos.coords.accuracy <= 30) {
            if (
              !lastRecordedPos.current ||
              getDistance(lastRecordedPos.current.lat, lastRecordedPos.current.lng, newLoc.lat, newLoc.lng) > 5 // Grava apenas se moveu mais de 5 metros
            ) {
              addTrackPoint({
                lat: newLoc.lat,
                lng: newLoc.lng,
                timestamp: Date.now(),
                speed: newLoc.speed || 0
              });
              lastRecordedPos.current = { lat: newLoc.lat, lng: newLoc.lng };
            }
          }
        } else {
          lastRecordedPos.current = null;
        }
      },
      (err) => console.error("Geolocation error:", err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [setLocation, isRecording, addTrackPoint, anchorAlarm]);

  const toggleSpeedUnit = async () => {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Light });
    }
    if (speedUnit === 'kt') setSpeedUnit('kmh');
    else if (speedUnit === 'kmh') setSpeedUnit('mph');
    else setSpeedUnit('kt');
  };

  const displaySpeed = useMemo(() => {
    let speedKt = 0;
    if (nmeaData.sog !== null) {
      speedKt = nmeaData.sog;
    } else if (location?.speed) {
      speedKt = location.speed * 1.94384; // m/s to knots
    }

    if (speedUnit === 'kmh') return (speedKt * 1.852).toFixed(1);
    if (speedUnit === 'mph') return (speedKt * 1.15078).toFixed(1);
    return speedKt.toFixed(1);
  }, [location?.speed, nmeaData.sog, speedUnit]);

  if (!user && !isOfflineMode) {
    return <AuthView />;
  }

  return (
    <div className="flex flex-col h-screen bg-[#0a192f] text-[#e6f1ff] overflow-hidden">
      {weatherAlert && (
        <div className="absolute top-0 left-0 right-0 bg-red-600 text-white font-bold text-center py-2 z-[100] animate-pulse shadow-lg flex items-center justify-center gap-2">
          <AlertTriangle size={20} />
          ALERTA DE MAU TEMPO: QUEDA BRUSCA DE PRESSÃO
        </div>
      )}
      {collisionCountdown !== null && (
        <div className="absolute inset-0 bg-red-900/95 z-[200] flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm">
          <BellRing size={80} className="text-white animate-bounce mb-6 drop-shadow-[0_0_30px_rgba(255,0,0,0.8)]" />
          <h1 className="text-4xl font-black text-white mb-2 tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-red-300">ALERTA DE COLISÃO</h1>
          <p className="text-xl text-red-200 mb-8 font-medium">Embarcação muito próxima!</p>
          <div className="text-9xl font-mono font-black text-white mb-12 drop-shadow-2xl">{collisionCountdown}</div>
          <button
            onClick={() => setCollisionCountdown(null)}
            className="w-full max-w-xs py-5 bg-white text-red-900 font-black text-2xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:bg-gray-100 active:scale-95 transition-all"
          >
            ESTOU BEM (CANCELAR)
          </button>
        </div>
      )}
      <main className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: "20%", rotateY: 10, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, rotateY: 0, scale: 1 }}
            exit={{ opacity: 0, x: "-20%", rotateY: -10, scale: 0.95 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="w-full h-full absolute inset-0 style-preserve-3d"
          >
            {activeTab === "map" && <MapView />}
            {activeTab === "weather" && <WeatherView />}
            {activeTab === "tides" && <TidesView />}
            {activeTab === "logbook" && <LogbookView />}
            {activeTab === "events" && <EventsView />}
            {activeTab === "achievements" && <AchievementsView />}
            {activeTab === "settings" && <SettingsView />}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {isMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#0a192f]/80 z-[100]"
                onClick={() => setIsMenuOpen(false)}
              />
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="absolute top-0 left-0 bottom-0 w-64 bg-[#0a192f]/80 backdrop-blur-xl border-r border-white/10 z-[101] flex flex-col shadow-2xl"
              >
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-[#112240] to-[#0a192f]">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg shadow-[#00e5ff]/20 overflow-hidden bg-[#0a192f] border border-white/10">
                      <img
                        src="/logo.png"
                        alt="Singrar Logo"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback se a imagem não for encontrada
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement!.innerHTML = '<span class="text-[#00e5ff] font-bold">S</span>';
                        }}
                      />
                    </div>
                    <div>
                      <h2 className="text-white font-bold text-xl tracking-tight">Singrar</h2>
                      <p className="text-[10px] text-[#00e5ff] uppercase tracking-widest font-bold">Marine OS</p>
                    </div>
                  </div>
                  <button onClick={() => setIsMenuOpen(false)} className="text-[#8892b0] hover:text-white bg-white/5 p-2 rounded-full transition-colors"><X size={20} /></button>
                </div>
                <div className="flex flex-col py-6 px-4 gap-2 overflow-y-auto">
                  <div className="text-xs font-bold text-[#8892b0] uppercase tracking-wider mb-2 px-2">Navegação</div>
                  <DrawerItem icon={<Map size={20} />} label="Mapa" active={activeTab === "map"} onClick={() => { setActiveTab("map"); setIsMenuOpen(false); }} />
                  <DrawerItem icon={<CloudRain size={20} />} label="Tempo & Radar" active={activeTab === "weather"} onClick={() => { setActiveTab("weather"); setIsMenuOpen(false); }} />
                  <DrawerItem icon={<Compass size={20} />} label="Marés & Correntes" active={activeTab === "tides"} onClick={() => { setActiveTab("tides"); setIsMenuOpen(false); }} />

                  <div className="text-xs font-bold text-[#8892b0] uppercase tracking-wider mt-4 mb-2 px-2">Comunidade</div>
                  <DrawerItem icon={<Users size={20} />} label="Eventos Náuticos" active={activeTab === "events"} onClick={() => { setActiveTab("events"); setIsMenuOpen(false); }} />
                  <DrawerItem icon={<Trophy size={20} />} label="Conquistas" active={activeTab === "achievements"} onClick={() => { setActiveTab("achievements"); setIsMenuOpen(false); }} />
                  <DrawerItem icon={<BookOpen size={20} />} label="Diário de Bordo" active={activeTab === "logbook"} onClick={() => { setActiveTab("logbook"); setIsMenuOpen(false); }} />

                  <div className="mt-auto pt-6">
                    <DrawerItem icon={<Settings size={20} />} label="Configurações" active={activeTab === "settings"} onClick={() => { setActiveTab("settings"); setIsMenuOpen(false); }} />
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </main>

      <InstallPrompt />
      <nav className="absolute bottom-0 left-0 right-0 bg-[#0a192f]/80 backdrop-blur-xl border-t border-white/10 pb-safe z-50">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems[0] && NAV_CONFIG[navItems[0]] && (
            <NavItem icon={NAV_CONFIG[navItems[0]].icon} label={NAV_CONFIG[navItems[0]].label} active={activeTab === navItems[0]} onClick={() => setActiveTab(navItems[0] as Tab)} />
          )}
          {navItems[1] && NAV_CONFIG[navItems[1]] && (
            <NavItem icon={NAV_CONFIG[navItems[1]].icon} label={NAV_CONFIG[navItems[1]].label} active={activeTab === navItems[1]} onClick={() => setActiveTab(navItems[1] as Tab)} />
          )}

          {/* Center Speedometer / Map Button */}
          <div
            onClick={() => activeTab !== 'map' ? setActiveTab('map') : toggleSpeedUnit()}
            className={`relative flex flex-col items-center justify-center -mt-8 w-16 h-16 rounded-full border-4 border-[#0a192f] shadow-[0_0_20px_rgba(0,229,255,0.2)] z-10 cursor-pointer transition-all duration-300 ${activeTab === 'map' ? 'bg-gradient-to-br from-[#00e5ff] to-[#ff6b00] scale-105' : 'bg-gradient-to-b from-[#112240] to-[#0a192f] hover:scale-105'}`}
          >
            <span className={`text-xl font-mono font-bold leading-none mt-1 ${activeTab === 'map' ? 'text-white drop-shadow-md' : 'text-[#00e5ff]'}`}>
              {displaySpeed}
            </span>
            <span className={`text-[9px] uppercase font-bold mt-0.5 ${activeTab === 'map' ? 'text-white/90' : 'text-[#8892b0]'}`}>
              {speedUnit === 'kt' ? 'Nós' : speedUnit === 'kmh' ? 'km/h' : 'mph'}
            </span>
          </div>

          {navItems[2] && NAV_CONFIG[navItems[2]] && (
            <NavItem icon={NAV_CONFIG[navItems[2]].icon} label={NAV_CONFIG[navItems[2]].label} active={activeTab === navItems[2]} onClick={() => setActiveTab(navItems[2] as Tab)} />
          )}
          <button
            onClick={() => setIsMenuOpen(true)}
            className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${isMenuOpen ? "text-[#00e5ff]" : "text-[#8892b0] hover:text-white"}`}
          >
            <Menu size={22} />
            <span className="text-[10px] font-medium mt-1">Menu</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

function NavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const handleTap = async () => {
    if (!active && Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Light });
    }
    onClick();
  };

  return (
    <button
      onClick={handleTap}
      className={`flex flex-col items-center justify-center w-16 h-full transition-all duration-200 ${active ? "text-[#00e5ff] -translate-y-1" : "text-[#8892b0] hover:text-white"
        }`}
    >
      {icon}
      <span className={`text-[10px] font-medium mt-1 transition-opacity duration-200 ${active ? "opacity-100" : "opacity-70"}`}>{label}</span>
      {active && (
        <motion.div
          layoutId="nav-indicator"
          className="absolute bottom-1 w-1 h-1 bg-[#00e5ff] rounded-full shadow-[0_0_8px_rgba(0,229,255,0.8)]"
        />
      )}
    </button>
  );
}

function DrawerItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${active ? "bg-[#64ffda]/10 text-[#64ffda]" : "text-[#8892b0] hover:bg-[#233554] hover:text-white"
        }`}
    >
      {icon}
      <span className="font-semibold">{label}</span>
    </button>
  );
}
