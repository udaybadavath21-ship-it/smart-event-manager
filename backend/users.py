from config import ADMIN_USERNAME, ADMIN_PASSWORD
from security import hash_password

admin_user = {
    "username": ADMIN_USERNAME,
    "hashed_password": hash_password(ADMIN_PASSWORD),
}