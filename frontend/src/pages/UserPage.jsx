import { useState } from "react";
import api from "../api";
import Swal from "sweetalert2";
import "../App.css";

function UserPage() {

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    organization: "",
    age: "",
    gender: "",
    city: "",
    event: "",
    ticket_type: "",
    emergency_contact_name: "",
    emergency_contact_number: "",
    relationship: "",
    disabled: "No",
accessibility_type: "",
  });

  const handleChange = (e) => {

    const { name, value, type, checked } = e.target;

    let newValue =
      type === "checkbox" ? checked : value;

    if (
      name === "phone" ||
      name === "emergency_contact_number"
    ) {
      newValue = newValue
        .replace(/\D/g, "")
        .slice(0, 10);
    }

    if (name === "age") {
  newValue = newValue.replace(/\D/g, "");

  if (newValue !== "") {
    const age = Number(newValue);

    if (age > 100) {
      newValue = "100";
    }
  }
}

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));
  };

  const handleSubmit = async (e) => {

    e.preventDefault();

    if (formData.phone.length !== 10) {
      Swal.fire(
        "Invalid Phone",
        "Phone number must contain exactly 10 digits.",
        "warning"
      );
      return;
    }

    if (
      formData.emergency_contact_number &&
      formData.emergency_contact_number.length !== 10
    ) {
      Swal.fire(
        "Invalid Emergency Contact",
        "Emergency contact number must contain exactly 10 digits.",
        "warning"
      );
      return;
    }
    if (Number(formData.age) < 18 || Number(formData.age) > 100) {
  Swal.fire({
    icon: "warning",
    title: "Invalid Age",
    text: "Age must be between 18 and 100.",
  });
  return;
}

    try {

      const response = await api.post(
        "/register",
        formData
      );

      Swal.fire({
        icon: "success",
        title: "Registration Successful!",
        html:
          "<b>Event ID:</b> " +
          response.data.event_id +
          "<br><br>Your QR pass has been sent to your email.",
      });

      setFormData({
        name: "",
        email: "",
        phone: "",
        organization: "",
        age: "",
        gender: "",
        city: "",
        event: "",
        ticket_type: "",
        emergency_contact_name: "",
        emergency_contact_number: "",
        relationship: "",
        disabled: "No",
accessibility_type: "",
      });

    } catch (error) {

      Swal.fire({
        icon: "error",
        title: "Registration Failed",
        text:
          error.response?.data?.detail ||
          "Something went wrong.",
      });

    }
  };
  return (
  <div
    style={{
      minHeight: "100vh",
      background:
        "linear-gradient(135deg,#4F46E5,#7C3AED)",
      padding: "40px 20px",
    }}
  >
    <div
      className="container"
      style={{
        maxWidth: "900px",
        background: "#fff",
        borderRadius: "20px",
        padding: "35px",
        boxShadow: "0 15px 40px rgba(0,0,0,0.2)",
      }}
    >
      <h1
        style={{
          textAlign: "center",
          color: "#4F46E5",
          marginBottom: "10px",
        }}
      >
         Smart Event Registration Portal
      </h1>

      <p
        style={{
          textAlign: "center",
          color: "#666",
          marginBottom: "30px",
        }}
      >
        Register now and receive your QR Pass instantly.
      </p>

      <form
        className="form"
        onSubmit={handleSubmit}
      >

        <h2>👤 Personal Details</h2>

        <input
          type="text"
          name="name"
          placeholder="Full Name"
          value={formData.name}
          onChange={handleChange}
          required
        />

        <input
          type="email"
          name="email"
          placeholder="Email Address"
          value={formData.email}
          onChange={handleChange}
          required
        />

        <input
          type="tel"
          name="phone"
          placeholder="Mobile Number"
          value={formData.phone}
          onChange={handleChange}
          maxLength={10}
          required
        />

        <input
          type="text"
          name="organization"
          placeholder="College / Company"
          value={formData.organization}
          onChange={handleChange}
        />

        <input
  type="number"
  name="age"
  placeholder="Age"
  value={formData.age}
  onChange={handleChange}
  min="18"
  max="100"
  required
/>
        <select
          name="gender"
          value={formData.gender}
          onChange={handleChange}
          required
        >
          <option value="">
            Select Gender
          </option>

          <option value="Male">
            Male
          </option>

          <option value="Female">
            Female
          </option>

          <option value="Other">
            Other
          </option>
        </select>

        <input
          type="text"
          name="city"
          placeholder="City"
          value={formData.city}
          onChange={handleChange}
          required
        />

        <hr
          style={{
            margin: "30px 0",
          }}
        />

        <h2>🎫 Event Details</h2>

        <select
          name="event"
          value={formData.event}
          onChange={handleChange}
          required
        >
          <option value="">
            Select Event
          </option>

          <option value="AI Summit 2026">
            AI Summit 2026
          </option>

          <option value="Tech Expo 2026">
            Tech Expo 2026
          </option>

          <option value="Hackathon 2026">
            Hackathon 2026
          </option>

          <option value="Workshop 2026">
            Workshop 2026
          </option>
        </select>

        <select
          name="ticket_type"
          value={formData.ticket_type}
          onChange={handleChange}
          required
        >
          <option value="">
            Select Ticket Type
          </option>

          <option value="Student">
            Student
          </option>

          <option value="Professional">
            Professional
          </option>

          <option value="VIP">
            VIP
          </option>
        </select>
                <hr
          style={{
            margin: "30px 0",
          }}
        />

        <h2>🚨 Emergency Contact</h2>

        <input
          type="text"
          name="emergency_contact_name"
          placeholder="Emergency Contact Name"
          value={formData.emergency_contact_name}
          onChange={handleChange}
          required
        />

        <input
          type="tel"
          name="emergency_contact_number"
          placeholder="Emergency Contact Number"
          value={formData.emergency_contact_number}
          onChange={handleChange}
          maxLength={10}
          required
        />

        <select
          name="relationship"
          value={formData.relationship}
          onChange={handleChange}
          required
        >
          <option value="">
            Relationship
          </option>

          <option value="Parent">
            Parent
          </option>

          <option value="Guardian">
            Guardian
          </option>

          <option value="Sibling">
            Sibling
          </option>

          <option value="Friend">
            Friend
          </option>

          <option value="Spouse">
            Spouse
          </option>

          <option value="Other">
            Other
          </option>
        </select>

<hr style={{ margin: "30px 0" }} />

<h2>♿ Accessibility</h2>

<div className="accessibility-box">
  <p>Do you require accessibility assistance?</p>

  <div className="radio-group">

    <label className="radio-option">
      <input
        type="radio"
        name="disabled"
        value="No"
        checked={formData.disabled === "No"}
        onChange={handleChange}
      />
      <span>No</span>
    </label>

    <label className="radio-option">
      <input
        type="radio"
        name="disabled"
        value="Yes"
        checked={formData.disabled === "Yes"}
        onChange={handleChange}
      />
      <span>Yes</span>
    </label>

  </div>

  {formData.disabled === "Yes" && (
    <select
      name="accessibility_type"
      value={formData.accessibility_type}
      onChange={handleChange}
      required
    >
      <option value="">Select Assistance Required</option>
      <option value="Wheelchair Access">♿ Wheelchair Access</option>
      <option value="Hearing Assistance">🦻 Hearing Assistance</option>
      <option value="Visual Assistance">👁 Visual Assistance</option>
      <option value="Other">Other</option>
    </select>
  )}
</div>

        <button
          type="submit"
          style={{
            background:
              "linear-gradient(135deg,#4F46E5,#7C3AED)",
            color: "#fff",
            border: "none",
            padding: "16px",
            borderRadius: "12px",
            fontSize: "18px",
            fontWeight: "bold",
            cursor: "pointer",
            width: "100%",
            transition: "0.3s",
          }}
        >
          🚀 Register Now
        </button>

      </form>

    </div>

  </div>
);

}

export default UserPage;