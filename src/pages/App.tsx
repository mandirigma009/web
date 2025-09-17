import { useNavigate } from "react-router-dom";
import { Button } from "../components/Button";

function App() {
  const navigate = useNavigate();

  const handleContinue = () => {
    navigate("/policy");
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-6">Welcome to My App</h1>
      <Button variant="primary" onClick={handleContinue}>
        Continue
      </Button>
    </div>
  );
}

export default App;
