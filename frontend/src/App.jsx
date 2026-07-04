import { useEffect, useMemo, useState } from "react";
import brandLogo from "./assets/neighshop-logo.png";
import paymentLockGuide from "./assets/payment-lock-guide.png";
import paymentQr from "./assets/payment-qr.png";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";
const MAX_SUPPORT_FILE_SIZE = 5 * 1024 * 1024;
const SUPPORT_FILE_ACCEPT = "image/png,image/jpeg,image/webp,application/pdf,.png,.jpg,.jpeg,.webp,.pdf";
let bodyScrollLockCount = 0;
let bodyScrollSnapshot = null;

const initialAuth = () => {
  try {
    return {
      token: localStorage.getItem("portalToken"),
      user: JSON.parse(localStorage.getItem("portalUser") || "null"),
    };
  } catch {
    return { token: null, user: null };
  }
};

async function api(path, options = {}, token) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}

function formatMoney(value) {
  return `Rs ${Number(value || 0).toLocaleString("en-IN")}`;
}

function App() {
  const [{ token, user }, setAuth] = useState(initialAuth);
  const [settings, setSettings] = useState({});
  const [notice, setNotice] = useState("");
  const path = window.location.pathname;

  const saveAuth = (nextToken, nextUser) => {
    localStorage.setItem("portalToken", nextToken);
    localStorage.setItem("portalUser", JSON.stringify(nextUser));
    setAuth({ token: nextToken, user: nextUser });
  };

  const logout = () => {
    localStorage.removeItem("portalToken");
    localStorage.removeItem("portalUser");
    setAuth({ token: null, user: null });
  };

  useEffect(() => {
    api("/api/settings")
      .then(setSettings)
      .catch(() => setSettings({}));
  }, []);

  useEffect(() => {
    if (!token) return;
    api("/api/auth/me", {}, token)
      .then((data) => saveAuth(token, data.user))
      .catch(logout);
  }, []);

  const shellProps = { user, token, settings, setNotice, saveAuth };
  const loginScreen = path.startsWith("/admin") ? (
    <StaffLoginScreen roleName="Admin" onAuth={saveAuth} setNotice={setNotice} />
  ) : path.startsWith("/partner") || path.startsWith("/affiliate") ? (
    <StaffLoginScreen roleName="Referral Partner" onAuth={saveAuth} setNotice={setNotice} />
  ) : (
    <AuthScreen onAuth={saveAuth} settings={settings} setNotice={setNotice} />
  );

  return (
    <div className="app-shell">
      {notice && (
        <div className="toast" onAnimationEnd={() => setNotice("")}>
          {notice}
        </div>
      )}
      <header className="topbar">
        <a className="brand" href="/">
          <img src={brandLogo} alt="Neighshop Global" />
          <span>NEIGHSHOP GLOBAL</span>
        </a>
        <nav>
          <a href="/" className="home-link" aria-label="Home">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 11 9-8 9 8" />
              <path d="M5 10v10h14V10" />
              <path d="M9 20v-6h6v6" />
            </svg>
          </a>
          {user && <span>{user.role}</span>}
          {user && <button onClick={logout}>Logout</button>}
        </nav>
      </header>

      {!user && loginScreen}
      {user?.role === "student" && <StudentPortal {...shellProps} />}
      {user?.role === "admin" && <AdminPortal {...shellProps} />}
      {user?.role === "affiliate" && <AffiliatePortal {...shellProps} />}
    </div>
  );
}

function FieldIcon({ name }) {
  const icons = {
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
    phone: (
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.7.6 2.5a2 2 0 0 1-.5 2.1L8 9.5a16 16 0 0 0 6.5 6.5l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.6.5 2.5.6a2 2 0 0 1 1.7 2Z" />
    ),
    gift: (
      <>
        <rect x="3" y="8" width="18" height="13" rx="2" />
        <path d="M12 8v13" />
        <path d="M3 12h18" />
        <path d="M12 8H7.5A2.5 2.5 0 1 1 10 5.5L12 8Z" />
        <path d="M12 8h4.5A2.5 2.5 0 1 0 14 5.5L12 8Z" />
      </>
    ),
    lock: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10" />
        <path d="M9 20v-6h6v6" />
      </>
    ),
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="8" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="15" width="7" height="6" rx="1.5" />
      </>
    ),
    book: (
      <>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15Z" />
      </>
    ),
    code: (
      <>
        <path d="m8 9-4 3 4 3" />
        <path d="m16 9 4 3-4 3" />
        <path d="m14 4-4 16" />
      </>
    ),
    star: (
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
    ),
    message: (
      <>
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" />
        <path d="M8 9h8" />
        <path d="M8 13h5" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
        <path d="M16 3.1a4 4 0 0 1 0 7.8" />
      </>
    ),
    credit: (
      <>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
        <path d="M6 15h3" />
      </>
    ),
    wallet: (
      <>
        <path d="M19 7V6a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h14v10H5a3 3 0 0 1-3-3V7" />
        <path d="M16 14h.01" />
      </>
    ),
    check: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.5 2.5L16 9" />
      </>
    ),
    x: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m9 9 6 6" />
        <path d="m15 9-6 6" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4" />
        <path d="m7 9 5-5 5 5" />
        <path d="M20 16v4H4v-4" />
      </>
    ),
    settings: (
      <>
        <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 .9-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5.9h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
      </>
    ),
    expand: (
      <>
        <path d="M8 3H3v5" />
        <path d="M3 3l7 7" />
        <path d="M16 3h5v5" />
        <path d="m21 3-7 7" />
        <path d="M8 21H3v-5" />
        <path d="m3 21 7-7" />
        <path d="M16 21h5v-5" />
        <path d="m21 21-7-7" />
      </>
    ),
    refresh: (
      <>
        <path d="M21 12a9 9 0 0 1-15.3 6.4L3 16" />
        <path d="M3 21v-5h5" />
        <path d="M3 12A9 9 0 0 1 18.3 5.6L21 8" />
        <path d="M21 3v5h-5" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    file: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6" />
      </>
    ),
    link: (
      <>
        <path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" />
        <path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1" />
      </>
    ),
    copy: (
      <>
        <rect x="9" y="9" width="11" height="11" rx="2" />
        <rect x="4" y="4" width="11" height="11" rx="2" />
      </>
    ),
    alert: (
      <>
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    edit: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M19 6l-1 14H6L5 6" />
        <path d="M10 11v5" />
        <path d="M14 11v5" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </>
    ),
    graph: (
      <>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="M8 15v-4" />
        <path d="M12 15V8" />
        <path d="M16 15v-7" />
      </>
    ),
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {icons[name] || icons.dashboard}
    </svg>
  );
}

