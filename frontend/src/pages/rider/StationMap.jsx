import { useEffect, useState } from 'react';
import API from '../../services/api';
import { MapPin, Battery, AlertCircle, Navigation, ExternalLink } from 'lucide-react';

// Haversine distance in km
function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function StationMap() {
  const [stations,  setStations]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [userPos,   setUserPos]   = useState(null);  // { lat, lng }
  const [locating,  setLocating]  = useState(false);
  const [locError,  setLocError]  = useState('');

  useEffect(() => {
    API.get('/stations')
      .then(res => setStations(res.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));

    // Auto-request location on mount
    locateMe();
  }, []);

  const locateMe = () => {
    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    setLocError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocError('Could not get your location. Showing all stations.');
        setLocating(false);
      }
    );
  };

  // Sort by distance if we have user position
  const sorted = userPos
    ? [...stations].sort((a, b) =>
        getDistance(userPos.lat, userPos.lng, a.location_lat, a.location_lng) -
        getDistance(userPos.lat, userPos.lng, b.location_lat, b.location_lng)
      )
    : stations;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Find a Station</h1>
          <p className="text-white/50 text-sm">
            {userPos ? 'Stations sorted by distance from your location.' : 'All active Spiro swap stations.'}
          </p>
        </div>
        <button onClick={locateMe} disabled={locating}
          className="btn-secondary flex items-center gap-2 text-sm shrink-0">
          <Navigation size={15} className={locating ? 'animate-spin' : ''} />
          {locating ? 'Locating…' : 'Use My Location'}
        </button>
      </div>

      {locError && (
        <div className="flex items-center gap-2 text-yellow-400 text-sm bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3">
          <AlertCircle size={15} /> {locError}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-spiro-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="glass p-8 text-center text-white/40">
          <MapPin size={40} className="mx-auto mb-3 opacity-40" />
          <p>No stations available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map((s, i) => {
            const dist = userPos
              ? getDistance(userPos.lat, userPos.lng, s.location_lat, s.location_lng)
              : null;
            const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${s.location_lat},${s.location_lng}`;

            return (
              <div key={s.station_id} className="glass p-5 hover:bg-white/10 transition-all space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-spiro-400 shrink-0" />
                    <span className="text-white font-semibold text-sm">{s.station_name}</span>
                  </div>
                  <span className={s.is_active ? 'badge-green' : 'badge-red'}>
                    {s.is_active ? 'Active' : 'Offline'}
                  </span>
                </div>

                {/* Battery count */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-white/60 text-sm">
                    <Battery size={14} className="text-yellow-400" />
                    <span>{s.available_count}/{s.total_capacity} batteries</span>
                  </div>
                  {s.available_count < 2 && (
                    <div className="flex items-center gap-1 text-yellow-400 text-xs">
                      <AlertCircle size={12} /> Low Stock
                    </div>
                  )}
                </div>

                {/* Distance + coords */}
                <div className="flex items-center justify-between">
                  <p className="text-white/30 text-xs">
                    📍 {parseFloat(s.location_lat).toFixed(4)}, {parseFloat(s.location_lng).toFixed(4)}
                    {dist !== null && (
                      <span className="ml-2 text-spiro-400 font-medium">{dist.toFixed(1)} km away</span>
                    )}
                  </p>
                  {userPos && i === 0 && (
                    <span className="text-xs bg-spiro-500/20 text-spiro-400 border border-spiro-500/30 px-2 py-0.5 rounded-full">
                      Nearest
                    </span>
                  )}
                </div>

                {/* Directions button */}
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                  className="btn-secondary text-xs py-2 flex items-center justify-center gap-1.5 w-full">
                  <ExternalLink size={13} /> Get Directions
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
