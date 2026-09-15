import React, { useState } from 'react';
import { MapPin, Loader2, ChevronDown, CheckCircle } from 'lucide-react';
import {
  TANZANIA_REGIONS, TANZANIA_FACILITIES,
  saveUserProfile, setRegistered, setUserType, saveLocation,
  getUserProfile, UserProfile,
} from '../lib/user';

interface RegistrationProps {
  onComplete: () => void;
}

export default function Registration({ onComplete }: RegistrationProps) {
  const existing = getUserProfile();
  const [fullName, setFullName] = useState(existing?.fullName || '');
  const [phone, setPhone] = useState(existing?.phone || '');
  const [userType, setUserTypeState] = useState<'parent' | 'worker'>(existing?.userType === 'facility' ? 'parent' : (existing?.userType as 'parent' | 'worker') || 'parent');
  const [region, setRegion] = useState(existing?.region || '');
  const [district, setDistrict] = useState(existing?.district || '');
  const [village, setVillage] = useState(existing?.village || '');
  const [facility, setFacility] = useState(existing?.facility || '');
  const [wardName, setWardName] = useState(existing?.wardName || '');
  const [staffId, setStaffId] = useState(existing?.staffId || '');
  const [jobTitle, setJobTitle] = useState(existing?.jobTitle || '');
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [locationText, setLocationText] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const facilities = region ? TANZANIA_FACILITIES[region] || [] : [];

  const detectLocation = () => {
    setLocationStatus('loading');
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setLocationText('GPS not available on this device');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(c);
        saveLocation(c);
        setLocationStatus('success');
        setLocationText(`Location detected: ${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}`);
      },
      () => {
        setLocationStatus('error');
        setLocationText('Unable to get location. Please check permissions.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'Full name is required';
    if (!phone.trim()) e.phone = 'Phone number is required';
    if (!region) e.region = 'Please select a region';
    if (!facility.trim()) e.facility = 'Nearest health facility is required';
    if (userType === 'worker') {
      if (!wardName.trim()) e.wardName = 'Facility / Ward name is required';
      if (!staffId.trim()) e.staffId = 'Staff ID is required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const profile: UserProfile = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      userType,
      region,
      district: district.trim(),
      village: village.trim(),
      facility: facility.trim(),
      wardName: userType === 'worker' ? wardName.trim() : undefined,
      staffId: userType === 'worker' ? staffId.trim() : undefined,
      jobTitle: userType === 'worker' ? jobTitle.trim() : undefined,
    };
    saveUserProfile(profile);
    setUserType(userType);
    setRegistered();
    onComplete();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F6E56] to-[#0A4D3D] flex flex-col items-center px-4 py-8 overflow-y-auto">
      {/* Logo */}
      <div className="flex flex-col items-center mb-6 mt-4">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-3 shadow-lg">
          <span className="text-[#0F6E56] text-3xl">☀</span>
        </div>
        <h1 className="text-white text-2xl font-bold text-center">Welcome to JaundiceCARE Tanzania</h1>
        <p className="text-white/70 text-sm mt-1">Register to get started</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 mb-8">
        {/* Full Name */}
        <div>
          <label className="block text-sm font-semibold text-[#1A1A1A] mb-1.5">Full Name *</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your full name"
            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E1F5EE] transition-all ${
              errors.fullName ? 'border-[#A32D2D] bg-red-50' : 'border-[#E5E3DC]'
            }`}
          />
          {errors.fullName && <p className="text-xs text-[#A32D2D] mt-1">{errors.fullName}</p>}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-semibold text-[#1A1A1A] mb-1.5">Phone Number *</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0712 345 678"
            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E1F5EE] transition-all ${
              errors.phone ? 'border-[#A32D2D] bg-red-50' : 'border-[#E5E3DC]'
            }`}
          />
          {errors.phone && <p className="text-xs text-[#A32D2D] mt-1">{errors.phone}</p>}
        </div>

        {/* User Type */}
        <div>
          <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">User Type *</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setUserTypeState('parent')}
              className={`py-4 rounded-xl font-bold text-sm transition-all border-2 ${
                userType === 'parent'
                  ? 'bg-[#0F6E56] text-white border-[#0F6E56]'
                  : 'bg-white text-[#0F6E56] border-[#E5E3DC]'
              }`}
            >
              Parent / Caregiver
            </button>
            <button
              onClick={() => setUserTypeState('worker')}
              className={`py-4 rounded-xl font-bold text-sm transition-all border-2 ${
                userType === 'worker'
                  ? 'bg-[#0F6E56] text-white border-[#0F6E56]'
                  : 'bg-white text-[#0F6E56] border-[#E5E3DC]'
              }`}
            >
              Healthcare Worker
            </button>
          </div>
        </div>

        {/* Region */}
        <div>
          <label className="block text-sm font-semibold text-[#1A1A1A] mb-1.5">Region *</label>
          <div className="relative">
            <select
              value={region}
              onChange={(e) => {
                setRegion(e.target.value);
                setFacility('');
              }}
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E1F5EE] appearance-none transition-all pr-10 ${
                errors.region ? 'border-[#A32D2D] bg-red-50' : 'border-[#E5E3DC]'
              }`}
            >
              <option value="">Select region...</option>
              {TANZANIA_REGIONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5F5E5A] pointer-events-none" size={18} />
          </div>
          {errors.region && <p className="text-xs text-[#A32D2D] mt-1">{errors.region}</p>}
        </div>

        {/* District */}
        <div>
          <label className="block text-sm font-semibold text-[#1A1A1A] mb-1.5">District</label>
          <input
            type="text"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            placeholder="Enter district name"
            className="w-full px-4 py-3 border border-[#E5E3DC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E1F5EE] transition-all"
          />
        </div>

        {/* Village / Street */}
        <div>
          <label className="block text-sm font-semibold text-[#1A1A1A] mb-1.5">Village / Street</label>
          <input
            type="text"
            value={village}
            onChange={(e) => setVillage(e.target.value)}
            placeholder="Enter village or street name"
            className="w-full px-4 py-3 border border-[#E5E3DC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E1F5EE] transition-all"
          />
        </div>

        {/* Nearest Health Facility */}
        <div>
          <label className="block text-sm font-semibold text-[#1A1A1A] mb-1.5">Nearest Health Facility *</label>
          <input
            type="text"
            value={facility}
            onChange={(e) => setFacility(e.target.value)}
            placeholder="Enter or select facility name"
            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E1F5EE] transition-all ${
              errors.facility ? 'border-[#A32D2D] bg-red-50' : 'border-[#E5E3DC]'
            }`}
          />
          {errors.facility && <p className="text-xs text-[#A32D2D] mt-1">{errors.facility}</p>}

          {/* Nearby facilities chips */}
          {facilities.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-[#5F5E5A] mb-2">Nearby Health Facilities in {region}:</p>
              <div className="flex flex-wrap gap-2">
                {facilities.map(f => (
                  <button
                    key={f}
                    onClick={() => setFacility(f)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      facility === f
                        ? 'bg-[#0F6E56] text-white'
                        : 'bg-[#E1F5EE] text-[#0F6E56] hover:bg-[#0F6E56] hover:text-white'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Worker-only fields */}
        {userType === 'worker' && (
          <div className="space-y-4 pt-2 border-t border-[#E5E3DC]">
            <p className="text-sm font-bold text-[#0F6E56]">Healthcare Worker Details</p>

            <div>
              <label className="block text-sm font-semibold text-[#1A1A1A] mb-1.5">Facility / Ward Name *</label>
              <input
                type="text"
                value={wardName}
                onChange={(e) => setWardName(e.target.value)}
                placeholder="e.g. Maternity Ward"
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E1F5EE] transition-all ${
                  errors.wardName ? 'border-[#A32D2D] bg-red-50' : 'border-[#E5E3DC]'
                }`}
              />
              {errors.wardName && <p className="text-xs text-[#A32D2D] mt-1">{errors.wardName}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#1A1A1A] mb-1.5">Staff ID / Badge Number *</label>
              <input
                type="text"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                placeholder="e.g. RN-01234"
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E1F5EE] transition-all ${
                  errors.staffId ? 'border-[#A32D2D] bg-red-50' : 'border-[#E5E3DC]'
                }`}
              />
              {errors.staffId && <p className="text-xs text-[#A32D2D] mt-1">{errors.staffId}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#1A1A1A] mb-1.5">Job Title</label>
              <div className="relative">
                <select
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full px-4 py-3 border border-[#E5E3DC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E1F5EE] appearance-none transition-all pr-10"
                >
                  <option value="">Select job title...</option>
                  <option value="Nurse">Nurse</option>
                  <option value="Midwife">Midwife</option>
                  <option value="Doctor">Doctor</option>
                  <option value="Community Health Worker">Community Health Worker</option>
                  <option value="Other">Other</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5F5E5A] pointer-events-none" size={18} />
              </div>
            </div>
          </div>
        )}

        {/* GPS Location Button */}
        <div>
          <button
            onClick={detectLocation}
            disabled={locationStatus === 'loading'}
            className="w-full bg-[#0F6E56] hover:bg-[#0d5844] text-white font-bold py-3.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {locationStatus === 'loading' ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Detecting location...</>
            ) : (
              <><MapPin className="w-5 h-5" /> Use My Current Location</>
            )}
          </button>
          {locationStatus === 'success' && (
            <div className="flex items-center gap-2 mt-2 text-xs text-[#27500A]">
              <CheckCircle className="w-4 h-4" />
              {locationText}
            </div>
          )}
          {locationStatus === 'error' && (
            <p className="text-xs text-[#A32D2D] mt-2">{locationText}</p>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          className="w-full bg-[#0F6E56] hover:bg-[#0d5844] text-white font-bold py-4 px-4 rounded-xl transition-colors text-lg mt-2"
        >
          Register & Start Using App
        </button>
      </div>
    </div>
  );
}
