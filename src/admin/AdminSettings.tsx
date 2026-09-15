import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Trash2, LogOut, CheckCircle, Phone, MessageCircle } from 'lucide-react';
import { getRecords, getReferrals, exportCSV } from './types';

export default function AdminSettings() {
  const navigate = useNavigate();

  const sessionRaw = localStorage.getItem('jc_admin_session');
  const session = sessionRaw ? JSON.parse(sessionRaw) : { name: 'Administrator', role: 'super_admin' };

  const credsRaw = localStorage.getItem('jc_admin_credentials');
  const creds = credsRaw ? JSON.parse(credsRaw) : { email: 'admin@jaundicecare.tz', password: 'sajahajo' };

  const [displayName, setDisplayName] = useState(session.name ?? 'Administrator');
  const [nameSaved, setNameSaved] = useState(false);

  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState('');
  const [passSaved, setPassSaved] = useState(false);

  const [showClearModal, setShowClearModal] = useState(false);
  const [clearText, setClearText] = useState('');

  const handleSaveName = () => {
    const updated = { ...session, name: displayName };
    localStorage.setItem('jc_admin_session', JSON.stringify(updated));
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2500);
  };

  const handleSavePassword = () => {
    setPassError('');
    if (newPass.length < 6) {
      setPassError('Password must be at least 6 characters.');
      return;
    }
    if (newPass !== confirmPass) {
      setPassError('Passwords do not match.');
      return;
    }
    const updated = { ...creds, password: newPass };
    localStorage.setItem('jc_admin_credentials', JSON.stringify(updated));
    setNewPass('');
    setConfirmPass('');
    setPassSaved(true);
    setTimeout(() => setPassSaved(false), 2500);
  };

  const handleExportScreenings = () => {
    const records = getRecords();
    const headers = ['Baby ID', 'Mother Name', 'Age (hrs)', 'Birth Weight (g)', 'Gestational Age', 'Bilirubin (mg/dL)', 'Status', 'Ward', 'Worker', 'Notes', 'Date'];
    const rows = records.map(r => [
      r.babyId, r.motherName, r.ageHours, r.birthWeight, r.gestationalAge,
      r.bilirubin, r.status, r.ward, r.workerName, r.notes,
      new Date(r.timestamp).toLocaleString()
    ]);
    exportCSV(headers, rows, `all-screenings-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportReferrals = () => {
    const referrals = getReferrals();
    const records = getRecords();
    const headers = ['Ref ID', 'Baby ID', 'Mother', 'Bilirubin', 'Status', 'From', 'Referred To', 'Date'];
    const rows = referrals.map(r => {
      const linked = records.find(rec => rec.id === r.screeningId);
      return [
        r.id, linked?.babyId ?? '—', linked?.motherName ?? '—',
        linked?.bilirubin ?? '—', linked?.status ?? '—',
        linked?.ward ?? '—', r.referredTo,
        new Date(r.referralDate).toLocaleString()
      ];
    });
    exportCSV(headers, rows, `all-referrals-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleClearAll = () => {
    if (clearText !== 'DELETE') return;
    localStorage.removeItem('jaundiceCare_records');
    localStorage.removeItem('jaundiceCare_referrals');
    localStorage.removeItem('jc_announcements');
    setShowClearModal(false);
    setClearText('');
  };

  const handleSignOut = () => {
    localStorage.removeItem('jc_admin_session');
    navigate('/admin', { replace: true });
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Profile */}
      <Section title="Profile">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#1A1A1A] mb-1.5">Display Name</label>
            <div className="flex gap-3">
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="flex-1 px-4 py-2.5 border border-[#E5E3DC] rounded-xl text-sm focus:outline-none focus:border-[#0F6E56]"
              />
              <button
                onClick={handleSaveName}
                className="px-4 py-2.5 bg-[#0F6E56] hover:bg-[#0d5844] text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Save
              </button>
            </div>
            {nameSaved && (
              <p className="text-xs text-[#27500A] flex items-center gap-1 mt-1.5">
                <CheckCircle size={12} /> Name updated
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1A1A1A] mb-1.5">Email</label>
            <input
              type="email"
              value={creds.email}
              readOnly
              className="w-full px-4 py-2.5 border border-[#E5E3DC] rounded-xl text-sm text-[#5F5E5A] bg-[#F7F6F2] cursor-not-allowed"
            />
          </div>
        </div>
      </Section>

      {/* Change password */}
      <Section title="Change Password">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#1A1A1A] mb-1.5">New Password</label>
            <input
              type="password"
              value={newPass}
              onChange={e => setNewPass(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-4 py-2.5 border border-[#E5E3DC] rounded-xl text-sm focus:outline-none focus:border-[#0F6E56]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1A1A1A] mb-1.5">Confirm Password</label>
            <input
              type="password"
              value={confirmPass}
              onChange={e => setConfirmPass(e.target.value)}
              placeholder="Repeat new password"
              className="w-full px-4 py-2.5 border border-[#E5E3DC] rounded-xl text-sm focus:outline-none focus:border-[#0F6E56]"
            />
          </div>
          {passError && (
            <p className="text-xs text-[#A32D2D] bg-[#FAECE7] px-3 py-2 rounded-lg">{passError}</p>
          )}
          {passSaved && (
            <p className="text-xs text-[#27500A] flex items-center gap-1">
              <CheckCircle size={12} /> Password updated successfully
            </p>
          )}
          <button
            onClick={handleSavePassword}
            disabled={!newPass || !confirmPass}
            className="px-4 py-2.5 bg-[#0F6E56] hover:bg-[#0d5844] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-40"
          >
            Update Password
          </button>
        </div>
      </Section>

      {/* App info */}
      <Section title="App Information">
        <div className="space-y-3 text-sm text-[#1A1A1A]">
          <InfoRow label="App Version" value="v1.0.0" />
          <InfoRow label="Project" value="JaundiceCARE Tanzania" />
          <InfoRow label="Technology" value="Picterus AS (Norway) / GOAL 3 (Netherlands)" />
          <div className="pt-2 border-t border-[#F0EFE9]">
            <p className="text-xs font-semibold text-[#5F5E5A] mb-2">Support / Admin Contact</p>
            <div className="flex items-center gap-3">
              <a
                href="tel:+255678419202"
                className="flex items-center gap-2 text-sm font-bold text-[#0F6E56]"
              >
                <Phone size={14} /> +255 678419202
              </a>
              <a
                href="https://wa.me/255678419202"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-[#EAF3DE] text-[#27500A] text-sm font-bold px-4 py-2 rounded-lg hover:bg-[#d8ecc7] transition-colors"
              >
                <MessageCircle size={14} /> WhatsApp Admin
              </a>
            </div>
          </div>
        </div>
      </Section>

      {/* Data management */}
      <Section title="Data Management">
        <div className="space-y-3">
          <button
            onClick={handleExportScreenings}
            className="w-full flex items-center gap-3 px-4 py-3 border border-[#E5E3DC] rounded-xl text-sm font-medium text-[#1A1A1A] hover:border-[#0F6E56] hover:text-[#0F6E56] transition-colors bg-white"
          >
            <Download size={16} className="text-[#0F6E56]" />
            Export all screenings as CSV
          </button>
          <button
            onClick={handleExportReferrals}
            className="w-full flex items-center gap-3 px-4 py-3 border border-[#E5E3DC] rounded-xl text-sm font-medium text-[#1A1A1A] hover:border-[#0F6E56] hover:text-[#0F6E56] transition-colors bg-white"
          >
            <Download size={16} className="text-[#0F6E56]" />
            Export all referrals as CSV
          </button>
          <button
            onClick={() => setShowClearModal(true)}
            className="w-full flex items-center gap-3 px-4 py-3 border border-[#A32D2D]/30 rounded-xl text-sm font-medium text-[#A32D2D] hover:bg-[#FAECE7] transition-colors bg-white"
          >
            <Trash2 size={16} />
            Clear all data
          </button>
        </div>
      </Section>

      {/* Sign out */}
      <div className="pt-2">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-5 py-3 bg-[#A32D2D] hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>

      {/* Clear all modal */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl space-y-4">
            <h3 className="font-bold text-[#1A1A1A] text-lg">Clear All Data?</h3>
            <p className="text-sm text-[#5F5E5A]">
              This will permanently delete all screenings, referrals, and announcements. This cannot be undone.
            </p>
            <div>
              <label className="block text-xs font-semibold text-[#1A1A1A] mb-1.5">
                Type <span className="font-mono text-[#A32D2D]">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={clearText}
                onChange={e => setClearText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-4 py-2.5 border border-[#E5E3DC] rounded-xl text-sm focus:outline-none focus:border-[#A32D2D]"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowClearModal(false); setClearText(''); }}
                className="flex-1 py-2.5 border border-[#E5E3DC] rounded-xl text-sm font-semibold text-[#1A1A1A] hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                disabled={clearText !== 'DELETE'}
                className="flex-1 py-2.5 bg-[#A32D2D] hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-40"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E3DC] shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-[#E5E3DC]">
        <h2 className="font-semibold text-[#1A1A1A] text-sm">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-[#F0EFE9] last:border-0">
      <span className="text-[#5F5E5A] text-sm">{label}</span>
      <span className="font-medium text-sm text-right max-w-48">{value}</span>
    </div>
  );
}
