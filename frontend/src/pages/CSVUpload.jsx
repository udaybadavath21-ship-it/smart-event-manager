import { useState } from "react";
import api from "../api";
import Sidebar from "../components/Sidebar";
import Swal from "sweetalert2";

function CSVUpload() {
  const [file, setFile] = useState(null);

  const handleUpload = async () => {
    if (!file) {
      Swal.fire({
        icon: "warning",
        title: "No File Selected",
        text: "Please select a CSV file.",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await api.post(
        "/upload-csv",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      Swal.fire({
        icon: "success",
        title: "Upload Successful!",
        html: `
          Uploaded: <b>${response.data.uploaded}</b><br>
          Skipped: <b>${response.data.skipped}</b>
        `,
      });

      setFile(null);

      document.getElementById("csvFile").value = "";
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Upload Failed",
        text:
          error.response?.data?.detail ||
          "Something went wrong.",
      });
    }
  };

  return (
    <div className="layout">
      <Sidebar />

      <div className="main-content">
        <div className="container">

          <h1>📂 CSV Upload</h1>

          <p>
            Upload a CSV file containing attendee details.
          </p>

          <div className="chart-card">

            <input
              id="csvFile"
              type="file"
              accept=".csv"
              onChange={(e) =>
                setFile(e.target.files[0])
              }
            />

            <br />
            <br />

            <button
              className="checkin-btn"
              onClick={handleUpload}
            >
              📤 Upload CSV
            </button>

          </div>

        </div>
      </div>
    </div>
  );
}

export default CSVUpload;