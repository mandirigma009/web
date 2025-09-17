import { useNavigate } from "react-router-dom";
import { Button } from "../components/Button";




function Policy() {
const navigate = useNavigate();

return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
          <h1 className="text-3xl font-bold mb-6">This is Policy Page</h1>
      <Button variant="primary" 
      onClick={
        () => navigate('/login')
      }>
          Accept
        </Button>
    </div>
)
}

export default Policy;