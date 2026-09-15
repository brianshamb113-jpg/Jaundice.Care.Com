import React, { useState, useEffect } from 'react';
import {
  Home, AlertCircle, Users, Settings as SettingsIcon,
  Phone, MapPin, Clock, CheckCircle, Activity,
  Building2, ArrowRight, LogOut, Navigation,
} from 'lucide-react';
import {
  getCurrentUser, getJcAlerts, markAlertResponded, getFacilityPatients,
  type JcAlert, type JcUser, type CurrentUser,
} from '../lib/user';
import LocationMap from '../components/LocationMap';

const SUPPORT_PHONE = '+255 678419202';

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

type FacilityTab = 'home' | 'alerts' | 'patients' | 'profile';

export default function FacilityDashboard({ onSignOut }: { onSignOut: () => void }) {
  const [tab, setTab] = useState<FacilityTab>('home');
  const [alerts, setAlerts] = useState<JcAlert[]>([]);
  const [patients, setPatients] = useState<JcUser[]>([]);
  const currentUser = getCurrentUser();

  const facilityName = currentUser?.facilityName || currentUser?.facility || 'Facility';

  const refresh = () => {
    setAlerts(getJcAlerts().filter(a => a.facilityName === facilityName));
    setPatients(getFacilityPatients(facilityName));
  };

  useEffect(() => {
    refresh();
  }, []);

  const activeAlerts = alerts.filter(a => !a.responded);
  const resolvedAlerts = alerts.filter(a => a.responded);

  const handleRespond = (alertId: string) => {
    markAlertResponded(alertId);
    refresh();
  };

  return (
    <div className="h-screen bg-[#F7F6F2] flex flex-col max-w-2xl mx-auto relative">
      <div className="flex-1 overflow-y-auto pb-20">
        {tab === 'home' && (
          <FacilityHome
            facilityName={facilityName}
            alerts={activeAlerts}
            resolvedCount={resolvedAlerts.length}
            patients={patients}
            onGoAlerts={() => setTab('alerts')}
            onGoPatients={() => setTab('patients')}
          />
        )}
        {tab === 'alerts' && (
          <AlertsPanel alerts={alerts} onRespond={handleRespond} />
        )}
        {tab === 'patients' && (
          <PatientsPanel patients={patients} />
        )}
        {tab === 'profile' && (
          <FacilityProfile currentUser={currentUser} onSignOut={onSignOut} />
        )}
      </div>

      <FacilityBottomNav tab={tab} onNavigate={setTab} alertCount={activeAlerts.length} />
    </div>
  );
}

