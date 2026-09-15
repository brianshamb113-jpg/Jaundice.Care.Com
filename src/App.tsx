import React, { useState, useEffect, useRef } from 'react';
import { Home, Camera, FileText, Send, Settings, ChevronRight, AlertCircle, CheckCircle, X, Plus, Download, Trash2, Share2, ArrowLeft, MapPin, Bell, Phone, MessageCircle, User as UserIcon, Volume2, LogOut, Sun, TrendingUp, Bell as BellIcon } from 'lucide-react';
import EntryScreen from './pages/EntryScreen';
import FacilityDashboard from './pages/FacilityDashboard';
import CriticalAlertOverlay from './components/CriticalAlertOverlay';
import LogoBadge from './components/LogoBadge';
import { isRegistered, getUserProfile, getUserType, getLocation, saveLocation, getCurrentUser, signOut } from './lib/user';
import { analyseImage } from './lib/bilirubinAnalysis';
import OfflineIndicator from './components/OfflineIndicator';
import LocationCapture from './components/LocationCapture';
import LocationMap from './components/LocationMap';
import { initSyncEngine, queueScan, queueAlert } from './lib/syncEngine';
import { startLocationWatch, getCurrentLocation, type CurrentLocation } from './lib/locationService';
import type { OfflineScan, OfflineAlert } from './lib/offlineDB';

// Types
interface ScreeningRecord {
  id: string;
  babyId: string;
  motherName: string;
  ageHours: number;
  birthWeight: number;
  gestationalAge: string;
  bilirubin: number;
  status: 'Normal' | 'Monitor' | 'Refer Urgently';
  ward: string;
  workerName: string;
  notes: string;
  timestamp: number;
  imageBase64: string;
}

interface ReferralRecord {
  id: string;
  screeningId: string;
  referralDate: number;
  referredTo: string;
  actionsTaken: string[];
}

interface AppSettings {
  workerName: string;
  facilityName: string;
  referralHospital: string;
  soundAlerts: boolean;
}

interface ScanState {
  step: number;
  babyId: string;
  motherName: string;
  ageHours: number;
  ageUnit: 'Hours' | 'Days';
  birthWeight: number;
  gestationalAge: string;
  ward: string;
  workerName: string;
  notes: string;
  capturedImage: string | null;
  bilirubin: number | null;
  imageFile: File | null;
  // Parent-mode fields
  babyNickname?: string;
  relationship?: string;
  currentLocation?: string;
  parentPhone?: string;
  // Worker-mode extra field
  motherPhone?: string;
  // GPS location
  gpsLocation?: CurrentLocation | null;
}

