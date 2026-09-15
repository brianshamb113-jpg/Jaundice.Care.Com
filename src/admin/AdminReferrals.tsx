import React, { useState, useMemo } from 'react';
import { Download } from 'lucide-react';
import { getRecords, getReferrals, getStatusBadge, exportCSV } from './types';

export default function AdminReferrals() {
  const records = getRecords();
  const referrals = getReferrals();
  const [filter, setFilter] = useState<'All' | 'Monitor' | 'Refer Urgently'>('All');

  const enriched = useMemo(() => {
    return referrals.map(ref => {
      const linked = records.find(r => r.id === ref.screeningId);
      return { ...ref, linked };
    });
  }, [referrals, records]);

  const filtered = useMemo(() => {
    if (filter === 'All') return enriched;
    return enriched.filter(r => r.linked?.status === filter);
  }, [enriched, filter]);

  const sorted = [...filtered].sort((a, b) => b.referralDate - a.referralDate);

  const handleExport = () => {
    const headers = ['Ref ID', 'Baby ID', 'Mother', 'Bilirubin', 'Status', 'From Ward', 'Referred To', 'Date'];
    const rows = sorted.map(r => [
      r.id,
      r.linked?.babyId ?? '—',
      r.linked?.motherName ?? '—',
      r.linked?.bilirubin ?? '—',
      r.linked?.status ?? '—',
      r.linked?.ward ?? '—',
      r.referredTo,
      new Date(r.referralDate).toLocaleString()
    ]);
    exportCSV(headers, rows, `referrals-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const chips: Array<'All' | 'Monitor' | 'Refer Urgently'> = ['All', 'Monitor', 'Refer Urgently'];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex gap-2 flex-wrap flex-1">
          {chips.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                filter === f
                  ? 'bg-[#0F6E56] text-white'
                  : 'bg-white border border-[#E5E3DC] text-[#5F5E5A] hover:border-[#0F6E56] hover:text-[#0F6E56]'
              }`}
            >
              {f}
            </button>
          ))}
          <span className="text-xs text-[#5F5E5A] self-center ml-2">{sorted.length} referrals</span>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0F6E56] hover:bg-[#0d5844] text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap"
        >
          <Download size={15} />
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[#E5E3DC] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F7F6F2] border-b border-[#E5E3DC]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#5F5E5A] whitespace-nowrap">Ref ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#5F5E5A] whitespace-nowrap">Baby ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#5F5E5A] whitespace-nowrap">Mother</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#5F5E5A] whitespace-nowrap">Bilirubin</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#5F5E5A] whitespace-nowrap">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#5F5E5A] whitespace-nowrap">From</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#5F5E5A] whitespace-nowrap">Referred To</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#5F5E5A] whitespace-nowrap">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EFE9]">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#5F5E5A] text-sm">No referrals found</td>
                </tr>
              ) : (
                sorted.map(ref => {
                  const status = ref.linked?.status;
                  const rowBg = status === 'Refer Urgently' ? 'bg-[#FAECE7]/30' :
                    status === 'Monitor' ? 'bg-[#FAEEDA]/30' : '';
                  return (
                    <tr key={ref.id} className={`hover:brightness-95 transition-all ${rowBg}`}>
                      <td className="px-4 py-3 font-mono text-xs text-[#5F5E5A] whitespace-nowrap">
                        {ref.id.slice(-8)}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#1A1A1A] whitespace-nowrap">
                        {ref.linked?.babyId ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-[#1A1A1A] max-w-32 truncate">
                        {ref.linked?.motherName ?? '—'}
                      </td>
                      <td className={`px-4 py-3 font-semibold whitespace-nowrap ${
                        status ? (status === 'Normal' ? 'text-[#27500A]' : status === 'Monitor' ? 'text-[#BA7517]' : 'text-[#A32D2D]') : 'text-[#5F5E5A]'
                      }`}>
                        {ref.linked ? `${ref.linked.bilirubin} mg/dL` : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {status ? (
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${getStatusBadge(status)}`}>
                            {status}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-[#5F5E5A] max-w-28 truncate">
                        {ref.linked?.ward ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-[#5F5E5A] max-w-28 truncate">
                        {ref.referredTo || '—'}
                      </td>
                      <td className="px-4 py-3 text-[#5F5E5A] whitespace-nowrap text-xs">
                        {new Date(ref.referralDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
