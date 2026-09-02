import { BrowserRouter, Routes, Route } from "react-router-dom";
import UserPage from "./pages/UserPage";
import AdminPage from "./pages/AdminPage";
import QRScanner from "./pages/QRScanner";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import AIInsights from "./pages/AIInsights";
import Attendees from "./pages/Attendees";
import CSVUpload from "./pages/CSVUpload";
import VenueAgent from "./pages/VenueAgent";
import SpeakerAgent from "./pages/SpeakerAgent";
import Scheduling from "./pages/Scheduling";
import SessionAnalytics from "./pages/SessionAnalytics";
import Sponsors from "./pages/Sponsors";
import Incidents from "./pages/Incidents";
import OperationsCenter from "./pages/OperationsCenter";
import Reports from "./pages/Reports";
import ExecutiveCenter from "./pages/ExecutiveCenter";
import AIOperationsCenter from "./pages/AIOperationsCenter";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Registration */}
        <Route
          path="/"
          element={<UserPage />}
        />

        {/* Admin Dashboard */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          }
        />

        {/* AI Insights */}
        <Route
          path="/ai-insights"
          element={
            <ProtectedRoute>
              <AIInsights />
            </ProtectedRoute>
          }
        />

        {/* Attendees */}
        <Route
          path="/attendees"
          element={
            <ProtectedRoute>
              <Attendees />
            </ProtectedRoute>
          }
        />

        {/* QR Scanner */}
        <Route
          path="/qr-scanner"
          element={
            <ProtectedRoute>
              <QRScanner />
            </ProtectedRoute>
          }
        />

        {/* CSV Upload */}
        <Route
          path="/csv-upload"
          element={
            <ProtectedRoute>
              <CSVUpload />
            </ProtectedRoute>
          }
        />

        {/* =================================================
            MILESTONE 2 - VENUE AGENT
        ================================================= */}
        <Route
          path="/venue-agent"
          element={
            <ProtectedRoute>
              <VenueAgent />
            </ProtectedRoute>
          }
        />

        {/* Login */}
        <Route
          path="/login"
          element={<Login />}
        />
<Route
  path="/speaker-agent"
  element={
    <ProtectedRoute>
      <SpeakerAgent />
    </ProtectedRoute>
  }
/>
<Route
  path="/scheduling"
  element={
    <ProtectedRoute>
      <Scheduling />
    </ProtectedRoute>
  }
/>
<Route
  path="/session-analytics"
  element={
    <ProtectedRoute>
      <SessionAnalytics />
    </ProtectedRoute>
  }
/>

        {/* Sponsors */}
        <Route
          path="/sponsors"
          element={
            <ProtectedRoute>
              <Sponsors />
            </ProtectedRoute>
          }
        />

        {/* Incidents */}
        <Route
          path="/incidents"
          element={
            <ProtectedRoute>
              <Incidents />
            </ProtectedRoute>
          }
        />

        {/* Operations Center */}
        <Route
          path="/operations"
          element={
            <ProtectedRoute>
              <OperationsCenter />
            </ProtectedRoute>
          }
        />

        {/* Reports */}
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          }
        />

        {/* Executive Command Center */}
        <Route
          path="/executive"
          element={
            <ProtectedRoute>
              <ExecutiveCenter />
            </ProtectedRoute>
          }
        />

        {/* AI Operations Center */}
        <Route
          path="/ai-operations"
          element={
            <ProtectedRoute>
              <AIOperationsCenter />
            </ProtectedRoute>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;