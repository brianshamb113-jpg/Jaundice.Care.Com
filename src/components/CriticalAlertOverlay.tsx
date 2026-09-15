import { useState, useEffect } from 'react';
import { Bell, Phone, MessageCircle, MapPin, Clock, Building2, Shield } from 'lucide-react';
import {
  getCurrentUser, findJcFacilityByName, composeAlertMessage,
  normalizePhone, addJcAlert, type JcFacility,
} from '../lib/user';

const ADMIN_PHONE = '+255 678419202';

interface CriticalAlertOverlayProps {
  babyId: string;
  bilirubin: number;
  motherName?: string;
  onDismiss: () => void;
}

export default function CriticalAlertOverlay({ babyId, bilirubin, motherName, onDismiss }: CriticalAlertOverlayProps) {
  const [facility, setFacility] = useState<JcFacility | null>(null);
  const [facilityWhatsappOpened, setFacilityWhatsappOpened] = useState(false);
  const [adminWhatsappOpened, setAdminWhatsappOpened] = useState(false);
  const [alertSaved, setAlertSaved] = useState(false);

  const currentUser = getCurrentUser();
  const parentName = motherName || currentUser?.fullName || 'Parent';
  const parentPhone = currentUser?.phone || '';
  const locationStr = [currentUser?.district, currentUser?.region].filter(Boolean).join(', ') || 'Unknown';
  const facilityName = currentUser?.facility || currentUser?.facilityName || '';

  useEffect(() => {
    if (facilityName) {
      const found = findJcFacilityByName(facilityName);
      setFacility(found);
    }
  }, [facilityName]);

  useEffect(() => {
    if (alertSaved) return;
    const message = composeAlertMessage({
      babyId, bilirubin, parentName, parentPhone, location: locationStr, facilityName,
    });
    addJcAlert({
      id: `alert-${Date.now()}`,
      facilityName,
      babyId,
      bilirubin,
      parentName,
      parentPhone,
      location: locationStr,
      createdAt: Date.now(),
      responded: false,
    });
    setAlertSaved(true);
  }, [alertSaved, babyId, bilirubin, parentName, parentPhone, locationStr, facilityName]);

  const fullMessage = composeAlertMessage({
    babyId, bilirubin, parentName, parentPhone, location: locationStr, facilityName,
  });

  const sendWhatsAppToFacility = () => {
    if (facility) {
      const phone = normalizePhone(facility.facilityPhone);
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(fullMessage)}`, '_blank');
      setFacilityWhatsappOpened(true);
    }
  };

  const sendWhatsAppToAdmin = () => {
    const phone = normalizePhone(ADMIN_PHONE);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(fullMessage)}`, '_blank');
    setAdminWhatsappOpened(true);
  };

  return (
    <div className="fixed inset-0 bg-[#A32D2D] z-50 flex flex-col items-center justify-center px-6 py-8 overflow-y-auto animate-fadeIn">
      <div className="relative mb-5">
        <div className="absolute inset-0 bg-white/20 rounded-full animate-ping" />
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center relative animate-bounce-slow">
          <Bell className="w-12 h-12 text-[#A32D2D]" />
        </div>
      </div>

      <h1 className="text-white text-2xl font-bold text-center mb-4">
        CRITICAL ALERT SENT
      </h1>

      <div className="bg-white/10 rounded-2xl p-5 w-full max-w-sm space-y-3 mb-6">
        <div className="flex items-center justify-center gap-2">
          <span className="text-white text-3xl font-bold">{bilirubin}</span>
          <span className="text-white/80 text-sm">mg/dL</span>
        </div>

        {facility ? (
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-white/60 text-xs mb-1 flex items-center gap-1.5">
              <Building2 className="w-3 h-3" /> Alert sent to:
            </p>
            <p className="text-white font-semibold text-sm">{facility.facilityName}</p>
            <a href={`tel:${facility.facilityPhone}`} className="text-white/80 text-xs flex items-center gap-1.5 mt-1">
              <Phone className="w-3 h-3" /> {facility.facilityPhone}
            </a>
          </div>
        ) : (
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-white/60 text-xs mb-1 flex items-center gap-1.5">
              <Building2 className="w-3 h-3" /> Alert sent to:
            </p>
            <p className="text-white font-semibold text-sm">{facilityName || 'Nearest facility'}</p>
          </div>
        )}

        <div className="bg-white/10 rounded-xl p-3">
          <p className="text-white/60 text-xs mb-1 flex items-center gap-1.5">
            <Shield className="w-3 h-3" /> Admin notified:
          </p>
          <p className="text-white font-semibold text-sm">{ADMIN_PHONE}</p>
        </div>
      </div>

      <div className="w-full max-w-sm space-y-3 mb-6">
        <p className="text-white text-center text-sm leading-relaxed">
          Help is being arranged for your baby. Please stay calm and keep your baby warm.
        </p>
        <p className="text-white/80 text-center text-sm leading-relaxed">
          Msaada unaepangwa kwa ajili ya mtoto wako. Tafadhali tulia na umshike mtoto wako joto.
        </p>
      </div>

      <div className="w-full max-w-sm space-y-3 mb-4">
        {facility && (
          <button
            onClick={sendWhatsAppToFacility}
            className="w-full bg-white text-[#A32D2D] font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            {facilityWhatsappOpened ? 'WhatsApp to Facility Sent' : 'Send WhatsApp to Facility'}
          </button>
        )}
        <button
          onClick={sendWhatsAppToAdmin}
          className="w-full bg-white/20 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors border border-white/30"
        >
          <Shield className="w-5 h-5" />
          {adminWhatsappOpened ? 'Alert to Admin Sent' : 'Send Alert to Admin'}
        </button>
      </div>

      <button
        onClick={onDismiss}
        className="w-full max-w-sm bg-white text-[#A32D2D] font-bold py-4 px-4 rounded-xl text-lg transition-colors"
      >
        I UNDERSTAND
      </button>
    </div>
  );
}