// Utility functions
const generateBabyId = () => `JC-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

const generateBilirubin = (): { value: number; status: 'Normal' | 'Monitor' | 'Refer Urgently' } => {
  const rand = Math.random();
  let value: number;
  let status: 'Normal' | 'Monitor' | 'Refer Urgently';

  if (rand < 0.5) {
    value = 5.0 + Math.random() * 6.9;
    status = 'Normal';
  } else if (rand < 0.8) {
    value = 12.0 + Math.random() * 4.9;
    status = 'Monitor';
  } else {
    value = 17.0 + Math.random() * 5.0;
    status = 'Refer Urgently';
  }

  return { value: parseFloat(value.toFixed(1)), status };
};

const getBiliColor = (status: string) => {
  switch(status) {
    case 'Normal': return 'text-[#27500A] bg-green-50';
    case 'Monitor': return 'text-[#BA7517] bg-yellow-50';
    case 'Refer Urgently': return 'text-[#A32D2D] bg-red-50';
    default: return 'text-gray-800 bg-gray-50';
  }
};

const getStatusBadgeColor = (status: string) => {
  switch(status) {
    case 'Normal': return 'bg-[#27500A] text-white';
    case 'Monitor': return 'bg-[#BA7517] text-white';
    case 'Refer Urgently': return 'bg-[#A32D2D] text-white';
    default: return 'bg-gray-500 text-white';
  }
};

// Home Screen
interface Announcement {
  id: string;
  title: string;
  body: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  is_published: boolean;
  created_at: number;
}

const HomeScreen: React.FC<{
  records: ScreeningRecord[];
  referrals: ReferralRecord[];
  onStartScan: () => void;
  onSelectRecord: (record: ScreeningRecord) => void;
}> = ({ records, referrals, onStartScan, onSelectRecord }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const profile = getUserProfile();
  const userType = getUserType();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const userInitials = profile?.fullName
    ? profile.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  const announcements: Announcement[] = (() => {
    try {
      const raw = localStorage.getItem('jc_announcements');
      return raw ? (JSON.parse(raw) as Announcement[]).filter(a => a.is_published) : [];
    } catch {
      return [];
    }
  })();

  const criticalBanners = announcements.filter(a => a.priority === 'Critical');
  const cardAnnouncements = announcements.filter(a => a.priority !== 'Critical');

  const screeningsToday = records.filter(r => new Date(r.timestamp).toDateString() === today.toDateString()).length;

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const screeningsWeek = records.filter(r => r.timestamp >= weekAgo.getTime()).length;

  const recentRecords = records.slice(-5).reverse();

  return (
    <div className="pb-28">
      {/* Critical banners */}
      {criticalBanners.map(ann => (
        <div key={ann.id} className="bg-[#A32D2D] text-white px-4 py-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold text-sm">{ann.title}</p>
            {ann.body && <p className="text-xs opacity-90 mt-0.5">{ann.body}</p>}
          </div>
        </div>
      ))}

      {/* Header — branded hero */}
      <div
        className="sticky top-0 z-40 bg-[#0F6E56] text-white rounded-b-3xl shadow-lg medical-grid relative overflow-hidden"
        style={{ height: 180 }}
      >
        <div className="absolute inset-0 flex items-center px-5">
          {/* Left: LogoBadge + heartbeat + smartphone */}
          <div className="flex flex-col items-center gap-1 mr-4">
            <LogoBadge size={80} />
            <svg
              viewBox="0 0 60 10"
              className="mt-1"
              width={50}
              height={10}
              fill="none"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 5 L14 5 L18 2 L22 8 L26 3 L30 7 L34 5 L58 5" />
            </svg>
            <svg
              viewBox="0 0 14 20"
              width={14}
              height={20}
              fill="none"
              stroke="white"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="1" width="10" height="18" rx="2" />
              <circle cx="7" cy="15" r="0.8" fill="white" stroke="none" />
            </svg>
          </div>

          {/* Right: title block */}
          <div className="flex-1">
            <h1 className="text-white font-bold leading-tight" style={{ fontSize: 28 }}>
              JaundiceCARE
            </h1>
            <p className="font-medium" style={{ color: '#F5A623', fontSize: 16, fontWeight: 500 }}>
              Tanzania
            </p>
            <p className="text-white/60 mt-0.5" style={{ fontSize: 12 }}>
              Neonatal Screening
            </p>
            {profile && (
              <p className="text-white/90 mt-2 text-xs font-semibold">
                {greeting}, {profile.fullName.split(' ')[0]}!
              </p>
            )}
          </div>
        </div>

        {/* User type tag + location */}
        {profile && (
          <div className="absolute bottom-3 left-5 right-5 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold bg-white/20 px-2.5 py-1 rounded-full">
                {userType === 'parent' ? 'Parent Mode' : 'Healthcare Worker Mode'}
              </span>
              {profile.district && profile.region && (
                <span className="text-[11px] font-semibold bg-white/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {profile.district}, {profile.region}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 space-y-6">
        {/* Nearest facility card */}
        {profile?.facility && (
          <div className="bg-white border border-[#E5E3DC] rounded-xl p-3 flex items-center gap-3 shadow-sm">
            <div className="w-9 h-9 bg-[#E1F5EE] rounded-lg flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-[#0F6E56]" />
            </div>
            <div>
              <p className="text-xs text-[#5F5E5A]">Your nearest facility</p>
              <p className="text-sm font-semibold text-[#1A1A1A]">{profile.facility}</p>
            </div>
          </div>
        )}

        {/* Quick Stats — branded stat cards */}
        <div className="grid grid-cols-3 gap-3">
          <div
            className="bg-white rounded-xl p-4 relative overflow-hidden heartbeat-bg"
            style={{ borderLeft: '3px solid #0F6E56' }}
          >
            <div className="relative z-10">
              <Sun className="w-4 h-4 mb-1.5" style={{ color: '#F5A623' }} />
              <p className="font-bold" style={{ fontSize: 32, color: '#0F6E56', lineHeight: 1 }}>
                {screeningsToday}
              </p>
              <p className="text-[#5F5E5A] uppercase tracking-wide mt-1" style={{ fontSize: 11 }}>
                Today
              </p>
            </div>
          </div>
          <div
            className="bg-white rounded-xl p-4 relative overflow-hidden heartbeat-bg"
            style={{ borderLeft: '3px solid #185FA5' }}
          >
            <div className="relative z-10">
              <TrendingUp className="w-4 h-4 mb-1.5" style={{ color: '#0F6E56' }} />
              <p className="font-bold" style={{ fontSize: 32, color: '#185FA5', lineHeight: 1 }}>
                {screeningsWeek}
              </p>
              <p className="text-[#5F5E5A] uppercase tracking-wide mt-1" style={{ fontSize: 11 }}>
                This week
              </p>
            </div>
          </div>
          <div
            className="bg-white rounded-xl p-4 relative overflow-hidden heartbeat-bg"
            style={{ borderLeft: '3px solid #F5A623' }}
          >
            <div className="relative z-10">
              <Send className="w-4 h-4 mb-1.5" style={{ color: '#185FA5' }} />
              <p className="font-bold" style={{ fontSize: 32, color: '#F5A623', lineHeight: 1 }}>
                {referrals.length}
              </p>
              <p className="text-[#5F5E5A] uppercase tracking-wide mt-1" style={{ fontSize: 11 }}>
                Referrals
              </p>
            </div>
          </div>
        </div>

        {/* Profile quick card */}
        {profile && (
          <div className="bg-white border border-[#E5E3DC] rounded-xl p-4 flex items-center gap-3 shadow-sm">
            <div className="w-12 h-12 bg-[#0F6E56] rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">{userInitials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-[#1A1A1A] truncate">{profile.fullName}</p>
              <p className="text-xs text-[#5F5E5A]">
                {userType === 'parent' ? 'Parent / Caregiver' : profile.jobTitle || 'Healthcare Worker'}
                {profile.facility ? ` · ${profile.facility}` : ''}
              </p>
            </div>
          </div>
        )}

        {/* Announcements */}
        {cardAnnouncements.length > 0 && (
          <div>
            <h2 className="font-bold text-[#1A1A1A] mb-2 text-sm">Announcements</h2>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {cardAnnouncements.map(ann => (
                <div
                  key={ann.id}
                  className="flex-shrink-0 w-64 bg-white border border-[#E5E3DC] rounded-xl p-4 shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      ann.priority === 'High' ? 'bg-[#FAEEDA] text-[#BA7517]' :
                      ann.priority === 'Critical' ? 'bg-[#FAECE7] text-[#A32D2D]' :
                      'bg-[#E1F5EE] text-[#0F6E56]'
                    }`}>
                      {ann.priority}
                    </span>
                    <span className="text-[10px] text-[#5F5E5A]">{ann.category}</span>
                  </div>
                  <p className="font-semibold text-sm text-[#1A1A1A] mb-1">{ann.title}</p>
                  {ann.body && <p className="text-xs text-[#5F5E5A] line-clamp-2">{ann.body}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Start Screening Button — hero action */}
        <button
          onClick={onStartScan}
          className="w-full text-white font-bold py-4 px-6 rounded-2xl transition-all tap-scale flex items-center justify-between"
          style={{
            height: 60,
            background: 'linear-gradient(to right, #0F6E56, #1D9E75)',
            boxShadow: '0 6px 20px rgba(15,110,86,0.35)',
            borderRadius: 16,
          }}
        >
          <span className="flex items-center gap-3">
            <Camera className="w-5 h-5" />
            <span style={{ fontSize: 16 }}>Start New Screening</span>
          </span>
          <span
            className="rounded-full flex items-center justify-center"
            style={{
              width: 32,
              height: 32,
              background: '#F5A623',
              boxShadow: '0 0 8px rgba(245,166,35,0.5)',
            }}
          >
            <svg viewBox="0 0 24 24" width={18} height={18} fill="white">
              <circle cx="12" cy="7" r="3.5" />
              <path d="M5 22 Q5 13 12 13 Q19 13 19 22 Z" />
            </svg>
          </span>
        </button>

        {/* Recent Screenings */}
        <div>
          <h2 className="font-bold text-[#1A1A1A] mb-3">Recent Screenings</h2>
          {recentRecords.length === 0 ? (
            <div className="bg-[#E1F5EE] rounded-xl p-6 text-center">
              <p className="text-[#5F5E5A] text-sm">No screenings recorded yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentRecords.map(record => (
                <button
                  key={record.id}
                  onClick={() => onSelectRecord(record)}
                  className="w-full bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-[#0F6E56] transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold text-[#1A1A1A]">{record.babyId}</div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${getStatusBadgeColor(record.status)}`}>
                      {record.status === 'Normal' ? 'NORMAL' : record.status === 'Monitor' ? 'MONITOR' : 'REFER'}
                    </span>
                  </div>
                  <p className="text-sm text-[#5F5E5A] mb-2">{record.motherName}</p>
                  <div className="flex justify-between items-center">
                    <span className={`font-bold text-lg ${getBiliColor(record.status)}`}>
                      {record.bilirubin} mg/dL
                    </span>
                    <span className="text-xs text-[#5F5E5A]">
                      {new Date(record.timestamp).toLocaleDateString()} {new Date(record.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-[#185FA5] rounded-xl p-4">
          <p className="text-xs text-[#1A1A1A] leading-relaxed">
            <strong>About JaundiceCARE:</strong> This tool uses smartphone colour analysis with a calibration card to estimate bilirubin levels in newborns. Always confirm critical results with laboratory TSB testing.
          </p>
        </div>
      </div>
    </div>
  );
};

// Scan Screen - Step 1
const ScanStep1: React.FC<{
  scan: ScanState;
  setScan: (s: ScanState) => void;
  settings: AppSettings;
}> = ({ scan, setScan, settings }) => {
  const profile = getUserProfile();
  const userType = getUserType();
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Parent-mode simplified form
  if (userType === 'parent') {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Baby ID</label>
          <input
            type="text"
            value={scan.babyId}
            disabled
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-500"
          />
          <p className="text-xs text-[#5F5E5A] mt-1">Auto-generated</p>
        </div>

        <div>
          <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Baby Nickname / Name (optional)</label>
          <input
            type="text"
            value={scan.babyNickname || ''}
            onChange={(e) => setScan({...scan, babyNickname: e.target.value})}
            placeholder="e.g. Baby Amina"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#0F6E56] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Baby Age (days) *</label>
          <input
            type="number"
            value={scan.ageHours > 0 ? Math.round(scan.ageHours) : ''}
            onChange={(e) => setScan({...scan, ageHours: parseInt(e.target.value) || 0, ageUnit: 'Days'})}
            placeholder="e.g. 3"
            min="0"
            className={`w-full px-4 py-3 border-2 rounded-lg focus:border-[#0F6E56] focus:outline-none ${
              errors.ageHours ? 'border-[#A32D2D] bg-red-50' : 'border-gray-300'
            }`}
          />
          {errors.ageHours && <p className="text-xs text-[#A32D2D] mt-1">{errors.ageHours}</p>}
        </div>

        <div>
          <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Your Relationship to Baby *</label>
          <select
            value={scan.relationship || ''}
            onChange={(e) => setScan({...scan, relationship: e.target.value})}
            className={`w-full px-4 py-3 border-2 rounded-lg focus:border-[#0F6E56] focus:outline-none ${
              errors.relationship ? 'border-[#A32D2D] bg-red-50' : 'border-gray-300'
            }`}
          >
            <option value="">Select...</option>
            <option value="Mother">Mother</option>
            <option value="Father">Father</option>
            <option value="Grandparent">Grandparent</option>
            <option value="Guardian">Guardian</option>
          </select>
          {errors.relationship && <p className="text-xs text-[#A32D2D] mt-1">{errors.relationship}</p>}
        </div>

        <div>
          <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Current Location</label>
          <input
            type="text"
            value={scan.currentLocation || ''}
            onChange={(e) => setScan({...scan, currentLocation: e.target.value})}
            placeholder={profile?.district ? `${profile.district}, ${profile.region}` : 'Enter your location'}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#0F6E56] focus:outline-none"
          />
        </div>

        <LocationCapture
          initialLocation={scan.gpsLocation || null}
          onLocation={(loc) => setScan({...scan, gpsLocation: loc, currentLocation: loc.address || `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`})}
        />

        <div>
          <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Phone Number</label>
          <input
            type="tel"
            value={scan.parentPhone || profile?.phone || ''}
            onChange={(e) => setScan({...scan, parentPhone: e.target.value})}
            placeholder="0712 345 678"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#0F6E56] focus:outline-none"
          />
        </div>
      </div>
    );
  }

  // Worker-mode full professional form
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Baby ID</label>
        <input
          type="text"
          value={scan.babyId}
          disabled
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-500"
        />
        <p className="text-xs text-[#5F5E5A] mt-1">Auto-generated</p>
      </div>

      <div>
        <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Mother's Name *</label>
        <input
          type="text"
          value={scan.motherName}
          onChange={(e) => setScan({...scan, motherName: e.target.value})}
          placeholder="Enter mother's name"
          className={`w-full px-4 py-3 border-2 rounded-lg focus:border-[#0F6E56] focus:outline-none ${
            errors.motherName ? 'border-[#A32D2D] bg-red-50' : 'border-gray-300'
          }`}
        />
        {errors.motherName && <p className="text-xs text-[#A32D2D] mt-1">{errors.motherName}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Age of Baby *</label>
          <input
            type="number"
            value={scan.ageHours || ''}
            onChange={(e) => setScan({...scan, ageHours: parseInt(e.target.value) || 0})}
            placeholder="0"
            min="0"
            className={`w-full px-4 py-3 border-2 rounded-lg focus:border-[#0F6E56] focus:outline-none ${
              errors.ageHours ? 'border-[#A32D2D] bg-red-50' : 'border-gray-300'
            }`}
          />
          {errors.ageHours && <p className="text-xs text-[#A32D2D] mt-1">{errors.ageHours}</p>}
        </div>
        <div>
          <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Unit *</label>
          <select
            value={scan.ageUnit}
            onChange={(e) => setScan({...scan, ageUnit: e.target.value as 'Hours' | 'Days'})}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#0F6E56] focus:outline-none"
          >
            <option value="Hours">Hours</option>
            <option value="Days">Days</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Birth Weight (grams) *</label>
        <input
          type="number"
          value={scan.birthWeight || ''}
          onChange={(e) => setScan({...scan, birthWeight: parseInt(e.target.value) || 0})}
          placeholder="3000"
          min="0"
          className={`w-full px-4 py-3 border-2 rounded-lg focus:border-[#0F6E56] focus:outline-none ${
            errors.birthWeight ? 'border-[#A32D2D] bg-red-50' : 'border-gray-300'
          }`}
        />
        {errors.birthWeight && <p className="text-xs text-[#A32D2D] mt-1">{errors.birthWeight}</p>}
      </div>

      <div>
        <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Gestational Age at Birth *</label>
        <select
          value={scan.gestationalAge}
          onChange={(e) => setScan({...scan, gestationalAge: e.target.value})}
          className={`w-full px-4 py-3 border-2 rounded-lg focus:border-[#0F6E56] focus:outline-none ${
            errors.gestationalAge ? 'border-[#A32D2D] bg-red-50' : 'border-gray-300'
          }`}
        >
          <option value="">Select...</option>
          <option value="35">35 weeks</option>
          <option value="36">36 weeks</option>
          <option value="37">37 weeks</option>
          <option value="38">38 weeks</option>
          <option value="39">39 weeks</option>
          <option value="40+">40+ weeks</option>
        </select>
        {errors.gestationalAge && <p className="text-xs text-[#A32D2D] mt-1">{errors.gestationalAge}</p>}
      </div>

      <div>
        <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Ward / Facility Name *</label>
        <input
          type="text"
          value={scan.ward}
          onChange={(e) => setScan({...scan, ward: e.target.value})}
          placeholder={profile?.wardName || settings.facilityName || "Enter facility name"}
          className={`w-full px-4 py-3 border-2 rounded-lg focus:border-[#0F6E56] focus:outline-none ${
            errors.ward ? 'border-[#A32D2D] bg-red-50' : 'border-gray-300'
          }`}
        />
        {errors.ward && <p className="text-xs text-[#A32D2D] mt-1">{errors.ward}</p>}
      </div>

      <div>
        <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Healthcare Worker Name *</label>
        <input
          type="text"
          value={scan.workerName}
          onChange={(e) => setScan({...scan, workerName: e.target.value})}
          placeholder={profile?.fullName || settings.workerName || "Your name"}
          className={`w-full px-4 py-3 border-2 rounded-lg focus:border-[#0F6E56] focus:outline-none ${
            errors.workerName ? 'border-[#A32D2D] bg-red-50' : 'border-gray-300'
          }`}
        />
        {errors.workerName && <p className="text-xs text-[#A32D2D] mt-1">{errors.workerName}</p>}
      </div>

      <div>
        <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Staff ID</label>
        <input
          type="text"
          value={scan.motherPhone || profile?.staffId || ''}
          onChange={(e) => setScan({...scan, motherPhone: e.target.value})}
          placeholder="e.g. RN-01234"
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#0F6E56] focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Mother's Phone Number *</label>
        <input
          type="tel"
          value={scan.motherPhone || ''}
          onChange={(e) => setScan({...scan, motherPhone: e.target.value})}
          placeholder="0712 345 678"
          className={`w-full px-4 py-3 border-2 rounded-lg focus:border-[#0F6E56] focus:outline-none ${
            errors.motherPhone ? 'border-[#A32D2D] bg-red-50' : 'border-gray-300'
          }`}
        />
        {errors.motherPhone && <p className="text-xs text-[#A32D2D] mt-1">{errors.motherPhone}</p>}
      </div>

      <div>
        <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Clinical Notes (optional)</label>
        <textarea
          value={scan.notes}
          onChange={(e) => setScan({...scan, notes: e.target.value})}
          placeholder="Any additional clinical observations..."
          rows={3}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#0F6E56] focus:outline-none"
        />
      </div>
    </div>
  );
};

// Scan Screen - Step 2: Face & Eye Detection
const ScanStep2: React.FC = () => {
  const speakInstructions = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const text = 'Hatua ya kwanza: Shikilia mtoto akiangalia kamera kwenye mwanga mzuri. Hatua ya pili: Hakikisha macho yote mawili yanaonekana. Hatua ya tatu: Shika simu sentimita ishirini hadi thelathini kutoka kwenye uso wa mtoto. Hatua ya nne: Mtoto awe ametulia wakati wa kupiga picha.';
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'sw-KE';
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-[#E5E3DC] p-6 text-center">
        <h2 className="text-lg font-bold text-[#1A1A1A] mb-1">Position Baby's Face</h2>
        <p className="text-sm text-[#5F5E5A] mb-4">No calibration card needed</p>

        {/* SVG illustration: baby face with camera and guide */}
        <svg viewBox="0 0 200 220" className="w-full max-w-[200px] mx-auto mb-4">
          {/* Golden light rays */}
          <g stroke="#F5A623" strokeWidth="1.5" opacity="0.5" strokeLinecap="round">
            <line x1="40" y1="20" x2="60" y2="50" />
            <line x1="100" y1="10" x2="100" y2="40" />
            <line x1="160" y1="20" x2="140" y2="50" />
            <line x1="20" y1="70" x2="50" y2="80" />
            <line x1="180" y1="70" x2="150" y2="80" />
          </g>

          {/* Phone camera above */}
          <rect x="80" y="5" width="40" height="25" rx="4" fill="#0F6E56" />
          <circle cx="100" cy="17" r="5" fill="#E1F5EE" stroke="#0F6E56" strokeWidth="1" />
          <circle cx="100" cy="17" r="2" fill="#0F6E56" />

          {/* Dotted oval guide frame */}
          <ellipse cx="100" cy="130" rx="55" ry="70" fill="none" stroke="#27500A" strokeWidth="2" strokeDasharray="4 3" opacity="0.6" />

          {/* Baby face */}
          <circle cx="100" cy="130" r="45" fill="#FDEBD3" stroke="#E5C9A8" strokeWidth="1" />
          {/* Eyes */}
          <circle cx="85" cy="125" r="5" fill="white" stroke="#1A1A1A" strokeWidth="0.5" />
          <circle cx="115" cy="125" r="5" fill="white" stroke="#1A1A1A" strokeWidth="0.5" />
          <circle cx="85" cy="126" r="2.5" fill="#1A1A1A" />
          <circle cx="115" cy="126" r="2.5" fill="#1A1A1A" />
          {/* Nose */}
          <circle cx="100" cy="140" r="1.5" fill="#E5C9A8" />
          {/* Mouth */}
          <path d="M 92 150 Q 100 155 108 150" fill="none" stroke="#E5C9A8" strokeWidth="1.5" strokeLinecap="round" />
        </svg>

        <div className="text-left space-y-2 mb-4">
          {[
            'Hold baby facing the camera in good light',
            'Make sure both eyes are visible',
            'Natural daylight or bright room light is best',
            'Hold phone 20-30cm from baby\'s face',
            'Keep baby still during capture',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#E1F5EE] text-[#0F6E56] text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <p className="text-sm text-[#1A1A1A]">{step}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Voice instructions button */}
      <button
        onClick={speakInstructions}
        className="w-full bg-[#E8F1FA] text-[#185FA5] font-semibold py-3 rounded-xl flex items-center justify-center gap-2 border border-[#185FA5]/20"
      >
        <Volume2 className="w-5 h-5" />
        Sikiliza maelekezo
      </button>
    </div>
  );
};

// Camera component
const CameraCapture: React.FC<{
  onCapture: (imageBase64: string) => void;
  onCancel: () => void;
}> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } }
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        alert('Camera not available. Please check permissions.');
      }
    };
    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const capture = () => {
    if (canvasRef.current && videoRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, -videoRef.current.videoWidth, 0);
        const imageData = canvasRef.current.toDataURL('image/jpeg', 0.7);
        setCapturedImage(imageData);
      }
    }
  };

  if (capturedImage) {
    return (
      <div className="space-y-4">
        <img src={capturedImage} alt="Captured" className="w-full rounded-lg border-2 border-gray-300" />
        <div className="flex gap-3">
          <button
            onClick={() => setCapturedImage(null)}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-[#1A1A1A] font-bold py-3 px-4 rounded-lg transition-colors"
          >
            Retake
          </button>
          <button
            onClick={() => onCapture(capturedImage)}
            className="flex-1 bg-[#0F6E56] hover:bg-[#0d5844] text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            Analyse
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative w-full bg-black rounded-lg overflow-hidden aspect-video">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Oval face guide overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div
            className="border-2 border-[#F5A623] rounded-full opacity-80"
            style={{ width: '60%', height: '75%', borderStyle: 'dashed' }}
          />
          <p className="absolute top-[15%] text-white text-xs font-semibold bg-black/40 px-2 py-1 rounded">
            Align baby's face
          </p>
          <p className="absolute bottom-[15%] text-white text-xs font-semibold bg-black/40 px-2 py-1 rounded">
            Eyes must be visible
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 bg-gray-300 hover:bg-gray-400 text-[#1A1A1A] font-bold py-3 px-4 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={capture}
          className="flex-1 bg-white hover:bg-gray-100 text-[#1A1A1A] font-bold py-3 px-4 rounded-lg border-2 border-[#0F6E56] transition-colors"
        >
          Capture
        </button>
      </div>
    </div>
  );
};

// Scan Screen - Step 3
const ScanStep3: React.FC<{
  onImageCapture: (image: string) => void;
  onBack: () => void;
}> = ({ onImageCapture, onBack }) => {
  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="text-[#185FA5] font-semibold text-sm flex items-center gap-1 mb-2"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <CameraCapture
        onCapture={onImageCapture}
        onCancel={onBack}
      />
    </div>
  );
};

// Scan Screen - Step 4
const ScanStep4: React.FC<{
  scan: ScanState;
  onSaveRecord: (record: ScreeningRecord) => void;
  onCompleteReferral: () => void;
  onNewScan: () => void;
}> = ({ scan, onSaveRecord, onCompleteReferral, onNewScan }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [result, setResult] = useState<{ value: number; status: 'Normal' | 'Monitor' | 'Refer Urgently' } | null>(null);
  const [showAlert, setShowAlert] = useState(false);
  const [saved, setSaved] = useState(false);
  const userType = getUserType();
  const profile = getUserProfile();

  useEffect(() => {
    const runAnalysis = async () => {
      let analysisResult;
      if (scan.capturedImage) {
        analysisResult = await analyseImage(scan.capturedImage);
      } else {
        // Fallback if no image
        const rand = Math.random();
        if (rand < 0.5) analysisResult = { value: parseFloat((5 + Math.random() * 7).toFixed(1)), status: 'Normal' as const, jaundiceIndex: 0.05 };
        else if (rand < 0.8) analysisResult = { value: parseFloat((12 + Math.random() * 5).toFixed(1)), status: 'Monitor' as const, jaundiceIndex: 0.15 };
        else analysisResult = { value: parseFloat((17 + Math.random() * 5).toFixed(1)), status: 'Refer Urgently' as const, jaundiceIndex: 0.3 };
      }
      setResult(analysisResult);
      setIsAnalyzing(false);
      if (analysisResult.status === 'Refer Urgently') {
        setTimeout(() => setShowAlert(true), 500);
      }
    };
    const timer = setTimeout(runAnalysis, 2500);
    return () => clearTimeout(timer);
  }, []);

  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-16 h-16 rounded-full border-4 border-[#0F6E56] border-t-transparent animate-spin mb-4"></div>
        <p className="text-[#5F5E5A] font-semibold">Analysing image...</p>
        <p className="text-xs text-[#5F5E5A] mt-2">Examining facial colour and eye sclera</p>
      </div>
    );
  }

  if (!result) return null;

  // Critical alert overlay
  if (showAlert) {
    return (
      <CriticalAlertOverlay
        babyId={scan.babyId}
        bilirubin={result.value}
        motherName={scan.motherName || scan.babyNickname || ''}
        onDismiss={() => setShowAlert(false)}
      />
    );
  }

  const guidance = {
    'Normal': 'Bilirubin within safe range. No immediate treatment required. Re-screen in 24 hours if jaundice is clinically visible.',
    'Monitor': 'Bilirubin approaching clinical threshold. Initiate monitoring every 6–8 hours. Prepare for phototherapy if levels rise above 17 mg/dL.',
    'Refer Urgently': 'Bilirubin at critical level. Initiate phototherapy IMMEDIATELY. Perform confirmatory TSB lab test. Contact the attending neonatologist. Complete referral form now.'
  };

  const handleSave = () => {
    const record: ScreeningRecord = {
      id: `${Date.now()}`,
      babyId: scan.babyId,
      motherName: scan.motherName || scan.babyNickname || '',
      ageHours: scan.ageUnit === 'Hours' ? scan.ageHours : scan.ageHours * 24,
      birthWeight: scan.birthWeight,
      gestationalAge: scan.gestationalAge,
      bilirubin: result.value,
      status: result.status,
      ward: scan.ward || profile?.facility || '',
      workerName: scan.workerName || profile?.fullName || '',
      notes: scan.notes,
      timestamp: Date.now(),
      imageBase64: scan.capturedImage || ''
    };
    onSaveRecord(record);

    // Queue scan for offline sync with GPS coordinates
    const offlineScan: OfflineScan = {
      id: record.id,
      babyId: record.babyId,
      motherName: record.motherName,
      ageHours: record.ageHours,
      birthWeight: record.birthWeight,
      gestationalAge: record.gestationalAge,
      bilirubin: record.bilirubin,
      status: record.status,
      ward: record.ward,
      workerName: record.workerName,
      notes: record.notes,
      imageBase64: record.imageBase64,
      latitude: scan.gpsLocation?.latitude ?? null,
      longitude: scan.gpsLocation?.longitude ?? null,
      accuracy: scan.gpsLocation?.accuracy ?? null,
      address: scan.gpsLocation?.address || scan.currentLocation || '',
      scannedAt: record.timestamp,
      isSynced: false,
      syncAttempts: 0,
      lastSyncAttempt: null,
    };
    queueScan(offlineScan);

    // If critical, queue alert to hospital with GPS
    if (result.status === 'Refer Urgently') {
      const alertId = `alert_${record.id}`;
      const offlineAlert: OfflineAlert = {
        id: alertId,
        scanId: record.id,
        babyId: record.babyId,
        bilirubin: result.value,
        parentName: record.motherName,
        parentPhone: scan.parentPhone || profile?.phone || '',
        facilityName: profile?.facility || 'Nearest Hospital',
        latitude: scan.gpsLocation?.latitude ?? null,
        longitude: scan.gpsLocation?.longitude ?? null,
        accuracy: scan.gpsLocation?.accuracy ?? null,
        address: scan.gpsLocation?.address || scan.currentLocation || '',
        isSent: false,
        retryCount: 0,
        lastRetry: null,
        createdAt: Date.now(),
        sentAt: null,
      };
      queueAlert(offlineAlert);
    }

    setSaved(true);
  };

  // Parent-mode results (Upgrade 9)
  if (userType === 'parent') {
    if (result.status === 'Normal') {
      return (
        <div className="space-y-4">
          <div
            className="rounded-2xl p-8 text-center text-white relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #27500A, #3B6D11)' }}
          >
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold mb-1">Your baby looks healthy today</h2>
            <p className="text-sm opacity-90 mb-3">Mtoto yuko salama · Baby is safe</p>
            <svg
              viewBox="0 0 120 12"
              className="mx-auto"
              width={140}
              height={12}
              fill="none"
              stroke="#F5A623"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path className="animate-heartbeat" d="M2 6 L30 6 L36 2 L42 10 L48 3 L54 9 L60 6 L118 6" />
            </svg>
          </div>
          <div className="bg-white rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-[#27500A]">{result.value} <span className="text-base font-normal">mg/dL</span></p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-xs text-center text-[#1A1A1A]">
            Estimated from facial colour analysis. For clinical confirmation use laboratory TSB testing.
          </div>
          <button
            onClick={onNewScan}
            className="w-full bg-[#0F6E56] text-white font-bold py-3.5 rounded-xl"
          >
            Scan Again Tomorrow
          </button>
          {!saved && (
            <button
              onClick={handleSave}
              className="w-full bg-gray-200 text-[#1A1A1A] font-bold py-3 rounded-xl"
            >
              Save Record
            </button>
          )}
        </div>
      );
    }

    if (result.status === 'Monitor') {
      return (
        <div className="space-y-4">
          <div
            className="rounded-2xl p-8 text-center text-white relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #BA7517, #854F0B)' }}
          >
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/20 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold mb-1">Keep watching your baby carefully</h2>
            <p className="text-sm opacity-90 mb-3">Fuatilia kwa makini · Monitor closely</p>
            <svg
              viewBox="0 0 120 12"
              className="mx-auto"
              width={140}
              height={12}
              fill="none"
              stroke="#F5A623"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path className="animate-heartbeat" d="M2 6 L30 6 L36 2 L42 10 L48 3 L54 9 L60 6 L118 6" />
            </svg>
          </div>
          <div className="bg-white rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-[#BA7517]">{result.value} <span className="text-base font-normal">mg/dL</span></p>
          </div>
          <div className="bg-white rounded-xl p-4">
            <p className="text-sm font-semibold text-[#1A1A1A] mb-2">Signs to watch for:</p>
            <ul className="text-sm text-[#5F5E5A] space-y-1.5">
              <li className="flex items-start gap-2"><span className="text-[#BA7517]">•</span> Eyes turning more yellow</li>
              <li className="flex items-start gap-2"><span className="text-[#BA7517]">•</span> Baby not feeding well</li>
              <li className="flex items-start gap-2"><span className="text-[#BA7517]">•</span> Baby very sleepy or not waking</li>
              <li className="flex items-start gap-2"><span className="text-[#BA7517]">•</span> Skin appearing more yellow</li>
            </ul>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-xs text-center text-[#1A1A1A]">
            Estimated from facial colour analysis. For clinical confirmation use laboratory TSB testing.
          </div>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(profile?.facility || 'nearest hospital')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-[#BA7517] text-white font-bold py-3.5 rounded-xl text-center block"
          >
            Go to clinic if you notice these signs
          </a>
          {!saved ? (
            <button
              onClick={handleSave}
              className="w-full bg-gray-200 text-[#1A1A1A] font-bold py-3 rounded-xl"
            >
              Save Record
            </button>
          ) : (
            <button
              onClick={onNewScan}
              className="w-full bg-gray-200 text-[#1A1A1A] font-bold py-3 rounded-xl"
            >
              New Screening
            </button>
          )}
        </div>
      );
    }

    // Refer Urgently — parent mode
    return (
      <div className="space-y-4">
        <div
          className="rounded-2xl p-8 text-center text-white animate-pulse-border"
          style={{ background: '#A32D2D' }}
        >
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/20 flex items-center justify-center">
            <Bell className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold mb-1">TAKE BABY TO HOSPITAL NOW</h2>
          <p className="text-sm opacity-90">NENDA HOSPITALI · GO TO HOSPITAL</p>
        </div>
        <div className="bg-white rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-[#A32D2D]">{result.value} <span className="text-base font-normal">mg/dL</span></p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 text-xs text-center text-[#1A1A1A]">
          Estimated from facial colour analysis. For clinical confirmation use laboratory TSB testing.
        </div>
        <a
          href="tel:112"
          className="w-full bg-white border-2 border-[#A32D2D] text-[#A32D2D] font-bold py-4 rounded-xl flex items-center justify-center gap-2 text-lg"
        >
          <Phone className="w-5 h-5" />
          Call Nearest Hospital
        </a>
        {!saved ? (
          <button
            onClick={handleSave}
            className="w-full bg-[#0F6E56] text-white font-bold py-3.5 rounded-xl"
          >
            Save Record
          </button>
        ) : (
          <button
            onClick={onNewScan}
            className="w-full bg-gray-200 text-[#1A1A1A] font-bold py-3 rounded-xl"
          >
            New Screening
          </button>
        )}
      </div>
    );
  }

  // Worker-mode results (existing)
  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl p-6 text-center text-white relative overflow-hidden"
        style={{
          background: result.status === 'Normal'
            ? 'linear-gradient(135deg, #27500A, #3B6D11)'
            : result.status === 'Monitor'
            ? 'linear-gradient(135deg, #BA7517, #854F0B)'
            : '#A32D2D',
          animation: result.status === 'Refer Urgently' ? 'pulse-border 1.6s ease-out infinite' : undefined,
        }}
      >
        <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-white/20 flex items-center justify-center">
          {result.status === 'Normal' ? (
            <CheckCircle className="w-8 h-8 text-white" />
          ) : result.status === 'Monitor' ? (
            <AlertCircle className="w-8 h-8 text-white" />
          ) : (
            <Bell className="w-8 h-8 text-white" />
          )}
        </div>
        <p className="text-xs font-semibold opacity-80 mb-2">ESTIMATED BILIRUBIN</p>
        <p className="text-5xl font-bold mb-1">{result.value}</p>
        <p className="text-sm">mg/dL</p>
        <p className="font-bold mt-3 text-lg">
          {result.status === 'Normal' ? 'NORMAL' : result.status === 'Monitor' ? 'MONITOR CLOSELY' : 'REFER URGENTLY'}
        </p>
        {result.status === 'Normal' && (
          <p className="text-xs opacity-80 mt-1">Mtoto yuko salama · Baby is safe</p>
        )}
        {result.status === 'Monitor' && (
          <p className="text-xs opacity-80 mt-1">Fuatilia kwa makini · Monitor closely</p>
        )}
        {result.status === 'Refer Urgently' && (
          <p className="text-xs opacity-80 mt-1">NENDA HOSPITALI · GO TO HOSPITAL</p>
        )}
        <svg
          viewBox="0 0 120 12"
          className="mx-auto mt-3"
          width={140}
          height={12}
          fill="none"
          stroke="#F5A623"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path className="animate-heartbeat" d="M2 6 L30 6 L36 2 L42 10 L48 3 L54 9 L60 6 L118 6" />
        </svg>
      </div>

      <div className="bg-blue-50 rounded-lg p-4">
        <p className="text-xs text-[#1A1A1A] leading-relaxed">{guidance[result.status]}</p>
      </div>

      {scan.capturedImage && (
        <div className="flex justify-center">
          <img src={scan.capturedImage} alt="Captured scan" className="w-20 h-20 rounded-lg border-2 border-gray-300 object-cover" />
        </div>
      )}

      <div className="bg-gray-50 rounded-lg p-4 space-y-1 text-sm">
        <p><strong>Baby ID:</strong> {scan.babyId}</p>
        <p><strong>Mother:</strong> {scan.motherName}</p>
        <p><strong>Age:</strong> {scan.ageHours} {scan.ageUnit}</p>
        <p><strong>Ward:</strong> {scan.ward}</p>
        <p><strong>Time:</strong> {new Date().toLocaleString()}</p>
      </div>

      <div className="bg-blue-50 rounded-lg p-3 text-xs">
        <p className="text-[#1A1A1A]">Estimated from facial colour analysis. For clinical confirmation use laboratory TSB testing.</p>
      </div>

      <div className="space-y-2">
        {!saved ? (
          <button
            onClick={handleSave}
            className="w-full bg-[#0F6E56] hover:bg-[#0d5844] text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            Save Record
          </button>
        ) : (
          <>
            {result.status !== 'Normal' && (
              <button
                onClick={onCompleteReferral}
                className="w-full bg-[#185FA5] hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
              >
                Complete Referral Form
              </button>
            )}
            <button
              onClick={onNewScan}
              className="w-full bg-gray-300 hover:bg-gray-400 text-[#1A1A1A] font-bold py-3 px-4 rounded-lg transition-colors"
            >
              New Screening
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// Scan Screen Container
const ScanScreen: React.FC<{
  records: ScreeningRecord[];
  referrals: ReferralRecord[];
  settings: AppSettings;
  onRecordSaved: (record: ScreeningRecord) => void;
  onNavigateToRefer: (record: ScreeningRecord) => void;
  onBackHome: () => void;
}> = ({ records, referrals, settings, onRecordSaved, onNavigateToRefer, onBackHome }) => {
  const [step, setStep] = useState(1);
  const [scan, setScan] = useState<ScanState>(() => {
    const profile = getUserProfile();
    const userType = getUserType();
    return {
      step: 1,
      babyId: generateBabyId(),
      motherName: '',
      ageHours: 0,
      ageUnit: userType === 'parent' ? 'Days' : 'Hours',
      birthWeight: 0,
      gestationalAge: '',
      ward: profile?.wardName || settings.facilityName || '',
      workerName: profile?.fullName || settings.workerName || '',
      notes: '',
      capturedImage: null,
      bilirubin: null,
      imageFile: null,
      parentPhone: profile?.phone || '',
      currentLocation: profile?.district ? `${profile.district}, ${profile.region}` : '',
    };
  });

  const userType = getUserType();

  const canProceed = step === 1 ?
    (userType === 'parent'
      ? scan.ageHours > 0 && !!scan.relationship
      : scan.babyId && scan.motherName && scan.ageHours > 0 && scan.birthWeight > 0 && scan.gestationalAge && scan.ward && scan.workerName && !!scan.motherPhone) :
    step === 2 ? true : step === 3 ? !!scan.capturedImage : true;

  const handleNextStep = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      // Camera will handle next
    }
  };

  const handleCapture = (imageBase64: string) => {
    setScan({...scan, capturedImage: imageBase64});
    setStep(4);
  };

  return (
    <div className="pb-28">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0F6E56] text-white p-4 rounded-b-xl shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBackHome} className="text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-bold">New Screening</h2>
          <div className="w-5"></div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span>Step {step} / 4</span>
          </div>
          <div className="h-1.5 bg-white bg-opacity-30 rounded-full overflow-hidden">
            <div className="h-full bg-white transition-all" style={{ width: `${(step / 4) * 100}%` }}></div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {step === 1 && <ScanStep1 scan={scan} setScan={setScan} settings={settings} />}
        {step === 2 && <ScanStep2 />}
        {step === 3 && <ScanStep3 onImageCapture={handleCapture} onBack={() => setStep(2)} />}
        {step === 4 && (
          <ScanStep4
            scan={scan}
            onSaveRecord={(record) => {
              onRecordSaved(record);
              onBackHome();
            }}
            onCompleteReferral={() => {
              if (scan.capturedImage) {
                const tempRecord: ScreeningRecord = {
                  id: `${Date.now()}`,
                  babyId: scan.babyId,
                  motherName: scan.motherName,
                  ageHours: scan.ageUnit === 'Hours' ? scan.ageHours : scan.ageHours * 24,
                  birthWeight: scan.birthWeight,
                  gestationalAge: scan.gestationalAge,
                  bilirubin: 0,
                  status: 'Monitor',
                  ward: scan.ward,
                  workerName: scan.workerName,
                  notes: scan.notes,
                  timestamp: Date.now(),
                  imageBase64: scan.capturedImage
                };
                onNavigateToRefer(tempRecord);
              }
            }}
            onNewScan={() => {
              setScan({
                step: 1,
                babyId: generateBabyId(),
                motherName: '',
                ageHours: 0,
                ageUnit: 'Hours',
                birthWeight: 0,
                gestationalAge: '',
                ward: settings.facilityName,
                workerName: settings.workerName,
                notes: '',
                capturedImage: null,
                bilirubin: null,
                imageFile: null
              });
              setStep(1);
            }}
          />
        )}

        {step < 4 && (
          <div className="flex gap-3 pt-4">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-[#1A1A1A] font-bold py-3 px-4 rounded-lg transition-colors"
              >
                Back
              </button>
            )}
            {step < 3 && (
              <button
                onClick={handleNextStep}
                disabled={!canProceed}
                className="flex-1 bg-[#0F6E56] hover:bg-[#0d5844] disabled:bg-gray-300 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                Next
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Records Screen
const RecordsScreen: React.FC<{
  records: ScreeningRecord[];
  onSelectRecord: (record: ScreeningRecord) => void;
}> = ({ records, onSelectRecord }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'All' | 'Normal' | 'Monitor' | 'Refer Urgently'>('All');
  const [selectedRecord, setSelectedRecord] = useState<ScreeningRecord | null>(null);

  const filteredRecords = records
    .filter(r => filter === 'All' || r.status === filter)
    .filter(r =>
      r.babyId.toLowerCase().includes(search.toLowerCase()) ||
      r.motherName.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => b.timestamp - a.timestamp);

  if (selectedRecord) {
    return (
      <div className="pb-28">
        <div className="sticky top-0 z-40 bg-[#0F6E56] text-white p-4 rounded-b-xl shadow-lg flex items-center justify-between">
          <button onClick={() => setSelectedRecord(null)} className="text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-bold">Record Details</h2>
          <div className="w-5"></div>
        </div>

        <div className="p-4 space-y-4">
          {selectedRecord.imageBase64 && (
            <img src={selectedRecord.imageBase64} alt="Scan" className="w-full rounded-lg border-2 border-gray-300" />
          )}

          <div className={`rounded-xl p-6 text-center ${getBiliColor(selectedRecord.status)}`}>
            <p className="text-sm font-semibold mb-1">BILIRUBIN LEVEL</p>
            <p className="text-4xl font-bold">{selectedRecord.bilirubin}</p>
            <p className="text-sm">mg/dL</p>
          </div>

          <div className={`rounded-xl p-3 font-bold text-center text-white text-sm ${getStatusBadgeColor(selectedRecord.status)}`}>
            {selectedRecord.status === 'Normal' ? 'NORMAL' : selectedRecord.status === 'Monitor' ? 'MONITOR CLOSELY' : 'REFER URGENTLY'}
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            <p><strong>Baby ID:</strong> {selectedRecord.babyId}</p>
            <p><strong>Mother:</strong> {selectedRecord.motherName}</p>
            <p><strong>Age:</strong> {selectedRecord.ageHours} hours ({(selectedRecord.ageHours / 24).toFixed(1)} days)</p>
            <p><strong>Birth Weight:</strong> {selectedRecord.birthWeight}g</p>
            <p><strong>Gestational Age:</strong> {selectedRecord.gestationalAge} weeks</p>
            <p><strong>Ward:</strong> {selectedRecord.ward}</p>
            <p><strong>Worker:</strong> {selectedRecord.workerName}</p>
            <p><strong>Date/Time:</strong> {new Date(selectedRecord.timestamp).toLocaleString()}</p>
            {selectedRecord.notes && <p><strong>Notes:</strong> {selectedRecord.notes}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-28">
      <div className="sticky top-0 z-40 bg-[#0F6E56] text-white p-4 rounded-b-xl shadow-lg">
        <h2 className="font-bold text-lg mb-4">Screening Records</h2>
        <input
          type="text"
          placeholder="Search by Baby ID or mother name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 rounded-lg text-[#1A1A1A]"
        />
      </div>

      <div className="p-4 space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {(['All', 'Normal', 'Monitor', 'Refer Urgently'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full font-semibold whitespace-nowrap transition-colors ${
                filter === f
                  ? 'bg-[#0F6E56] text-white'
                  : 'bg-[#E1F5EE] text-[#0F6E56]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {filteredRecords.length === 0 ? (
          <div className="bg-[#E1F5EE] rounded-xl p-6 text-center">
            <p className="text-[#5F5E5A] text-sm">No records found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredRecords.map(record => {
              const borderColor = record.status === 'Normal' ? '#27500A' : record.status === 'Monitor' ? '#BA7517' : '#A32D2D';
              return (
                <button
                  key={record.id}
                  onClick={() => setSelectedRecord(record)}
                  className="w-full bg-white rounded-xl p-4 text-left hover:shadow-md transition-all relative overflow-hidden"
                  style={{ borderLeft: `4px solid ${borderColor}` }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="inline-block text-xs font-bold text-[#0F6E56] bg-[#E1F5EE] px-2.5 py-0.5 rounded-full">
                        {record.babyId}
                      </span>
                      <p className="text-xs text-[#5F5E5A] mt-1 font-semibold">{record.motherName}</p>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${getStatusBadgeColor(record.status)}`}>
                      {record.status === 'Normal' ? 'NORMAL' : record.status === 'Monitor' ? 'MONITOR' : 'REFER'}
                    </span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="font-bold text-2xl" style={{ color: borderColor }}>
                        {record.bilirubin}
                      </span>
                      <span className="text-sm font-normal" style={{ color: borderColor }}> mg/dL</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#5F5E5A]">
                        {record.ward} · {new Date(record.timestamp).toLocaleDateString()}
                      </span>
                      <span
                        className="rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ width: 20, height: 20, background: '#F5A623' }}
                      >
                        <svg viewBox="0 0 24 24" width={12} height={12} fill="white">
                          <circle cx="12" cy="7" r="3.5" />
                          <path d="M5 22 Q5 13 12 13 Q19 13 19 22 Z" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// Referral Screen
const ReferralScreen: React.FC<{
  records: ScreeningRecord[];
  referrals: ReferralRecord[];
  settings: AppSettings;
  prefilledRecord?: ScreeningRecord;
  onBackHome: () => void;
}> = ({ records, referrals, settings, prefilledRecord, onBackHome }) => {
  const [selectedScreeningId, setSelectedScreeningId] = useState(prefilledRecord?.id || '');
  const [referredTo, setReferredTo] = useState(settings.referralHospital);
  const [actionsTaken, setActionsTaken] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [showPrintModal, setShowPrintModal] = useState(false);

  const screeningRecord = selectedScreeningId
    ? records.find(r => r.id === selectedScreeningId)
    : prefilledRecord;

  const referralId = `JCR-${Date.now()}`;

  const relevantRecords = records.filter(r => r.status !== 'Normal');

  const toggleAction = (action: string) => {
    setActionsTaken(prev =>
      prev.includes(action)
        ? prev.filter(a => a !== action)
        : [...prev, action]
    );
  };

  const generateReferralLetter = () => {
    if (!screeningRecord) return '';

    return `
JAUNDICECARE TANZANIA — NEONATAL REFERRAL LETTER

Date: ${new Date().toLocaleDateString()}
Reference: ${referralId}

─────────────────────────────────────────────

PATIENT INFORMATION
Baby ID: ${screeningRecord.babyId}
Mother: ${screeningRecord.motherName}
Age at Screening: ${screeningRecord.ageHours} hours
Birth Weight: ${screeningRecord.birthWeight}g
Gestational Age: ${screeningRecord.gestationalAge} weeks

SCREENING RESULTS
Bilirubin Level: ${screeningRecord.bilirubin} mg/dL
Status: ${screeningRecord.status}
Date of Screening: ${new Date(screeningRecord.timestamp).toLocaleString()}

REFERRAL DETAILS
Referring Facility: ${screeningRecord.ward}
Referred To: ${referredTo}
Referring Healthcare Worker: ${screeningRecord.workerName}

REASON FOR REFERRAL
${screeningRecord.status === 'Monitor'
  ? 'Bilirubin approaching phototherapy threshold. Monitoring required.'
  : 'Critical bilirubin level. Immediate phototherapy and confirmatory TSB required.'}

ACTIONS TAKEN
${actionsTaken.length > 0 ? actionsTaken.map(a => `✓ ${a}`).join('\n') : '• None yet'}

ADDITIONAL NOTES
${notes || 'None'}

─────────────────────────────────────────────

DISCLAIMER
This referral is based on smartphone-assisted bilirubin estimation and must be confirmed by laboratory TSB before final clinical decisions.

Generated by JaundiceCARE Tanzania
www.jaundicecare.org

Referred by: ${screeningRecord.workerName}
Facility: ${screeningRecord.ward}
Date: ${new Date().toLocaleDateString()}
    `.trim();
  };

  return (
    <div className="pb-28">
      <div className="sticky top-0 z-40 bg-[#0F6E56] text-white p-4 rounded-b-xl shadow-lg flex items-center justify-between">
        <button onClick={onBackHome} className="text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-bold">Referral Form</h2>
        <div className="w-5"></div>
      </div>

      <div className="p-4 space-y-4">
        {!prefilledRecord && (
          <div>
            <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Select Patient *</label>
            <select
              value={selectedScreeningId}
              onChange={(e) => setSelectedScreeningId(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#0F6E56] focus:outline-none"
            >
              <option value="">Choose a patient...</option>
              {relevantRecords.map(r => (
                <option key={r.id} value={r.id}>
                  {r.babyId} - {r.motherName} ({r.bilirubin} mg/dL)
                </option>
              ))}
            </select>
          </div>
        )}

        {screeningRecord && (
          <>
            <div className="bg-blue-50 rounded-lg p-4 space-y-2 text-sm">
              <p><strong>Baby ID:</strong> {screeningRecord.babyId}</p>
              <p><strong>Mother:</strong> {screeningRecord.motherName}</p>
              <p><strong>Bilirubin:</strong> {screeningRecord.bilirubin} mg/dL</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Referred To *</label>
              <input
                type="text"
                value={referredTo}
                onChange={(e) => setReferredTo(e.target.value)}
                placeholder="Hospital or physician name"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#0F6E56] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-[#1A1A1A] mb-3">Actions Taken</label>
              <div className="space-y-2">
                {['Started phototherapy', 'Performed TSB lab test', 'Contacted neonatologist', 'Notified family'].map(action => (
                  <label key={action} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                    <input
                      type="checkbox"
                      checked={actionsTaken.includes(action)}
                      onChange={() => toggleAction(action)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-[#1A1A1A]">{action}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[#1A1A1A] mb-2">Additional Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional clinical information..."
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#0F6E56] focus:outline-none"
              />
            </div>

            <button
              onClick={() => setShowPrintModal(true)}
              className="w-full bg-[#0F6E56] hover:bg-[#0d5844] text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              Generate Referral Letter
            </button>
          </>
        )}

        {!screeningRecord && selectedScreeningId && (
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-sm text-[#A32D2D]">Record not found</p>
          </div>
        )}
      </div>

      {/* Print Modal */}
      {showPrintModal && screeningRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50">
          <div className="bg-white w-full rounded-t-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h3 className="font-bold text-[#1A1A1A]">Referral Letter</h3>
              <button onClick={() => setShowPrintModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <pre className="whitespace-pre-wrap font-mono text-xs text-[#1A1A1A] bg-gray-50 p-4 rounded-lg mb-4 overflow-auto">
                {generateReferralLetter()}
              </pre>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    window.print();
                    setShowPrintModal(false);
                  }}
                  className="w-full bg-[#0F6E56] hover:bg-[#0d5844] text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  Print
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generateReferralLetter());
                    alert('Referral letter copied to clipboard');
                    setShowPrintModal(false);
                  }}
                  className="w-full bg-[#185FA5] hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" /> Copy to Clipboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Settings Screen
const SettingsScreen: React.FC<{
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  records: ScreeningRecord[];
  onExport: () => void;
  onClearData: () => void;
  onSignOut: () => void;
}> = ({ settings, onSettingsChange, records, onExport, onClearData, onSignOut }) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleExportCSV = () => {
    const headers = ['Baby ID', 'Mother Name', 'Age (hours)', 'Birth Weight (g)', 'Gestational Age', 'Bilirubin (mg/dL)', 'Status', 'Ward', 'Worker', 'Notes', 'Timestamp'];
    const rows = records.map(r => [
      r.babyId,
      r.motherName,
      r.ageHours,
      r.birthWeight,
      r.gestationalAge,
      r.bilirubin,
      r.status,
      r.ward,
      r.workerName,
      r.notes,
      new Date(r.timestamp).toLocaleString()
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jaundicecare-records-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="pb-28">
      <div className="bg-[#0F6E56] text-white p-4 rounded-b-xl shadow-lg">
        <h2 className="font-bold text-lg">Settings</h2>
      </div>

      <div className="p-4 space-y-6">
        {/* Worker Information */}
        <div>
          <h3 className="font-bold text-[#1A1A1A] mb-3">Healthcare Worker</h3>
          <input
            type="text"
            placeholder="Your name"
            value={settings.workerName}
            onChange={(e) => onSettingsChange({...settings, workerName: e.target.value})}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#0F6E56] focus:outline-none"
          />
        </div>

        {/* Facility Information */}
        <div>
          <h3 className="font-bold text-[#1A1A1A] mb-3">Facility / Ward Name</h3>
          <input
            type="text"
            placeholder="Facility or ward name"
            value={settings.facilityName}
            onChange={(e) => onSettingsChange({...settings, facilityName: e.target.value})}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#0F6E56] focus:outline-none"
          />
        </div>

        {/* Referral Hospital */}
        <div>
          <h3 className="font-bold text-[#1A1A1A] mb-3">Default Referral Hospital</h3>
          <input
            type="text"
            placeholder="Hospital name for referrals"
            value={settings.referralHospital}
            onChange={(e) => onSettingsChange({...settings, referralHospital: e.target.value})}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#0F6E56] focus:outline-none"
          />
        </div>

        {/* Sound Alerts */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <label className="font-semibold text-[#1A1A1A]">Sound Alerts for Critical Results</label>
          <button
            onClick={() => onSettingsChange({...settings, soundAlerts: !settings.soundAlerts})}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.soundAlerts ? 'bg-[#0F6E56]' : 'bg-gray-300'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              settings.soundAlerts ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {/* Data Management */}
        <div>
          <h3 className="font-bold text-[#1A1A1A] mb-3">Data Management</h3>
          <div className="space-y-2">
            <button
              onClick={handleExportCSV}
              className="w-full bg-[#185FA5] hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> Export Records as CSV
            </button>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="w-full bg-[#A32D2D] hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Clear All Records
            </button>
          </div>
        </div>

        {/* About */}
        <div className="bg-blue-50 rounded-lg p-4 space-y-3">
          <h3 className="font-bold text-[#1A1A1A]">About</h3>
          <div className="text-xs text-[#1A1A1A] space-y-2">
            <p><strong>Version:</strong> v1.0.0</p>
            <p className="leading-relaxed">
              JaundiceCARE Tanzania is a smartphone-based neonatal jaundice screening prototype developed for academic and research purposes.
            </p>
            <p className="leading-relaxed">
              <strong>Technology:</strong> Picterus AS (Norway) / GOAL 3 (Netherlands) — Eurostars Programme
            </p>
            <p className="leading-relaxed text-amber-900">
              This app does not replace clinical diagnosis. Always confirm results with laboratory testing.
            </p>
          </div>
        </div>

        {/* Admin Access */}
        <div>
          <h3 className="font-bold text-[#1A1A1A] mb-3">Admin Access</h3>
          <a
            href="/admin"
            className="inline-flex items-center gap-2 px-4 py-2 border-2 border-[#0F6E56] text-[#0F6E56] rounded-lg text-sm font-semibold hover:bg-[#E1F5EE] transition-colors"
          >
            Open Admin Portal →
          </a>
        </div>

        {/* Sign Out */}
        <div>
          <button
            onClick={onSignOut}
            className="w-full flex items-center justify-center gap-2 bg-[#A32D2D] hover:bg-red-700 text-white font-bold py-3.5 px-4 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" /> Sign Out
          </button>
          <p className="text-xs text-[#5F5E5A] text-center mt-2">You will be returned to the login screen</p>
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm space-y-4">
            <h3 className="font-bold text-lg text-[#1A1A1A]">Clear All Records?</h3>
            <p className="text-sm text-[#5F5E5A]">This action cannot be undone. All screening records will be permanently deleted.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-[#1A1A1A] font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onClearData();
                  setShowClearConfirm(false);
                }}
                className="flex-1 bg-[#A32D2D] hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Bottom Navigation
const BottomNav: React.FC<{
  currentScreen: string;
  onNavigate: (screen: string) => void;
}> = ({ currentScreen, onNavigate }) => {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'scan', label: 'Scan', icon: Camera },
    { id: 'records', label: 'Records', icon: FileText },
    { id: 'refer', label: 'Refer', icon: Send },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white px-2 py-2 flex justify-around items-center max-w-2xl mx-auto w-full"
      style={{ borderTop: '1px solid #E5E3DC', boxShadow: '0 -2px 10px rgba(0,0,0,0.06)' }}
    >
      {navItems.map(({ id, label, icon: Icon }) => {
        const active = currentScreen === id;
        return (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className="flex flex-col items-center justify-center py-2 px-3 transition-colors min-h-16"
            style={{ color: active ? '#0F6E56' : '#B4B2A9' }}
          >
            <Icon className="w-5 h-5 mb-1" />
            {active && (
              <span
                className="rounded-full mt-0.5"
                style={{ width: 4, height: 4, background: '#F5A623' }}
              />
            )}
            {active && (
              <span className="font-bold" style={{ fontSize: 10, color: '#0F6E56' }}>
                {label}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};

// Main App
export default function App() {
  const [registered, setRegisteredState] = useState(() => isRegistered() || !!getCurrentUser());
  const [currentScreen, setCurrentScreen] = useState('home');

  // Initialize sync engine + location watch on app mount
  useEffect(() => {
    const cleanupSync = initSyncEngine();
    startLocationWatch();
    return () => {
      cleanupSync();
    };
  }, []);
  const [records, setRecords] = useState<ScreeningRecord[]>(() => {
    const stored = localStorage.getItem('jaundiceCare_records');
    return stored ? JSON.parse(stored) : [];
  });
  const [referrals, setReferrals] = useState<ReferralRecord[]>(() => {
    const stored = localStorage.getItem('jaundiceCare_referrals');
    return stored ? JSON.parse(stored) : [];
  });
  const [settings, setSettings] = useState<AppSettings>(() => {
    const stored = localStorage.getItem('jaundiceCare_settings');
    return stored ? JSON.parse(stored) : {
      workerName: '',
      facilityName: '',
      referralHospital: '',
      soundAlerts: false
    };
  });
  const [selectedRecordForReferral, setSelectedRecordForReferral] = useState<ScreeningRecord | null>(null);
  const [selectedRecordDetail, setSelectedRecordDetail] = useState<ScreeningRecord | null>(null);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('jaundiceCare_records', JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    localStorage.setItem('jaundiceCare_referrals', JSON.stringify(referrals));
  }, [referrals]);

  useEffect(() => {
    localStorage.setItem('jaundiceCare_settings', JSON.stringify(settings));
  }, [settings]);

  const handleRecordSaved = (record: ScreeningRecord) => {
    setRecords([...records, record]);
    if (settings.soundAlerts && record.status === 'Refer Urgently') {
      // Simple beep using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gain.gain.setValueAtTime(0.3, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    }
  };

  const handleNavigate = (screen: string) => {
    setCurrentScreen(screen);
    setSelectedRecordDetail(null);
    setSelectedRecordForReferral(null);
  };

  if (!registered) {
    return (
      <EntryScreen onComplete={() => setRegisteredState(true)} />
    );
  }

  const currentUser = getCurrentUser();
  if (currentUser?.userType === 'facility') {
    return (
      <FacilityDashboard
        onSignOut={() => {
          signOut();
          setRegisteredState(false);
        }}
      />
    );
  }

  return (
    <div className="h-screen bg-[#F7F6F2] flex flex-col max-w-2xl mx-auto relative">
      <OfflineIndicator />
      <div className="flex-1 overflow-y-auto">
        {currentScreen === 'home' && (
          <HomeScreen
            records={records}
            referrals={referrals}
            onStartScan={() => setCurrentScreen('scan')}
            onSelectRecord={(record) => {
              setSelectedRecordDetail(record);
              setCurrentScreen('records');
            }}
          />
        )}
        {currentScreen === 'scan' && (
          <ScanScreen
            records={records}
            referrals={referrals}
            settings={settings}
            onRecordSaved={handleRecordSaved}
            onNavigateToRefer={(record) => {
              setSelectedRecordForReferral(record);
              setCurrentScreen('refer');
            }}
            onBackHome={() => setCurrentScreen('home')}
          />
        )}
        {currentScreen === 'records' && (
          <RecordsScreen
            records={records}
            onSelectRecord={setSelectedRecordDetail}
          />
        )}
        {currentScreen === 'refer' && (
          <ReferralScreen
            records={records}
            referrals={referrals}
            settings={settings}
            prefilledRecord={selectedRecordForReferral || undefined}
            onBackHome={() => setCurrentScreen('home')}
          />
        )}
        {currentScreen === 'settings' && (
          <SettingsScreen
            settings={settings}
            onSettingsChange={setSettings}
            records={records}
            onExport={() => {
              const headers = ['Baby ID', 'Mother Name', 'Age (hours)', 'Birth Weight (g)', 'Gestational Age', 'Bilirubin (mg/dL)', 'Status', 'Ward', 'Worker', 'Notes', 'Timestamp'];
              const rows = records.map(r => [
                r.babyId,
                r.motherName,
                r.ageHours,
                r.birthWeight,
                r.gestationalAge,
                r.bilirubin,
                r.status,
                r.ward,
                r.workerName,
                r.notes,
                new Date(r.timestamp).toLocaleString()
              ]);

              const csv = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
              ].join('\n');

              const blob = new Blob([csv], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `jaundicecare-records-${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
            }}
            onClearData={() => {
              setRecords([]);
              setReferrals([]);
            }}
            onSignOut={() => {
              signOut();
              setRegisteredState(false);
            }}
          />
        )}
      </div>
      <BottomNav currentScreen={currentScreen} onNavigate={handleNavigate} />
    </div>
  );
}
