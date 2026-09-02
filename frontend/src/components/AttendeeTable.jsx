import "../styles/AttendeeTable.css";
function AttendeeTable({
  attendees,
  searchTerm,
  editAttendee,
  deleteAttendee,
  checkInAttendee,
  undoCheckInAttendee,
}) {
  return (
    <table className="attendee-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Email</th>
          <th>City</th>
          <th>Ticket</th>
          <th>Actions</th>
        </tr>
      </thead>

      <tbody>
        {attendees
          .filter((attendee) => {
            return (
              attendee.name
                .toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
              attendee.email
                .toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
              attendee.city
                .toLowerCase()
                .includes(searchTerm.toLowerCase())
            );
          })
          .map((attendee) => (
            <tr key={attendee.attendee_id}>
              <td>{attendee.attendee_id}</td>

              <td>{attendee.name}</td>

              <td>{attendee.email}</td>

              <td>{attendee.city}</td>

              <td>{attendee.ticket_type}</td>

              <td>
                <button
                  className="edit-btn"
                  type="button"
                  onClick={() => editAttendee(attendee)}
                >
                  Edit
                </button>

                <button
                  className="delete-btn"
                  type="button"
                  onClick={() =>
                    deleteAttendee(attendee.attendee_id)
                  }
                >
                  Delete
                </button>

                {attendee.checkin_status ? (
                  <button
                    className="undo-btn"
                    type="button"
                    onClick={() =>
                      undoCheckInAttendee(
                        attendee.attendee_id
                      )
                    }
                  >
                    ↩ Undo Check-In
                  </button>
                ) : (
                  <button
                    className="checkin-btn"
                    type="button"
                    onClick={() =>
                      checkInAttendee(
                        attendee.attendee_id
                      )
                    }
                  >
                    ✅ Check In
                  </button>
                )}
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  );
}

export default AttendeeTable;