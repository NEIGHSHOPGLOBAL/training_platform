import hashlib
import smtplib
import json
import os
import random
import string
import uuid
from datetime import datetime, timedelta
from email.message import EmailMessage
from html import escape
from functools import wraps
from pathlib import Path

import jwt
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename

load_dotenv()

db = SQLAlchemy()
limiter = Limiter(key_func=get_remote_address)
DEFAULT_DEV_SECRET = "dev-secret-change-before-production-32-bytes"

ALLOWED_UPLOADS = {
    "png",
    "jpg",
    "jpeg",
    "webp",
    "pdf",
    "zip",
    "doc",
    "docx",
    "ppt",
    "pptx",
    "xls",
    "xlsx",
}
IMAGE_PDF_UPLOADS = {"png", "jpg", "jpeg", "webp", "pdf"}
MAX_SUPPORT_FILE_SIZE = 5 * 1024 * 1024

PASSWORD_HASH_METHOD = "pbkdf2:sha256"


def now_utc():
    return datetime.utcnow()


def make_code(length=5):
    alphabet = string.ascii_uppercase + string.digits
    return "".join(random.choice(alphabet) for _ in range(length))


def hash_code(code):
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


def otp_email_html(code, full_name=None):
    name = escape(full_name or "Student")
    escaped_code = escape(code)
    return f"""
<!doctype html>
<html lang="en">
  <head>
    <meta name="color-scheme" content="dark">
    <meta name="supported-color-schemes" content="dark">
  </head>
  <body style="margin:0;padding:0;background:#050705;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#050705;margin:0;padding:34px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#0b0d0b;border:1px solid #20351d;border-radius:24px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.55);">
            <tr>
              <td style="padding:30px 30px 24px;background:#0f160d;border-bottom:1px solid #20351d;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td>
                      <div style="color:#a8f060;font-size:12px;font-weight:800;letter-spacing:3px;text-transform:uppercase;">Neighshop Global</div>
                      <h1 style="margin:14px 0 0;color:#ffffff;font-size:30px;line-height:1.2;font-weight:800;">Verify your student login</h1>
                    </td>
                    <td align="right" style="vertical-align:top;">
                      <div style="display:inline-block;padding:8px 12px;border:1px solid #365c2a;border-radius:999px;color:#a8f060;font-size:12px;font-weight:700;background:#142012;">OTP</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 30px 10px;">
                <p style="margin:0 0 10px;color:#ffffff;font-size:17px;line-height:1.7;">Hi {name},</p>
                <p style="margin:0;color:#b8b8b8;font-size:15px;line-height:1.75;">Use the secure code below to continue to your Neighshop Global student portal.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 30px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#101610;border:1px solid #315528;border-radius:20px;">
                  <tr>
                    <td align="center" style="padding:26px 18px;">
                      <div style="color:#8d9b89;font-size:11px;font-weight:800;letter-spacing:2.5px;text-transform:uppercase;">Verification Code</div>
                      <div style="margin-top:12px;color:#a8f060;font-size:44px;line-height:1;font-weight:900;letter-spacing:9px;">{escaped_code}</div>
                      <div style="width:54px;height:3px;margin:18px auto 0;background:#22e03a;border-radius:999px;"></div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 30px 30px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #202820;">
                  <tr>
                    <td style="padding-top:20px;color:#8f8f8f;font-size:13px;line-height:1.7;">
                      This OTP is valid for 10 minutes. If you did not request this email, please ignore it.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 30px;background:#070907;border-top:1px solid #202820;color:#777;font-size:12px;line-height:1.6;">
                Neighshop Global Training Program<br>
                Don't just learn. Build real experience.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""


def send_otp_email(to_email, code, full_name=None):
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    from_name = os.getenv("SMTP_FROM_NAME", "Neighshop Global Training")

    if not smtp_user or not smtp_password:
        return False

    message = EmailMessage()
    message["Subject"] = "Your Neighshop Global Student Portal OTP"
    message["From"] = f"{from_name} <{smtp_user}>"
    message["To"] = to_email
    message.set_content(
        f"Your Neighshop Global student portal OTP is {code}. It is valid for 10 minutes."
    )
    message.add_alternative(otp_email_html(code, full_name), subtype="html")

    with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as smtp:
        smtp.starttls()
        smtp.login(smtp_user, smtp_password)
        smtp.send_message(message)
    return True


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    role = db.Column(db.String(20), nullable=False, index=True)
    full_name = db.Column(db.String(140), nullable=False)
    email = db.Column(db.String(180), unique=True, nullable=True, index=True)
    phone = db.Column(db.String(40), nullable=True)
    username = db.Column(db.String(80), unique=True, nullable=True, index=True)
    password_hash = db.Column(db.String(255), nullable=True)
    student_id = db.Column(db.String(20), unique=True, nullable=True, index=True)
    referral_code = db.Column(db.String(10), unique=True, nullable=True, index=True)
    referred_by_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    payment_status = db.Column(db.String(30), default="registered", nullable=False)
    course_mode = db.Column(db.String(20), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    approved_at = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=now_utc, nullable=False)
    last_login_at = db.Column(db.DateTime(timezone=True), nullable=True)

    referred_by = db.relationship("User", remote_side=[id])

    def public_dict(self):
        return {
            "id": self.id,
            "role": self.role,
            "fullName": self.full_name,
            "email": self.email,
            "phone": self.phone,
            "username": self.username,
            "studentId": self.student_id,
            "referralCode": self.referral_code,
            "referralLink": f"/register?ref={self.referral_code}" if self.referral_code else None,
            "hasReferral": bool(self.referred_by_id),
            "paymentStatus": self.payment_status,
            "courseMode": self.course_mode,
            "isActive": self.is_active,
            "createdAt": self.created_at.isoformat(),
            "approvedAt": self.approved_at.isoformat() if self.approved_at else None,
        }


class OTPRequest(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(180), nullable=False, index=True)
    code_hash = db.Column(db.String(64), nullable=False)
    purpose = db.Column(db.String(30), default="student_login", nullable=False)
    full_name = db.Column(db.String(140), nullable=True)
    phone = db.Column(db.String(40), nullable=True)
    referral_code = db.Column(db.String(10), nullable=True)
    attempts = db.Column(db.Integer, default=0, nullable=False)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)
    consumed_at = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=now_utc, nullable=False)


class ReferralRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    referrer_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    referred_student_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, unique=True)
    status = db.Column(db.String(20), default="pending", nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=now_utc, nullable=False)
    approved_at = db.Column(db.DateTime(timezone=True), nullable=True)

    referrer = db.relationship("User", foreign_keys=[referrer_id])
    referred_student = db.relationship("User", foreign_keys=[referred_student_id])

    def dict(self):
        student = self.referred_student
        return {
            "id": self.id,
            "status": self.status,
            "studentName": student.full_name,
            "studentId": student.student_id,
            "paymentStatus": student.payment_status,
            "createdAt": self.created_at.isoformat(),
            "approvedAt": self.approved_at.isoformat() if self.approved_at else None,
        }


class PaymentSubmission(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    mode = db.Column(db.String(20), nullable=False)
    original_amount = db.Column(db.Integer, nullable=False)
    payable_amount = db.Column(db.Integer, nullable=False)
    screenshot_path = db.Column(db.String(255), nullable=False)
    status = db.Column(db.String(30), default="payment_submitted", nullable=False)
    admin_notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=now_utc, nullable=False)
    reviewed_at = db.Column(db.DateTime(timezone=True), nullable=True)

    student = db.relationship("User")

    def dict(self):
        is_manual = self.screenshot_path.startswith("payments/manual-") if self.screenshot_path else False
        return {
            "id": self.id,
            "student": self.student.public_dict(),
            "mode": self.mode,
            "originalAmount": self.original_amount,
            "payableAmount": self.payable_amount,
            "screenshotUrl": f"/api/uploads/{self.screenshot_path}" if self.screenshot_path else None,
            "isManual": is_manual,
            "proofLabel": "Manual record" if is_manual else "Uploaded proof",
            "status": self.status,
            "adminNotes": self.admin_notes,
            "createdAt": self.created_at.isoformat(),
            "reviewedAt": self.reviewed_at.isoformat() if self.reviewed_at else None,
        }


class WalletTransaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    amount = db.Column(db.Integer, nullable=False)
    type = db.Column(db.String(20), nullable=False)
    related_student_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    transaction_id = db.Column(db.String(100), nullable=True)
    payment_mode = db.Column(db.String(60), nullable=True)
    remarks = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=now_utc, nullable=False)

    user = db.relationship("User", foreign_keys=[user_id])
    related_student = db.relationship("User", foreign_keys=[related_student_id])

    def dict(self):
        return {
            "id": self.id,
            "amount": self.amount,
            "type": self.type,
            "studentName": self.related_student.full_name if self.related_student else None,
            "transactionId": self.transaction_id,
            "paymentMode": self.payment_mode,
            "remarks": self.remarks,
            "createdAt": self.created_at.isoformat(),
        }


class Material(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(160), nullable=False)
    description = db.Column(db.Text, nullable=True)
    file_path = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(80), default="material", nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=now_utc, nullable=False)

    def dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "category": self.category,
            "fileUrl": f"/api/uploads/{self.file_path}",
            "isActive": self.is_active,
            "createdAt": self.created_at.isoformat(),
        }


class CodeResource(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(160), nullable=False)
    description = db.Column(db.Text, nullable=True)
    resource_type = db.Column(db.String(30), nullable=False)
    url = db.Column(db.String(255), nullable=True)
    file_path = db.Column(db.String(255), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=now_utc, nullable=False)

    def dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "resourceType": self.resource_type,
            "url": self.url,
            "fileUrl": f"/api/uploads/{self.file_path}" if self.file_path else None,
            "isActive": self.is_active,
            "createdAt": self.created_at.isoformat(),
        }


class Announcement(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(160), nullable=False)
    body = db.Column(db.Text, nullable=False)
    priority = db.Column(db.String(20), default="normal", nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=now_utc, nullable=False)

    def dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "body": self.body,
            "priority": self.priority,
            "isActive": self.is_active,
            "createdAt": self.created_at.isoformat(),
        }


class SupportRequest(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    message = db.Column(db.Text, nullable=False)
    file_path = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(30), default="open", nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=now_utc, nullable=False)
    reviewed_at = db.Column(db.DateTime(timezone=True), nullable=True)

    user = db.relationship("User")

    def dict(self):
        return {
            "id": self.id,
            "user": self.user.public_dict(),
            "message": self.message,
            "fileUrl": f"/api/uploads/{self.file_path}" if self.file_path else None,
            "status": self.status,
            "createdAt": self.created_at.isoformat(),
            "reviewedAt": self.reviewed_at.isoformat() if self.reviewed_at else None,
        }


class Setting(db.Model):
    key = db.Column(db.String(80), primary_key=True)
    value = db.Column(db.Text, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=now_utc, onupdate=now_utc)


class AuditLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    actor_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    action = db.Column(db.String(120), nullable=False)
    metadata_json = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=now_utc, nullable=False)


def create_app():
    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", DEFAULT_DEV_SECRET)
    app.config["JWT_SECRET"] = os.getenv("JWT_SECRET", app.config["SECRET_KEY"])
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///training_portal.db")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["MAX_CONTENT_LENGTH"] = 8 * 1024 * 1024
    app.config["UPLOAD_FOLDER"] = os.getenv("UPLOAD_FOLDER", "uploads")

    Path(app.config["UPLOAD_FOLDER"]).mkdir(parents=True, exist_ok=True)

    db.init_app(app)
    limiter.init_app(app)
    frontend_origins = [
        origin.strip()
        for origin in os.getenv(
            "FRONTEND_ORIGIN",
            "http://localhost:5173,http://127.0.0.1:5173",
        ).split(",")
        if origin.strip()
    ]
    CORS(
        app,
        resources={r"/api/*": {"origins": frontend_origins}},
        supports_credentials=True,
    )

    register_routes(app)

    with app.app_context():
        db.create_all()
        seed_defaults()

    return app


def seed_defaults():
    defaults = {
        "courseStartDate": "2026-07-20",
        "courseStatus": "Upcoming",
        "enrollmentStatus": "Open",
        "priceOffline": 5500,
        "priceOnline": 4500,
        "referralPriceOffline": 5000,
        "referralPriceOnline": 4000,
        "referralReward": 500,
        "devOtpOnScreen": os.getenv("DEV_SHOW_OTP", "true").lower() == "true",
    }
    for key, value in defaults.items():
        if not Setting.query.get(key):
            db.session.add(Setting(key=key, value=json.dumps(value)))

    username = os.getenv("DEFAULT_ADMIN_USERNAME", "admin")
    if not User.query.filter_by(username=username, role="admin").first():
        db.session.add(
            User(
                role="admin",
                full_name="System Admin",
                username=username,
                password_hash=generate_password_hash(
                    os.getenv("DEFAULT_ADMIN_PASSWORD", "admin123"),
                    method=PASSWORD_HASH_METHOD,
                ),
                referral_code=unique_referral_code(),
            )
        )
    db.session.commit()


def get_setting(key, fallback=None):
    setting = Setting.query.get(key)
    if not setting:
        return fallback
    try:
        return json.loads(setting.value)
    except json.JSONDecodeError:
        return setting.value


def set_setting(key, value):
    setting = Setting.query.get(key)
    if not setting:
        setting = Setting(key=key, value=json.dumps(value))
        db.session.add(setting)
    else:
        setting.value = json.dumps(value)


def all_settings():
    return {setting.key: json.loads(setting.value) for setting in Setting.query.all()}


def show_dev_otp():
    env_value = os.getenv("DEV_SHOW_OTP")
    if env_value is not None:
        return env_value.lower() == "true"
    return bool(get_setting("devOtpOnScreen", True))


def create_token(user):
    payload = {
        "sub": str(user.id),
        "role": user.role,
        "iat": int(now_utc().timestamp()),
        "exp": int((now_utc() + timedelta(days=14)).timestamp()),
    }
    return jwt.encode(payload, os.getenv("JWT_SECRET", DEFAULT_DEV_SECRET), algorithm="HS256")


def current_user():
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        return None
    token = header.replace("Bearer ", "", 1)
    try:
        payload = jwt.decode(token, os.getenv("JWT_SECRET", DEFAULT_DEV_SECRET), algorithms=["HS256"])
    except jwt.PyJWTError:
        return None
    return db.session.get(User, int(payload["sub"]))


def require_auth(*roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = current_user()
            if not user or not user.is_active:
                return error("Authentication required", 401)
            if roles and user.role not in roles:
                return error("You do not have permission for this action", 403)
            request.user = user
            return fn(*args, **kwargs)

        return wrapper

    return decorator


def error(message, status=400):
    return jsonify({"message": message}), status


def audit(action, actor=None, metadata=None):
    db.session.add(
        AuditLog(
            actor_id=actor.id if actor else None,
            action=action,
            metadata_json=json.dumps(metadata or {}),
        )
    )


def unique_student_id():
    year = now_utc().year
    count = User.query.filter(User.student_id.isnot(None)).count() + 1
    while True:
        student_id = f"SD{year}{count:05d}"
        if not User.query.filter_by(student_id=student_id).first():
            return student_id
        count += 1


def unique_referral_code():
    while True:
        code = make_code()
        if not User.query.filter_by(referral_code=code).first():
            return code


def allowed_file(filename, allowed_extensions=None):
    extensions = allowed_extensions or ALLOWED_UPLOADS
    return "." in filename and filename.rsplit(".", 1)[1].lower() in extensions


def upload_size(file):
    position = file.stream.tell()
    file.stream.seek(0, os.SEEK_END)
    size = file.stream.tell()
    file.stream.seek(position)
    return size


def save_upload(file, folder, allowed_extensions=None, max_bytes=None):
    if not file or file.filename == "":
        raise ValueError("File is required")
    if not allowed_file(file.filename, allowed_extensions):
        raise ValueError("Unsupported file type")
    if max_bytes and upload_size(file) > max_bytes:
        raise ValueError("File must be 5MB or smaller")
    original = secure_filename(file.filename)
    suffix = original.rsplit(".", 1)[1].lower()
    relative_dir = Path(folder)
    upload_root = Path(os.getenv("UPLOAD_FOLDER", "uploads"))
    target_dir = upload_root / relative_dir
    target_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.{suffix}"
    file.save(target_dir / filename)
    return str(relative_dir / filename)


def calculate_price(mode, has_referral):
    mode = (mode or "").lower()
    if mode not in {"online", "offline"}:
        raise ValueError("Mode must be online or offline")
    original = get_setting("priceOnline" if mode == "online" else "priceOffline", 4500)
    payable = get_setting(
        "referralPriceOnline" if mode == "online" else "referralPriceOffline",
        original,
    )
    return int(original), int(payable if has_referral else original)


def wallet_summary(user_id):
    transactions = WalletTransaction.query.filter_by(user_id=user_id).order_by(WalletTransaction.created_at.desc()).all()
    lifetime = sum(tx.amount for tx in transactions if tx.type == "earning")
    paid = abs(sum(tx.amount for tx in transactions if tx.type == "payout"))
    return {
        "lifetimeEarnings": lifetime,
        "paidAmount": paid,
        "availableBalance": lifetime - paid,
        "transactions": [tx.dict() for tx in transactions],
    }


def award_referral_for(student):
    record = ReferralRecord.query.filter_by(referred_student_id=student.id).first()
    if not record or record.status == "approved":
        return
    reward = int(get_setting("referralReward", 500))
    existing = WalletTransaction.query.filter_by(
        user_id=record.referrer_id,
        related_student_id=student.id,
        type="earning",
    ).first()
    if not existing:
        db.session.add(
            WalletTransaction(
                user_id=record.referrer_id,
                related_student_id=student.id,
                amount=reward,
                type="earning",
                remarks=f"Referral reward for {student.full_name}",
            )
        )
    record.status = "approved"
    record.approved_at = now_utc()


def list_referrals(user_id):
    records = ReferralRecord.query.filter_by(referrer_id=user_id).order_by(ReferralRecord.created_at.desc()).all()
    approved = sum(1 for record in records if record.status == "approved")
    pending = sum(1 for record in records if record.status != "approved")
    return {
        "totalReferrals": len(records),
        "approvedReferrals": approved,
        "pendingPayment": pending,
        "recentReferrals": [record.dict() for record in records],
    }


def register_routes(app):
    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok", "time": now_utc().isoformat()})

    @app.get("/api/settings")
    def settings_public():
        return jsonify(all_settings())

    @app.post("/api/auth/student/request-otp")
    @limiter.limit("5 per minute")
    def request_student_otp():
        data = request.get_json(silent=True) or {}
        email = (data.get("email") or "").strip().lower()
        full_name = (data.get("fullName") or "").strip()
        phone = (data.get("phone") or "").strip()
        referral_code = (data.get("referralCode") or "").strip().upper() or None
        if not email or "@" not in email:
            return error("Valid email is required")

        existing_user = User.query.filter_by(email=email, role="student").first()
        if not existing_user and not full_name:
            return error("Full name is required for registration")
        if referral_code and not User.query.filter_by(referral_code=referral_code).first():
            return error("Invalid referral code")

        code = f"{random.randint(100000, 999999)}"
        otp = OTPRequest(
            email=email,
            code_hash=hash_code(code),
            full_name=full_name or (existing_user.full_name if existing_user else None),
            phone=phone or (existing_user.phone if existing_user else None),
            referral_code=referral_code,
            expires_at=now_utc() + timedelta(minutes=10),
        )
        db.session.add(otp)
        db.session.commit()

        email_sent = False
        try:
            email_sent = send_otp_email(email, code, otp.full_name)
        except Exception as exc:
            app.logger.exception("Failed to send OTP email: %s", exc)

        dev_otp_enabled = show_dev_otp()
        if not email_sent and not dev_otp_enabled:
            return error("Unable to send OTP email. Please try again later.", 502)

        response = {"message": "OTP sent to email" if email_sent else "OTP generated"}
        if dev_otp_enabled:
            response["devOtp"] = code
        return jsonify(response)

    @app.post("/api/auth/student/verify-otp")
    @limiter.limit("10 per minute")
    def verify_student_otp():
        data = request.get_json(silent=True) or {}
        email = (data.get("email") or "").strip().lower()
        code = (data.get("code") or "").strip()
        otp = (
            OTPRequest.query.filter_by(email=email, consumed_at=None)
            .order_by(OTPRequest.created_at.desc())
            .first()
        )
        if not otp or otp.expires_at < now_utc():
            return error("OTP expired or not found")
        if otp.attempts >= 5:
            return error("Too many OTP attempts", 429)
        if otp.code_hash != hash_code(code):
            otp.attempts += 1
            db.session.commit()
            return error("Invalid OTP")

        user = User.query.filter_by(email=email, role="student").first()
        if not user:
            referrer = User.query.filter_by(referral_code=otp.referral_code).first() if otp.referral_code else None
            user = User(
                role="student",
                full_name=otp.full_name,
                email=email,
                phone=otp.phone,
                student_id=unique_student_id(),
                referral_code=unique_referral_code(),
                referred_by_id=referrer.id if referrer else None,
            )
            db.session.add(user)
            db.session.flush()
            if referrer:
                db.session.add(ReferralRecord(referrer_id=referrer.id, referred_student_id=user.id))
            audit("student_registered", user, {"referralCode": otp.referral_code})

        user.last_login_at = now_utc()
        otp.consumed_at = now_utc()
        db.session.commit()
        return jsonify({"token": create_token(user), "user": user.public_dict()})

    @app.post("/api/auth/login")
    @limiter.limit("10 per minute")
    def password_login():
        data = request.get_json(silent=True) or {}
        username = (data.get("username") or "").strip()
        password = data.get("password") or ""
        user = User.query.filter(User.username == username, User.role.in_(["admin", "affiliate"])).first()
        if not user or not user.password_hash or not check_password_hash(user.password_hash, password):
            return error("Invalid username or password", 401)
        user.last_login_at = now_utc()
        db.session.commit()
        return jsonify({"token": create_token(user), "user": user.public_dict()})

    @app.get("/api/auth/me")
    @require_auth()
    def me():
        return jsonify({"user": request.user.public_dict()})

    @app.post("/api/payments")
    @limiter.limit("6 per minute")
    @require_auth("student")
    def submit_payment():
        student = request.user
        mode = request.form.get("mode", "").lower()
        try:
            original, payable = calculate_price(mode, bool(student.referred_by_id))
            screenshot_path = save_upload(
                request.files.get("screenshot"),
                "payments",
                allowed_extensions=IMAGE_PDF_UPLOADS,
                max_bytes=MAX_SUPPORT_FILE_SIZE,
            )
        except ValueError as exc:
            return error(str(exc))

        payment = PaymentSubmission(
            student_id=student.id,
            mode=mode,
            original_amount=original,
            payable_amount=payable,
            screenshot_path=screenshot_path,
        )
        student.course_mode = mode
        student.payment_status = "payment_submitted"
        db.session.add(payment)
        audit("payment_submitted", student, {"paymentId": payment.id})
        db.session.commit()
        return jsonify({"payment": payment.dict(), "user": student.public_dict()}), 201

    @app.get("/api/payments/my")
    @require_auth("student")
    def my_payments():
        payments = PaymentSubmission.query.filter_by(student_id=request.user.id).order_by(PaymentSubmission.created_at.desc()).all()
        return jsonify({"payments": [payment.dict() for payment in payments]})

    @app.post("/api/support")
    @require_auth("student", "affiliate")
    def create_support_request():
        message = (request.form.get("message") or "").strip()
        if not message:
            return error("Message is required")

        file_path = None
        if request.files.get("file") and request.files["file"].filename:
            try:
                file_path = save_upload(
                    request.files.get("file"),
                    "support",
                    allowed_extensions=IMAGE_PDF_UPLOADS,
                    max_bytes=MAX_SUPPORT_FILE_SIZE,
                )
            except ValueError as exc:
                return error(str(exc))

        support = SupportRequest(user_id=request.user.id, message=message, file_path=file_path)
        db.session.add(support)
        audit("support_request_created", request.user, {"supportId": support.id})
        db.session.commit()
        return jsonify({"support": support.dict()}), 201

    @app.get("/api/referrals/me")
    @require_auth("student", "affiliate")
    def referral_dashboard():
        user = request.user
        referrals = list_referrals(user.id)
        wallet = wallet_summary(user.id)
        return jsonify({"user": user.public_dict(), "referrals": referrals, "wallet": wallet})

    @app.get("/api/materials")
    @require_auth("student", "admin")
    def materials_list():
        if request.user.role == "student" and request.user.payment_status != "approved":
            return error("Course access requires approved payment", 403)
        materials = Material.query.filter_by(is_active=True).order_by(Material.created_at.desc()).all()
        return jsonify({"materials": [item.dict() for item in materials]})

    @app.get("/api/codes")
    @require_auth("student", "admin")
    def codes_list():
        if request.user.role == "student" and request.user.payment_status != "approved":
            return error("Code access requires approved payment", 403)
        resources = CodeResource.query.filter_by(is_active=True).order_by(CodeResource.created_at.desc()).all()
        return jsonify({"codes": [item.dict() for item in resources]})

    @app.get("/api/announcements")
    @require_auth("student", "admin", "affiliate")
    def announcements_list():
        announcements = Announcement.query.filter_by(is_active=True).order_by(Announcement.priority.asc(), Announcement.created_at.desc()).all()
        return jsonify({"announcements": [item.dict() for item in announcements]})

    @app.get("/api/student/dashboard")
    @require_auth("student")
    def student_dashboard():
        user = request.user
        latest_announcement = Announcement.query.filter_by(is_active=True).order_by(Announcement.created_at.desc()).first()
        return jsonify(
            {
                "user": user.public_dict(),
                "settings": all_settings(),
                "locked": user.payment_status != "approved",
                "latestAnnouncement": latest_announcement.dict() if latest_announcement else None,
                "referrals": list_referrals(user.id),
                "wallet": wallet_summary(user.id),
            }
        )

    @app.get("/api/admin/stats")
    @require_auth("admin")
    def admin_stats():
        today = now_utc().date().isoformat()
        students = User.query.filter_by(role="student", is_active=True)
        payments_today = PaymentSubmission.query.filter(db.func.date(PaymentSubmission.created_at) == today).count()
        return jsonify(
            {
                "totalStudents": students.count(),
                "pendingVerification": students.filter(User.payment_status.in_(["payment_submitted", "under_review"])).count(),
                "approvedStudents": students.filter_by(payment_status="approved").count(),
                "rejectedPayments": students.filter_by(payment_status="rejected").count(),
                "todaysRegistrations": students.filter(db.func.date(User.created_at) == today).count(),
                "todaysPayments": payments_today,
                "referralPartners": User.query.filter_by(role="affiliate").count(),
                "pendingWallet": sum(wallet_summary(user.id)["availableBalance"] for user in User.query.filter(User.role.in_(["student", "affiliate"])).all()),
                "totalEarningsGenerated": sum(tx.amount for tx in WalletTransaction.query.filter_by(type="earning").all()),
                "materialsUploaded": Material.query.count(),
                "announcements": Announcement.query.count(),
            }
        )

    @app.get("/api/admin/students")
    @require_auth("admin")
    def admin_students():
        students = User.query.filter_by(role="student", is_active=True).order_by(User.created_at.desc()).all()
        return jsonify({"students": [student.public_dict() for student in students]})

    @app.patch("/api/admin/students/<int:student_id>")
    @require_auth("admin")
    def update_student(student_id):
        data = request.get_json(silent=True) or {}
        student = db.session.get(User, student_id)
        if not student or student.role != "student":
            return error("Student not found", 404)

        if "fullName" in data:
            full_name = (data.get("fullName") or "").strip()
            if not full_name:
                return error("Full name is required")
            student.full_name = full_name
        if "email" in data:
            email = (data.get("email") or "").strip().lower() or None
            if email:
                existing = User.query.filter(User.email == email, User.id != student.id).first()
                if existing:
                    return error("Email already exists")
            student.email = email
        if "phone" in data:
            student.phone = (data.get("phone") or "").strip() or None
        if "courseMode" in data:
            mode = (data.get("courseMode") or "").strip().lower() or None
            if mode and mode not in {"online", "offline"}:
                return error("Course mode must be online or offline")
            student.course_mode = mode
        if "paymentStatus" in data:
            status = data.get("paymentStatus")
            if status not in {"registered", "payment_submitted", "under_review", "approved", "rejected"}:
                return error("Invalid payment status")
            student.payment_status = status
            if status == "approved":
                student.approved_at = student.approved_at or now_utc()
                award_referral_for(student)
        if "isActive" in data:
            student.is_active = bool(data.get("isActive"))

        audit("student_updated", request.user, {"studentId": student.id})
        db.session.commit()
        return jsonify({"student": student.public_dict()})

    @app.delete("/api/admin/students/<int:student_id>")
    @require_auth("admin")
    def remove_student(student_id):
        student = db.session.get(User, student_id)
        if not student or student.role != "student":
            return error("Student not found", 404)
        student.is_active = False
        audit("student_removed", request.user, {"studentId": student.id})
        db.session.commit()
        return jsonify({"student": student.public_dict()})

    @app.get("/api/admin/payments")
    @require_auth("admin")
    def admin_payments():
        payments = PaymentSubmission.query.order_by(PaymentSubmission.created_at.desc()).all()
        return jsonify({"payments": [payment.dict() for payment in payments]})

    @app.patch("/api/admin/payments/<int:payment_id>")
    @require_auth("admin")
    def review_payment(payment_id):
        data = request.get_json(silent=True) or {}
        status = data.get("status")
        if status not in {"under_review", "approved", "rejected"}:
            return error("Status must be under_review, approved, or rejected")
        payment = db.session.get(PaymentSubmission, payment_id)
        if not payment:
            return error("Payment not found", 404)
        payment.status = status
        payment.admin_notes = data.get("adminNotes")
        payment.reviewed_at = now_utc()
        payment.student.payment_status = status
        if status == "approved":
            payment.student.approved_at = now_utc()
            award_referral_for(payment.student)
        audit("payment_reviewed", request.user, {"paymentId": payment.id, "status": status})
        db.session.commit()
        return jsonify({"payment": payment.dict()})

    @app.post("/api/admin/payments/manual")
    @require_auth("admin")
    def create_manual_payment():
        data = request.get_json(silent=True) or {}
        identifier = (data.get("studentIdentifier") or data.get("studentId") or data.get("email") or "").strip()
        mode = (data.get("mode") or "").strip().lower()
        status = data.get("status") or "approved"
        try:
            amount = int(data.get("amount") or 0)
        except (TypeError, ValueError):
            return error("Amount must be a number")

        if not identifier:
            return error("Student ID or email is required")
        if mode not in {"online", "offline"}:
            return error("Mode must be online or offline")
        if amount <= 0:
            return error("Amount must be positive")
        if status not in {"under_review", "approved", "rejected"}:
            return error("Status must be under_review, approved, or rejected")

        student = User.query.filter(
            User.role == "student",
            User.is_active.is_(True),
            (User.student_id == identifier) | (User.email == identifier.lower()),
        ).first()
        if not student:
            return error("Student not found", 404)

        receipt_dir = Path(app.config["UPLOAD_FOLDER"]) / "payments"
        receipt_dir.mkdir(parents=True, exist_ok=True)
        receipt_name = f"manual-{uuid.uuid4().hex}.txt"
        receipt_path = receipt_dir / receipt_name
        receipt_path.write_text(
            "\n".join(
                [
                    "Manual payment record",
                    f"Student: {student.full_name} ({student.student_id})",
                    f"Mode: {mode}",
                    f"Amount: {amount}",
                    f"Status: {status}",
                    f"Transaction ID: {data.get('transactionId') or '-'}",
                    f"Notes: {data.get('adminNotes') or '-'}",
                    f"Recorded at: {now_utc().isoformat()}",
                ]
            ),
            encoding="utf-8",
        )

        notes = data.get("adminNotes") or ""
        transaction_id = (data.get("transactionId") or "").strip()
        if transaction_id:
            notes = f"Transaction ID: {transaction_id}. {notes}".strip()

        payment = PaymentSubmission(
            student_id=student.id,
            mode=mode,
            original_amount=amount,
            payable_amount=amount,
            screenshot_path=str(Path("payments") / receipt_name),
            status=status,
            admin_notes=notes or None,
            reviewed_at=now_utc(),
        )
        student.course_mode = mode
        student.payment_status = status
        if status == "approved":
            student.approved_at = student.approved_at or now_utc()
            award_referral_for(student)
        db.session.add(payment)
        audit("manual_payment_created", request.user, {"studentId": student.id, "amount": amount, "status": status})
        db.session.commit()
        return jsonify({"payment": payment.dict(), "student": student.public_dict()}), 201

    @app.post("/api/admin/affiliates")
    @require_auth("admin")
    def create_affiliate():
        data = request.get_json(silent=True) or {}
        username = (data.get("username") or "").strip()
        password = data.get("password") or ""
        full_name = (data.get("fullName") or "").strip()
        if not username or not password or not full_name:
            return error("Full name, username, and password are required")
        if User.query.filter_by(username=username).first():
            return error("Username already exists")
        affiliate = User(
            role="affiliate",
            full_name=full_name,
            username=username,
            phone=data.get("phone"),
            email=data.get("email"),
            password_hash=generate_password_hash(password, method=PASSWORD_HASH_METHOD),
            referral_code=unique_referral_code(),
        )
        db.session.add(affiliate)
        audit("affiliate_created", request.user, {"username": username})
        db.session.commit()
        return jsonify({"affiliate": affiliate.public_dict()}), 201

    @app.get("/api/admin/affiliates")
    @require_auth("admin")
    def affiliates_list():
        affiliates = User.query.filter_by(role="affiliate", is_active=True).order_by(User.created_at.desc()).all()
        return jsonify({"affiliates": [affiliate.public_dict() for affiliate in affiliates]})

    @app.get("/api/admin/support")
    @require_auth("admin")
    def admin_support_requests():
        requests = SupportRequest.query.order_by(SupportRequest.created_at.desc()).all()
        return jsonify({"requests": [item.dict() for item in requests]})

    @app.patch("/api/admin/support/<int:support_id>")
    @require_auth("admin")
    def update_support_request(support_id):
        data = request.get_json(silent=True) or {}
        status = data.get("status")
        if status not in {"open", "reviewing", "resolved"}:
            return error("Status must be open, reviewing, or resolved")
        support = db.session.get(SupportRequest, support_id)
        if not support:
            return error("Support request not found", 404)
        support.status = status
        support.reviewed_at = now_utc()
        audit("support_request_updated", request.user, {"supportId": support.id, "status": status})
        db.session.commit()
        return jsonify({"support": support.dict()})

    @app.patch("/api/admin/affiliates/<int:affiliate_id>")
    @require_auth("admin")
    def update_affiliate(affiliate_id):
        data = request.get_json(silent=True) or {}
        affiliate = db.session.get(User, affiliate_id)
        if not affiliate or affiliate.role != "affiliate":
            return error("Partner not found", 404)

        if "fullName" in data:
            full_name = (data.get("fullName") or "").strip()
            if not full_name:
                return error("Full name is required")
            affiliate.full_name = full_name
        if "username" in data:
            username = (data.get("username") or "").strip()
            if not username:
                return error("Username is required")
            existing = User.query.filter(User.username == username, User.id != affiliate.id).first()
            if existing:
                return error("Username already exists")
            affiliate.username = username
        if "email" in data:
            email = (data.get("email") or "").strip().lower() or None
            if email:
                existing = User.query.filter(User.email == email, User.id != affiliate.id).first()
                if existing:
                    return error("Email already exists")
            affiliate.email = email
        if "phone" in data:
            affiliate.phone = (data.get("phone") or "").strip() or None
        if data.get("password"):
            affiliate.password_hash = generate_password_hash(data["password"], method=PASSWORD_HASH_METHOD)
        if "isActive" in data:
            affiliate.is_active = bool(data.get("isActive"))

        audit("affiliate_updated", request.user, {"affiliateId": affiliate.id})
        db.session.commit()
        return jsonify({"affiliate": affiliate.public_dict()})

    @app.delete("/api/admin/affiliates/<int:affiliate_id>")
    @require_auth("admin")
    def remove_affiliate(affiliate_id):
        affiliate = db.session.get(User, affiliate_id)
        if not affiliate or affiliate.role != "affiliate":
            return error("Partner not found", 404)
        affiliate.is_active = False
        audit("affiliate_removed", request.user, {"affiliateId": affiliate.id})
        db.session.commit()
        return jsonify({"affiliate": affiliate.public_dict()})

    @app.post("/api/admin/payouts")
    @require_auth("admin")
    def create_payout():
        data = request.get_json(silent=True) or {}
        user = db.session.get(User, data.get("userId"))
        amount = int(data.get("amount") or 0)
        if not user or user.role not in {"student", "affiliate"}:
            return error("Referral earner not found")
        if amount <= 0:
            return error("Payout amount must be positive")
        if amount > wallet_summary(user.id)["availableBalance"]:
            return error("Payout exceeds available balance")
        tx = WalletTransaction(
            user_id=user.id,
            amount=-amount,
            type="payout",
            transaction_id=data.get("transactionId"),
            payment_mode=data.get("paymentMode"),
            remarks=data.get("remarks"),
        )
        db.session.add(tx)
        audit("payout_created", request.user, {"userId": user.id, "amount": amount})
        db.session.commit()
        return jsonify({"transaction": tx.dict(), "wallet": wallet_summary(user.id)}), 201

    @app.post("/api/admin/materials")
    @require_auth("admin")
    def create_material():
        try:
            file_path = save_upload(request.files.get("file"), "materials")
        except ValueError as exc:
            return error(str(exc))
        material = Material(
            title=request.form.get("title", "").strip() or "Untitled Material",
            description=request.form.get("description"),
            category=request.form.get("category", "material"),
            file_path=file_path,
        )
        db.session.add(material)
        db.session.commit()
        return jsonify({"material": material.dict()}), 201

    @app.post("/api/admin/codes")
    @require_auth("admin")
    def create_code_resource():
        resource_type = request.form.get("resourceType", "link")
        file_path = None
        if request.files.get("file"):
            try:
                file_path = save_upload(request.files.get("file"), "codes")
            except ValueError as exc:
                return error(str(exc))
        resource = CodeResource(
            title=request.form.get("title", "").strip() or "Untitled Resource",
            description=request.form.get("description"),
            resource_type=resource_type,
            url=request.form.get("url"),
            file_path=file_path,
        )
        db.session.add(resource)
        db.session.commit()
        return jsonify({"code": resource.dict()}), 201

    @app.post("/api/admin/announcements")
    @require_auth("admin")
    def create_announcement():
        data = request.get_json(silent=True) or {}
        if not data.get("title") or not data.get("body"):
            return error("Title and body are required")
        announcement = Announcement(
            title=data["title"],
            body=data["body"],
            priority=data.get("priority", "normal"),
        )
        db.session.add(announcement)
        db.session.commit()
        return jsonify({"announcement": announcement.dict()}), 201

    @app.patch("/api/admin/settings")
    @require_auth("admin")
    def update_settings():
        data = request.get_json(silent=True) or {}
        for key, value in data.items():
            set_setting(key, value)
        audit("settings_updated", request.user, {"keys": list(data.keys())})
        db.session.commit()
        return jsonify(all_settings())

    @app.get("/api/admin/referral-report")
    @require_auth("admin")
    def referral_report():
        users = User.query.filter(User.role.in_(["student", "affiliate"])).order_by(User.created_at.desc()).all()
        return jsonify(
            {
                "earners": [
                    {
                        "user": user.public_dict(),
                        "referrals": list_referrals(user.id),
                        "wallet": wallet_summary(user.id),
                    }
                    for user in users
                ]
            }
        )

    @app.get("/api/uploads/<path:filename>")
    @require_auth("student", "admin", "affiliate")
    def uploaded_file(filename):
        upload_root = Path(os.getenv("UPLOAD_FOLDER", "uploads")).resolve()
        return send_from_directory(upload_root, filename)


app = create_app()


if __name__ == "__main__":
    app.run(
        port=int(os.getenv("PORT", "5000")),
        debug=os.getenv("FLASK_ENV", "development") == "development",
    )
