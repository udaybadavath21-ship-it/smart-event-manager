import os
import qrcode

def generate_qr(event_id):
    print("Generating QR for:", event_id)

    folder = "qrcodes"
    os.makedirs(folder, exist_ok=True)

    file_path = os.path.join(folder, f"{event_id}.png")

    img = qrcode.make(event_id)
    img.save(file_path)

    print("QR saved at:", file_path)

    return file_path