function iconForLabel(label = "") {
  const normalized = label.toLowerCase();
  if (normalized.includes("home") || normalized.includes("dashboard")) return "dashboard";
  if (normalized.includes("student") || normalized.includes("partner") || normalized.includes("referral")) return "users";
  if (normalized.includes("payment") || normalized.includes("paid")) return "credit";
  if (normalized.includes("wallet") || normalized.includes("earning") || normalized.includes("balance")) return "wallet";
  if (normalized.includes("material")) return "book";
  if (normalized.includes("code")) return "code";
  if (normalized.includes("review")) return "star";
  if (normalized.includes("chat")) return "message";
  if (normalized.includes("content")) return "file";
  if (normalized.includes("setting")) return "settings";
  if (normalized.includes("announcement")) return "bell";
  if (normalized.includes("earning") || normalized.includes("graph")) return "graph";
  if (normalized.includes("support")) return "message";
  if (normalized.includes("course") || normalized.includes("countdown")) return "clock";
  if (normalized.includes("approved") || normalized.includes("verified")) return "check";
  if (normalized.includes("rejected")) return "x";
  if (normalized.includes("pending") || normalized.includes("review")) return "clock";
  return "dashboard";
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function statusClass(status = "") {
  return String(status || "neutral").replace(/_/g, "-").toLowerCase();
}

function humanizeLabel(value = "") {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function StatusBadge({ status }) {
  return <span className={`status-badge ${statusClass(status)}`}>{String(status || "not set").replace(/_/g, " ")}</span>;
}

function useBodyScrollLock(locked = true) {
  useEffect(() => {
    if (!locked) return undefined;

    const body = document.body;
    const root = document.documentElement;

    if (bodyScrollLockCount === 0) {
      const bodyStyles = window.getComputedStyle(body);
      const scrollbarWidth = window.innerWidth - root.clientWidth;
      bodyScrollSnapshot = {
        bodyOverflow: body.style.overflow,
        bodyPaddingRight: body.style.paddingRight,
        rootOverflow: root.style.overflow,
      };
      body.style.overflow = "hidden";
      root.style.overflow = "hidden";
      if (scrollbarWidth > 0) {
        const currentPadding = parseFloat(bodyStyles.paddingRight) || 0;
        body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
      }
    }

    bodyScrollLockCount += 1;

    return () => {
      bodyScrollLockCount = Math.max(0, bodyScrollLockCount - 1);
      if (bodyScrollLockCount === 0 && bodyScrollSnapshot) {
        body.style.overflow = bodyScrollSnapshot.bodyOverflow;
        body.style.paddingRight = bodyScrollSnapshot.bodyPaddingRight;
        root.style.overflow = bodyScrollSnapshot.rootOverflow;
        bodyScrollSnapshot = null;
      }
    };
  }, [locked]);
}

function validateSupportFile(file) {
  if (!file) return "";
  const allowed = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
  if (!allowed.includes(file.type)) return "Only image or PDF files are allowed.";
  if (file.size > MAX_SUPPORT_FILE_SIZE) return "File must be 5MB or smaller.";
  return "";
}

function ActionButton({ icon, tone = "neutral", children, ...props }) {
  return (
    <button type="button" className={`action-button ${tone}`} {...props}>
      <FieldIcon name={icon} />
      {children}
    </button>
  );
}

function AuthScreen({ onAuth, settings, setNotice }) {
  const [authMode, setAuthMode] = useState("login");
  const [registration, setRegistration] = useState({
    fullName: "",
    email: "",
    phone: "",
    referralCode: new URLSearchParams(window.location.search).get("ref") || "",
  });
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [authHint, setAuthHint] = useState("");

  const switchAuthMode = (mode) => {
    setAuthMode(mode);
    setAuthHint("");
    setOtp("");
    setDevOtp("");
    setOtpSent(false);
  };

  const submitOtpRequest = async (event) => {
    event.preventDefault();
    setIsSendingOtp(true);
    setAuthHint("");
    const payload = authMode === "login"
      ? { email: registration.email }
      : registration;
    try {
      const data = await api("/api/auth/student/request-otp", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setDevOtp(data.devOtp || "");
      setOtpSent(true);
      setNotice(data.message || "OTP sent to email.");
    } catch (error) {
      const message = error.message || "Unable to send OTP. Please try again.";
      const shouldOpenRegister = authMode === "login" && /full name|required for registration|not registered/i.test(message);
      if (shouldOpenRegister) {
        const registerMessage = "Student not registered. Kindly register first.";
        setAuthMode("register");
        setOtp("");
        setDevOtp("");
        setOtpSent(false);
        setAuthHint(registerMessage);
        setNotice(registerMessage);
      } else {
        setAuthHint(message);
        setNotice(message);
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  const verifyOtp = async (event) => {
    event.preventDefault();
    setIsVerifyingOtp(true);
    try {
      const data = await api("/api/auth/student/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email: registration.email, code: otp }),
      });
      onAuth(data.token, data.user);
    } catch (error) {
      setNotice(error.message || "Invalid OTP.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  return (
    <main className="student-auth-page">
      <section className="student-auth-info" aria-label="Training program highlights">
        <div>
          <h1>
            Learn. Build.
            <br />
            Grow <span>With Us.</span>
          </h1>
          <p className="auth-info-lead">
            Join aspiring developers and start your journey toward a successful tech career with Neighshop Global.
          </p>
        </div>

        <div className="auth-benefits">
          <article>
            <div className="benefit-icon">01</div>
            <div>
              <h3>Industry-Focused Courses</h3>
              <p>Learn from experts and build real-world projects.</p>
            </div>
          </article>
          <article>
            <div className="benefit-icon">02</div>
            <div>
              <h3>Mentorship & Support</h3>
              <p>Get guidance from experienced mentors.</p>
            </div>
          </article>
          <article>
            <div className="benefit-icon">03</div>
            <div>
              <h3>Placement Assistance</h3>
              <p>Prepare for interviews and career opportunities.</p>
            </div>
          </article>
        </div>
      </section>

      <section className="auth-card student-auth-card" id="portal-login">
        {!otpSent ? (
          <>
            <div className="login-heading">
              <p className="eyebrow">Student Access</p>
              <h2>{authMode === "login" ? "Login" : "Register"}</h2>
              <p>{authMode === "login" ? "Enter your registered email and verify OTP." : "Create your student account and verify your email OTP."}</p>
            </div>

            <div className="auth-mode-toggle">
              <button type="button" className={authMode === "login" ? "active" : ""} onClick={() => switchAuthMode("login")}>
                <FieldIcon name="lock" /> Login
              </button>
              <button type="button" className={authMode === "register" ? "active" : ""} onClick={() => switchAuthMode("register")}>
                <FieldIcon name="user" /> Register
              </button>
            </div>

            {authHint && <div className="auth-inline-alert"><FieldIcon name="alert" /> {authHint}</div>}

            <form onSubmit={submitOtpRequest} className="student-form">
              {authMode === "register" && (
                <label className="field-row">
                  <span className="field-icon"><FieldIcon name="user" /></span>
                  <input aria-label="Full name" required placeholder="Full Name" value={registration.fullName} onChange={(e) => setRegistration({ ...registration, fullName: e.target.value })} />
                </label>
              )}
              <label className="field-row">
                <span className="field-icon"><FieldIcon name="mail" /></span>
                <input aria-label="Email address" type="email" required placeholder="Email Address" value={registration.email} onChange={(e) => setRegistration({ ...registration, email: e.target.value })} />
              </label>
              {authMode === "register" && (
                <>
                  <label className="field-row">
                    <span className="field-icon"><FieldIcon name="phone" /></span>
                    <span className="phone-prefix">+91</span>
                    <input aria-label="Mobile number" placeholder="Mobile Number" value={registration.phone} onChange={(e) => setRegistration({ ...registration, phone: e.target.value })} />
                  </label>
                  <label className="field-row">
                    <span className="field-icon"><FieldIcon name="gift" /></span>
                    <input aria-label="Referral code" placeholder="Referral Code" value={registration.referralCode} onChange={(e) => setRegistration({ ...registration, referralCode: e.target.value.toUpperCase() })} />
                    <span className="field-badge">Optional</span>
                  </label>
                </>
              )}
              <button className="btn-primary" disabled={isSendingOtp || otpSent}>
                {isSendingOtp ? "Sending..." : "Send OTP"}
              </button>
            </form>
            <p className="privacy-note">We never share your information with anyone.</p>
          </>
        ) : (
          <div className="otp-step">
            <div className="login-heading otp-heading">
              <p className="eyebrow">Verify Email</p>
              <h2>Enter OTP</h2>
              <p>We sent a 6-digit verification code to {registration.email} for {authMode === "login" ? "login" : "registration"}.</p>
            </div>
            {devOtp && <div className="dev-otp">Development OTP: {devOtp}</div>}
            <form onSubmit={verifyOtp} className="otp-only-form">
              <label className="field-row otp-field">
                <span className="field-icon"><FieldIcon name="lock" /></span>
                <input
                  aria-label="OTP code"
                  inputMode="numeric"
                  maxLength="6"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
              </label>
              <button className="btn-primary" disabled={isVerifyingOtp}>
                {isVerifyingOtp ? "Verifying..." : "Verify & Enter"}
              </button>
            </form>
            <button
              className="back-button"
              type="button"
              onClick={() => {
                setOtpSent(false);
                setOtp("");
                setDevOtp("");
              }}
            >
              Change details
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

function StaffLoginScreen({ roleName, onAuth, setNotice }) {
  const [login, setLogin] = useState({ username: "", password: "" });

  const passwordLogin = async (event) => {
    event.preventDefault();
    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(login),
      });
      onAuth(data.token, data.user);
    } catch (error) {
      setNotice(error.message);
    }
  };

  return (
    <main className="staff-login-page">
      <section className="auth-card professional-login staff-login-card">
        <div className="login-heading">
          <p className="eyebrow">{roleName} Access</p>
          <h2>{roleName} Login</h2>
          <p>This area is separate from student OTP login.</p>
        </div>
        <form onSubmit={passwordLogin} className="form-grid">
            <label>
              Username
              <input required placeholder="admin or partner username" value={login.username} onChange={(e) => setLogin({ ...login, username: e.target.value })} />
            </label>
            <label>
              Password
              <input type="password" required placeholder="Enter password" value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} />
            </label>
            <button className="btn-primary">Login</button>
            {roleName === "Admin" && <p className="muted">Default dev admin: admin / admin123</p>}
          </form>
        <div className="login-footer">
          <span>Role based access</span>
          <span>Protected admin APIs</span>
          <span>Separate URL</span>
        </div>
      </section>
    </main>
  );
}

function StudentPortal({ user, token, settings, setNotice, saveAuth }) {
  const [tab, setTab] = useState("home");
  const [dashboard, setDashboard] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const studentTabs = ["home", "materials", "codes", "reviews", "group chat", "referrals", "support"];

  const loadDashboard = () =>
    api("/api/student/dashboard", {}, token)
      .then(setDashboard)
      .catch((error) => setNotice(error.message));

  useEffect(() => {
    loadDashboard();
  }, []);

  const activeUser = dashboard?.user || user;
  const locked = dashboard?.locked ?? activeUser.paymentStatus !== "approved";
  const isSupportTab = tab === "support";
  const isReferralTab = tab === "referrals";
  const isUtilityTab = isSupportTab || isReferralTab;
  const waitingForApproval = ["payment_submitted", "under_review"].includes(activeUser.paymentStatus);
  const changeStudentTab = (nextTab) => {
    setTab(nextTab);
    setMobileMenuOpen(false);
  };

  return (
    <main className={`portal student-portal ${locked ? "is-locked" : "is-verified"}`}>
      <Sidebar title="Student Portal" tabs={studentTabs} active={tab} onChange={changeStudentTab} hideBrand />
      <section className="workspace">
        <div key={tab} className={`student-dashboard-content ${locked && !isUtilityTab ? "is-blurred" : ""}`}>
          <PageHeader
            title={`Welcome, ${activeUser.fullName}`}
            subtitle={`Student ID ${activeUser.studentId} | Status ${activeUser.paymentStatus}`}
          />
          {isSupportTab ? (
            <SupportPanel token={token} setNotice={setNotice} title="Student Support" />
          ) : isReferralTab ? (
            <ReferralPanel token={token} user={activeUser} setNotice={setNotice} />
          ) : locked ? (
            <LockedDashboardPreview activeUser={activeUser} dashboard={dashboard} settings={settings} />
          ) : (
            <UnlockingSoonScreen tab={tab} settings={settings} />
          )}
        </div>
        {locked && !isUtilityTab && waitingForApproval && (
          <ApprovalWaitingGate activeUser={activeUser} onRefresh={loadDashboard} />
        )}
        {locked && !isUtilityTab && !waitingForApproval && (
          <EnrollmentGate
            token={token}
            settings={settings}
            hasReferral={activeUser.hasReferral}
            onComplete={(nextUser) => {
              saveAuth(token, nextUser);
              loadDashboard();
            }}
          />
        )}
      </section>
      <StudentMobileNav
        tabs={studentTabs}
        active={tab}
        onChange={changeStudentTab}
        menuOpen={mobileMenuOpen}
        setMenuOpen={setMobileMenuOpen}
      />
    </main>
  );
}

function StudentMobileNav({ tabs, active, onChange, menuOpen, setMenuOpen }) {
  const bottomTabs = ["home", "materials", "referrals", "support"];
  useBodyScrollLock(menuOpen);

  return (
    <>
      <nav className="student-mobile-bottom-nav" aria-label="Student mobile navigation">
        {bottomTabs.map((tab) => (
          <button key={tab} type="button" className={active === tab ? "active" : ""} onClick={() => onChange(tab)}>
            <FieldIcon name={iconForLabel(tab)} />
            <span>{tab}</span>
          </button>
        ))}
        <button type="button" className={menuOpen ? "active" : ""} onClick={() => setMenuOpen(!menuOpen)}>
          <span className="hamburger-lines" aria-hidden="true"><i /><i /><i /></span>
          <span>Menu</span>
        </button>
      </nav>

      {menuOpen && (
        <div className="student-mobile-menu-backdrop" role="presentation" onMouseDown={() => setMenuOpen(false)}>
          <aside className="student-mobile-menu" role="dialog" aria-modal="true" aria-label="Student menu" onMouseDown={(event) => event.stopPropagation()}>
            <div className="student-mobile-menu-header">
              <div>
                <p className="eyebrow">Student Menu</p>
                <h2>All Sections</h2>
              </div>
              <button type="button" className="modal-close-button" onClick={() => setMenuOpen(false)} aria-label="Close menu">
                <FieldIcon name="x" />
              </button>
            </div>
            <div className="student-mobile-menu-grid">
              {tabs.map((tab) => (
                <button key={tab} type="button" className={active === tab ? "active" : ""} onClick={() => onChange(tab)}>
                  <FieldIcon name={iconForLabel(tab)} />
                  <span>{tab}</span>
                </button>
              ))}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

function LockedDashboardPreview({ activeUser, dashboard, settings }) {
  return (
    <div className="locked-preview-dashboard">
      <div className="dashboard-grid">
        <CountdownCard startDate={settings.courseStartDate || "2026-07-20"} />
        <StatCard label="Payment Status" value={activeUser.paymentStatus} />
        <StatCard label="Course Progress" value="0%" />
        <StatCard label="Materials Locked" value="24+" />
        <StatCard label="Live Sessions" value="18" />
        <StatCard label="Assignments" value="12" />
        <AnnouncementCard item={dashboard?.latestAnnouncement} />
        <ReferralCard user={activeUser} />
      </div>
      <article className="blur-chart-card">
        <div>
          <p className="eyebrow"><FieldIcon name="dashboard" /> Performance Preview</p>
          <h3>Training dashboard unlocks after approval</h3>
        </div>
        <div className="mock-chart" aria-hidden="true">
          <span style={{ height: "44%" }} />
          <span style={{ height: "70%" }} />
          <span style={{ height: "52%" }} />
          <span style={{ height: "86%" }} />
          <span style={{ height: "64%" }} />
          <span style={{ height: "92%" }} />
          <span style={{ height: "76%" }} />
        </div>
      </article>
    </div>
  );
}

function UnlockingSoonScreen({ tab, settings }) {
  const title = tab.replace(/\b\w/g, (char) => char.toUpperCase());

  return (
    <div className="unlocking-screen">
      <CountdownCard startDate={settings.courseStartDate || "2026-07-20"} />
      <article className="unlocking-card">
        <p className="eyebrow">{title}</p>
        <h2>Unlocking Soon</h2>
        <p>
          Your payment is verified. This section will unlock when the course starts and resources are released.
        </p>
        <div className="unlocking-timeline">
          <span>Verified</span>
          <span>Course countdown active</span>
          <span>Content unlocking soon</span>
        </div>
      </article>
    </div>
  );
}

function ApprovalWaitingGate({ activeUser, onRefresh }) {
  const [refreshing, setRefreshing] = useState(false);
  useBodyScrollLock();

  const refreshStatus = async () => {
    setRefreshing(true);
    await Promise.resolve(onRefresh()).finally(() => setRefreshing(false));
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      onRefresh();
    }, 12000);
    return () => window.clearInterval(timer);
  }, [onRefresh]);

  return (
    <div className="gate approval-waiting-overlay">
      <article className="approval-waiting-card">
        <div className="approval-loader" aria-hidden="true">
          <span />
          <span />
          <FieldIcon name="clock" />
        </div>
        <p className="eyebrow"><FieldIcon name="upload" /> Proof Submitted</p>
        <h2>Waiting For Admin Approval</h2>
        <p>
          Your payment proof has been submitted successfully. The dashboard will unlock automatically once admin verifies your payment.
        </p>
        <div className="approval-status-strip">
          <span>Student ID<strong>{activeUser.studentId}</strong></span>
          <span>Current Status<strong>{String(activeUser.paymentStatus).replace(/_/g, " ")}</strong></span>
        </div>
        <button className={`btn-primary refresh-status-button ${refreshing ? "is-refreshing" : ""}`} type="button" onClick={refreshStatus} disabled={refreshing}>
          <FieldIcon name="refresh" />
          {refreshing ? "Checking..." : "Refresh Status"}
        </button>
        <small>We also check automatically every few seconds.</small>
      </article>
    </div>
  );
}

function EnrollmentGate({ token, settings, hasReferral, onComplete }) {
  const [mode, setMode] = useState("online");
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [step, setStep] = useState(1);
  const [isImageOpen, setIsImageOpen] = useState(false);
  useBodyScrollLock();

  const original = mode === "online" ? settings.priceOnline : settings.priceOffline;
  const referral = mode === "online" ? settings.referralPriceOnline : settings.referralPriceOffline;

  const submit = async (event) => {
    event.preventDefault();
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    const validation = validateSupportFile(file);
    if (validation) {
      setMessage(validation);
      return;
    }
    const form = new FormData();
    form.append("mode", mode);
    form.append("screenshot", file);
    const data = await api("/api/payments", { method: "POST", body: form }, token);
    setMessage("Payment proof submitted for admin verification.");
    onComplete(data.user);
  };

  const payable = hasReferral ? referral : original;
  const selectProofFile = (event) => {
    const nextFile = event.target.files?.[0] || null;
    const validation = validateSupportFile(nextFile);
    if (validation) {
      event.target.value = "";
      setFile(null);
      setMessage(validation);
      return;
    }
    setMessage("");
    setFile(nextFile);
  };

  return (
    <>
    <div className="gate">
      <form className="gate-card multistep-gate-card" onSubmit={submit}>
        <div className="gate-copy">
          <p className="eyebrow"><FieldIcon name="lock" /> Secure Dashboard</p>
          <h2>Dashboard Locked Until Payment Approval</h2>
          <p>Complete the steps below. Your dashboard will unlock after admin verification.</p>
        </div>

        <div className="payment-guide-image">
          <img src={paymentLockGuide} alt="Payment approval process guide" />
          <button
            className="image-expand-button"
            type="button"
            aria-label="View payment guide larger"
            onClick={() => setIsImageOpen(true)}
          >
            <FieldIcon name="expand" />
          </button>
        </div>

        <div className="gate-step-column">
          <div className="multistep-progress">
            {[1, 2, 3].map((item) => (
              <button
                type="button"
                key={item}
                className={step === item ? "active" : step > item ? "completed" : ""}
                onClick={() => setStep(item)}
              >
                {item}
              </button>
            ))}
          </div>

          {step === 1 && (
            <div className="gate-step-panel">
              <h3><FieldIcon name="check" /> Select Training Mode</h3>
              <label>
                Choose your mode
                <select value={mode} onChange={(event) => setMode(event.target.value)}>
                  <option value="online">Online Training</option>
                  <option value="offline">Offline Training</option>
                </select>
              </label>
              <div className="pricing-mini">
                <span className={hasReferral ? "strike" : ""}>{formatMoney(original)}</span>
                {hasReferral && <strong>{formatMoney(payable)}</strong>}
                {hasReferral && <small>Referral discount applied.</small>}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="gate-step-panel">
              <h3><FieldIcon name="credit" /> Payment Details</h3>
              <p>Scan the QR code below to complete your payment, then continue to upload your payment screenshot.</p>
              <div className="student-payment-qr">
                <img src={paymentQr} alt="Payment QR code" />
                <strong>ARYAN MANGLA</strong>
                <span>Verify this name before paying. Then upload your screenshot in the next step.</span>
              </div>
              <div className="payment-summary">
                <span>Selected Mode</span>
                <strong>{mode === "online" ? "Online Training" : "Offline Training"}</strong>
                <span>Payable Amount</span>
                <strong>{formatMoney(payable)}</strong>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="gate-step-panel">
              <h3><FieldIcon name="upload" /> Upload Screenshot</h3>
              <input type="file" required accept={SUPPORT_FILE_ACCEPT} onChange={selectProofFile} />
              <p className="muted">Upload a clear payment screenshot or PDF confirmation. Image/PDF only, 5MB max.</p>
            </div>
          )}

          <div className="gate-actions">
            {step > 1 && (
              <button type="button" className="btn-secondary" onClick={() => setStep(step - 1)}>
                Back
              </button>
            )}
            <button className="btn-primary" disabled={step === 3 && !file}>
              {step < 3 ? "Continue" : "Submit Payment Proof"}
            </button>
          </div>
        </div>
        {message && <p className="success">{message}</p>}
      </form>
    </div>
    {isImageOpen && (
      <ImageLightbox image={paymentLockGuide} alt="Payment approval process guide enlarged" onClose={() => setIsImageOpen(false)} />
    )}
    </>
  );
}

function ImageLightbox({ image, alt, onClose }) {
  useBodyScrollLock();

  return (
    <div className="image-lightbox" role="dialog" aria-modal="true" aria-label="Payment guide image" onMouseDown={onClose}>
      <div className="image-lightbox-inner" onMouseDown={(event) => event.stopPropagation()}>
        <button className="image-lightbox-close" type="button" aria-label="Close image" onClick={onClose}>
          <FieldIcon name="x" />
        </button>
        <img src={image} alt={alt} />
      </div>
    </div>
  );
}

function FilePreviewLightbox({ preview, onClose }) {
  useBodyScrollLock();
  const isImage = preview.type.startsWith("image/");

  return (
    <div className="file-lightbox" role="dialog" aria-modal="true" aria-label="File preview" onMouseDown={onClose}>
      <div className={`file-lightbox-inner ${isImage ? "is-image" : "is-document"}`} onMouseDown={(event) => event.stopPropagation()}>
        <button className="image-lightbox-close" type="button" aria-label="Close file preview" onClick={onClose}>
          <FieldIcon name="x" />
        </button>
        {isImage ? (
          <img src={preview.url} alt="Attachment preview" />
        ) : (
          <iframe src={preview.url} title="Attachment preview" />
        )}
      </div>
    </div>
  );
}

function AffiliatePortal({ user, token, setNotice }) {
  return (
    <main className="portal single">
      <section className="workspace">
        <PageHeader title={`Referral Partner: ${user.fullName}`} subtitle="Course access is intentionally disabled for referral partners." />
        <div className="stack">
          <ReferralPanel token={token} user={user} setNotice={setNotice} />
          <SupportPanel token={token} setNotice={setNotice} title="Referral Partner Support" />
        </div>
      </section>
    </main>
  );
}

function AdminPortal({ token, settings, setNotice }) {
  const [tab, setTab] = useState("dashboard");
  const [stats, setStats] = useState({});
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [affiliates, setAffiliates] = useState([]);
  const [referralEarners, setReferralEarners] = useState([]);
  const [supportRequests, setSupportRequests] = useState([]);

  const loadAdmin = () => {
    Promise.all([
      api("/api/admin/stats", {}, token),
      api("/api/admin/students", {}, token),
      api("/api/admin/payments", {}, token),
      api("/api/admin/affiliates", {}, token),
      api("/api/admin/referral-report", {}, token),
      api("/api/admin/support", {}, token),
    ])
      .then(([statsData, studentData, paymentData, affiliateData, referralReportData, supportData]) => {
        setStats(statsData);
        setStudents(studentData.students || []);
        setPayments(paymentData.payments || []);
        setAffiliates(affiliateData.affiliates || []);
        setReferralEarners(referralReportData.earners || []);
        setSupportRequests(supportData.requests || []);
      })
      .catch((error) => setNotice(error.message));
  };

  useEffect(() => {
    loadAdmin();
  }, []);

  const reviewPayment = async (paymentId, status) => {
    await api(`/api/admin/payments/${paymentId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }, token);
    setNotice(`Payment marked ${status}.`);
    loadAdmin();
  };

  return (
    <main className="portal admin-portal">
      <Sidebar title="Admin Panel" tabs={["dashboard", "students", "payments", "partners", "support", "content", "settings"]} active={tab} onChange={setTab} hideBrand variant="collapsible" />
      <section className="workspace">
        <div key={tab} className="tab-panel">
          {tab === "dashboard" && <AdminStats stats={stats} />}
          {tab === "students" && <StudentManager students={students} payments={payments} token={token} reload={loadAdmin} setNotice={setNotice} />}
          {tab === "payments" && <PaymentsTable payments={payments} students={students} token={token} onReview={reviewPayment} reload={loadAdmin} setNotice={setNotice} />}
          {tab === "partners" && <PartnerManager token={token} affiliates={affiliates} referralEarners={referralEarners} reload={loadAdmin} setNotice={setNotice} />}
          {tab === "support" && <SupportInbox requests={supportRequests} token={token} reload={loadAdmin} setNotice={setNotice} />}
          {tab === "content" && <ContentManager token={token} setNotice={setNotice} />}
          {tab === "settings" && <SettingsManager token={token} settings={settings} setNotice={setNotice} />}
        </div>
      </section>
    </main>
  );
}

function Sidebar({ title, tabs, active, onChange, hideBrand = false, variant = "" }) {
  return (
    <aside className={`sidebar ${variant ? `sidebar-${variant}` : ""}`}>
      {!hideBrand && (
        <div className="sidebar-brand">
          <img src={brandLogo} alt="" />
          <h2>{title}</h2>
        </div>
      )}
      {tabs.map((tab) => (
        <button key={tab} className={active === tab ? "active" : ""} onClick={() => onChange(tab)}>
          <span className="nav-icon"><FieldIcon name={iconForLabel(tab)} /></span>
          <span>{tab}</span>
        </button>
      ))}
    </aside>
  );
}

function PageHeader({ title, subtitle }) {
  return (
    <div className="page-header">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  );
}

function CountdownCard({ startDate }) {
  const days = useMemo(() => {
    const diff = new Date(startDate).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 86400000));
  }, [startDate]);
  return <StatCard label="Course Starts In" value={`${days} days`} />;
}

function StatCard({ label, value }) {
  return (
    <article className="stat-card">
      <div className="stat-icon"><FieldIcon name={iconForLabel(label)} /></div>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function AnnouncementCard({ item }) {
  return (
    <article className="wide-card">
      <p className="eyebrow"><FieldIcon name="bell" /> Latest Announcement</p>
      <h3>{item?.title || "No announcements yet"}</h3>
      <p>{item?.body || "Updates from your training team will appear here."}</p>
    </article>
  );
}

function ReferralCard({ user }) {
  return (
    <article className="wide-card accent">
      <p className="eyebrow"><FieldIcon name="gift" /> Referral CTA</p>
      <h3>Earn for every approved referral</h3>
      <p>Share code <strong>{user.referralCode}</strong> or link <strong>{user.referralLink}</strong>.</p>
    </article>
  );
}

function ProtectedList({ title, endpoint, token, locked, dataKey }) {
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (locked) return;
    api(endpoint, {}, token)
      .then((data) => setItems(data[dataKey] || []))
      .catch((error) => setMessage(error.message));
  }, [endpoint, locked]);

  if (locked) return <EmptyState title={`${title} locked`} text="Access unlocks after admin approves your payment." />;
  if (message) return <EmptyState title="Unable to load" text={message} />;
  if (!items.length) return <EmptyState title={`No ${title.toLowerCase()} yet`} text="Admin uploads will appear here." />;

  return (
    <div className="card-grid">
      {items.map((item) => (
        <article className="resource-card" key={item.id}>
          <div className="resource-icon"><FieldIcon name={item.resourceType === "link" || item.url ? "link" : "file"} /></div>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
          {item.fileUrl ? <AuthFileLink path={item.fileUrl} token={token}><FieldIcon name="file" /> Open Resource</AuthFileLink> : <a href={item.url} target="_blank" rel="noreferrer"><FieldIcon name="link" /> Open Resource</a>}
        </article>
      ))}
    </div>
  );
}

function InPanelTabs({ tabs, active, onChange }) {
  return (
    <div className="in-panel-tabs" role="tablist" aria-label="Section navigation">
      {tabs.map((tab) => (
        <button key={tab.id} type="button" role="tab" aria-selected={active === tab.id} className={active === tab.id ? "active" : ""} onClick={() => onChange(tab.id)}>
          <FieldIcon name={tab.icon || iconForLabel(tab.label)} />
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

function ReferralPanel({ token, user, setNotice }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [section, setSection] = useState("overview");

  useEffect(() => {
    api("/api/referrals/me", {}, token)
      .then((nextData) => {
        setData(nextData);
        setError("");
      })
      .catch((nextError) => setError(nextError.message));
  }, []);

  const wallet = data?.wallet || {};
  const referrals = data?.referrals || {};
  const referralCode = data?.user?.referralCode || user.referralCode || "";
  const referralLink = referralCode ? `${window.location.origin}/?ref=${referralCode}` : "";
  const transactions = wallet.transactions || [];
  const recentReferrals = referrals.recentReferrals || [];
  const referralSections = [
    { id: "overview", label: "Overview", icon: "dashboard" },
    { id: "share", label: "Share", icon: "link" },
    { id: "referrals", label: "Referrals", icon: "users" },
    { id: "wallet", label: "Wallet", icon: "wallet" },
  ];

  const copyText = async (label, value) => {
    if (!value) {
      setNotice?.(`${label} is not available yet.`);
      return;
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setNotice?.(`${label} copied.`);
    } catch {
      setNotice?.(`Unable to copy ${label.toLowerCase()}.`);
    }
  };

  if (error) {
    return <EmptyState title="Unable to load referrals" text={error} />;
  }

  if (!data) {
    return <EmptyState title="Loading referral dashboard" text="Fetching your referral link, wallet, and recent referral activity." />;
  }

  return (
    <div className="referral-panel-shell">
      <article className="referral-hero-card">
        <div>
          <p className="eyebrow"><FieldIcon name="gift" /> Referral Dashboard</p>
          <h2>{referralCode || "Referral code pending"}</h2>
          <p>Share your code, track referred students, and watch wallet rewards from one simple panel.</p>
        </div>
        <div className="referral-hero-stats">
          <span>Wallet<strong>{formatMoney(wallet.availableBalance)}</strong></span>
          <span>Approved<strong>{referrals.approvedReferrals || 0}</strong></span>
        </div>
      </article>

      <InPanelTabs tabs={referralSections} active={section} onChange={setSection} />

      <div key={section} className="referral-tab-panel">
        {section === "overview" && (
          <div className="dashboard-grid">
            <StatCard label="Total Referrals" value={referrals.totalReferrals || 0} />
            <StatCard label="Approved Referrals" value={referrals.approvedReferrals || 0} />
            <StatCard label="Pending Referrals" value={referrals.pendingPayment || 0} />
            <StatCard label="Wallet Balance" value={formatMoney(wallet.availableBalance)} />
            <StatCard label="Lifetime Earnings" value={formatMoney(wallet.lifetimeEarnings)} />
            <StatCard label="Paid Amount" value={formatMoney(wallet.paidAmount)} />
          </div>
        )}

        {section === "share" && (
          <article className="wide-card referral-share-card">
            <div>
              <p className="eyebrow"><FieldIcon name="link" /> Referral Share</p>
              <h3>{referralCode || "Referral code pending"}</h3>
              <p>Share this code or link. Rewards are added to your wallet after referred student payments are approved.</p>
            </div>
            <div className="referral-copy-grid">
              <div className="copy-box">
                <span>Referral Code</span>
                <strong>{referralCode || "-"}</strong>
                <button className="btn-secondary" type="button" onClick={() => copyText("Referral code", referralCode)}>
                  <FieldIcon name="copy" /> Copy Code
                </button>
              </div>
              <div className="copy-box">
                <span>Referral Link</span>
                <strong>{referralLink || "-"}</strong>
                <button className="btn-secondary" type="button" onClick={() => copyText("Referral link", referralLink)}>
                  <FieldIcon name="link" /> Copy Link
                </button>
              </div>
            </div>
          </article>
        )}

        {section === "referrals" && (
          <div className="stack">
            <h2 className="section-heading"><FieldIcon name="users" /> Recent Referrals</h2>
            <DataTable rows={recentReferrals} columns={["studentId", "studentName", "paymentStatus", "status", "createdAt"]} />
          </div>
        )}

        {section === "wallet" && (
          <div className="stack">
            <div className="wallet-summary-row">
              <StatCard label="Wallet Balance" value={formatMoney(wallet.availableBalance)} />
              <StatCard label="Lifetime Earnings" value={formatMoney(wallet.lifetimeEarnings)} />
              <StatCard label="Paid Amount" value={formatMoney(wallet.paidAmount)} />
            </div>
            <h2 className="section-heading"><FieldIcon name="wallet" /> Wallet Transactions</h2>
            <DataTable rows={transactions} columns={["type", "amount", "studentName", "transactionId", "createdAt"]} />
          </div>
        )}
      </div>
    </div>
  );
}

function SupportPanel({ token, setNotice, title = "Support" }) {
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectFile = (event) => {
    const nextFile = event.target.files?.[0] || null;
    const validation = validateSupportFile(nextFile);
    if (validation) {
      event.target.value = "";
      setFile(null);
      setNotice(validation);
      return;
    }
    setFile(nextFile);
  };

  const submitSupport = async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const validation = validateSupportFile(file);
    if (validation) {
      setNotice(validation);
      return;
    }
    const form = new FormData();
    form.append("message", message);
    if (file) form.append("file", file);
    setIsSubmitting(true);
    try {
      await api("/api/support", { method: "POST", body: form }, token);
      setMessage("");
      setFile(null);
      formElement.reset();
      setNotice("Support request sent to admin.");
    } catch (error) {
      setNotice(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="panel-form support-card" onSubmit={submitSupport}>
      <div>
        <p className="eyebrow"><FieldIcon name="message" /> Support</p>
        <h2>{title}</h2>
        <p className="muted">Send a message to admin. You can attach one image or PDF up to 5MB.</p>
      </div>
      <label>
        Message
        <textarea required placeholder="Write your issue, payment question, or account request..." value={message} onChange={(event) => setMessage(event.target.value)} />
      </label>
      <label>
        Attachment
        <input type="file" accept={SUPPORT_FILE_ACCEPT} onChange={selectFile} />
      </label>
      {file && <p className="file-hint">Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>}
      <button className="btn-primary" disabled={isSubmitting}>
        <FieldIcon name="upload" />
        {isSubmitting ? "Sending..." : "Send Support Request"}
      </button>
    </form>
  );
}

function AdminStats({ stats }) {
  const totalStudents = Number(stats.totalStudents || 0);
  const pending = Number(stats.pendingVerification || 0);
  const approved = Number(stats.approvedStudents || 0);
  const rejected = Number(stats.rejectedPayments || 0);
  const cards = [
    ["Total Students", totalStudents, "+ active enrollments"],
    ["Pending Verification", pending, "needs review"],
    ["Approved Students", approved, `${totalStudents ? Math.round((approved / totalStudents) * 100) : 0}% verified`],
    ["Total Earnings", formatMoney(stats.totalEarningsGenerated), "referral generated"],
  ];
  const activity = [
    { label: "Registrations", value: Number(stats.todaysRegistrations || 0) },
    { label: "Payments", value: Number(stats.todaysPayments || 0) },
    { label: "Partners", value: Number(stats.referralPartners || 0) },
    { label: "Materials", value: Number(stats.materialsUploaded || 0) },
    { label: "Announcements", value: Number(stats.announcements || 0) },
  ];
  const paymentMix = [
    { label: "Approved", value: approved, tone: "success" },
    { label: "Pending", value: pending, tone: "warning" },
    { label: "Rejected", value: rejected, tone: "danger" },
  ];

  return (
    <div className="stack">
      <div className="dashboard-grid admin-kpi-grid">
        {cards.map(([label, value, hint]) => (
          <article className="stat-card admin-stat-card" key={label}>
            <div className="stat-icon"><FieldIcon name={iconForLabel(label)} /></div>
            <span>{label}</span>
            <strong>{value ?? 0}</strong>
            <small>{hint}</small>
          </article>
        ))}
      </div>
      <div className="analytics-grid">
        <MiniBarChart title="Today Snapshot" subtitle="Quick operational activity" values={activity} />
        <MiniProgressList title="Verification Health" rows={paymentMix} total={Math.max(totalStudents, 1)} />
        <article className="wide-card dashboard-insight-card">
          <p className="eyebrow"><FieldIcon name="wallet" /> Wallet Exposure</p>
          <h3>{formatMoney(stats.pendingWallet)}</h3>
          <p>Pending wallet amount across referral earners. Keep payouts reconciled after payment approvals.</p>
          <div className="insight-row">
            <span>Referral partners</span>
            <strong>{stats.referralPartners || 0}</strong>
          </div>
        </article>
      </div>
    </div>
  );
}

function MiniBarChart({ title, subtitle, values }) {
  const max = Math.max(...values.map((item) => item.value), 1);
  return (
    <article className="chart-card">
      <div>
        <p className="eyebrow"><FieldIcon name="graph" /> {title}</p>
        <p>{subtitle}</p>
      </div>
      <div className="mini-bars" aria-label={title}>
        {values.map((item) => (
          <div key={item.label}>
            <span style={{ height: `${Math.max(16, (item.value / max) * 100)}%` }} />
            <small>{item.label}</small>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}

function MiniProgressList({ title, rows, total }) {
  return (
    <article className="chart-card">
      <p className="eyebrow"><FieldIcon name="check" /> {title}</p>
      <div className="progress-list">
        {rows.map((row) => (
          <div key={row.label}>
            <div>
              <span>{row.label}</span>
              <strong>{row.value}</strong>
            </div>
            <span className={`progress-track ${row.tone}`}>
              <i style={{ width: `${Math.min(100, (row.value / total) * 100)}%` }} />
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}

function StudentManager({ students, payments = [], token, reload, setNotice }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const statusOptions = ["registered", "payment_submitted", "under_review", "approved", "rejected"];
  const proofByStudentId = useMemo(() => {
    const map = new Map();
    payments.forEach((payment) => {
      if (payment.student?.id && payment.screenshotUrl && !map.has(payment.student.id)) {
        map.set(payment.student.id, payment);
      }
    });
    return map;
  }, [payments]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((student) => {
      const matchesStatus = status === "all" || student.paymentStatus === status;
      const haystack = [student.studentId, student.fullName, student.email, student.phone, student.referralCode, student.courseMode]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesStatus && (!q || haystack.includes(q));
    });
  }, [students, query, status]);

  const startEdit = (student) => {
    setEditing({
      id: student.id,
      fullName: student.fullName || "",
      email: student.email || "",
      phone: student.phone || "",
      paymentStatus: student.paymentStatus || "registered",
      courseMode: student.courseMode || "",
    });
  };

  const submit = async (event) => {
    event.preventDefault();
    try {
      await api(`/api/admin/students/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify(editing),
      }, token);
      setNotice("Student updated.");
      setEditing(null);
      reload();
    } catch (error) {
      setNotice(error.message);
    }
  };

  const remove = async (student) => {
    if (!window.confirm(`Remove ${student.fullName} from the active student list?`)) return;
    try {
      await api(`/api/admin/students/${student.id}`, { method: "DELETE" }, token);
      setNotice("Student removed.");
      setSelected(null);
      reload();
    } catch (error) {
      setNotice(error.message);
    }
  };

  return (
    <div className="stack">
      <div className="summary-strip">
        <StatCard label="Students Showing" value={filtered.length} />
        <StatCard label="Approved Students" value={students.filter((item) => item.paymentStatus === "approved").length} />
        <StatCard label="Pending Verification" value={students.filter((item) => ["payment_submitted", "under_review"].includes(item.paymentStatus)).length} />
        <StatCard label="Referral Students" value={students.filter((item) => item.hasReferral).length} />
      </div>

      <div className="admin-toolbar">
        <label className="search-field">
          <FieldIcon name="search" />
          <input placeholder="Search by name, email, student ID, phone, referral..." value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter students by payment status">
          <option value="all">All payment statuses</option>
          {statusOptions.map((item) => <option key={item} value={item}>{item.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      {editing && (
        <form className="panel-form edit-panel" onSubmit={submit}>
          <h2><FieldIcon name="edit" /> Edit Student</h2>
          <div className="form-two">
            <label>Full name<input required value={editing.fullName} onChange={(event) => setEditing({ ...editing, fullName: event.target.value })} /></label>
            <label>Email<input type="email" value={editing.email} onChange={(event) => setEditing({ ...editing, email: event.target.value })} /></label>
            <label>Phone<input value={editing.phone} onChange={(event) => setEditing({ ...editing, phone: event.target.value })} /></label>
            <label>Course mode
              <select value={editing.courseMode} onChange={(event) => setEditing({ ...editing, courseMode: event.target.value })}>
                <option value="">Not selected</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
              </select>
            </label>
            <label>Payment status
              <select value={editing.paymentStatus} onChange={(event) => setEditing({ ...editing, paymentStatus: event.target.value })}>
                {statusOptions.map((item) => <option key={item} value={item}>{item.replace(/_/g, " ")}</option>)}
              </select>
            </label>
          </div>
          <div className="form-actions">
            <button className="btn-primary"><FieldIcon name="check" /> Save Student</button>
            <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}

      {filtered.length ? (
        <div className="table-wrap professional-table">
          <table>
            <thead>
              <tr><th>Student</th><th>Contact</th><th>Status</th><th>Referral</th><th>Course</th><th>Joined</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map((student) => (
                <tr key={student.id}>
                  {(() => {
                    const proof = proofByStudentId.get(student.id);
                    return (
                      <>
                  <td><strong>{student.fullName}</strong><br /><small>{student.studentId}</small></td>
                  <td>{student.email || "-"}<br /><small>{student.phone || "No phone"}</small></td>
                  <td><StatusBadge status={student.paymentStatus} /></td>
                  <td>{student.referralCode || "-"}<br /><small>{student.hasReferral ? "Referred student" : "Direct"}</small></td>
                  <td>{student.courseMode || "-"}</td>
                  <td>{formatDate(student.createdAt)}</td>
                  <td className="table-actions">
                    <ActionButton icon="eye" onClick={() => setSelected(student)}>View</ActionButton>
                    {proof && <AuthFileLink path={proof.screenshotUrl} token={token}><FieldIcon name="file" /> Proof</AuthFileLink>}
                    <ActionButton icon="edit" tone="soft" onClick={() => startEdit(student)}>Edit</ActionButton>
                    <ActionButton icon="trash" tone="danger" onClick={() => remove(student)}>Remove</ActionButton>
                  </td>
                      </>
                    );
                  })()}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No matching students" text="Try a different search term or status filter." />
      )}

      {selected && (
        <AdminModal title="Student Profile" icon="eye" onClose={() => setSelected(null)} size="wide">
          {(() => {
            const proof = proofByStudentId.get(selected.id);
            return (
              <>
                <h3 className="modal-record-title">{selected.fullName}</h3>
                <div className="detail-grid">
                  <span>Student ID<strong>{selected.studentId}</strong></span>
                  <span>Email<strong>{selected.email || "-"}</strong></span>
                  <span>Phone<strong>{selected.phone || "-"}</strong></span>
                  <span>Payment<strong><StatusBadge status={selected.paymentStatus} /></strong></span>
                  <span>Referral Code<strong>{selected.referralCode || "-"}</strong></span>
                  <span>Joined<strong>{formatDate(selected.createdAt)}</strong></span>
                  <span>Uploaded Proof<strong>{proof ? <AuthFileLink path={proof.screenshotUrl} token={token}><FieldIcon name="file" /> View proof</AuthFileLink> : "No proof uploaded"}</strong></span>
                </div>
              </>
            );
          })()}
        </AdminModal>
      )}
    </div>
  );
}

function PaymentsTable({ payments, students, token, onReview, reload, setNotice }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [proofMinimized, setProofMinimized] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState({
    studentIdentifier: "",
    mode: "online",
    amount: "",
    status: "approved",
    transactionId: "",
    adminNotes: "",
  });

  const pendingPayments = payments.filter((payment) => ["payment_submitted", "under_review"].includes(payment.status));
  const manualPayments = payments.filter((payment) => payment.isManual);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return payments.filter((payment) => {
      const matchesStatus =
        status === "all" ||
        (status === "pending" && ["payment_submitted", "under_review"].includes(payment.status)) ||
        payment.status === status;
      const haystack = [
        payment.student?.fullName,
        payment.student?.studentId,
        payment.student?.email,
        payment.mode,
        payment.status,
        payment.adminNotes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesStatus && (!q || haystack.includes(q));
    });
  }, [payments, query, status]);

  const submitManual = async (event) => {
    event.preventDefault();
    try {
      await api("/api/admin/payments/manual", {
        method: "POST",
        body: JSON.stringify({ ...manual, amount: Number(manual.amount) }),
      }, token);
      setManual({ studentIdentifier: "", mode: "online", amount: "", status: "approved", transactionId: "", adminNotes: "" });
      setShowManual(false);
      setNotice("Manual payment recorded.");
      reload();
    } catch (error) {
      setNotice(error.message);
    }
  };

  return (
    <div className="stack">
      <div className="summary-strip">
        <StatCard label="Payment Requests" value={payments.length} />
        <StatCard label="Needs Verification" value={pendingPayments.length} />
        <StatCard label="Manual Records" value={manualPayments.length} />
        <StatCard label="Approved Payments" value={payments.filter((item) => item.status === "approved").length} />
      </div>

      <div className="admin-toolbar">
        <label className="search-field">
          <FieldIcon name="search" />
          <input placeholder="Search payment requests by student, ID, status..." value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <div className="toolbar-actions">
          <button type="button" className="btn-primary compact-button" onClick={() => setShowManual(true)}>
            <FieldIcon name="credit" /> + Record Payment
          </button>
          <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter payments">
            <option value="all">All payments</option>
            <option value="pending">Not verified only</option>
            <option value="payment_submitted">Submitted</option>
            <option value="under_review">Under review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <button type="button" className="btn-secondary compact-button" onClick={() => setProofMinimized(!proofMinimized)}>
            <FieldIcon name={proofMinimized ? "eye" : "x"} /> {proofMinimized ? "Show Proof" : "Minimize Proof"}
          </button>
        </div>
      </div>

      {filtered.length ? (
        <div className="table-wrap professional-table">
          <table>
            <thead>
              <tr><th>Student</th><th>Mode</th><th>Amount</th><th>Status</th>{!proofMinimized && <th>Proof</th>}<th>Submitted</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map((payment) => (
                <tr key={payment.id} className={["payment_submitted", "under_review"].includes(payment.status) ? "attention-row" : ""}>
                  <td><strong>{payment.student?.fullName || "Unknown"}</strong><br /><small>{payment.student?.studentId || "-"}</small></td>
                  <td>{payment.mode}</td>
                  <td>{formatMoney(payment.payableAmount)}</td>
                  <td><StatusBadge status={payment.status} /></td>
                  {!proofMinimized && (
                    <td>
                      {payment.screenshotUrl ? (
                        <AuthFileLink path={payment.screenshotUrl} token={token}><FieldIcon name="file" /> {payment.proofLabel || "View proof"}</AuthFileLink>
                      ) : (
                        <span className="muted">No proof</span>
                      )}
                    </td>
                  )}
                  <td>{formatDate(payment.createdAt)}</td>
                  <td className="table-actions">
                    {payment.status === "approved" ? (
                      <ActionButton icon="x" tone="danger" onClick={() => onReview(payment.id, "rejected")}>Disapprove</ActionButton>
                    ) : (
                      <>
                        {payment.status !== "under_review" && <ActionButton icon="clock" onClick={() => onReview(payment.id, "under_review")}>Review</ActionButton>}
                        <ActionButton icon="check" tone="success" onClick={() => onReview(payment.id, "approved")}>Approve</ActionButton>
                        {payment.status !== "rejected" && <ActionButton icon="x" tone="danger" onClick={() => onReview(payment.id, "rejected")}>Reject</ActionButton>}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No payment records" text="Payment requests and manual records will appear here." />
      )}
      {showManual && (
        <AdminModal title="Record Offline / Manual Payment" icon="credit" onClose={() => setShowManual(false)} size="wide">
          <form className="modal-form" onSubmit={submitManual}>
            <p className="muted">Use this when payment was confirmed outside the student upload flow.</p>
            <div className="form-two">
              <label>Student ID or email
                <input list="student-options" required placeholder="SD202600001 or student@email.com" value={manual.studentIdentifier} onChange={(event) => setManual({ ...manual, studentIdentifier: event.target.value })} />
                <datalist id="student-options">
                  {students.map((student) => <option key={student.id} value={student.studentId}>{student.fullName} - {student.email}</option>)}
                </datalist>
              </label>
              <label>Training mode
                <select value={manual.mode} onChange={(event) => setManual({ ...manual, mode: event.target.value })}>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                </select>
              </label>
              <label>Amount<input required type="number" min="1" value={manual.amount} onChange={(event) => setManual({ ...manual, amount: event.target.value })} /></label>
              <label>Status
                <select value={manual.status} onChange={(event) => setManual({ ...manual, status: event.target.value })}>
                  <option value="approved">Approved</option>
                  <option value="under_review">Under review</option>
                  <option value="rejected">Rejected</option>
                </select>
              </label>
              <label>Transaction ID<input placeholder="UPI / bank / cash ref" value={manual.transactionId} onChange={(event) => setManual({ ...manual, transactionId: event.target.value })} /></label>
              <label>Admin notes<input placeholder="Receipt note, collector name, etc." value={manual.adminNotes} onChange={(event) => setManual({ ...manual, adminNotes: event.target.value })} /></label>
            </div>
            <div className="form-actions">
              <button className="btn-primary"><FieldIcon name="check" /> Add Manual Payment</button>
              <button type="button" className="btn-secondary" onClick={() => setShowManual(false)}>Cancel</button>
            </div>
          </form>
        </AdminModal>
      )}
    </div>
  );
}

function PartnerManager({ token, affiliates, referralEarners = [], reload, setNotice }) {
  const [form, setForm] = useState({ fullName: "", username: "", password: "", phone: "", email: "" });
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [payoutTarget, setPayoutTarget] = useState(null);
  const [payoutForm, setPayoutForm] = useState({ amount: "", transactionId: "", paymentMode: "upi", remarks: "" });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return affiliates.filter((partner) => {
      const haystack = [partner.fullName, partner.username, partner.email, partner.phone, partner.referralCode]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return !q || haystack.includes(q);
    });
  }, [affiliates, query]);

  const earners = useMemo(() => referralEarners.filter((earner) => {
    const totalReferrals = Number(earner.referrals?.totalReferrals || 0);
    const available = Number(earner.wallet?.availableBalance || 0);
    const lifetime = Number(earner.wallet?.lifetimeEarnings || 0);
    return totalReferrals > 0 || available > 0 || lifetime > 0;
  }), [referralEarners]);
  const totalAvailablePayout = earners.reduce((sum, earner) => sum + Number(earner.wallet?.availableBalance || 0), 0);

  const submit = async (event) => {
    event.preventDefault();
    try {
      await api("/api/admin/affiliates", { method: "POST", body: JSON.stringify(form) }, token);
      setForm({ fullName: "", username: "", password: "", phone: "", email: "" });
      setShowCreate(false);
      setNotice("Partner created.");
      reload();
    } catch (error) {
      setNotice(error.message);
    }
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    try {
      await api(`/api/admin/affiliates/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify(editing),
      }, token);
      setEditing(null);
      setNotice("Partner updated.");
      reload();
    } catch (error) {
      setNotice(error.message);
    }
  };

  const remove = async (partner) => {
    if (!window.confirm(`Remove partner ${partner.fullName}?`)) return;
    try {
      await api(`/api/admin/affiliates/${partner.id}`, { method: "DELETE" }, token);
      setNotice("Partner removed.");
      reload();
    } catch (error) {
      setNotice(error.message);
    }
  };

  const openPayout = (earner) => {
    setPayoutTarget(earner);
    setPayoutForm({
      amount: earner.wallet?.availableBalance ? String(earner.wallet.availableBalance) : "",
      transactionId: "",
      paymentMode: "upi",
      remarks: "",
    });
  };

  const submitPayout = async (event) => {
    event.preventDefault();
    if (!payoutTarget) return;
    try {
      await api("/api/admin/payouts", {
        method: "POST",
        body: JSON.stringify({
          userId: payoutTarget.user.id,
          amount: Number(payoutForm.amount),
          transactionId: payoutForm.transactionId,
          paymentMode: payoutForm.paymentMode,
          remarks: payoutForm.remarks,
        }),
      }, token);
      setPayoutTarget(null);
      setPayoutForm({ amount: "", transactionId: "", paymentMode: "upi", remarks: "" });
      setNotice("Referral payout recorded.");
      reload();
    } catch (error) {
      setNotice(error.message);
    }
  };

  return (
    <div className="stack">
      <div className="partner-overview-card">
        <div>
          <p className="eyebrow"><FieldIcon name="users" /> Referral Partners</p>
          <h2>Partner Network</h2>
          <p className="muted">Manage partner access, referral codes, and contact details from one clean list.</p>
        </div>
        <div className="partner-metrics">
          <span>Total<strong>{affiliates.length}</strong></span>
          <span>Active<strong>{affiliates.filter((partner) => partner.isActive).length}</strong></span>
          <span>Showing<strong>{filtered.length}</strong></span>
          <span>Payable<strong>{formatMoney(totalAvailablePayout)}</strong></span>
        </div>
      </div>

      <div className="admin-toolbar">
        <label className="search-field">
          <FieldIcon name="search" />
          <input placeholder="Search partners by name, username, email, referral code..." value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <div className="toolbar-actions">
          <button type="button" className="btn-primary compact-button" onClick={() => setShowCreate(true)}>
            <FieldIcon name="users" /> + Add New
          </button>
          <span className="toolbar-count">{filtered.length} partners</span>
        </div>
      </div>

      {filtered.length ? (
        <div className="table-wrap professional-table">
          <table>
            <thead>
              <tr><th>Partner</th><th>Contact</th><th>Referral Code</th><th>Status</th><th>Created</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map((partner) => (
                <tr key={partner.id}>
                  <td><strong>{partner.fullName}</strong><br /><small>@{partner.username}</small></td>
                  <td>{partner.email || "-"}<br /><small>{partner.phone || "No phone"}</small></td>
                  <td><strong>{partner.referralCode}</strong></td>
                  <td><StatusBadge status={partner.isActive ? "active" : "inactive"} /></td>
                  <td>{formatDate(partner.createdAt)}</td>
                  <td className="table-actions">
                    <ActionButton icon="eye" onClick={() => setEditing({ ...partner, password: "" })}>View</ActionButton>
                    <ActionButton icon="edit" tone="soft" onClick={() => setEditing({ ...partner, password: "" })}>Edit</ActionButton>
                    <ActionButton icon="trash" tone="danger" onClick={() => remove(partner)}>Remove</ActionButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No matching partners" text="Create a partner or adjust your search filter." />
      )}

      <div className="admin-toolbar">
        <p className="toolbar-title"><FieldIcon name="wallet" /> Referral Payouts</p>
        <span className="toolbar-count">{formatMoney(totalAvailablePayout)} payable</span>
      </div>

      {earners.length ? (
        <div className="table-wrap professional-table">
          <table>
            <thead>
              <tr><th>Referrer</th><th>Role</th><th>Referral Code</th><th>Referrals</th><th>Wallet</th><th>Paid</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {earners.map((earner) => (
                <tr key={earner.user.id}>
                  <td><strong>{earner.user.fullName}</strong><br /><small>{earner.user.studentId || (earner.user.username ? `@${earner.user.username}` : earner.user.email || "-")}</small></td>
                  <td>{earner.user.role}</td>
                  <td><strong>{earner.user.referralCode || "-"}</strong></td>
                  <td>{earner.referrals?.totalReferrals || 0}<br /><small>{earner.referrals?.approvedReferrals || 0} approved</small></td>
                  <td><strong>{formatMoney(earner.wallet?.availableBalance)}</strong><br /><small>{formatMoney(earner.wallet?.lifetimeEarnings)} earned</small></td>
                  <td>{formatMoney(earner.wallet?.paidAmount)}</td>
                  <td className="table-actions">
                    <ActionButton icon="wallet" tone="success" onClick={() => openPayout(earner)} disabled={Number(earner.wallet?.availableBalance || 0) <= 0}>Payout</ActionButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No referral payouts yet" text="Referral earners will appear here after approved referral payments." />
      )}

      {showCreate && (
        <AdminModal title="Create Referral Partner" icon="users" onClose={() => setShowCreate(false)} size="wide">
          <form className="modal-form" onSubmit={submit}>
            <p className="muted">Create partner access with a unique referral code and wallet tracking.</p>
            <div className="form-two">
              <label>Full name<input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></label>
              <label>Username<input required value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} /></label>
              <label>Password<input required type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
              <label>Phone<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
              <label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
            </div>
            <div className="form-actions">
              <button className="btn-primary"><FieldIcon name="users" /> Create Partner</button>
              <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            </div>
          </form>
        </AdminModal>
      )}
      {editing && (
        <AdminModal title="Edit Partner" icon="edit" onClose={() => setEditing(null)} size="wide">
          <form className="modal-form" onSubmit={saveEdit}>
            <div className="form-two">
              <label>Full name<input required value={editing.fullName} onChange={(event) => setEditing({ ...editing, fullName: event.target.value })} /></label>
              <label>Username<input required value={editing.username} onChange={(event) => setEditing({ ...editing, username: event.target.value })} /></label>
              <label>Email<input type="email" value={editing.email || ""} onChange={(event) => setEditing({ ...editing, email: event.target.value })} /></label>
              <label>Phone<input value={editing.phone || ""} onChange={(event) => setEditing({ ...editing, phone: event.target.value })} /></label>
              <label>New password<input type="password" placeholder="Leave blank to keep current" value={editing.password || ""} onChange={(event) => setEditing({ ...editing, password: event.target.value })} /></label>
            </div>
            <div className="form-actions">
              <button className="btn-primary"><FieldIcon name="check" /> Save Partner</button>
              <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </form>
        </AdminModal>
      )}
      {payoutTarget && (
        <AdminModal title="Record Referral Payout" icon="wallet" onClose={() => setPayoutTarget(null)} size="wide">
          <form className="modal-form" onSubmit={submitPayout}>
            <div className="payout-target-card">
              <span>Paying To<strong>{payoutTarget.user.fullName}</strong></span>
              <span>Available Balance<strong>{formatMoney(payoutTarget.wallet?.availableBalance)}</strong></span>
            </div>
            <div className="form-two">
              <label>Amount
                <input required type="number" min="1" max={Math.max(0, Number(payoutTarget.wallet?.availableBalance || 0))} value={payoutForm.amount} onChange={(event) => setPayoutForm({ ...payoutForm, amount: event.target.value })} />
              </label>
              <label>Payment mode
                <select value={payoutForm.paymentMode} onChange={(event) => setPayoutForm({ ...payoutForm, paymentMode: event.target.value })}>
                  <option value="upi">UPI</option>
                  <option value="bank">Bank transfer</option>
                  <option value="cash">Cash</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label>Transaction ID<input placeholder="UPI / bank / payout reference" value={payoutForm.transactionId} onChange={(event) => setPayoutForm({ ...payoutForm, transactionId: event.target.value })} /></label>
              <label>Remarks<input placeholder="Optional payout note" value={payoutForm.remarks} onChange={(event) => setPayoutForm({ ...payoutForm, remarks: event.target.value })} /></label>
            </div>
            <div className="form-actions">
              <button className="btn-primary"><FieldIcon name="wallet" /> Record Payout</button>
              <button type="button" className="btn-secondary" onClick={() => setPayoutTarget(null)}>Cancel</button>
            </div>
          </form>
        </AdminModal>
      )}
    </div>
  );
}

function SupportInbox({ requests, token, reload, setNotice }) {
  const [status, setStatus] = useState("all");
  const filtered = requests.filter((request) => status === "all" || request.status === status);

  const updateStatus = async (requestId, nextStatus) => {
    try {
      await api(`/api/admin/support/${requestId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      }, token);
      setNotice(`Support request marked ${nextStatus}.`);
      reload();
    } catch (error) {
      setNotice(error.message);
    }
  };

  return (
    <div className="stack">
      <div className="summary-strip">
        <StatCard label="Support Requests" value={requests.length} />
        <StatCard label="Open Requests" value={requests.filter((item) => item.status === "open").length} />
        <StatCard label="Reviewing" value={requests.filter((item) => item.status === "reviewing").length} />
        <StatCard label="Resolved" value={requests.filter((item) => item.status === "resolved").length} />
      </div>
      <div className="admin-toolbar">
        <p className="toolbar-title"><FieldIcon name="message" /> Support Inbox</p>
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter support requests">
          <option value="all">All requests</option>
          <option value="open">Open</option>
          <option value="reviewing">Reviewing</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>
      {filtered.length ? (
        <div className="table-wrap professional-table">
          <table>
            <thead>
              <tr><th>User</th><th>Role</th><th>Message</th><th>Attachment</th><th>Status</th><th>Created</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map((request) => (
                <tr key={request.id}>
                  <td><strong>{request.user.fullName}</strong><br /><small>{request.user.studentId || request.user.username || request.user.email}</small></td>
                  <td>{request.user.role}</td>
                  <td className="message-cell">{request.message}</td>
                  <td>
                    {request.fileUrl ? (
                      <AuthFileLink path={request.fileUrl} token={token}>View file</AuthFileLink>
                    ) : (
                      <span className="muted">No file</span>
                    )}
                  </td>
                  <td><StatusBadge status={request.status} /></td>
                  <td>{formatDate(request.createdAt)}</td>
                  <td className="table-actions">
                    <ActionButton icon="clock" onClick={() => updateStatus(request.id, "reviewing")}>Review</ActionButton>
                    <ActionButton icon="check" tone="success" onClick={() => updateStatus(request.id, "resolved")}>Resolve</ActionButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No support requests" text="Student and partner messages will appear here." />
      )}
    </div>
  );
}

function ContentManager({ token, setNotice }) {
  const [announcement, setAnnouncement] = useState({ title: "", body: "", priority: "normal" });

  const submitUpload = async (event, endpoint) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await api(endpoint, { method: "POST", body: form }, token);
    formElement.reset();
    setNotice("Content saved.");
  };

  const submitAnnouncement = async (event) => {
    event.preventDefault();
    await api("/api/admin/announcements", { method: "POST", body: JSON.stringify(announcement) }, token);
    setAnnouncement({ title: "", body: "", priority: "normal" });
    setNotice("Announcement published.");
  };

  return (
    <div className="content-grid">
      <form className="panel-form" onSubmit={(event) => submitUpload(event, "/api/admin/materials")}>
        <h2><FieldIcon name="book" /> Upload Material</h2>
        <input name="title" placeholder="Title" />
        <textarea name="description" placeholder="Description" />
        <input name="category" placeholder="Category" />
        <input name="file" type="file" required />
        <button className="btn-primary"><FieldIcon name="upload" /> Upload Material</button>
      </form>
      <form className="panel-form" onSubmit={(event) => submitUpload(event, "/api/admin/codes")}>
        <h2><FieldIcon name="code" /> Add Code Resource</h2>
        <input name="title" placeholder="Title" />
        <textarea name="description" placeholder="Description" />
        <input name="url" placeholder="GitHub or external URL" />
        <input name="resourceType" placeholder="link or zip" />
        <input name="file" type="file" />
        <button className="btn-primary"><FieldIcon name="code" /> Save Resource</button>
      </form>
      <form className="panel-form" onSubmit={submitAnnouncement}>
        <h2><FieldIcon name="bell" /> Announcement</h2>
        <input value={announcement.title} onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })} placeholder="Title" />
        <textarea value={announcement.body} onChange={(e) => setAnnouncement({ ...announcement, body: e.target.value })} placeholder="Message" />
        <select value={announcement.priority} onChange={(e) => setAnnouncement({ ...announcement, priority: e.target.value })}>
          <option value="normal">Normal</option>
          <option value="high">High Priority</option>
        </select>
        <button className="btn-primary"><FieldIcon name="bell" /> Publish</button>
      </form>
    </div>
  );
}

function SettingsManager({ token, settings, setNotice }) {
  const [form, setForm] = useState(settings);

  useEffect(() => setForm(settings), [settings]);

  const submit = async (event) => {
    event.preventDefault();
    await api("/api/admin/settings", {
      method: "PATCH",
      body: JSON.stringify({
        ...form,
        priceOffline: Number(form.priceOffline),
        priceOnline: Number(form.priceOnline),
        referralPriceOffline: Number(form.referralPriceOffline),
        referralPriceOnline: Number(form.referralPriceOnline),
        referralReward: Number(form.referralReward),
      }),
    }, token);
    setNotice("Settings updated.");
  };

  return (
    <form className="settings-grid" onSubmit={submit}>
      {["courseStartDate", "courseStatus", "enrollmentStatus", "priceOffline", "priceOnline", "referralPriceOffline", "referralPriceOnline", "referralReward"].map((field) => (
        <label key={field}>
          {humanizeLabel(field)}
          <input value={form[field] ?? ""} onChange={(event) => setForm({ ...form, [field]: event.target.value })} />
        </label>
      ))}
      <button className="btn-primary"><FieldIcon name="settings" /> Save Settings</button>
    </form>
  );
}

function tableValue(column, value) {
  if (value == null || value === "") return "-";
  if (column.toLowerCase().includes("amount")) return formatMoney(value);
  if (column.toLowerCase().includes("created") || column.toLowerCase().includes("date")) return formatDate(value);
  if (column.toLowerCase().includes("status")) return String(value).replace(/_/g, " ");
  return String(value);
}

function DataTable({ rows, columns }) {
  if (!rows?.length) return <EmptyState title="No records" text="Records will appear here when available." />;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || index}>
              {columns.map((column) => <td key={column}>{tableValue(column, row[column])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminModal({ title, icon = "eye", onClose, children, size = "" }) {
  useBodyScrollLock();

  const closeOnBackdrop = (event) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div className="admin-modal-backdrop" role="dialog" aria-modal="true" aria-label={title} onMouseDown={closeOnBackdrop}>
      <div className={`admin-modal ${size ? `admin-modal-${size}` : ""}`}>
        <div className="admin-modal-header">
          <h2><FieldIcon name={icon} /> {title}</h2>
          <button type="button" className="modal-close-button" onClick={onClose} aria-label="Close">
            <FieldIcon name="x" />
          </button>
        </div>
        <div className="admin-modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}

function AuthFileLink({ path, token, children }) {
  const [preview, setPreview] = useState(null);
  const openFile = async () => {
    const response = await fetch(`${API_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    setPreview({ url, type: blob.type || "", name: String(children || "Uploaded proof") });
  };

  const closePreview = () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  useEffect(() => () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
  }, [preview?.url]);

  return (
    <>
      <button className="link-button" type="button" onClick={openFile}>
        {children}
      </button>
      {preview && (
        <FilePreviewLightbox preview={preview} onClose={closePreview} />
      )}
    </>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="empty-state">
      <span><FieldIcon name="alert" /></span>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}

export default App;
