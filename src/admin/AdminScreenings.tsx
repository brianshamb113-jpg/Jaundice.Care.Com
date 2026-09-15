import React, { useState, useMemo } from 'react';
import { Search, Download } from 'lucide-react';
import { getRecords, getStatusBadge, getBiliClass, exportCSV } from './types';

const PAGE_SIZE = 15;

export default function AdminScreenings() {
  const records = getRecords();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'All' | 'Normal' | 'Monitor' | 'Refer Urgently'>('All');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return records
      .filter(r => filter === 'All' || r.status === filter)
      .filter(r =>
        r.babyId.toLowerCase().includes(search.toLowerCase()) ||
        r.motherName.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [records, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleExport = () => {
    const headers = ['Baby ID', 'Mother Name', 'Age (hrs)', 'Birth Weight (g)', 'Gestational Age', 'Bilirubin (mg/dL)', 'Status', 'Ward', 'Worker', 'Notes', 'Date'];
    const rows = records.map(r => [
      r.babyId, r.motherName, r.ageHours, r.birthWeight, r.gestationalAge,
      r.bilirubin, r.status, r.ward, r.workerName, r.notes,
      new Date(r.timestamp).toLocaleString()
    ]);
    exportCSV(headers, rows, `screenings-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const filterChips: Array<'All' | 'Normal' | 'Monitor' | 'Refer Urgently'> = ['All', 'Normal', 'Monitor', 'Refer Urgently'];

  return (
    <div className="space-y-4">
      {/* Search + export */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5F5E5A]" />
          <input
            type="text"
            placeholder="Search by Baby ID or mother name..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 border border-[#E5E3DC] rounded-xl text-sm text-[#1A1A1A] focus:outline-none focus:border-[#0F6E56] bg-white"
          />
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0F6E56] hover:bg-[#0d5844] text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Download size={15} />
          Export CSV
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {filterChips.map(f => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              filter === f
                ? 'bg-[#0F6E56] text-white'
                : 'bg-white border border-[#E5E3DC] text-[#5F5E5A] hover:border-[#0F6E56] hover:text-[#0F6E56]'
            }`}
          >
            {f}
          </button>
        ))}
        <span className="ml-auto text-xs text-[#5F5E5A] self-center">
          {filtered.length} records
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E5E3DC] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F7F6F2] border-b border-[#E5E3DC]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#5F5E5A] whitespace-nowrap">Baby ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#5F5E5A] whitespace-nowrap">Mother</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#5F5E5A] whitespace-nowrap">Age (hrs)</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#5F5E5A] whitespace-nowrap">Bilirubin</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#5F5E5A] whitespace-nowrap">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#5F5E5A] whitespace-nowrap">Ward</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#5F5E5A] whitespace-nowrap">Worker</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[#5F5E5A] whitespace-nowrap">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EFE9]">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#5F5E5A] text-sm">
                    No records found
                  </td>
                </tr>
              ) : (
                paginated.map(r => (
                  <tr key={r.id} className="hover:bg-[#F7F6F2] transition-colors">
                    <td className="px-4 py-3 font-medium text-[#1A1A1A] whitespace-nowrap">{r.babyId}</td>
                    <td className="px-4 py-3 text-[#1A1A1A] max-w-32 truncate">{r.motherName}</td>
                    <td className="px-4 py-3 text-[#5F5E5A] whitespace-nowrap">{r.ageHours}</td>
                    <td className={`px-4 py-3 font-semibold whitespace-nowrap ${getBiliClass(r.status)}`}>
                      {r.bilirubin} mg/dL
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${getStatusBadge(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#5F5E5A] max-w-28 truncate">{r.ward}</td>
                    <td className="px-4 py-3 text-[#5F5E5A] max-w-28 truncate">{r.workerName}</td>
                    <td className="px-4 py-3 text-[#5F5E5A] whitespace-nowrap text-xs">
                      {new Date(r.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#E5E3DC] bg-[#F7F6F2]">
            <p className="text-xs text-[#5F5E5A]">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs font-medium border border-[#E5E3DC] rounded-lg disabled:opacity-40 hover:border-[#0F6E56] hover:text-[#0F6E56] transition-colors bg-white"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs font-medium border border-[#E5E3DC] rounded-lg disabled:opacity-40 hover:border-[#0F6E56] hover:text-[#0F6E56] transition-colors bg-white"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
