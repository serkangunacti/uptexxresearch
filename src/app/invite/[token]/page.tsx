"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InviteAcceptPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function acceptInvite(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: params.token, name, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Davet kabul edilemedi.");
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Davet kabul edilemedi.");
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-wrapper">
            <img src="/uptexx-logo.png" alt="Uptexx" className="login-logo" />
          </div>
          <h1>Davet Kabul</h1>
          <p>Şifreni belirleyip tenant hesabını etkinleştir.</p>
        </div>

        <form onSubmit={acceptInvite} className="login-form">
          <div className="form-group">
            <label htmlFor="name">Ad Soyad</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="password">Şifre</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={10}
              required
            />
          </div>
          {error ? <div className="login-error">{error}</div> : null}
          <button className="login-button" type="submit" disabled={loading}>
            {loading ? "Kuruluyor..." : "Hesabı Etkinleştir"}
          </button>
        </form>
      </div>
    </div>
  );
}
