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
  logo: { textAlign: 'center' as const, marginBottom: '32px' },
  icon: { fontSize: '52px', display: 'block', marginBottom: '12px' },
  title: { fontSize: '24px', fontWeight: 800, color: 'var(--color-text)', margin: '0 0 4px' },
  sub: { fontSize: '14px', color: 'var(--color-text-muted)', margin: 0 },
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
  const [accessId,  setAccessId]  = useState('');
  const [pin,       setPin]       = useState('');
  const [showPin,   setShowPin]   = useState(false);
  const [loading, setLoading] = useState(false);
  const { setTokens, setUser } = useAuthStore();
  const { addToast } = useUiStore();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pin) { addToast('Le mot de passe est requis', 'error'); return; }
    setLoading(true);
    try {
      const data = await api.login(accessId.toUpperCase().trim(), pin);
      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
    } catch (err) {
      addToast((err as Error).message || 'Identifiants invalides', 'error');
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
            <label style={S.label}>Identifiant d'accès</label>
            <input
              style={S.input}
              type="text"
              value={accessId}
              onChange={(e) => setAccessId(e.target.value.toUpperCase())}
              placeholder="MAR001"
              maxLength={6}
              autoComplete="username"
              autoCapitalize="characters"
              required
            />
          </div>
          <div style={S.field}>
            <label style={S.label}>Mot de passe</label>
            <div style={{ position: 'relative' }}>
              <input
                style={{ ...S.input, paddingRight: '44px' }}
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Votre mot de passe"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPin(v => !v)}
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  border: 'none', background: 'transparent', cursor: 'pointer',
                  color: 'var(--color-text-muted)', fontSize: '18px', padding: '4px',
                }}
                title={showPin ? 'Masquer' : 'Afficher'}
              >
                {showPin ? '🙈' : '👁'}
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
