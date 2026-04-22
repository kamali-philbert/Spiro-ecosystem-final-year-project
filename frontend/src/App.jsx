import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';

// Pages
import Landing               from './pages/Landing';
import Login                 from './pages/Login';
import RiderDashboard        from './pages/rider/RiderDashboard';
import StationMap            from './pages/rider/StationMap';
import SwapScreen            from './pages/rider/SwapScreen';
import BatteryStatus         from './pages/rider/BatteryStatus';
import Subscription          from './pages/rider/Subscription';
import SwapHistory           from './pages/rider/SwapHistory';
import Notifications         from './pages/rider/Notifications';
import TechnicianDashboard   from './pages/technician/TechnicianDashboard';
import DiagnosticPortal      from './pages/technician/DiagnosticPortal';
import RepairTickets         from './pages/technician/RepairTickets';
import MaintenanceChecklist  from './pages/technician/MaintenanceChecklist';
import TechnicianReport      from './pages/technician/TechnicianReport';
import AdminDashboard        from './pages/admin/AdminDashboard';
import UserManagement        from './pages/admin/UserManagement';
import PredictiveAlerts      from './pages/admin/PredictiveAlerts';
import FleetMap              from './pages/admin/FleetMap';
import BatteryHealth         from './pages/admin/BatteryHealth';
import Analytics             from './pages/admin/Analytics';
import StationManagement     from './pages/admin/StationManagement';
import BatteryManagement     from './pages/admin/BatteryManagement';
import SubscriptionManagement from './pages/admin/SubscriptionManagement';
import Reports               from './pages/admin/Reports';
import CashierAudits         from './pages/admin/CashierAudits';
import CashierDashboard      from './pages/cashier/CashierDashboard';
import RiderLookup           from './pages/cashier/RiderLookup';
import TopUpBalance          from './pages/cashier/TopUpBalance';
import DailySummary          from './pages/cashier/DailySummary';
import ProcessSwap           from './pages/cashier/ProcessSwap';

function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-60 flex-1 p-8">{children}</main>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center">
      <p className="text-6xl font-bold text-spiro-400">404</p>
      <p className="text-white mt-4 text-xl">Page not found</p>
      <a href="/" className="btn-primary mt-6 inline-block">Go Home</a>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"      element={<Landing />} />
          <Route path="/login" element={<Login />} />

          {/* RIDER */}
          <Route path="/rider/dashboard" element={
            <ProtectedRoute roles={['RIDER']}><AppLayout><RiderDashboard /></AppLayout></ProtectedRoute>} />
          <Route path="/rider/stations" element={
            <ProtectedRoute roles={['RIDER']}><AppLayout><StationMap /></AppLayout></ProtectedRoute>} />
          <Route path="/rider/swap" element={
            <ProtectedRoute roles={['RIDER']}><AppLayout><SwapScreen /></AppLayout></ProtectedRoute>} />
          <Route path="/rider/battery" element={
            <ProtectedRoute roles={['RIDER']}><AppLayout><BatteryStatus /></AppLayout></ProtectedRoute>} />
          <Route path="/rider/subscription" element={
            <ProtectedRoute roles={['RIDER']}><AppLayout><Subscription /></AppLayout></ProtectedRoute>} />
          <Route path="/rider/swap-history" element={
            <ProtectedRoute roles={['RIDER']}><AppLayout><SwapHistory /></AppLayout></ProtectedRoute>} />
          <Route path="/rider/notifications" element={
            <ProtectedRoute roles={['RIDER']}><AppLayout><Notifications /></AppLayout></ProtectedRoute>} />

          {/* TECHNICIAN */}
          <Route path="/technician/dashboard" element={
            <ProtectedRoute roles={['TECHNICIAN','ADMIN']}><AppLayout><TechnicianDashboard /></AppLayout></ProtectedRoute>} />
          <Route path="/technician/portal" element={
            <ProtectedRoute roles={['TECHNICIAN','ADMIN']}><AppLayout><DiagnosticPortal /></AppLayout></ProtectedRoute>} />
          <Route path="/technician/tickets" element={
            <ProtectedRoute roles={['TECHNICIAN','ADMIN']}><AppLayout><RepairTickets /></AppLayout></ProtectedRoute>} />
          <Route path="/technician/checklist" element={
            <ProtectedRoute roles={['TECHNICIAN','ADMIN']}><AppLayout><MaintenanceChecklist /></AppLayout></ProtectedRoute>} />
          <Route path="/technician/report" element={
            <ProtectedRoute roles={['TECHNICIAN','ADMIN']}><AppLayout><TechnicianReport /></AppLayout></ProtectedRoute>} />

          {/* ADMIN */}
          <Route path="/admin/dashboard" element={
            <ProtectedRoute roles={['ADMIN']}><AppLayout><AdminDashboard /></AppLayout></ProtectedRoute>} />
          <Route path="/admin/fleet" element={
            <ProtectedRoute roles={['ADMIN']}><AppLayout><FleetMap /></AppLayout></ProtectedRoute>} />
          <Route path="/admin/batteries" element={
            <ProtectedRoute roles={['ADMIN']}><AppLayout><BatteryHealth /></AppLayout></ProtectedRoute>} />
          <Route path="/admin/alerts" element={
            <ProtectedRoute roles={['ADMIN']}><AppLayout><PredictiveAlerts /></AppLayout></ProtectedRoute>} />
          <Route path="/admin/users" element={
            <ProtectedRoute roles={['ADMIN']}><AppLayout><UserManagement /></AppLayout></ProtectedRoute>} />
          <Route path="/admin/analytics" element={
            <ProtectedRoute roles={['ADMIN']}><AppLayout><Analytics /></AppLayout></ProtectedRoute>} />
          <Route path="/admin/stations" element={
            <ProtectedRoute roles={['ADMIN']}><AppLayout><StationManagement /></AppLayout></ProtectedRoute>} />
          <Route path="/admin/manage-batteries" element={
            <ProtectedRoute roles={['ADMIN']}><AppLayout><BatteryManagement /></AppLayout></ProtectedRoute>} />
          <Route path="/admin/subscriptions" element={
            <ProtectedRoute roles={['ADMIN']}><AppLayout><SubscriptionManagement /></AppLayout></ProtectedRoute>} />
          <Route path="/admin/reports" element={
            <ProtectedRoute roles={['ADMIN']}><AppLayout><Reports /></AppLayout></ProtectedRoute>} />
          <Route path="/admin/cashier-audits" element={
            <ProtectedRoute roles={['ADMIN']}><AppLayout><CashierAudits /></AppLayout></ProtectedRoute>} />

          {/* CASHIER */}
          <Route path="/cashier/dashboard" element={
            <ProtectedRoute roles={['CASHIER','ADMIN']}><AppLayout><CashierDashboard /></AppLayout></ProtectedRoute>} />
          <Route path="/cashier/rider-lookup" element={
            <ProtectedRoute roles={['CASHIER','ADMIN']}><AppLayout><RiderLookup /></AppLayout></ProtectedRoute>} />
          <Route path="/cashier/topup" element={
            <ProtectedRoute roles={['CASHIER','ADMIN']}><AppLayout><TopUpBalance /></AppLayout></ProtectedRoute>} />
          <Route path="/cashier/daily-summary" element={
            <ProtectedRoute roles={['CASHIER','ADMIN']}><AppLayout><DailySummary /></AppLayout></ProtectedRoute>} />
          <Route path="/cashier/process-swap" element={
            <ProtectedRoute roles={['CASHIER','ADMIN']}><AppLayout><ProcessSwap /></AppLayout></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