function FacilityHome({
  facilityName, alerts, resolvedCount, patients,
  onGoAlerts, onGoPatients,
}: {
  facilityName: string;
  alerts: JcAlert[];
  resolvedCount: number;
  patients: JcUser[];
  onGoAlerts: () => void;
  onGoPatients: () => void;
}) {
  return (
    <div>
      {/* Header */}
      <div className="bg-[#0A4D3D] text-white px-6 pt-8 pb-6 rounded-b-3xl shadow-lg">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{facilityName}</h1>
            <p className="text-sm text-[#F5A623] font-semibold mt-0.5">Health Facility Portal</p>
          </div>
          <div className="flex items-center gap-1.5 bg-[#27500A] px-3 py-1.5 rounded-full flex-shrink-0">
            <span className="w-2 h-2 bg-[#4ADE80] rounded-full animate-pulse" />
            <span className="text-xs font-semibold">Live</span>
          </div>
        </div>
        <p className="text-xs text-white/60 mt-3 flex items-center gap-1.5">
          <Phone className="w-3 h-3" /> Support: {SUPPORT_PHONE}
        </p>
      </div>

      <div className="p-4 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Alerts Today"
            value={alerts.length}
            color="red"
            icon={<AlertCircle className="w-5 h-5" />}
          />
          <StatCard
            label="Patients Nearby"
            value={patients.length}
            color="blue"
            icon={<Users className="w-5 h-5" />}
          />
          <StatCard
            label="Total Cases"
            value={alerts.length + resolvedCount}
            color="teal"
            icon={<Activity className="w-5 h-5" />}
          />
          <StatCard
            label="Resolved"
            value={resolvedCount}
            color="green"
            icon={<CheckCircle className="w-5 h-5" />}
          />
        </div>

        {/* Active Alerts Preview */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-[#1A1A1A] text-sm">Active Alerts</h2>
            {alerts.length > 0 && (
              <button onClick={onGoAlerts} className="text-xs font-semibold text-[#0F6E56] flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
          {alerts.length === 0 ? (
            <div className="bg-[#E1F5EE] rounded-xl p-6 text-center">
              <CheckCircle className="w-8 h-8 text-[#0F6E56] mx-auto mb-2" />
              <p className="text-sm text-[#5F5E5A]">No active alerts. All clear.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.slice(0, 3).map(alert => (
                <AlertCard key={alert.id} alert={alert} onRespond={() => {}} compact />
              ))}
            </div>
          )}
        </div>

        {/* Registered Patients Preview */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-[#1A1A1A] text-sm">Registered Patients</h2>
            {patients.length > 0 && (
              <button onClick={onGoPatients} className="text-xs font-semibold text-[#0F6E56] flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
          {patients.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-6 text-center">
              <Users className="w-8 h-8 text-[#5F5E5A] mx-auto mb-2" />
              <p className="text-sm text-[#5F5E5A]">No registered patients yet</p>
            </div>
          ) : (
            <div className="bg-white border border-[#E5E3DC] rounded-xl divide-y divide-[#F0EFE9]">
              {patients.slice(0, 4).map(p => (
                <PatientRow key={p.id} patient={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label, value, color, icon,
}: {
  label: string;
  value: number;
  color: 'red' | 'blue' | 'teal' | 'green';
  icon: React.ReactNode;
}) {
  const styles = {
    red: 'bg-[#FAECE7] text-[#A32D2D]',
    blue: 'bg-[#E8F1FA] text-[#185FA5]',
    teal: 'bg-[#E1F5EE] text-[#0F6E56]',
    green: 'bg-[#EAF3DE] text-[#27500A]',
  };
  return (
    <div className={`${styles[color]} rounded-2xl p-4`}>
      <div className="flex items-center justify-between mb-2">
        {icon}
      </div>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-xs font-semibold mt-1 opacity-80">{label}</p>
    </div>
  );
}

function AlertCard({ alert, onRespond, compact }: { alert: JcAlert; onRespond: () => void; compact?: boolean }) {
  const [localResponded, setLocalResponded] = useState(alert.responded);
  const [showMap, setShowMap] = useState(false);

  const handleRespond = () => {
    setLocalResponded(true);
    onRespond();
  };

  const hasGPS = alert.latitude != null && alert.longitude != null;

  if (localResponded) {
    return (
      <div className="bg-[#EAF3DE] border border-[#27500A]/20 rounded-xl p-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-[#27500A]" />
          <span className="text-sm font-semibold text-[#27500A]">Responded</span>
          <span className="text-xs text-[#5F5E5A] ml-auto">{timeAgo(alert.createdAt)}</span>
        </div>
        <p className="text-xs text-[#5F5E5A] mt-1">{alert.babyId} · {alert.parentName}</p>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-[#A32D2D]/30 rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-bold text-[#1A1A1A] text-sm">{alert.babyId}</p>
          <p className="text-2xl font-bold text-[#A32D2D] mt-1">{alert.bilirubin}<span className="text-xs font-normal ml-1">mg/dL</span></p>
        </div>
        <span className="text-[10px] font-bold bg-[#A32D2D] text-white px-2 py-1 rounded-full">URGENT</span>
      </div>

      <a href={`tel:${alert.parentPhone}`} className="flex items-center gap-1.5 text-sm text-[#185FA5] font-semibold hover:underline">
        <Phone className="w-3.5 h-3.5" />
        {alert.parentName} · {alert.parentPhone}
      </a>

      <div className="flex items-center gap-1.5 text-xs text-[#5F5E5A] mt-2">
        <MapPin className="w-3 h-3" />
        {alert.location}
      </div>

      <div className="flex items-center gap-1.5 text-xs text-[#5F5E5A] mt-1">
        <Clock className="w-3 h-3" />
        {timeAgo(alert.createdAt)}
      </div>

      {!compact && (
        <>
          {hasGPS && (
            <div className="mt-3">
              <button
                onClick={() => setShowMap(!showMap)}
                className="w-full bg-[#E8F1FA] text-[#185FA5] text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1.5 mb-2"
              >
                <MapPin className="w-3.5 h-3.5" />
                {showMap ? 'Hide Map' : 'Show Baby Location on Map'}
              </button>
              {showMap && (
                <div className="space-y-2">
                  <LocationMap
                    latitude={alert.latitude!}
                    longitude={alert.longitude!}
                    accuracy={alert.accuracy || undefined}
                    label={`Baby ${alert.babyId}`}
                    height={220}
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
            </div>
          )}
          <div className="flex gap-2 mt-3">
            <a
              href={`tel:${alert.parentPhone}`}
              className="flex-1 bg-[#185FA5] hover:bg-[#145090] text-white text-xs font-bold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" /> Call Parent
            </a>
            <button
              onClick={handleRespond}
              className="flex-1 bg-[#27500A] hover:bg-[#1e3d08] text-white text-xs font-bold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Mark Responded
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function PatientRow({ patient }: { patient: JcUser }) {
  const records = (() => {
    try {
      const raw = localStorage.getItem('jaundiceCare_records');
      const all = raw ? JSON.parse(raw) : [];
      return all.filter((r: { workerName: string }) => r.workerName === patient.fullName);
    } catch {
      return [];
    }
  })();

  const lastScan = records.length > 0 ? new Date(records[records.length - 1].timestamp) : null;

  return (
    <div className="flex items-center gap-3 p-3">
      <div className="w-9 h-9 bg-[#E1F5EE] rounded-full flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-bold text-[#0F6E56]">
          {patient.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#1A1A1A] truncate">{patient.fullName}</p>
        <div className="flex items-center gap-2 text-xs text-[#5F5E5A]">
          <a href={`tel:${patient.phone}`} className="hover:text-[#185FA5]">{patient.phone}</a>
          {patient.district && <span>· {patient.district}</span>}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-[10px] text-[#5F5E5A]">Last scan</p>
        <p className="text-xs font-semibold text-[#1A1A1A]">
          {lastScan ? lastScan.toLocaleDateString() : 'No scans'}
        </p>
      </div>
    </div>
  );
}

function AlertsPanel({ alerts, onRespond }: { alerts: JcAlert[]; onRespond: (id: string) => void }) {
  const active = alerts.filter(a => !a.responded);
  const resolved = alerts.filter(a => a.responded);

  return (
    <div>
      <div className="bg-[#0A4D3D] text-white px-6 pt-8 pb-6 rounded-b-3xl shadow-lg">
        <h1 className="text-xl font-bold">Alerts</h1>
        <p className="text-sm text-white/70 mt-0.5">{active.length} active · {resolved.length} resolved</p>
      </div>

      <div className="p-4 space-y-4">
        {active.length > 0 && (
          <div>
            <h2 className="font-bold text-[#A32D2D] text-sm mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-[#A32D2D] rounded-full animate-pulse" /> Active Alerts
            </h2>
            <div className="space-y-2">
              {active.map(alert => (
                <AlertCard key={alert.id} alert={alert} onRespond={() => onRespond(alert.id)} />
              ))}
            </div>
          </div>
        )}

        {resolved.length > 0 && (
          <div>
            <h2 className="font-bold text-[#27500A] text-sm mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Resolved
            </h2>
            <div className="space-y-2">
              {resolved.map(alert => (
                <AlertCard key={alert.id} alert={alert} onRespond={() => {}} />
              ))}
            </div>
          </div>
        )}

        {alerts.length === 0 && (
          <div className="bg-[#E1F5EE] rounded-xl p-8 text-center">
            <CheckCircle className="w-12 h-12 text-[#0F6E56] mx-auto mb-3" />
            <p className="font-semibold text-[#1A1A1A]">No alerts yet</p>
            <p className="text-sm text-[#5F5E5A] mt-1">Critical screening results from parents will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PatientsPanel({ patients }: { patients: JcUser[] }) {
  const [search, setSearch] = useState('');
  const filtered = patients.filter(p =>
    p.fullName.toLowerCase().includes(search.toLowerCase()) ||
    p.phone.includes(search)
  );

  return (
    <div>
      <div className="bg-[#0A4D3D] text-white px-6 pt-8 pb-6 rounded-b-3xl shadow-lg">
        <h1 className="text-xl font-bold">Registered Patients</h1>
        <p className="text-sm text-white/70 mt-0.5">{patients.length} parent{patients.length !== 1 ? 's' : ''} registered to your facility</p>
      </div>

      <div className="p-4 space-y-4">
        {patients.length > 0 && (
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 border border-[#E5E3DC] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E1F5EE]"
          />
        )}

        {filtered.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-8 text-center">
            <Users className="w-12 h-12 text-[#5F5E5A] mx-auto mb-3" />
            <p className="font-semibold text-[#1A1A1A]">No patients found</p>
            <p className="text-sm text-[#5F5E5A] mt-1">
              {patients.length === 0
                ? 'Parents who register with your facility as nearest will appear here.'
                : 'No matches for your search.'}
            </p>
          </div>
        ) : (
          <div className="bg-white border border-[#E5E3DC] rounded-xl divide-y divide-[#F0EFE9]">
            {filtered.map(p => (
              <PatientRow key={p.id} patient={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FacilityProfile({ currentUser, onSignOut }: { currentUser: CurrentUser | null; onSignOut: () => void }) {
  const facility = currentUser;
  return (
    <div>
      <div className="bg-[#0A4D3D] text-white px-6 pt-8 pb-6 rounded-b-3xl shadow-lg">
        <h1 className="text-xl font-bold">Facility Profile</h1>
        <p className="text-sm text-white/70 mt-0.5">Account and facility information</p>
      </div>

      <div className="p-4 space-y-6">
        {/* Facility Card */}
        <div className="bg-white border border-[#E5E3DC] rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[#185FA5] rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-[#1A1A1A]">{facility?.facilityName || 'Facility'}</p>
              <p className="text-xs text-[#5F5E5A]">{facility?.facilityType || 'Health Facility'}</p>
            </div>
          </div>

          <div className="space-y-2.5 text-sm">
            <InfoRow label="Region" value={facility?.region || '—'} />
            <InfoRow label="District" value={facility?.district || '—'} />
            <InfoRow label="In-charge" value={facility?.fullName || '—'} />
            <InfoRow label="Phone" value={facility?.phone || '—'} />
          </div>
        </div>

        {/* Support */}
        <div className="bg-[#E8F1FA] border border-[#185FA5]/20 rounded-xl p-4">
          <p className="text-xs text-[#5F5E5A] mb-1">Need help? Contact support:</p>
          <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, '')}`} className="text-sm font-bold text-[#185FA5] flex items-center gap-1.5">
            <Phone className="w-4 h-4" /> {SUPPORT_PHONE}
          </a>
        </div>

        {/* About */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-bold text-[#1A1A1A] text-sm mb-2">About</h3>
          <div className="text-xs text-[#1A1A1A] space-y-1">
            <p><strong>Version:</strong> v1.0.0</p>
            <p><strong>Project:</strong> JaundiceCARE Tanzania</p>
            <p className="text-amber-900 mt-2">This app does not replace clinical diagnosis. Always confirm results with laboratory testing.</p>
          </div>
        </div>

        {/* Sign Out */}
        <button
          onClick={onSignOut}
          className="w-full flex items-center justify-center gap-2 bg-[#A32D2D] hover:bg-red-700 text-white font-bold py-3.5 px-4 rounded-xl transition-colors"
        >
          <LogOut className="w-5 h-5" /> Sign Out
        </button>
        <p className="text-xs text-[#5F5E5A] text-center">You will be returned to the login screen</p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-[#F0EFE9] last:border-0">
      <span className="text-[#5F5E5A]">{label}</span>
      <span className="font-medium text-[#1A1A1A] text-right max-w-48">{value}</span>
    </div>
  );
}

function FacilityBottomNav({
  tab, onNavigate, alertCount,
}: {
  tab: FacilityTab;
  onNavigate: (tab: FacilityTab) => void;
  alertCount: number;
}) {
  const items = [
    { id: 'home' as const, label: 'Home', icon: Home },
    { id: 'alerts' as const, label: 'Alerts', icon: AlertCircle },
    { id: 'patients' as const, label: 'Patients', icon: Users },
    { id: 'profile' as const, label: 'Profile', icon: SettingsIcon },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2 flex justify-around items-center max-w-2xl mx-auto w-full">
      {items.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onNavigate(id)}
          className={`relative flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors min-h-16 ${
            tab === id ? 'text-[#0F6E56] bg-[#E1F5EE]' : 'text-[#5F5E5A] hover:text-[#0F6E56]'
          }`}
        >
          <Icon className="w-5 h-5 mb-1" />
          <span className="text-xs font-semibold">{label}</span>
          {id === 'alerts' && alertCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-[#A32D2D] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {alertCount}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}
