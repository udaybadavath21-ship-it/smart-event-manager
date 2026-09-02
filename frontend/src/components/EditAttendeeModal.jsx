import Modal from "react-modal";
import { useEffect, useState } from "react";

Modal.setAppElement("#root");

function EditAttendeeModal({
  isOpen,
  onClose,
  attendee,
  onSave,
}) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    organization: "",
    age: "",
    gender: "",
    city: "",
    ticket_type: "",
  });

  useEffect(() => {
    if (attendee) {
      setFormData({
        name: attendee.name || "",
        phone: attendee.phone || "",
        organization: attendee.organization || "",
        age: attendee.age || "",
        gender: attendee.gender || "",
        city: attendee.city || "",
        ticket_type: attendee.ticket_type || "",
      });
    }
  }, [attendee]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="Edit Attendee"
      style={{
        overlay: {
          backgroundColor: "rgba(0,0,0,0.5)",
        },
        content: {
          width: "500px",
          margin: "auto",
          borderRadius: "15px",
          padding: "25px",
        },
      }}
    >
      <h2>Edit Attendee</h2>

      <input
        name="name"
        placeholder="Name"
        value={formData.name}
        onChange={handleChange}
      />

      <input
        name="phone"
        placeholder="Phone"
        value={formData.phone}
        onChange={handleChange}
      />

      <input
        name="organization"
        placeholder="Organization"
        value={formData.organization}
        onChange={handleChange}
      />

      <input
        name="age"
        placeholder="Age"
        value={formData.age}
        onChange={handleChange}
      />

      <input
        name="gender"
        placeholder="Gender"
        value={formData.gender}
        onChange={handleChange}
      />

      <input
        name="city"
        placeholder="City"
        value={formData.city}
        onChange={handleChange}
      />

      <input
        name="ticket_type"
        placeholder="Ticket Type"
        value={formData.ticket_type}
        onChange={handleChange}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "20px",
        }}
      >
        <button onClick={onClose}>
          Cancel
        </button>

        <button
          onClick={() => onSave(formData)}
        >
          Save Changes
        </button>
      </div>
    </Modal>
  );
}

export default EditAttendeeModal;