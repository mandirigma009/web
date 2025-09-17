import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/Button";

function Dashboard() {
  const [name, setName] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/me", {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) {
          navigate("/login");
          return;
        }

        const data = await res.json();
        setName(data.user.name); // ✅ display name
      } catch (err) {
        console.error("Error fetching user:", err);
        navigate("/login");
      }
    };

    fetchUser();
  }, [navigate]);

  const handleLogout = async () => {
    await fetch("http://localhost:5000/api/logout", {
      method: "POST",
      credentials: "include",
    });

    setName("");
    navigate("/login");
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">
        Welcome to Dashboard {name && `, ${name}`}
      </h1>
      <Button variant="secondary" onClick={handleLogout}>
        Log Out
      </Button>
    </div>
  );
}

export default Dashboard;
