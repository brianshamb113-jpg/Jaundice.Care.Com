export type UserType = 'parent' | 'worker' | 'facility';

export interface UserProfile {
  fullName: string;
  phone: string;
  userType: UserType;
  region: string;
  district: string;
  village: string;
  facility: string;
  // Worker-only fields
  wardName?: string;
  staffId?: string;
  jobTitle?: string;
  // Facility-only fields
  facilityName?: string;
  facilityType?: string;
}

export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface JcUser {
  id: string;
  fullName: string;
  phone: string;
  password: string;
  userType: 'parent';
  region: string;
  district: string;
  village: string;
  facility: string;
  location?: GeoLocation;
  createdAt: number;
}

export interface JcAlert {
  id: string;
  facilityName: string;
  babyId: string;
  bilirubin: number;
  parentName: string;
  parentPhone: string;
  location: string;
  createdAt: number;
  responded: boolean;
  respondedAt?: number;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
}

export interface JcFacility {
  id: string;
  facilityName: string;
  facilityType: string;
  registrationNumber: string;
  region: string;
  district: string;
  physicalAddress: string;
  location?: GeoLocation;
  facilityPhone: string;
  inChargeName: string;
  inChargePhone: string;
  password: string;
  createdAt: number;
}

export interface CurrentUser {
  id: string;
  fullName: string;
  phone: string;
  userType: 'parent' | 'worker' | 'facility';
  region: string;
  district: string;
  village: string;
  facility: string;
  wardName?: string;
  staffId?: string;
  jobTitle?: string;
  facilityName?: string;
  facilityType?: string;
  location?: GeoLocation;
  loginAt: number;
}

export function isRegistered(): boolean {
  return localStorage.getItem('jc_registered') === 'true';
}

export function getUserProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem('jc_user_profile');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveUserProfile(profile: UserProfile) {
  localStorage.setItem('jc_user_profile', JSON.stringify(profile));
}

export function getUserType(): UserType | null {
  const t = localStorage.getItem('jc_user_type');
  return (t === 'parent' || t === 'worker' || t === 'facility') ? t : null;
}

export function setUserType(type: UserType) {
  localStorage.setItem('jc_user_type', type);
}

export function setRegistered() {
  localStorage.setItem('jc_registered', 'true');
}

