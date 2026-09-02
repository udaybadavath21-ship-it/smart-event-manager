import { useState, useEffect } from "react";
import api from "../api";
import Sidebar from "../components/Sidebar";
import SearchBar from "../components/SearchBar";
import AttendeeTable from "../components/AttendeeTable";
import EditAttendee from "../components/EditAttendee";
import Swal from "sweetalert2";
import "../App.css";

function Attendees() {

  const [attendees, setAttendees] = useState([]);

  const [editData, setEditData] = useState({
    attendee_id: "",
    name: "",
    phone: "",
    organization: "",
    age: "",
    gender: "",
    city: "",
    ticket_type: "",
  });

  const [showEditForm, setShowEditForm] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");

  const fetchAttendees = async () => {
    try {
      const response = await api.get("/attendees");

      setAttendees(response.data);

    } catch (error) {

      console.log(error);

      if (error.response?.status === 401) {

        await Swal.fire({
          icon: "warning",
          title: "Session Expired",
          text: "Please login again.",
        });

        localStorage.removeItem("token");

        window.location.href="/login";
      }
    }
  };

  useEffect(() => {
    fetchAttendees();
  }, []);

  const deleteAttendee = async (id) => {
    try {

      await api.delete(`/attendee/${id}`);

      await Swal.fire({
        icon:"success",
        title:"Deleted!",
        text:"Attendee deleted successfully.",
      });

      fetchAttendees();

    } catch {

      Swal.fire({
        icon:"error",
        title:"Delete Failed",
        text:"Failed to delete attendee.",
      });

    }
  };

  const editAttendee = (attendee) => {

    setEditData(attendee);

    setShowEditForm(true);

  };

  const updateAttendee = async () => {

    try {

      await api.put(
        `/attendee/${editData.attendee_id}`,
        editData
      );

      Swal.fire({
        icon:"success",
        title:"Updated!",
        text:"Attendee updated successfully.",
      });

      fetchAttendees();

      setShowEditForm(false);

    } catch {

      Swal.fire({
        icon:"error",
        title:"Update Failed",
        text:"Failed to update attendee.",
      });

    }

  };

  const checkInAttendee = async(id)=>{

    try{

      const response=await api.put(`/checkin/${id}`);

      Swal.fire({
        icon:"success",
        title:"Checked In",
        text:response.data.message,
      });

      fetchAttendees();

    }catch(error){

      Swal.fire({
        icon:"error",
        title:"Check-In Failed",
        text:error.response?.data?.detail || "Something went wrong.",
      });

    }

  };

  const undoCheckInAttendee=async(id)=>{

    const result=await Swal.fire({
      title:"Undo Check-In?",
      icon:"warning",
      showCancelButton:true,
    });

    if(!result.isConfirmed) return;

    try{

      const response=await api.put(`/undo-checkin/${id}`);

      Swal.fire({
        icon:"success",
        title:"Undo Successful",
        text:response.data.message,
      });

      fetchAttendees();

    }catch(error){

      Swal.fire({
        icon:"error",
        title:"Undo Failed",
        text:error.response?.data?.detail || "Something went wrong.",
      });

    }

  };

  return (

    <div className="layout">

      <Sidebar/>

      <div className="main-content">

        <h1>👥 Attendees</h1>

        <EditAttendee
          editData={editData}
          setEditData={setEditData}
          updateAttendee={updateAttendee}
          showEditForm={showEditForm}
          setShowEditForm={setShowEditForm}
        />

        <SearchBar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />

        <AttendeeTable
          attendees={attendees}
          searchTerm={searchTerm}
          editAttendee={editAttendee}
          deleteAttendee={deleteAttendee}
          checkInAttendee={checkInAttendee}
          undoCheckInAttendee={undoCheckInAttendee}
        />

      </div>

    </div>

  );

}

export default Attendees;