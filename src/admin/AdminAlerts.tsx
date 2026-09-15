import { useState } from 'react';
import { Phone, CheckCircle, AlertCircle, MapPin, Clock, Building2, Navigation } from 'lucide-react';
import { getJcAlerts, markAlertResponded, type JcAlert } from '../lib/user';
import LocationMap from '../components/LocationMap';

const ADMIN_PHONE = '+255 678419202';

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

export default function AdminAlerts() {
  const [alerts, setAlerts] = useState<JcAlert[]>(getJcAlerts());
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('all');

  const refresh = () => setAlerts(getJcAlerts());

  const handleResolve = (id: string) => {
    markAlertResponded(id);
    refresh();
  };

  const filtered = alerts.filter(a => {
    if (filter === 'pending') return !a.responded;
    if (filter === 'resolved') return a.responded;
    return true;
  });

  const pendingCount = alerts.filter(a => !a.responded).length;
  const resolvedCount = alerts.filter(a => a.responded).length;

  return (
    <div className="space-y-6">
      {/* Admin contact line */}
      <div className="bg-[#FAECE7] border border-[#A32D2D]/20 rounded-xl px-5 py-3 flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-[#A32D2D]" />
        <span className="text-sm text-[#5F5E5A]">Admin line:</span>
        <a href={`tel:${ADMIN_PHONE.replace(/\s/g, '')}`} className="text-sm font-bold text-[#A32D2D]">
          {ADMIN_PHONE}
        </a>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        <FilterButton active={filter === 'all'} onClick={() => setFilter('all')} label={`All (${alerts.length})`} />
        <FilterButton active={filter === 'pending'} onClick={() => setFilter('pending')} label={`Pending (${pendingCount})`} red />
        <FilterButton active={filter === 'resolved'} onClick={() => setFilter('resolved')} label={`Resolved (${resolvedCount})`} green />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E5E3DC] p-12 text-center shadow-sm">
          <CheckCircle className="w-12 h-12 text-[#27500A] mx-auto mb-3" />
          <p className="font-semibold text-[#1A1A1A]">No alerts</p>
          <p className="text-sm text-[#5F5E5A] mt-1">
            {filter === 'pending' ? 'No pending alerts. All caught up!' : 'No alerts in this category.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(alert => (
            <div
              key={alert.id}
              className={`bg-white rounded-xl border-2 shadow-sm p-5 transition-all ${
                alert.responded ? 'border-[#E5E3DC] opacity-75' : 'border-[#A32D2D]/30'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-[#1A1A1A] text-sm">{alert.babyId}</p>
                  <p className="text-3xl font-bold text-[#A32D2D] mt-1">
                    {alert.bilirubin}<span className="text-xs font-normal ml-1">mg/dL</span>
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                  alert.responded
                    ? 'bg-[#EAF3DE] text-[#27500A]'
                    : 'bg-[#A32D2D] text-white animate-pulse'
                }`}>
                  {alert.responded ? 'RESOLVED' : 'PENDING'}
                </span>
              </div>

              <div className="space-y-1.5 text-sm">
                <p className="text-[#1A1A1A]">
                  <span className="text-[#5F5E5A]">Parent: </span>
                  <a href={`tel:${alert.parentPhone}`} className="font-semibold text-[#185FA5] hover:underline flex items-center gap-1 inline-flex">
                    <Phone className="w-3 h-3" /> {alert.parentName} · {alert.parentPhone}
                  </a>
                </p>
                <p className="text-[#5F5E5A] flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" /> {alert.location}
                </p>
                <p className="text-[#5F5E5A] flex items-center gap-1.5">
                  <Building2 className="w-3 h-3" /> Facility alerted: {alert.facilityName || 'Unknown'}
                </p>
                <p className="text-[#5F5E5A] flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> {timeAgo(alert.createdAt)}
                </p>
              </div>

              {alert.latitude != null && alert.longitude != null && (
                <div className="mt-3 space-y-2">
                  <LocationMap
                    latitude={alert.latitude}
                    longitude={alert.longitude}
                    accuracy={alert.accuracy || undefined}
                    label={`Baby ${alert.babyId}`}
                    height={200}
                  />
                  <a
                    href={`https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-[#185FA5] text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5"
                  >
                    <Navigation className="w-3.5 h-3.5" /> Open in Google Maps
                  </a>
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <a
                  href={`tel:${alert.parentPhone}`}
                  className="flex-1 bg-[#185FA5] hover:bg-[#145090] text-white text-xs font-bold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" /> Call Parent
                </a>
                {alert.facilityName && (
                  <a
                    href={`tel:${alert.facilityName}`}
                    className="flex-1 bg-[#0F6E56] hover:bg-[#0d5844] text-white text-xs font-bold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Building2 className="w-3.5 h-3.5" /> Call Facility
                  </a>
                )}
                {!alert.responded && (
                  <button
                    onClick={() => handleResolve(alert.id)}
                    className="flex-1 bg-[#27500A] hover:bg-[#1e3d08] text-white text-xs font-bold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Mark Resolved
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterButton({ active, onClick, label, red, green }: { active: boolean; onClick: () => void; label: string; red?: boolean; green?: boolean }) {
  const activeClass = red ? 'bg-[#A32D2D] text-white' : green ? 'bg-[#27500A] text-white' : 'bg-[#0F6E56] text-white';
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
        active ? activeClass : 'bg-white border border-[#E5E3DC] text-[#5F5E5A] hover:border-[#0F6E56]'
      }`}
    >
      {label}
    </button>
  );
}
