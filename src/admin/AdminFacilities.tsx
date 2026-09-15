import { useState } from 'react';
import { Phone, MessageCircle, CheckCircle, Trash2, Building2, MapPin } from 'lucide-react';
import {
  getJcFacilities, deleteJcFacility, verifyJcFacility, normalizePhone,
} from '../lib/user';

const ADMIN_PHONE = '+255 678419202';

export default function AdminFacilities() {
  const [facilities, setFacilities] = useState(getJcFacilities());

  const refresh = () => setFacilities(getJcFacilities());

  const handleDelete = (id: string) => {
    deleteJcFacility(id);
    refresh();
  };

  const handleVerify = (id: string) => {
    verifyJcFacility(id);
    refresh();
  };

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

      {facilities.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E5E3DC] p-12 text-center shadow-sm">
          <Building2 className="w-12 h-12 text-[#5F5E5A] mx-auto mb-3" />
          <p className="font-semibold text-[#1A1A1A]">No facilities registered yet</p>
          <p className="text-sm text-[#5F5E5A] mt-1">
            Health facilities that register through the app will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E5E3DC] shadow-sm overflow-hidden">
          {/* Desktop table header */}
          <div className="hidden md:grid grid-cols-[1.5fr_1fr_1fr_1fr_1.2fr_1.5fr] gap-3 px-5 py-3 border-b border-[#E5E3DC] bg-[#F7F6F2]">
            <span className="text-xs font-bold text-[#5F5E5A] uppercase tracking-wide">Name</span>
            <span className="text-xs font-bold text-[#5F5E5A] uppercase tracking-wide">Type</span>
            <span className="text-xs font-bold text-[#5F5E5A] uppercase tracking-wide">Region</span>
            <span className="text-xs font-bold text-[#5F5E5A] uppercase tracking-wide">District</span>
            <span className="text-xs font-bold text-[#5F5E5A] uppercase tracking-wide">In-charge</span>
            <span className="text-xs font-bold text-[#5F5E5A] uppercase tracking-wide">Actions</span>
          </div>

          <div className="divide-y divide-[#F0EFE9]">
            {facilities.map(fac => (
              <div key={fac.id} className="md:grid md:grid-cols-[1.5fr_1fr_1fr_1fr_1.2fr_1.5fr] md:gap-3 md:items-center px-5 py-4 hover:bg-[#F7F6F2] transition-colors">
                {/* Name */}
                <div className="mb-2 md:mb-0">
                  <p className="font-semibold text-sm text-[#1A1A1A]">{fac.facilityName}</p>
                  <p className="text-xs text-[#5F5E5A]">{fac.registrationNumber}</p>
                </div>

                {/* Type */}
                <div className="mb-2 md:mb-0">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    fac.facilityType.includes('Verified')
                      ? 'bg-[#EAF3DE] text-[#27500A]'
                      : 'bg-[#E1F5EE] text-[#0F6E56]'
                  }`}>
                    {fac.facilityType}
                  </span>
                </div>

                {/* Region */}
                <p className="text-sm text-[#1A1A1A] mb-2 md:mb-0">{fac.region}</p>

                {/* District */}
                <p className="text-sm text-[#1A1A1A] mb-2 md:mb-0">{fac.district || '—'}</p>

                {/* In-charge */}
                <div className="mb-2 md:mb-0">
                  <p className="text-sm font-medium text-[#1A1A1A]">{fac.inChargeName}</p>
                  <a href={`tel:${fac.inChargePhone}`} className="text-xs text-[#185FA5] hover:underline">
                    {fac.inChargePhone}
                  </a>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <a
                    href={`tel:${fac.facilityPhone}`}
                    className="w-8 h-8 rounded-lg bg-[#E8F1FA] text-[#185FA5] flex items-center justify-center hover:bg-[#d0ebf9] transition-colors"
                    title="Call facility"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                  <a
                    href={`https://wa.me/${normalizePhone(fac.facilityPhone)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-lg bg-[#EAF3DE] text-[#27500A] flex items-center justify-center hover:bg-[#d8ecc7] transition-colors"
                    title="WhatsApp facility"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>
                  {!fac.facilityType.includes('Verified') && (
                    <button
                      onClick={() => handleVerify(fac.id)}
                      className="w-8 h-8 rounded-lg bg-[#E1F5EE] text-[#0F6E56] flex items-center justify-center hover:bg-[#c8e8d7] transition-colors"
                      title="Verify facility"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(fac.id)}
                    className="w-8 h-8 rounded-lg bg-[#FAECE7] text-[#A32D2D] flex items-center justify-center hover:bg-[#f5d8d0] transition-colors"
                    title="Delete facility"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
