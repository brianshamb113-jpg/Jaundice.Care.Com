import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { getRecords, getStatusBadge, getBiliClass, ScreeningRecord } from './types';

interface ChildSummary {
  babyId: string;
  motherName: string;
  latestBilirubin: number;
  latestStatus: ScreeningRecord['status'];
  screeningsCount: number;
  latestTimestamp: number;
}

function buildChildren(records: ScreeningRecord[]): ChildSummary[] {
  const map = new Map<string, ScreeningRecord[]>();
  for (const r of records) {
    if (!map.has(r.babyId)) map.set(r.babyId, []);
    map.get(r.babyId)!.push(r);
  }
  const children: ChildSummary[] = [];
  map.forEach((recs, babyId) => {
    const sorted = [...recs].sort((a, b) => b.timestamp - a.timestamp);
    const latest = sorted[0];
    children.push({
      babyId,
      motherName: latest.motherName,
      latestBilirubin: latest.bilirubin,
      latestStatus: latest.status,
      screeningsCount: recs.length,
      latestTimestamp: latest.timestamp,
    });
  });
  return children.sort((a, b) => b.latestTimestamp - a.latestTimestamp);
}

export function ChildStoryPage() {
  const { babyId } = useParams<{ babyId: string }>();
  const navigate = useNavigate();
  const records = getRecords();
  const childRecords = [...records]
    .filter(r => r.babyId === babyId)
    .sort((a, b) => b.timestamp - a.timestamp);

  if (childRecords.length === 0) {
    return (
      <div className="p-6">
        <button onClick={() => navigate('/admin/children')} className="text-[#0F6E56] flex items-center gap-1 mb-4 text-sm font-medium hover:underline">
          <ArrowLeft size={16} /> Back to Children
        </button>
        <p className="text-[#5F5E5A]">No records found for {babyId}.</p>
      </div>
    );
  }

  const maxBili = Math.max(...childRecords.map(r => r.bilirubin));
  const latestStatus = childRecords[0].status;
  const riskLevel = maxBili >= 17 ? 'High' : maxBili >= 12 ? 'Moderate' : 'Low';
  const riskColor = riskLevel === 'High' ? 'text-[#A32D2D] bg-[#FAECE7]' :
    riskLevel === 'Moderate' ? 'text-[#BA7517] bg-[#FAEEDA]' : 'text-[#27500A] bg-[#EAF3DE]';

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/admin/children')}
        className="text-[#0F6E56] flex items-center gap-1 text-sm font-medium hover:underline"
      >
        <ArrowLeft size={16} /> Back to Children
      </button>

      {/* Header */}
      <div className="bg-[#0F6E56] rounded-xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-white/70 uppercase tracking-wide">Baby ID</span>
            <h1 className="text-2xl font-bold mt-0.5">{babyId}</h1>
            <p className="text-white/80 text-sm mt-1">{childRecords[0].motherName}</p>
          </div>
          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full bg-white/20 text-white`}>
            {childRecords.length} screenings
          </span>
        </div>
      </div>

      {/* Summary panel */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-[#E5E3DC] p-4 shadow-sm text-center">
          <p className="text-xs text-[#5F5E5A] font-medium mb-1">Total Screenings</p>
          <p className="text-2xl font-bold text-[#1A1A1A]">{childRecords.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E3DC] p-4 shadow-sm text-center">
          <p className="text-xs text-[#5F5E5A] font-medium mb-1">Highest Bilirubin</p>
          <p className={`text-2xl font-bold ${getBiliClass(latestStatus)}`}>{maxBili}</p>
          <p className="text-xs text-[#5F5E5A]">mg/dL</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E3DC] p-4 shadow-sm text-center">
          <p className="text-xs text-[#5F5E5A] font-medium mb-1">Latest Status</p>
          <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${getStatusBadge(latestStatus)}`}>
            {latestStatus}
          </span>
        </div>
        <div className="bg-white rounded-xl border border-[#E5E3DC] p-4 shadow-sm text-center">
          <p className="text-xs text-[#5F5E5A] font-medium mb-1">Risk Level</p>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${riskColor}`}>{riskLevel}</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-xl border border-[#E5E3DC] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E3DC]">
          <h2 className="font-semibold text-[#1A1A1A] text-sm">Screening Timeline</h2>
        </div>
        <div className="divide-y divide-[#F0EFE9]">
          {childRecords.map((r, idx) => (
            <div key={r.id} className="px-5 py-4 flex gap-4">
              <div className="flex flex-col items-center pt-1">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                  r.status === 'Normal' ? 'bg-[#27500A]' :
                  r.status === 'Monitor' ? 'bg-[#BA7517]' : 'bg-[#A32D2D]'
                }`} />
                {idx < childRecords.length - 1 && (
                  <div className="flex-1 w-px bg-[#E5E3DC] mt-2" />
                )}
              </div>
              <div className="flex-1 pb-2">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-xs text-[#5F5E5A] font-medium">
                      {new Date(r.timestamp).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                      {' '}
                      {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${getStatusBadge(r.status)}`}>
                    {r.status}
                  </span>
                </div>
                <p className={`text-2xl font-bold ${getBiliClass(r.status)}`}>
                  {r.bilirubin} <span className="text-sm font-normal text-[#5F5E5A]">mg/dL</span>
                </p>
                <div className="mt-2 text-xs text-[#5F5E5A] space-y-0.5">
                  <p><span className="font-medium text-[#1A1A1A]">Ward:</span> {r.ward}</p>
                  <p><span className="font-medium text-[#1A1A1A]">Worker:</span> {r.workerName}</p>
                  {r.notes && <p><span className="font-medium text-[#1A1A1A]">Notes:</span> {r.notes}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminChildren() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const records = getRecords();
  const children = useMemo(() => buildChildren(records), [records]);

  const filtered = useMemo(() =>
    children.filter(c =>
      c.babyId.toLowerCase().includes(search.toLowerCase()) ||
      c.motherName.toLowerCase().includes(search.toLowerCase())
    ), [children, search]
  );

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5F5E5A]" />
        <input
          type="text"
          placeholder="Search by Baby ID or mother name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-[#E5E3DC] rounded-xl text-sm text-[#1A1A1A] focus:outline-none focus:border-[#0F6E56] bg-white"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E5E3DC] p-10 text-center text-[#5F5E5A] text-sm">
          {records.length === 0 ? 'No children recorded yet.' : 'No results found.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(child => (
            <div key={child.babyId} className="bg-white rounded-xl border border-[#E5E3DC] shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#E1F5EE] text-[#0F6E56]">
                  {child.babyId}
                </span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${getStatusBadge(child.latestStatus)}`}>
                  {child.latestStatus}
                </span>
              </div>

              <p className="font-semibold text-[#1A1A1A] text-sm mb-1">{child.motherName}</p>

              <div className="flex items-center gap-3 my-3">
                <div>
                  <p className={`text-2xl font-bold ${getBiliClass(child.latestStatus)}`}>
                    {child.latestBilirubin}
                  </p>
                  <p className="text-xs text-[#5F5E5A]">mg/dL latest</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xl font-bold text-[#1A1A1A]">{child.screeningsCount}</p>
                  <p className="text-xs text-[#5F5E5A]">screenings</p>
                </div>
              </div>

              <p className="text-xs text-[#5F5E5A] mb-4">
                Last: {new Date(child.latestTimestamp).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric'
                })}
              </p>

              <button
                onClick={() => navigate(`/admin/children/${encodeURIComponent(child.babyId)}`)}
                className="w-full py-2 rounded-lg border border-[#0F6E56] text-[#0F6E56] text-sm font-semibold hover:bg-[#E1F5EE] transition-colors"
              >
                View Story
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
