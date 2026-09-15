import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Users, Activity, FileText, AlertTriangle, Bell, Phone, CheckCircle, Building2 } from 'lucide-react';
import { getRecords, getReferrals, getStatusBadge } from './types';
import { getJcUsers, getJcFacilities, getJcAlerts, markAlertResponded } from '../lib/user';

const PIE_COLORS = ['#27500A', '#BA7517', '#A32D2D'];

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E3DC] p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[#5F5E5A] font-medium mb-1">{label}</p>
          <p className="text-3xl font-bold text-[#1A1A1A]">{value}</p>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + '22' }}>
          <Icon size={20} style={{ color }} />
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const records = getRecords();
  const referrals = getReferrals();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const stats = useMemo(() => {
    const uniqueChildren = new Set(records.map(r => r.babyId)).size;
    const screeningsToday = records.filter(r => {
      const d = new Date(r.timestamp);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    }).length;
    const criticalCases = records.filter(r => r.bilirubin >= 17).length;
    return { uniqueChildren, screeningsToday, criticalCases };
  }, [records]);

  const barData = useMemo(() => {
    const days: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const label = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' });
      const count = records.filter(r => {
        const rd = new Date(r.timestamp);
        rd.setHours(0, 0, 0, 0);
        return rd.getTime() === d.getTime();
      }).length;
      days.push({ date: label, count });
    }
    return days;
  }, [records]);

  const pieData = useMemo(() => {
    const normal = records.filter(r => r.status === 'Normal').length;
    const monitor = records.filter(r => r.status === 'Monitor').length;
    const refer = records.filter(r => r.status === 'Refer Urgently').length;
    return [
      { name: 'Normal', value: normal },
      { name: 'Monitor', value: monitor },
      { name: 'Refer Urgently', value: refer },
    ].filter(d => d.value > 0);
  }, [records]);

  const recentScreenings = [...records].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  const recentReferrals = [...referrals].sort((a, b) => b.referralDate - a.referralDate).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Children" value={stats.uniqueChildren} icon={Users} color="#0F6E56" />
        <StatCard label="Screenings Today" value={stats.screeningsToday} icon={Activity} color="#185FA5" />
        <StatCard label="Total Referrals" value={referrals.length} icon={FileText} color="#BA7517" />
        <StatCard label="Critical Cases" value={stats.criticalCases} icon={AlertTriangle} color="#A32D2D" />
      </div>

      {/* New system stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Registered Parents" value={getJcUsers().filter(u => u.userType === 'parent').length} icon={Users} color="#0F6E56" />
        <StatCard label="Registered Facilities" value={getJcFacilities().length} icon={Building2} color="#185FA5" />
        <StatCard label="Active Alerts" value={getJcAlerts().filter(a => !a.responded).length} icon={Bell} color="#A32D2D" />
        <StatCard label="Total Screenings" value={records.length} icon={Activity} color="#BA7517" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar chart */}
        <div className="bg-white rounded-xl border border-[#E5E3DC] p-5 shadow-sm">
          <h2 className="font-semibold text-[#1A1A1A] mb-4 text-sm">Screenings — Last 7 Days</h2>
          {records.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-[#5F5E5A] text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0EFE9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#5F5E5A' }} />
                <YAxis tick={{ fontSize: 10, fill: '#5F5E5A' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #E5E3DC', fontSize: 12 }}
                />
                <Bar dataKey="count" name="Screenings" fill="#0F6E56" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie chart */}
        <div className="bg-white rounded-xl border border-[#E5E3DC] p-5 shadow-sm">
          <h2 className="font-semibold text-[#1A1A1A] mb-4 text-sm">Status Distribution</h2>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-[#5F5E5A] text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #E5E3DC', fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent screenings */}
        <div className="bg-white rounded-xl border border-[#E5E3DC] shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E3DC]">
            <h2 className="font-semibold text-[#1A1A1A] text-sm">Recent Screenings</h2>
            <button
              onClick={() => navigate('/admin/screenings')}
              className="text-xs text-[#0F6E56] hover:underline font-medium"
            >
              View all
            </button>
          </div>
          {recentScreenings.length === 0 ? (
            <div className="p-5 text-center text-sm text-[#5F5E5A]">No screenings yet</div>
          ) : (
            <div className="divide-y divide-[#F0EFE9]">
              {recentScreenings.map(r => (
                <div key={r.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="font-medium text-sm text-[#1A1A1A]">{r.babyId}</p>
                    <p className="text-xs text-[#5F5E5A]">{r.motherName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-sm ${
                      r.status === 'Normal' ? 'text-[#27500A]' :
                      r.status === 'Monitor' ? 'text-[#BA7517]' : 'text-[#A32D2D]'
                    }`}>
                      {r.bilirubin} mg/dL
                    </span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${getStatusBadge(r.status)}`}>
                      {r.status === 'Normal' ? 'Normal' : r.status === 'Monitor' ? 'Monitor' : 'Refer'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent referrals */}
        <div className="bg-white rounded-xl border border-[#E5E3DC] shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E3DC]">
            <h2 className="font-semibold text-[#1A1A1A] text-sm">Recent Referrals</h2>
            <button
              onClick={() => navigate('/admin/referrals')}
              className="text-xs text-[#0F6E56] hover:underline font-medium"
            >
              View all
            </button>
          </div>
          {recentReferrals.length === 0 ? (
            <div className="p-5 text-center text-sm text-[#5F5E5A]">No referrals yet</div>
          ) : (
            <div className="divide-y divide-[#F0EFE9]">
              {recentReferrals.map(ref => {
                const linked = records.find(r => r.id === ref.screeningId);
                return (
                  <div key={ref.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="font-medium text-sm text-[#1A1A1A]">
                        {linked?.babyId ?? '—'}
                      </p>
                      <p className="text-xs text-[#5F5E5A]">{ref.referredTo || 'Unknown facility'}</p>
                    </div>
                    <p className="text-xs text-[#5F5E5A]">
                      {new Date(ref.referralDate).toLocaleDateString()}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Active Alerts Panel (Upgrade 4 Part F) */}
      <ActiveAlertsPanel />
    </div>
  );
}

function ActiveAlertsPanel() {
  const [alerts, setAlerts] = useState(getJcAlerts());
  const activeAlerts = alerts.filter(a => !a.responded);

  const handleResolve = (id: string) => {
    markAlertResponded(id);
    setAlerts(getJcAlerts());
  };

  return (
    <div className="bg-white rounded-xl border border-[#E5E3DC] shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E3DC]">
        <h2 className="font-semibold text-[#1A1A1A] text-sm flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#A32D2D]" />
          Active Alerts
        </h2>
        {activeAlerts.length > 0 && (
          <span className="text-[11px] font-bold bg-[#A32D2D] text-white px-2 py-0.5 rounded-full">
            {activeAlerts.length} Active
          </span>
        )}
      </div>
      {activeAlerts.length === 0 ? (
        <div className="p-5 text-center text-sm text-[#27500A] flex items-center justify-center gap-2">
          <CheckCircle className="w-4 h-4" />
          No active alerts
        </div>
      ) : (
        <div className="divide-y divide-[#F0EFE9]">
          {activeAlerts.map(alert => (
            <div key={alert.id} className="px-5 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-[#0F6E56]">{alert.babyId}</p>
                  <p className="text-sm font-bold text-[#A32D2D]">
                    {alert.bilirubin} mg/dL — CRITICAL
                  </p>
                  <p className="text-xs text-[#5F5E5A] mt-1">
                    {alert.location}
                  </p>
                  <p className="text-xs text-[#5F5E5A]">
                    Facility: {alert.facilityName || 'Unknown'}
                  </p>
                  <p className="text-xs text-[#5F5E5A]">
                    {new Date(alert.createdAt).toLocaleString()}
                  </p>
                  {alert.parentPhone && (
                    <a
                      href={`tel:${alert.parentPhone}`}
                      className="text-xs text-[#185FA5] font-semibold flex items-center gap-1 mt-1"
                    >
                      <Phone className="w-3 h-3" />
                      {alert.parentName} · {alert.parentPhone}
                    </a>
                  )}
                </div>
                <button
                  onClick={() => handleResolve(alert.id)}
                  className="text-xs font-semibold text-white bg-[#27500A] px-3 py-1.5 rounded-lg whitespace-nowrap"
                >
                  Mark Resolved
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