export function getLocation(): GeoLocation | null {
  try {
    const raw = localStorage.getItem('jc_location');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLocation(loc: GeoLocation) {
  localStorage.setItem('jc_location', JSON.stringify(loc));
}

export function getJcUsers(): JcUser[] {
  try {
    const raw = localStorage.getItem('jc_users');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveJcUsers(users: JcUser[]) {
  localStorage.setItem('jc_users', JSON.stringify(users));
}

export function addJcUser(user: JcUser) {
  const users = getJcUsers();
  users.push(user);
  saveJcUsers(users);
}

export function findJcUserByPhone(phone: string): JcUser | null {
  const users = getJcUsers();
  const normalized = phone.replace(/[\s-]/g, '');
  return users.find(u => u.phone.replace(/[\s-]/g, '') === normalized) || null;
}

export function findJcFacilityByPhone(phone: string): JcFacility | null {
  const facilities = getJcFacilities();
  const normalized = phone.replace(/[\s-]/g, '');
  return facilities.find(f => f.facilityPhone.replace(/[\s-]/g, '') === normalized) || null;
}

export function getJcAlerts(): JcAlert[] {
  try {
    const raw = localStorage.getItem('jc_alerts');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveJcAlerts(alerts: JcAlert[]) {
  localStorage.setItem('jc_alerts', JSON.stringify(alerts));
}

export function markAlertResponded(alertId: string) {
  const alerts = getJcAlerts();
  const idx = alerts.findIndex(a => a.id === alertId);
  if (idx >= 0) {
    alerts[idx].responded = true;
    alerts[idx].respondedAt = Date.now();
    saveJcAlerts(alerts);
  }
}

export function getFacilityPatients(facilityName: string): JcUser[] {
  return getJcUsers().filter(u => u.facility === facilityName);
}

export function findJcFacilityByName(name: string): JcFacility | null {
  const facilities = getJcFacilities();
  return facilities.find(f => f.facilityName === name) || null;
}

export function composeAlertMessage(params: {
  babyId: string;
  bilirubin: number;
  parentName: string;
  parentPhone: string;
  location: string;
  facilityName?: string;
}): string {
  const time = new Date().toLocaleString('en-GB', { timeZone: 'Africa/Dar_es_Salaam' });
  return [
    'JAUNDICECARE CRITICAL ALERT',
    `Baby ID: ${params.babyId}`,
    `Bilirubin Level: ${params.bilirubin} mg/dL — CRITICAL`,
    `Time: ${time}`,
    `Parent Name: ${params.parentName}`,
    `Parent Phone: ${params.parentPhone}`,
    `Location: ${params.location}`,
    `Facility: ${params.facilityName || 'Nearest facility'}`,
    'Action Required: Contact parent immediately and arrange urgent care.',
    'Admin: +255 678419202',
    '— JaundiceCARE Tanzania System',
  ].join('\n');
}

export function normalizePhone(phone: string): string {
  let p = phone.replace(/[\s-]/g, '');
  if (p.startsWith('0')) p = '255' + p.slice(1);
  if (p.startsWith('+')) p = p.slice(1);
  return p;
}

export function addJcAlert(alert: JcAlert) {
  const alerts = getJcAlerts();
  alerts.unshift(alert);
  saveJcAlerts(alerts);
}

export function deleteJcFacility(facilityId: string) {
  const facilities = getJcFacilities();
  saveJcFacilities(facilities.filter(f => f.id !== facilityId));
}

export function verifyJcFacility(facilityId: string) {
  const facilities = getJcFacilities();
  const idx = facilities.findIndex(f => f.id === facilityId);
  if (idx >= 0) {
    facilities[idx].facilityType = facilities[idx].facilityType + ' (Verified)';
    saveJcFacilities(facilities);
  }
}

export function getJcFacilities(): JcFacility[] {
  try {
    const raw = localStorage.getItem('jc_facilities');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveJcFacilities(facilities: JcFacility[]) {
  localStorage.setItem('jc_facilities', JSON.stringify(facilities));
}

export function addJcFacility(facility: JcFacility) {
  const facilities = getJcFacilities();
  facilities.push(facility);
  saveJcFacilities(facilities);
}

export function getCurrentUser(): CurrentUser | null {
  try {
    const raw = localStorage.getItem('jc_current_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: CurrentUser) {
  localStorage.setItem('jc_current_user', JSON.stringify(user));
  const profile: UserProfile = {
    fullName: user.fullName,
    phone: user.phone,
    userType: user.userType,
    region: user.region,
    district: user.district,
    village: user.village,
    facility: user.facility,
    wardName: user.wardName,
    staffId: user.staffId,
    jobTitle: user.jobTitle,
    facilityName: user.facilityName,
    facilityType: user.facilityType,
  };
  saveUserProfile(profile);
  setUserType(user.userType);
  setRegistered();
}

export function clearCurrentUser() {
  localStorage.removeItem('jc_current_user');
  localStorage.removeItem('jc_registered');
  localStorage.removeItem('jc_user_profile');
  localStorage.removeItem('jc_user_type');
}

export function signOut() {
  clearCurrentUser();
}

export interface AlertRecord {
  id: number;
  babyId: string;
  bilirubin: number;
  status: 'Refer Urgently';
  location: { lat: number; lng: number; region: string; district: string } | null;
  facility: string;
  userPhone: string;
  alertedAt: string;
  alertSent: boolean;
  resolved?: boolean;
}

export function getAlerts(): AlertRecord[] {
  try {
    const raw = localStorage.getItem('jc_alerts');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAlerts(alerts: AlertRecord[]) {
  localStorage.setItem('jc_alerts', JSON.stringify(alerts));
}

export function addAlert(alert: AlertRecord) {
  const alerts = getAlerts();
  alerts.unshift(alert);
  saveAlerts(alerts);
}

export function resolveAlert(id: number) {
  const alerts = getAlerts();
  const a = alerts.find(x => x.id === id);
  if (a) {
    a.resolved = true;
    saveAlerts(alerts);
  }
}

export const FACILITY_TYPES = [
  'Dispensary',
  'Health Centre',
  'Clinic',
  'District Hospital',
  'Regional Referral Hospital',
  'Zonal/Specialized Hospital',
  'National Hospital',
];

export const TANZANIA_REGIONS = [
  'Dar es Salaam', 'Dodoma', 'Mwanza', 'Arusha', 'Mbeya', 'Morogoro',
  'Tanga', 'Zanzibar', 'Kilimanjaro', 'Mtwara', 'Lindi', 'Ruvuma',
  'Iringa', 'Njombe', 'Songwe', 'Katavi', 'Kigoma', 'Rukwa', 'Simiyu',
  'Geita', 'Shinyanga', 'Tabora', 'Singida', 'Manyara', 'Pwani',
  'Kagera', 'Pemba North', 'Pemba South', 'Unguja North', 'Unguja South',
];

export const TANZANIA_FACILITIES: Record<string, string[]> = {
  'Dar es Salaam': [
    'Muhimbili National Hospital',
    'Temeke District Hospital',
    'Mwananyamala Hospital',
    'Amana District Hospital',
    'Sinza Hospital',
  ],
  'Mwanza': [
    'Bugando Medical Centre',
    'Sekou Toure Hospital',
    'Mwanza Regional Hospital',
  ],
  'Arusha': [
    'Mount Meru Regional Hospital',
    'Arusha Lutheran Medical Centre',
    'KCMC Hospital',
  ],
  'Dodoma': [
    'Benjamin Mkapa Hospital',
    'Dodoma Regional Referral Hospital',
  ],
  'Mbeya': [
    'Mbeya Zonal Referral Hospital',
    'Mbeya Regional Hospital',
  ],
  'Morogoro': [
    'Morogoro Regional Referral Hospital',
  ],
  'Tanga': [
    'Bombo Regional Hospital',
    'Tanga Regional Referral Hospital',
  ],
  'Zanzibar': [
    'Mnazi Mmoja Hospital',
    'Zanzibar State University Hospital',
  ],
};

export function getFacilitiesForRegion(region: string): string[] {
  return TANZANIA_FACILITIES[region] || [];
}
