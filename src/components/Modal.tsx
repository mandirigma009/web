interface ModalProps {
  setOpenModal: (open: boolean) => void;
}
import { useNavigate } from "react-router-dom";
import "../styles/modal.css";
  
function Modal({ setOpenModal }: ModalProps) {
const navigate = useNavigate();


  const handleContinue = () => {
    navigate("/login");
  };

  return (
    <div className="modalBackground">
      <div className="modalContainer">

        <div className="title">
          <h1>Privacy Policy</h1>
        </div>
        <div className="body">
          <p>Lorem Ipsum is simply dummy text of the printing and typesetting industry. 
        Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, 
        when an unknown printer took a galley of type and scrambled it to make a type specimen book. 
        It has survived not only five centuries, but also the leap into electronic typesetting,
         remaining essentially unchanged. It was popularised in the 1960s with the release of 
         Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing
         software like Aldus PageMaker including versions of Lorem Ipsum.Lorem Ipsum is simply dummy 
         text of the printing and typesetting industry.</p>
        </div>
        <div className="footer">
          <button
            onClick={() => {
              setOpenModal(false);
            }}
            id="cancelBtn"
          >
            Cancel
          </button>
          <button onClick={handleContinue}>Accept</button>
        </div>
      </div>
    </div>
  );
}

export default Modal;