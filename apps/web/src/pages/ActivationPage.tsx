import { useState } from 'react';
import { api } from '../services/api';

interface Props { token: string; }

function passwordStrength(pwd: string): { label: string; color: string; pct: number } {
  if (!pwd) return { label: '', color: '#e5e7eb', pct: 0 };
  let s = 0;
  if (pwd.length >= 8)            s++;
  if (pwd.length >= 12)           s++;
  if (/[A-Z]/.test(pwd))         s++;
  if (/[a-z]/.test(pwd))         s++;
  if (/\d/.test(pwd))            s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  if (s <= 2) return { label: 'Faible',   color: '#dc2626', pct: Math.round(s / 6 * 100) };
  if (s <= 4) return { label: 'Moyen',    color: '#d97706', pct: Math.round(s / 6 * 100) };
  return            { label: 'Robuste',   color: '#16a34a', pct: Math.round(s / 6 * 100) };
}

const S = {
  page: {
    minHeight: '100dvh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: 'var(--color-surface-2)', padding: '24px',
  } as const,
  card: {
    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
    borderRadius: '16px', padding: '40px 32px',
    width: '100%', maxWidth: '380px', boxShadow: '0 4px 16px rgba(0,0,0,.10)',
  } as const,
};

export function ActivationPage({ token }: Props) {
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPwd,   setShowPwd]   = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState(false);

  const strength = passwordStrength(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 6)      { setError('Le mot de passe doit faire au moins 6 caractères.'); return; }
    if (password !== confirm)      { setError('Les mots de passe ne correspondent pas.'); return; }
    setLoading(true);
    try {
      await api.activateAccount(token, password);
      setSuccess(true);
      // Nettoyer l'URL sans recharger la page
      window.history.replaceState({}, '', '/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 16px',
    border: '1px solid var(--color-border)', borderRadius: '10px',
    fontSize: '15px', background: 'var(--color-surface)', color: 'var(--color-text)',
    boxSizing: 'border-box',
  };

  if (success) return (
    <div style={S.page}>
      <div style={{ ...S.card, textAlign: 'center' }}>
        <div style={{ fontSize: '52px', marginBottom: '16px' }}>✅</div>
        <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700 }}>Mot de passe créé !</h2>
        <p style={{ margin: '0 0 24px', color: 'var(--color-text-muted)', fontSize: '14px' }}>
          Votre compte est maintenant actif. Vous pouvez vous connecter.
        </p>
        <a
          href="/"
          style={{
            display: 'inline-block', padding: '12px 28px',
            background: 'var(--color-primary)', color: '#fff',
            borderRadius: '10px', fontWeight: 600, fontSize: '15px',
            textDecoration: 'none',
          }}
        >
          Se connecter →
        </a>
      </div>
    </div>
  );

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>🔐</span>
          <h1 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: 800 }}>Créer votre mot de passe</h1>
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '14px' }}>
            Choisissez un mot de passe sécurisé pour accéder à l'application.
          </p>
        </div>

        {error && (
          <div style={{
            padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5',
            borderRadius: '8px', color: '#dc2626', fontSize: '13px', marginBottom: '16px',
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Nouveau mot de passe
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Au moins 6 caractères"
                autoComplete="new-password"
                style={{ ...inputStyle, paddingRight: '48px' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  border: 'none', background: 'transparent', cursor: 'pointer',
                  color: 'var(--color-text-muted)', fontSize: '18px', padding: '4px',
                }}
              >
                {showPwd ? '🙈' : '👁'}
              </button>
            </div>
            {password && (
              <div style={{ marginTop: '6px' }}>
                <div style={{ height: '4px', background: '#e5e7eb', borderRadius: '2px', overflow: 'hidden', marginBottom: '4px' }}>
                  <div style={{ height: '100%', width: `${strength.pct}%`, background: strength.color, borderRadius: '2px', transition: 'all 0.3s' }} />
                </div>
                <span style={{ fontSize: '11px', color: strength.color, fontWeight: 600 }}>{strength.label}</span>
              </div>
            )}
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Répétez le mot de passe"
              autoComplete="new-password"
              style={{
                ...inputStyle,
                borderColor: confirm && confirm !== password ? '#fca5a5' : 'var(--color-border)',
              }}
              required
            />
            {confirm && confirm !== password && (
              <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>
                Les mots de passe ne correspondent pas
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px',
              background: 'var(--color-primary)', color: '#fff',
              border: 'none', borderRadius: '10px',
              fontSize: '16px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Activation…' : 'Activer mon compte'}
          </button>
        </form>
      </div>
    </div>
  );
}
