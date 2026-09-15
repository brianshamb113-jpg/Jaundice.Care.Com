export interface ScreeningRecord {
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

export interface ReferralRecord {
  id: string;
  screeningId: string;
  referralDate: number;
  referredTo: string;
  actionsTaken: string[];
}

export interface AdminSession {
  loggedIn: boolean;
  role: string;
  name: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  category: 'General' | 'Clinical Update' | 'Training' | 'Alert' | 'System';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  is_published: boolean;
  created_at: number;
}

export const STATUS_COLORS = {
  Normal: { text: '#27500A', bg: '#EAF3DE' },
  Monitor: { text: '#BA7517', bg: '#FAEEDA' },
  'Refer Urgently': { text: '#A32D2D', bg: '#FAECE7' },
};

export function getStatusBadge(status: string) {
  switch (status) {
    case 'Normal': return 'text-[#27500A] bg-[#EAF3DE]';
    case 'Monitor': return 'text-[#BA7517] bg-[#FAEEDA]';
    case 'Refer Urgently': return 'text-[#A32D2D] bg-[#FAECE7]';
    default: return 'text-gray-600 bg-gray-100';
  }
}

export function getBiliClass(status: string) {
  switch (status) {
    case 'Normal': return 'text-[#27500A]';
    case 'Monitor': return 'text-[#BA7517]';
    case 'Refer Urgently': return 'text-[#A32D2D]';
    default: return 'text-gray-700';
  }
}

export function getSession(): AdminSession | null {
  try {
    const raw = localStorage.getItem('jc_admin_session');
    if (!raw) return null;
    const s = JSON.parse(raw) as AdminSession;
    return s.loggedIn ? s : null;
  } catch {
    return null;
  }
}

export function getRecords(): ScreeningRecord[] {
  try {
    const raw = localStorage.getItem('jaundiceCare_records');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getReferrals(): ReferralRecord[] {
  try {
    const raw = localStorage.getItem('jaundiceCare_referrals');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getAnnouncements(): Announcement[] {
  try {
    const raw = localStorage.getItem('jc_announcements');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAnnouncements(items: Announcement[]) {
  localStorage.setItem('jc_announcements', JSON.stringify(items));
}

export function exportCSV(headers: string[], rows: (string | number)[][], filename: string) {
  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
