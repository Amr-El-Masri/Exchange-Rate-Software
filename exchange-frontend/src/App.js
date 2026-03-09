import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Box } from "@mui/material";
import Navbar from "./components/Navbar";
import ProofPanel from "./components/ProofPanel";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Transactions from "./pages/Transactions";
import Marketplace from "./pages/Marketplace";
import Alerts from "./pages/Alerts";
import Watchlist from "./pages/Watchlist";
import Notifications from "./pages/Notifications";
import Preferences from "./pages/Preferences";
import Admin from "./pages/Admin";
import Graph from "./pages/Graph";
import BASE_URL from "./config";

const BASE = "/amr-el-masri";

function AppContent(){
  const [userToken, setUserToken]= useState(localStorage.getItem("TOKEN"));
  const [userRole, setUserRole]= useState(localStorage.getItem("ROLE"));
  const [userPreferences, setUserPreferences] = useState(null);

  async function fetchPreferences(token) {
    try {
      const response = await fetch(`${BASE_URL}/preferences`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data.default_interval) {
        setUserPreferences(data);
      }
    } catch (err) {
      // silently fail, defaults will be used
    }
  }

  function login(token, role) {
    localStorage.setItem("TOKEN", token);
    localStorage.setItem("ROLE", role);
    setUserToken(token);
    setUserRole(role);
    fetchPreferences(token);
  }

  function logout() {
    localStorage.removeItem("TOKEN");
    localStorage.removeItem("ROLE");
    setUserToken(null);
    setUserRole(null);
    setUserPreferences(null);
  }

  return (
    //Routes and Route define which component to show for which URL
    <div>
      <Navbar userToken={userToken} userRole={userRole} onLogout={logout} />
      <ProofPanel />
      <div style={{ padding: "20px" }}>
        <Box sx={{ marginLeft: "200px", padding: "20px" }}>
          <Routes>
            <Route path={`${BASE}/dashboard`} element={<Dashboard userToken={userToken} userPreferences={userPreferences} />} />
            <Route path={`${BASE}/graph`} element={<Graph userPreferences={userPreferences} />} />
            <Route path={`${BASE}/login`} element={<Login onLogin={login} />} />
            <Route path={`${BASE}/register`} element={<Register onLogin={login}/>} />
            <Route path={`${BASE}/transactions`} element={<Transactions userToken={userToken} />} />
            <Route path={`${BASE}/marketplace`} element={<Marketplace userToken={userToken} />} />
            <Route path={`${BASE}/alerts`} element={<Alerts userToken={userToken} />} />
            <Route path={`${BASE}/watchlist`} element={<Watchlist userToken={userToken} />} />
            <Route path={`${BASE}/notifications`} element={<Notifications userToken={userToken} />} />
            <Route path={`${BASE}/preferences`} element={<Preferences userToken={userToken} />} />
            <Route path={`${BASE}/admin`} element={<Admin userToken={userToken} userRole={userRole} />} />
            <Route path="*" element={<Navigate to={`${BASE}/dashboard`} />} />
          </Routes>
        </Box>
      </div>
    </div>
  );

}

//note: we split into AppContent and App cz ProofPanel uses useLocation() which requires being inside BrowserRouter
export default function App() {
  return (
    //this wraps everything and enables routing
    <BrowserRouter> 
      <AppContent />
    </BrowserRouter>
  );
}