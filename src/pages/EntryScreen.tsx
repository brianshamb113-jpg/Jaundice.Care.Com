import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Loader2, ChevronDown, CheckCircle, AlertCircle,
  Phone, Lock, User, Building2, Users, ArrowRight, Shield,
} from 'lucide-react';
import {
  TANZANIA_REGIONS, FACILITY_TYPES, saveLocation,
  addJcUser, addJcFacility, findJcUserByPhone, findJcFacilityByPhone, setCurrentUser,
  type JcUser, type JcFacility, type GeoLocation,
} from '../lib/user';

type Tab = 'signin' | 'register' | 'admin';

interface EntryScreenProps {
  onComplete: () => void;
}

export default function EntryScreen({ onComplete }: EntryScreenProps) {
  const [activeTab, setActiveTab] = useState<Tab>('signin');

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0F6E56] to-[#0A4D3D] flex flex-col items-center px-4 py-8 overflow-y-auto">
      <div className="flex flex-col items-center mb-6 mt-4">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-3 shadow-lg">
          <span className="text-[#0F6E56] text-3xl">☀</span>
        </div>
        <h1 className="text-white text-2xl font-bold text-center">JaundiceCARE Tanzania</h1>
        <p className="text-white/70 text-sm mt-1">Neonatal Screening Tool</p>
      </div>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden mb-8">
        <div className="flex border-b border-[#E5E3DC]">
          <TabButton active={activeTab === 'signin'} onClick={() => setActiveTab('signin')} label="Sign In" />
          <TabButton active={activeTab === 'register'} onClick={() => setActiveTab('register')} label="Register" />
          <TabButton active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} label="Admin" />
        </div>

        <div className="p-6">
          {activeTab === 'signin' && <SignInTab onComplete={onComplete} />}
          {activeTab === 'register' && <RegisterTab onComplete={onComplete} />}
          {activeTab === 'admin' && <AdminTab />}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-3 text-sm font-bold transition-colors ${
        active
          ? 'text-[#0F6E56] border-b-2 border-[#0F6E56] bg-[#E1F5EE]/50'
          : 'text-[#5F5E5A] hover:text-[#0F6E56]'
      }`}
    >
      {label}
    </button>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-[#A32D2D] mt-1">{message}</p>;
}

function GpsButton({ onDetected }: { onDetected: (loc: GeoLocation) => void }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [text, setText] = useState('');

  const detect = () => {
    setStatus('loading');
    if (!navigator.geolocation) {
      setStatus('error');
      setText('GPS not available on this device');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        saveLocation(loc);
        setStatus('success');
        setText(`Location: ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`);
        onDetected(loc);
      },
      () => {
        setStatus('error');
        setText('Unable to get location. Please check permissions.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div>
      <button
        onClick={detect}
        disabled={status === 'loading'}
        className="w-full bg-[#E1F5EE] hover:bg-[#d0ebd9] text-[#0F6E56] font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60 border border-[#0F6E56]/20"
      >
        {status === 'loading' ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Detecting...</>
        ) : (
          <><MapPin className="w-4 h-4" /> Get GPS Location</>
        )}
      </button>
      {status === 'success' && (
        <div className="flex items-center gap-2 mt-2 text-xs text-[#27500A]">
          <CheckCircle className="w-4 h-4" /> {text}
        </div>
      )}
      {status === 'error' && (
        <p className="text-xs text-[#A32D2D] mt-2">{text}</p>
      )}
    </div>
  );
}

function RegionDropdown({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#1A1A1A] mb-1.5">Region *</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E1F5EE] appearance-none pr-10 ${
            error ? 'border-[#A32D2D] bg-red-50' : 'border-[#E5E3DC]'
          }`}
        >
          <option value="">Select region...</option>
          {TANZANIA_REGIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5F5E5A] pointer-events-none" size={18} />
      </div>
      <FieldError message={error} />
    </div>
  );
}

