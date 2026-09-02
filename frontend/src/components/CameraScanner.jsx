import { Html5QrcodeScanner } from "html5-qrcode";
import { useEffect, useRef } from "react";
import api from "../api";
import Swal from "sweetalert2";

function CameraScanner({ onScan }) {
  const scannerRef = useRef(null);
  const hasScanned = useRef(false);

  useEffect(() => {
    if (scannerRef.current) return;

    const scanner = new Html5QrcodeScanner(
      "reader",
      {
        fps: 5,
        qrbox: {
          width: 300,
          height: 300,
        },
      },
      false
    );

    scannerRef.current = scanner;

    scanner.render(
      async (decodedText) => {
        if (hasScanned.current) return;

        hasScanned.current = true;
        try {
          const response = await api.post(
            "/scan-qr",
            {
              event_id: decodedText,
            }
          );

          onScan({
  ...response.data,
});
          if (scannerRef.current) {
  await scannerRef.current.clear();
  document.getElementById("reader").innerHTML = "";
  scannerRef.current = null;
}

          await Swal.fire({
            icon: "success",
            title: "QR Scanned Successfully!",
            html: `
              <b>Name:</b> ${response.data.name}<br>
              <b>Event ID:</b> ${response.data.event_id}<br>
              <b>Ticket:</b> ${response.data.ticket_type}<br>
              <b>City:</b> ${response.data.city}
            `,
            confirmButtonText: "Continue",
          });

        } catch (error) {
          console.error(error);

          Swal.fire({
            icon: "error",
            title: "Attendee Not Found",
            text: "No attendee exists for this QR code.",
          });
        }
      },
      (error) => {
      }
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [onScan]);

  return <div id="reader"></div>;
}

export default CameraScanner;