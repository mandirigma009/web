/*App Tsx*/

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/App.css";
import { ToastContainer } from "react-toastify";

function App() {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/me", {
          method: "GET",
          credentials: "include",
        });
        if (res.ok) navigate("/dashboard");
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [navigate]);

  if (loading) {
    return (
      <div className="App">
        <div className="loader">Loading...</div>
      </div>
    );
  }

  return (
    <div className="App">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* ====== HEADER ====== */}
      <header className="app-header">
        <div className="header-left">
          <img src="/images/logo.png" alt="Logo 1" className="header-logo" />
          <img
            src="/images/logo.png"
            alt="Logo 2"
            className="header-logo"
          />
        </div>
        <div className="header-right">
          <button
            className="header-login-btn"
            onClick={() => navigate("/login")}
          >
            Login
          </button>
        </div>
      </header>

      {/* ====== MAIN CONTENT ====== */}
      <main className="main-content">
        <div className="overlay-content">
          <img
            src="/images/logo.png"
            alt="University Logo"
            className="main-logo"
          />
          <h2 className="dept-title">CLASSROOM SCHEDULING SYSTEM</h2>
          <h3 className="sub-title">BULACAN POLYTECHNIC COLLEGE</h3>
          <button
            className="get-started-btn"
            onClick={() => navigate("/login")}
          >
            LET'S GET STARTED
          </button>
        </div>
      </main>

      {/* ====== FOOTER ====== */}
      <footer className="app-footer">
        <small>
          © 2025 Bulacan Polytechnic College Bocaue Classroom Scheduling System
        </small>
      </footer>
    </div>
  );
}

export default App;
