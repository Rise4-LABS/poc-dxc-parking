import { useState } from 'react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';

const S = {
  page: {
    minHeight: '100dvh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: 'var(--color-surface-2)', padding: 'var(--space-6)',
  } as const,
  card: { width: '100%', maxWidth: '420px', boxShadow: 'var(--shadow-lg)' } as const,
  logo:  { textAlign: 'center' as const, marginBottom: 'var(--space-8)' },
  badge: {
    width: '56px', height: '56px', borderRadius: 'var(--radius-lg)',
    display: 'grid', placeItems: 'center', margin: '0 auto var(--space-4)',
    background: 'linear-gradient(135deg, var(--accent), var(--brand-600))',
    fontSize: '30px', boxShadow: 'var(--shadow-md)',
  } as const,
  title: { fontSize: 'var(--fs-2xl)', fontWeight: 800, letterSpacing: '-.02em', color: 'var(--color-text)', margin: '0 0 4px' },
  sub:   { fontSize: 'var(--fs-base)', color: 'var(--color-text-muted)', margin: 0 },
  eye: {
    position: 'absolute' as const, right: '10px', top: '50%', transform: 'translateY(-50%)',
    border: 'none', background: 'transparent', cursor: 'pointer',
    color: 'var(--color-text-muted)', fontSize: '18px', padding: '4px', lineHeight: 1,
  },
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
      <div className="card" style={S.card}>
        <div className="card__body">
          <div style={S.logo}>
            <div style={S.badge}>🅿️</div>
            <h1 style={S.title}>BoxBox</h1>
            <p style={S.sub}>Gestion du parking</p>
          </div>
          <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="field">
              <label className="label">Adresse email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="prenom.nom@dxc.com"
                autoComplete="email"
                required
              />
            </div>
            <div className="field">
              <label className="label">Mot de passe</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  style={{ paddingRight: '44px' }}
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
                  style={S.eye}
                  aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPwd ? '🙈' : '👁'}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn--primary btn--block" disabled={loading} style={{ marginTop: 'var(--space-2)', padding: '12px' }}>
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
