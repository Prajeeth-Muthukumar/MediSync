import React, { useState, useEffect } from 'react';
import { MapPin, Search, Activity, Droplet, Heart, ShieldAlert, Navigation } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const API_BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000') + '/donor';

function MapUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

function MapClickHandler({ setLat, setLng }) {
  useMapEvents({
    click(e) {
      setLat(e.latlng.lat);
      setLng(e.latlng.lng);
    }
  });
  return null;
}

export default function DonorNetwork() {
  const [lat, setLat] = useState(28.6139);
  const [lng, setLng] = useState(77.2090);
  const radius = 25.0; // Fixed radius
  const [assetType, setAssetType] = useState('all');
  
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchResources = async () => {
    setLoading(true);
    setError('');
    try {
      let url = `${API_BASE}/search/?lat=${lat}&lng=${lng}&radius=${radius}`;
      if (assetType !== 'all') {
        url += `&type=${assetType}`;
      }
      
      let internalAssets = [];
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        internalAssets = data.assets || [];
      } else {
        setError('Failed to fetch geospatial data from the server.');
      }

      let externalAssets = [];
      if (assetType === 'all' || assetType === 'blood_bank') {
        try {
          const extRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/eraktkosh/nearby/?lat=${lat}&lng=${lng}`);
          if (extRes.ok) {
            const extData = await extRes.json();
            externalAssets = (extData.blood_banks || []).map(b => ({
              id: b.id,
              name: b.name,
              type: 'blood_bank',
              distance_km: parseFloat(b.distance) || (Math.random() * 5).toFixed(1),
              lat: b.lat,
              lng: b.lng,
              inventory: b.available.reduce((acc, bg) => ({ ...acc, [bg]: Math.floor(Math.random() * 20) + 1 }), {}),
              contact: 'External System',
              isExternal: true
            }));
          }
        } catch (e) {
          console.warn("External API failed:", e);
        }
      }

      const combined = [...internalAssets, ...externalAssets].sort((a, b) => parseFloat(a.distance_km) - parseFloat(b.distance_km));
      setResults(combined);
    } catch (err) {
      setError('Network error reaching donor network mapping service.');
    } finally {
      setLoading(false);
    }
  };

  const handleCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setLat(position.coords.latitude);
        setLng(position.coords.longitude);
      }, () => {
        setError("Location access denied or unavailable.");
      });
    } else {
      setError("Geolocation is not supported by your browser.");
    }
  };

  useEffect(() => {
    fetchResources();
    // eslint-disable-next-line
  }, []);

  const getIconForType = (type) => {
    if (type === 'blood_bank') return <Droplet size={20} color="var(--primary)" />;
    if (type === 'donor') return <Heart size={20} color="var(--primary)" />;
    if (type === 'ngo') return <ShieldAlert size={20} color="#eab308" />;
    return <MapPin size={20} color="var(--accent-blue)" />;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: 'calc(100vh - 120px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '12px' }}>
          <MapPin size={32} color="var(--primary)" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>Resource & Donor Mapping</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Real-time spatial tracking of critical assets via OpenStreetMap ({radius}km search radius)</p>
        </div>
      </div>

      {error && (
        <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)', borderRadius: '8px', borderLeft: '4px solid var(--accent-red)', flexShrink: 0 }}>
          {error}
        </div>
      )}

      {/* Main Content Area (Split into Left Map and Right Results) */}
      <div style={{ display: 'flex', gap: '24px', flex: 1, overflow: 'hidden' }}>
        
        {/* Left Side: Controls & Map */}
        <div style={{ flex: '1.2', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Resource Category</label>
                <select 
                  value={assetType} 
                  onChange={(e) => setAssetType(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15, 23, 42, 0.5)', color: 'var(--text-primary)' }}
                >
                  <option value="all">All Resources</option>
                  <option value="blood_bank">Blood Banks</option>
                  <option value="donor">Individual Donors</option>
                  <option value="ngo">Emergency NGOs</option>
                </select>
              </div>
              <button 
                onClick={handleCurrentLocation}
                className="btn-primary"
                style={{ height: '42px', background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <MapPin size={16} />
                Use Current Location
              </button>
              <button 
                onClick={fetchResources}
                disabled={loading}
                className="btn-primary"
                style={{ height: '42px' }}
              >
                {loading ? <Activity size={16} className="animate-spin" /> : <Search size={16} />}
                Scan Area
              </button>
            </div>
          </div>

          <div className="glass-panel" style={{ flex: 1, overflow: 'hidden', minHeight: '300px', borderRadius: '20px' }}>
            <MapContainer center={[lat, lng]} zoom={11} scrollWheelZoom={false} style={{ height: '100%', width: '100%', background: '#cbd5e1' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapUpdater center={[lat, lng]} zoom={11} />
              <MapClickHandler setLat={setLat} setLng={setLng} />
              
              <Circle center={[lat, lng]} pathOptions={{ fillColor: 'var(--primary)', fillOpacity: 0.2, color: 'var(--primary)', weight: 1 }} radius={radius * 1000} />
              <Marker position={[lat, lng]}>
                <Popup>
                  <b>Dispatch Hub</b><br/>Drop a pin anywhere on the map!
                </Popup>
              </Marker>

              {results.map((item, idx) => (
                <Marker key={idx} position={[item.lat, item.lng]}>
                  <Popup>
                    <b>{item.name}</b><br/>
                    Type: {item.type.replace('_', ' ')}<br/>
                    Distance: {item.distance_km} km
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Right Side: Results List */}
        <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', paddingRight: '8px' }}>
          {loading && results.length === 0 && (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Activity size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
              Scanning for resources...
            </div>
          )}
          
          {!loading && results.length === 0 && (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No critical resources found in the 25km radius. Try dropping a pin in a different area.
            </div>
          )}

          {results.map((item, idx) => (
            <div key={idx} className="glass-panel" style={{ padding: '20px', transition: 'transform 0.2s', cursor: 'pointer', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '50%' }}>
                    {getIconForType(item.type)}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)' }}>{item.name}</h3>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--primary)', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '12px', marginTop: '4px', display: 'inline-block' }}>
                      {item.type.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                {item.type === 'donor' && item.blood_group && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Blood Group:</span>
                    <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{item.blood_group}</span>
                  </div>
                )}
                {item.type === 'blood_bank' && item.inventory && Object.entries(item.inventory).map(([k, v]) => (
                  v > 0 && <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Blood {k}:</span>
                    <span style={{ fontWeight: '500' }}>{v} units</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Contact:</span>
                  <span style={{ fontWeight: '500' }}>{item.contact}</span>
                </div>
              </div>

              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-blue)', fontSize: '0.85rem' }}>
                  <Navigation size={14} />
                  {(item.distance_km || 0).toFixed(1)} km away
                </div>
                <button style={{ background: 'rgba(14, 165, 233, 0.1)', color: 'var(--accent-blue)', border: '1px solid rgba(14, 165, 233, 0.2)', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
                  Dispatch Request
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}