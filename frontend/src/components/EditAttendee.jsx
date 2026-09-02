function EditAttendee({
  editData,
  setEditData,
  updateAttendee,
  showEditForm,
  setShowEditForm,
}) {
  if (!showEditForm) return null;

  return (
    <>
      <h2>Edit Attendee</h2>

      <form className="form">
        <input
          type="text"
          placeholder="Name"
          value={editData.name}
          onChange={(e) =>
            setEditData({
              ...editData,
              name: e.target.value,
            })
          }
        />

        <input
          type="text"
          placeholder="Phone"
          value={editData.phone}
          onChange={(e) =>
            setEditData({
              ...editData,
              phone: e.target.value,
            })
          }
        />

        <input
          type="text"
          placeholder="Organization"
          value={editData.organization}
          onChange={(e) =>
            setEditData({
              ...editData,
              organization: e.target.value,
            })
          }
        />

        <input
          type="number"
          placeholder="Age"
          value={editData.age}
          onChange={(e) =>
            setEditData({
              ...editData,
              age: e.target.value,
            })
          }
        />

        <input
          type="text"
          placeholder="Gender"
          value={editData.gender}
          onChange={(e) =>
            setEditData({
              ...editData,
              gender: e.target.value,
            })
          }
        />

        <input
          type="text"
          placeholder="City"
          value={editData.city}
          onChange={(e) =>
            setEditData({
              ...editData,
              city: e.target.value,
            })
          }
        />

        <input
          type="text"
          placeholder="Ticket Type"
          value={editData.ticket_type}
          onChange={(e) =>
            setEditData({
              ...editData,
              ticket_type: e.target.value,
            })
          }
        />

        <button
          type="button"
          onClick={updateAttendee}
        >
          Update Attendee
        </button>

        <button
          type="button"
          onClick={() => setShowEditForm(false)}
          style={{
            marginTop: "10px",
            background: "#6b7280",
          }}
        >
          Cancel
        </button>
      </form>
    </>
  );
}

export default EditAttendee;