function Input({
  label, type = 'text', value, onChange, placeholder, error, required,
}: {
  label: string; type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; error?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#1A1A1A] mb-1.5">
        {label} {required && <span className="text-[#A32D2D]">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E1F5EE] transition-all ${
          error ? 'border-[#A32D2D] bg-red-50' : 'border-[#E5E3DC]'
        }`}
      />
      <FieldError message={error} />
    </div>
  );
}

const ADMIN_EMAIL = 'admin@jaundicecare.tz';
const ADMIN_PASSWORD = 'sajahajo';
const ADMIN_PHONE = '+255 678419202';

function SignInTab({ onComplete }: { onComplete: () => void }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!phone.trim() || !password.trim()) {
      setError('Please enter your phone number and password.');
      return;
    }

    // Check parents first
    const user = findJcUserByPhone(phone.trim());
    if (user) {
      if (user.password !== password) {
        setError('Incorrect password. Please try again.');
        return;
      }
      setCurrentUser({
        id: user.id,
        fullName: user.fullName,
        phone: user.phone,
        userType: 'parent',
        region: user.region,
        district: user.district,
        village: user.village,
        facility: user.facility,
        location: user.location,
        loginAt: Date.now(),
      });
      onComplete();
      return;
    }

    // Check facilities
    const facility = findJcFacilityByPhone(phone.trim());
    if (facility) {
      if (facility.password !== password) {
        setError('Incorrect password. Please try again.');
        return;
      }
      setCurrentUser({
        id: facility.id,
        fullName: facility.inChargeName,
        phone: facility.inChargePhone,
        userType: 'facility',
        region: facility.region,
        district: facility.district,
        village: '',
        facility: facility.facilityName,
        facilityName: facility.facilityName,
        facilityType: facility.facilityType,
        location: facility.location,
        loginAt: Date.now(),
      });
      onComplete();
      return;
    }

    setError('No account found with this phone number. Please register first.');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[#1A1A1A] mb-1">Welcome Back</h2>
        <p className="text-sm text-[#5F5E5A]">Sign in with your phone and password</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-[#1A1A1A] mb-1.5">Phone Number</label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5F5E5A]" size={18} />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0712 345 678"
            className="w-full pl-10 pr-4 py-3 border border-[#E5E3DC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E1F5EE] transition-all"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-[#1A1A1A] mb-1.5">Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5F5E5A]" size={18} />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full pl-10 pr-4 py-3 border border-[#E5E3DC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E1F5EE] transition-all"
          />
        </div>
      </div>

      {error && (
        <div className="bg-[#FAECE7] border border-[#A32D2D] rounded-xl px-4 py-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-[#A32D2D] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[#A32D2D] font-medium">{error}</p>
        </div>
      )}

      <button
        type="submit"
        className="w-full bg-[#0F6E56] hover:bg-[#0d5844] text-white font-bold py-3.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        Sign In <ArrowRight className="w-4 h-4" />
      </button>

      <p className="text-center text-xs text-[#5F5E5A]">
        Don't have an account?{' '}
        <button type="button" className="text-[#0F6E56] font-semibold hover:underline" onClick={() => {}}>
          Register here
        </button>
      </p>
    </form>
  );
}

function RegisterTab({ onComplete }: { onComplete: () => void }) {
  const [userType, setUserType] = useState<'parent' | 'facility' | null>(null);
  const [facilitySuccess, setFacilitySuccess] = useState(false);

  if (facilitySuccess) {
    return <FacilitySuccessScreen />;
  }

  if (userType === 'parent') {
    return <ParentForm onComplete={onComplete} onBack={() => setUserType(null)} />;
  }

  if (userType === 'facility') {
    return <FacilityForm onComplete={() => setFacilitySuccess(true)} onBack={() => setUserType(null)} />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[#1A1A1A] mb-1">Create Account</h2>
        <p className="text-sm text-[#5F5E5A]">Select your account type to get started</p>
      </div>

      <button
        onClick={() => setUserType('parent')}
        className="w-full p-5 rounded-2xl border-2 border-[#0F6E56] bg-[#E1F5EE]/50 hover:bg-[#E1F5EE] transition-all text-left group"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#0F6E56] rounded-xl flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-[#0F6E56] text-base">Parent / Guardian</p>
            <p className="text-xs text-[#5F5E5A] mt-0.5">For parents and caregivers of newborns</p>
          </div>
          <ArrowRight className="w-5 h-5 text-[#0F6E56] opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </div>
      </button>

      <button
        onClick={() => setUserType('facility')}
        className="w-full p-5 rounded-2xl border-2 border-[#185FA5] bg-[#E8F1FA]/50 hover:bg-[#E8F1FA] transition-all text-left group"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#185FA5] rounded-xl flex items-center justify-center flex-shrink-0">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-[#185FA5] text-base">Health Facility</p>
            <p className="text-xs text-[#5F5E5A] mt-0.5">For hospitals, clinics, and health centers</p>
          </div>
          <ArrowRight className="w-5 h-5 text-[#185FA5] opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </div>
      </button>
    </div>
  );
}

function ParentForm({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [region, setRegion] = useState('');
  const [district, setDistrict] = useState('');
  const [village, setVillage] = useState('');
  const [facility, setFacility] = useState('');
  const [location, setLocation] = useState<GeoLocation | undefined>(undefined);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'Full name is required';
    if (!phone.trim()) e.phone = 'Phone number is required';
    if (!password) e.password = 'Password is required';
    if (password.length < 6) e.password = 'Password must be at least 6 characters';
    if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!region) e.region = 'Please select a region';
    if (!facility.trim()) e.facility = 'Nearest health facility is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const user: JcUser = {
      id: `usr-${Date.now()}`,
      fullName: fullName.trim(),
      phone: phone.trim(),
      password,
      userType: 'parent',
      region,
      district: district.trim(),
      village: village.trim(),
      facility: facility.trim(),
      location,
      createdAt: Date.now(),
    };
    addJcUser(user);

    setCurrentUser({
      id: user.id,
      fullName: user.fullName,
      phone: user.phone,
      userType: 'parent',
      region: user.region,
      district: user.district,
      village: user.village,
      facility: user.facility,
      location: user.location,
      loginAt: Date.now(),
    });
    onComplete();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <BackButton onClick={onBack} label="Back to account types" />
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 bg-[#0F6E56] rounded-lg flex items-center justify-center">
          <Users className="w-4 h-4 text-white" />
        </div>
        <h2 className="text-lg font-bold text-[#1A1A1A]">Parent / Guardian Registration</h2>
      </div>

      <Input label="Full Name" value={fullName} onChange={setFullName} placeholder="Enter your full name" error={errors.fullName} required />
      <Input label="Phone Number" type="tel" value={phone} onChange={setPhone} placeholder="0712 345 678" error={errors.phone} required />
      <Input label="Password" type="password" value={password} onChange={setPassword} placeholder="Minimum 6 characters" error={errors.password} required />
      <Input label="Confirm Password" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Re-enter password" error={errors.confirmPassword} required />
      <RegionDropdown value={region} onChange={setRegion} error={errors.region} />
      <Input label="District" value={district} onChange={setDistrict} placeholder="Enter district" />
      <Input label="Village / Street" value={village} onChange={setVillage} placeholder="Enter village or street" />
      <Input label="Nearest Health Facility" value={facility} onChange={setFacility} placeholder="Facility name" error={errors.facility} required />
      <GpsButton onDetected={setLocation} />

      <button type="submit" className="w-full bg-[#0F6E56] hover:bg-[#0d5844] text-white font-bold py-3.5 px-4 rounded-xl transition-colors">
        Register & Continue
      </button>
    </form>
  );
}

function FacilityForm({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const [facilityName, setFacilityName] = useState('');
  const [facilityType, setFacilityType] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [region, setRegion] = useState('');
  const [district, setDistrict] = useState('');
  const [physicalAddress, setPhysicalAddress] = useState('');
  const [location, setLocation] = useState<GeoLocation | undefined>(undefined);
  const [facilityPhone, setFacilityPhone] = useState('');
  const [inChargeName, setInChargeName] = useState('');
  const [inChargePhone, setInChargePhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!facilityName.trim()) e.facilityName = 'Facility name is required';
    if (!facilityType) e.facilityType = 'Please select facility type';
    if (!registrationNumber.trim()) e.registrationNumber = 'Registration number is required';
    if (!region) e.region = 'Please select a region';
    if (!physicalAddress.trim()) e.physicalAddress = 'Physical address is required';
    if (!facilityPhone.trim()) e.facilityPhone = 'Facility phone is required';
    if (!inChargeName.trim()) e.inChargeName = 'In-charge name is required';
    if (!inChargePhone.trim()) e.inChargePhone = 'In-charge phone is required';
    if (!password) e.password = 'Password is required';
    if (password.length < 6) e.password = 'Password must be at least 6 characters';
    if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const facilityRecord: JcFacility = {
      id: `fac-${Date.now()}`,
      facilityName: facilityName.trim(),
      facilityType,
      registrationNumber: registrationNumber.trim(),
      region,
      district: district.trim(),
      physicalAddress: physicalAddress.trim(),
      location,
      facilityPhone: facilityPhone.trim(),
      inChargeName: inChargeName.trim(),
      inChargePhone: inChargePhone.trim(),
      password,
      createdAt: Date.now(),
    };
    addJcFacility(facilityRecord);
    onComplete();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <BackButton onClick={onBack} label="Back to account types" />
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 bg-[#185FA5] rounded-lg flex items-center justify-center">
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <h2 className="text-lg font-bold text-[#1A1A1A]">Health Facility Registration</h2>
      </div>

      <Input label="Facility Name" value={facilityName} onChange={setFacilityName} placeholder="Enter facility name" error={errors.facilityName} required />

      <div>
        <label className="block text-sm font-semibold text-[#1A1A1A] mb-1.5">Facility Type *</label>
        <div className="relative">
          <select
            value={facilityType}
            onChange={(e) => setFacilityType(e.target.value)}
            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E1F5EE] appearance-none pr-10 ${
              errors.facilityType ? 'border-[#A32D2D] bg-red-50' : 'border-[#E5E3DC]'
            }`}
          >
            <option value="">Select type...</option>
            {FACILITY_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5F5E5A] pointer-events-none" size={18} />
        </div>
        <FieldError message={errors.facilityType} />
      </div>

      <Input label="Registration Number" value={registrationNumber} onChange={setRegistrationNumber} placeholder="e.g. REG-00123" error={errors.registrationNumber} required />
      <RegionDropdown value={region} onChange={setRegion} error={errors.region} />
      <Input label="District" value={district} onChange={setDistrict} placeholder="Enter district" />
      <Input label="Physical Address" value={physicalAddress} onChange={setPhysicalAddress} placeholder="Street, building, landmark" error={errors.physicalAddress} required />
      <GpsButton onDetected={setLocation} />
      <Input label="Facility Phone" type="tel" value={facilityPhone} onChange={setFacilityPhone} placeholder="022 123 4567" error={errors.facilityPhone} required />
      <Input label="In-charge Name" value={inChargeName} onChange={setInChargeName} placeholder="Full name of facility in-charge" error={errors.inChargeName} required />
      <Input label="In-charge Phone" type="tel" value={inChargePhone} onChange={setInChargePhone} placeholder="0712 345 678" error={errors.inChargePhone} required />
      <Input label="Password" type="password" value={password} onChange={setPassword} placeholder="Minimum 6 characters" error={errors.password} required />
      <Input label="Confirm Password" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Re-enter password" error={errors.confirmPassword} required />

      <button type="submit" className="w-full bg-[#185FA5] hover:bg-[#145090] text-white font-bold py-3.5 px-4 rounded-xl transition-colors">
        Register Facility
      </button>
    </form>
  );
}

