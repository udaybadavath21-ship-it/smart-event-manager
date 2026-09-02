import { useState, useEffect } from "react";
import axios from "axios";
function useAttendees() {

}
const [attendees, setAttendees] = useState([]);
  const [editData, setEditData] = useState({
  attendee_id: "",
  name: "",
  phone: "",
  organization: "",
  age: "",
  gender: "",
  city: "",
  ticket_type: ""
});
  const [searchTerm, setSearchTerm] = useState("");
  return {
  attendees,
  setAttendees,
  editData,
  setEditData,
  searchTerm,
  setSearchTerm,
};

export default useAttendees;