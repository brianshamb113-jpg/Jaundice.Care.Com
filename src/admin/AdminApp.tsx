import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import AdminLogin from './AdminLogin';
import AdminLayout from './AdminLayout';
import AdminDashboard from './AdminDashboard';
import AdminChildren, { ChildStoryPage } from './AdminChildren';
import AdminScreenings from './AdminScreenings';
import AdminReferrals from './AdminReferrals';
import AdminAnnouncements from './AdminAnnouncements';
import AdminSettings from './AdminSettings';
import AdminFacilities from './AdminFacilities';
import AdminAlerts from './AdminAlerts';
import AdminParents from './AdminParents';
import { getSession } from './types';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!getSession()) {
      navigate('/admin', { replace: true, state: { from: location } });
    }
  }, [location, navigate]);

  if (!getSession()) return null;
  return <>{children}</>;
}

export default function AdminApp() {
  return (
    <Routes>
      <Route path="/" element={<AdminLogin />} />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <AdminLayout>
              <AdminDashboard />
            </AdminLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/children"
        element={
          <RequireAuth>
            <AdminLayout>
              <AdminChildren />
            </AdminLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/children/:babyId"
        element={
          <RequireAuth>
            <AdminLayout>
              <ChildStoryPage />
            </AdminLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/screenings"
        element={
          <RequireAuth>
            <AdminLayout>
              <AdminScreenings />
            </AdminLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/referrals"
        element={
          <RequireAuth>
            <AdminLayout>
              <AdminReferrals />
            </AdminLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/announcements"
        element={
          <RequireAuth>
            <AdminLayout>
              <AdminAnnouncements />
            </AdminLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/facilities"
        element={
          <RequireAuth>
            <AdminLayout>
              <AdminFacilities />
            </AdminLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/alerts"
        element={
          <RequireAuth>
            <AdminLayout>
              <AdminAlerts />
            </AdminLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/parents"
        element={
          <RequireAuth>
            <AdminLayout>
              <AdminParents />
            </AdminLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/settings"
        element={
          <RequireAuth>
            <AdminLayout>
              <AdminSettings />
            </AdminLayout>
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
