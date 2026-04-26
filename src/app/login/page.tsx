"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Hardcoded credentials as requested
    const validUser = "serkangunacti@kuzeytakip.com";
    const validPrefix = "serkangunacti";
    const validPass = "172561";

    const normalizedUsername = username.trim().toLowerCase();
    
    if (
      (normalizedUsername === validUser || normalizedUsername === validPrefix) &&
      password === validPass
    ) {
      // Set a simple cookie for authentication
      document.cookie = "uptexx_auth=true; path=/; max-age=86400; SameSite=Lax";
      router.push("/");
      router.refresh();
    } else {
      setError("Geçersiz kullanıcı adı veya şifre.");
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-wrapper">
            <img src="/uptexx-logo.png" alt="Uptexx" className="login-logo" />
          </div>
          <h1>UPTEXX</h1>
          <p>Araştırma Otomasyonu Giriş</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Kullanıcı Adı veya E-posta</label>
            <input
              id="username"
              type="text"
              placeholder="Kullanıcı adınızı giriniz"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Şifre</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>

        <div className="login-footer">
          <p>&copy; {new Date().getFullYear()} Uptexx Research Automation</p>
        </div>
      </div>

      <style jsx>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0f172a;
          background-image: 
            radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.15) 0px, transparent 50%),
            radial-gradient(at 100% 0%, rgba(139, 92, 246, 0.15) 0px, transparent 50%);
          padding: 20px;
        }

        .login-card {
          width: 100%;
          max-width: 400px;
          background: rgba(30, 41, 59, 0.7);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 48px 40px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .login-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .logo-wrapper {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
        }

        .login-logo {
          width: 72px;
          height: 72px;
          object-fit: contain;
          border-radius: 12px;
        }

        .login-header h1 {
          font-size: 26px;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: #fff;
          margin-bottom: 6px;
        }

        .login-header p {
          color: #94a3b8;
          font-size: 14px;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .form-group label {
          font-size: 13px;
          font-weight: 600;
          color: #cbd5e1;
          margin-left: 2px;
        }

        .form-group input {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 14px 16px;
          color: #fff;
          font-size: 15px;
          transition: all 0.2s;
        }

        .form-group input:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.15);
        }

        .login-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #fca5a5;
          padding: 12px;
          border-radius: 10px;
          font-size: 13px;
          text-align: center;
        }

        .login-button {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff;
          border: none;
          border-radius: 12px;
          padding: 16px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 8px;
        }

        .login-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.4);
        }

        .login-button:active {
          transform: translateY(0);
        }

        .login-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .login-footer {
          margin-top: 32px;
          text-align: center;
        }

        .login-footer p {
          font-size: 12px;
          color: #64748b;
        }
      `}</style>
    </div>
  );
}
