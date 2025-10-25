import { useState } from "react";
import "../../../styles/modal.css";

interface CancelReasonModalProps {
  bookingId: number;
  onClose: () => void;
  onCancelConfirmed: (bookingId: number, reason: string) => void;
}

export default function CancelReasonModal({
  bookingId,
  onClose,
  onCancelConfirmed,
}: CancelReasonModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const handleConfirm = () => {
    if (!reason.trim()) {
      setError("Please provide a cancellation reason.");
      return;
    }

    // ✅ Call parent-provided function with bookingId and reason
    onCancelConfirmed(bookingId, reason);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h4>Cancel Reservation</h4>
        <p>Please provide a reason for canceling this reservation.</p>

        <textarea
          className="cancel-modal-textarea"
          rows={4}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setError("");
          }}
          placeholder="Enter your cancellation reason..."
        />

        {error && <p className="cancel-modal-error">{error}</p>}

        <div className="cancel-modal-buttons">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-danger btn-sm" onClick={handleConfirm}>
            Confirm Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