function FacilitySuccessScreen() {
  return (
    <div className="space-y-5 text-center py-6">
      <div className="w-20 h-20 bg-[#E1F5EE] rounded-full flex items-center justify-center mx-auto">
        <CheckCircle className="w-10 h-10 text-[#0F6E56]" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">Facility Registered Successfully!</h2>
        <p className="text-sm text-[#5F5E5A] leading-relaxed">
          Your health facility registration has been submitted for verification.
          You will be contacted once your account is approved.
        </p>
      </div>
      <div className="bg-[#E8F1FA] border border-[#185FA5]/20 rounded-xl p-4">
        <p className="text-xs text-[#5F5E5A] mb-1">For account approval, contact admin:</p>
        <a href={`tel:${ADMIN_PHONE.replace(/\s/g, '')}`} className="text-lg font-bold text-[#185FA5] flex items-center justify-center gap-2">
          <Phone className="w-4 h-4" /> {ADMIN_PHONE}
        </a>
      </div>
    </div>
  );
}

function AdminTab() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (email.trim() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      localStorage.setItem('jc_admin_session', JSON.stringify({
        loggedIn: true,
        role: 'super_admin',
        name: 'Administrator',
      }));
      navigate('/admin/dashboard', { replace: true });
    } else {
      setError('Invalid admin credentials.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 bg-[#1A1A1A] rounded-lg flex items-center justify-center">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <h2 className="text-lg font-bold text-[#1A1A1A]">Admin Login</h2>
      </div>
      <p className="text-sm text-[#5F5E5A] -mt-2">Restricted access for administrators</p>

      <div>
        <label className="block text-sm font-semibold text-[#1A1A1A] mb-1.5">Email</label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5F5E5A]" size={18} />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@jaundicecare.tz"
            className="w-full pl-10 pr-4 py-3 border border-[#E5E3DC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E1F5EE] transition-all"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-[#1A1A1A] mb-1.5">Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5F5E5A]" size={18} />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full pl-10 pr-4 py-3 border border-[#E5E3DC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E1F5EE] transition-all"
          />
        </div>
      </div>

      {error && (
        <div className="bg-[#FAECE7] border border-[#A32D2D] rounded-xl px-4 py-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-[#A32D2D] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[#A32D2D] font-medium">{error}</p>
        </div>
      )}

      <button
        type="submit"
        className="w-full bg-[#1A1A1A] hover:bg-black text-white font-bold py-3.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        <Shield className="w-4 h-4" /> Sign In to Admin
      </button>

      <div className="bg-[#F7F6F2] rounded-xl p-3 text-center">
        <p className="text-xs text-[#5F5E5A]">Need admin access? Call:</p>
        <a href={`tel:${ADMIN_PHONE.replace(/\s/g, '')}`} className="text-sm font-bold text-[#0F6E56] flex items-center justify-center gap-1.5 mt-1">
          <Phone className="w-3.5 h-3.5" /> {ADMIN_PHONE}
        </a>
      </div>
    </form>
  );
}

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm font-semibold text-[#5F5E5A] hover:text-[#0F6E56] transition-colors flex items-center gap-1"
    >
      ← {label}
    </button>
  );
}
