import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from dotenv import load_dotenv


load_dotenv()

EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")


def send_registration_email(email, name, event_id, ticket_type, qr_path):
    message = MIMEMultipart()

    message["From"] = EMAIL_USER
    message["To"] = email
    message["Subject"] = "Event Registration Confirmed"

    body = f"""
Hello {name},

Your registration has been successfully completed.

Event ID: {event_id}
Ticket Type: {ticket_type}

Your QR Code is attached with this email.

Please carry it on the event day.

Thank you for registering!

Regards,
Event Registration Team
"""

    message.attach(MIMEText(body, "plain"))
    with open(qr_path, "rb") as image_file:
     qr_image = MIMEImage(image_file.read())
     qr_image.add_header(
        "Content-Disposition",
        "attachment",
        filename=os.path.basename(qr_path)
    )
    message.attach(qr_image)
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(EMAIL_USER, EMAIL_PASSWORD)
        server.send_message(message)