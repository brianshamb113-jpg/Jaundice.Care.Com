import { useState } from 'react';
import { Phone, MessageCircle, Users, MapPin, Building2 } from 'lucide-react';
import { getJcUsers, normalizePhone, type JcUser } from '../lib/user';

const ADMIN_PHONE = '+255 678419202';

export default function AdminParents() {
  const [search, setSearch] = useState('');
  const parents = getJcUsers().filter(u => u.userType === 'parent');

  const filtered = parents.filter(p => {
    const q = search.toLowerCase();
    return (
      p.fullName.toLowerCase().includes(q) ||
      p.phone.includes(search) ||
      (p.region && p.region.toLowerCase().includes(q)) ||
      (p.facility && p.facility.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Admin contact line */}
      <div className="bg-[#E8F1FA] border border-[#185FA5]/20 rounded-xl px-5 py-3 flex items-center gap-2">
        <Phone className="w-4 h-4 text-[#185FA5]" />
        <span className="text-sm text-[#5F5E5A]">Admin line:</span>
        <a href={`tel:${ADMIN_PHONE.replace(/\s/g, '')}`} className="text-sm font-bold text-[#185FA5]">
          {ADMIN_PHONE}
        </a>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search by name, phone, region, or facility..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full px-4 py-3 border border-[#E5E3DC] rounded-xl text-sm focus:outline-none focus:border-[#0F6E56] bg-white"
      />

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E5E3DC] p-12 text-center shadow-sm">
          <Users className="w-12 h-12 text-[#5F5E5A] mx-auto mb-3" />
          <p className="font-semibold text-[#1A1A1A]">No parents found</p>
          <p className="text-sm text-[#5F5E5A] mt-1">
            {parents.length === 0
              ? 'Parents who register through the app will appear here.'
              : 'No matches for your search.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E5E3DC] shadow-sm overflow-hidden">
          {/* Desktop table header */}
          <div className="hidden md:grid grid-cols-[1.5fr_1fr_1fr_1.5fr_1fr_1fr] gap-3 px-5 py-3 border-b border-[#E5E3DC] bg-[#F7F6F2]">
            <span className="text-xs font-bold text-[#5F5E5A] uppercase tracking-wide">Name</span>
            <span className="text-xs font-bold text-[#5F5E5A] uppercase tracking-wide">Phone</span>
            <span className="text-xs font-bold text-[#5F5E5A] uppercase tracking-wide">Region</span>
            <span className="text-xs font-bold text-[#5F5E5A] uppercase tracking-wide">Nearest Facility</span>
            <span className="text-xs font-bold text-[#5F5E5A] uppercase tracking-wide">Registered</span>
            <span className="text-xs font-bold text-[#5F5E5A] uppercase tracking-wide">Actions</span>
          </div>

          <div className="divide-y divide-[#F0EFE9]">
            {filtered.map(p => (
              <div key={p.id} className="md:grid md:grid-cols-[1.5fr_1fr_1fr_1.5fr_1fr_1fr] md:gap-3 md:items-center px-5 py-4 hover:bg-[#F7F6F2] transition-colors">
                {/* Name */}
                <div className="mb-2 md:mb-0">
                  <p className="font-semibold text-sm text-[#1A1A1A]">{p.fullName}</p>
                  {p.district && (
                    <p className="text-xs text-[#5F5E5A] flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {p.district}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <a href={`tel:${p.phone}`} className="text-sm text-[#185FA5] hover:underline block mb-2 md:mb-0">
                  {p.phone}
                </a>

                {/* Region */}
                <p className="text-sm text-[#1A1A1A] mb-2 md:mb-0">{p.region}</p>

                {/* Nearest Facility */}
                <div className="mb-2 md:mb-0">
                  <p className="text-sm text-[#1A1A1A] flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#5F5E5A]" />
                    {p.facility || '—'}
                  </p>
                </div>

                {/* Registered date */}
                <p className="text-xs text-[#5F5E5A] mb-2 md:mb-0">
                  {new Date(p.createdAt).toLocaleDateString('en-GB')}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  <a
                    href={`tel:${p.phone}`}
                    className="w-8 h-8 rounded-lg bg-[#E8F1FA] text-[#185FA5] flex items-center justify-center hover:bg-[#d0ebf9] transition-colors"
                    title="Call parent"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                  <a
                    href={`https://wa.me/${normalizePhone(p.phone)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-lg bg-[#EAF3DE] text-[#27500A] flex items-center justify-center hover:bg-[#d8ecc7] transition-colors"
                    title="WhatsApp parent"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
