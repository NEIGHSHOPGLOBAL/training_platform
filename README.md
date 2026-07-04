# Training Management & Referral Platform

This repository contains a production-oriented starter implementation for the Training Management & Referral Platform described in `overview.txt`.

The original `index.html` remains the public landing page. The authenticated product is split into:

- `backend/`: Flask REST API with SQLite, SQLAlchemy models, JWT auth, OTP-based student login, role-based admin/student/affiliate access, secure upload validation, payments, referrals, wallets, content, and settings.
- `frontend/`: React/Vite dashboard app styled from the landing page visual language.

## Run Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python app.py
```

The API runs at `http://localhost:5000`.

Default development admin:

- Username: `admin`
- Password: `admin123`

Change these in `backend/.env` before using real data.

## Run Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The React app runs at `http://localhost:5173`.

## Key Flows Implemented

- Student registration and login via email OTP. In development, the OTP is returned on screen when `DEV_SHOW_OTP=true`.
- Optional referral code validation during student registration.
- Automatic student IDs like `SD202600001` and unique 5-character referral codes.
- Locked student dashboard until payment proof is uploaded and approved by admin.
- Online/offline pricing and referral-discount pricing controlled from admin settings.
- Admin payment verification with approved/rejected/under-review statuses.
- Referral reward creation only after referred student's payment is approved.
- Wallet summary with lifetime earnings, paid amount, available balance, and transaction history.
- Admin-created referral partner accounts with independent referral dashboards and no course access.
- Materials, code resources, announcements, course settings, and admin dashboard metrics.

## Notes

This is a strong functional foundation, not a final hardened deployment. For production, configure SMTP delivery, a managed SQL database, HTTPS, stricter CORS origins, persistent file storage, backup policy, observability, and stronger secret management.
