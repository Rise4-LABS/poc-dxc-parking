import { useState } from 'react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';

const S = {
  page: {
    minHeight: '100dvh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: 'var(--color-surface-2)', padding: '24px',
  } as const,
  card: {
    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)', padding: '40px 32px',
    width: '100%', maxWidth: '360px', boxShadow: 'var(--shadow-md)',
  } as const,
  logo:  { textAlign: 'center' as const, marginBottom: '32px' },
  icon:  { fontSize: '52px', display: 'block', marginBottom: '12px' },
  title: { fontSize: '24px', fontWeight: 800, color: 'var(--color-text)', margin: '0 0 4px' },
  sub:   { fontSize: '14px', color: 'var(--color-text-muted)', margin: 0 },
  field: { marginBottom: '20px' },
  label: { display: 'block' as const, fontSize: '14px', fontWeight: 500, color: 'var(--color-text)', marginBottom: '6px' },
  input: {
    width: '100%', padding: '12px 16px',
    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
    fontSize: '16px', background: 'var(--color-surface)', color: 'var(--color-text)',
    boxSizing: 'border-box' as const,
  },
  btn: {
    width: '100%', padding: '14px',
    background: 'var(--color-primary)', color: '#fff',
    border: 'none', borderRadius: 'var(--radius-md)',
    fontSize: '16px', fontWeight: 600, cursor: 'pointer', marginTop: '8px',
  } as const,
};

export function LoginPage() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const { setTokens, setUser } = useAuthStore();
  const { addToast } = useUiStore();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { addToast('Veuillez remplir tous les champs', 'error'); return; }
    setLoading(true);
    try {
      const data = await api.login(email.trim().toLowerCase(), password);
      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
    } catch (err) {
      const msg = (err as Error).message || 'Identifiants invalides';
      if (msg.includes('non activé') || msg.includes('PENDING')) {
        addToast('Votre compte n\'est pas encore activé. Vérifiez votre email.', 'error');
      } else {
        addToast(msg, 'error');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logo}>
          <span style={S.icon}>🅿️</span>
          <h1 style={S.title}>DriveXchange</h1>
          <p style={S.sub}>Gestion du parking</p>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)}>
          <div style={S.field}>
            <label style={S.label}>Adresse email</label>
            <input
              style={S.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom.nom@dxc.com"
              autoComplete="email"
              required
            />
          </div>
          <div style={S.field}>
            <label style={S.label}>Mot de passe</label>
            <div style={{ position: 'relative' }}>
              <input
                style={{ ...S.input, paddingRight: '48px' }}
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Votre mot de passe"
                autoComplete="current-password"
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
          </div>
          <button type="submit" disabled={loading} style={{ ...S.btn, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
