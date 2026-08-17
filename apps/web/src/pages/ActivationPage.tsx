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
    justifyContent: 'center', background: 'var(--color-surface-2)', padding: 'var(--space-6)',
  } as const,
  card: { width: '100%', maxWidth: '420px', boxShadow: 'var(--shadow-lg)' } as const,
  badge: {
    width: '56px', height: '56px', borderRadius: 'var(--radius-lg)',
    display: 'grid', placeItems: 'center', margin: '0 auto var(--space-4)',
    background: 'linear-gradient(135deg, var(--accent), var(--brand-600))',
    fontSize: '28px', boxShadow: 'var(--shadow-md)',
  } as const,
  eye: {
    position: 'absolute' as const, right: '10px', top: '50%', transform: 'translateY(-50%)',
    border: 'none', background: 'transparent', cursor: 'pointer',
    color: 'var(--color-text-muted)', fontSize: '18px', padding: '4px', lineHeight: 1,
  },
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

  if (success) return (
    <div style={S.page}>
      <div className="card" style={S.card}>
        <div className="card__body" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '52px', marginBottom: 'var(--space-4)' }}>✅</div>
          <h2 style={{ margin: '0 0 8px', fontSize: 'var(--fs-xl)', fontWeight: 800, letterSpacing: '-.02em' }}>Mot de passe créé !</h2>
          <p style={{ margin: '0 0 var(--space-6)', color: 'var(--color-text-muted)', fontSize: 'var(--fs-base)' }}>
            Votre compte est maintenant actif. Vous pouvez vous connecter.
          </p>
          <a href="/" className="btn btn--primary" style={{ padding: '12px 28px' }}>
            Se connecter →
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <div style={S.page}>
      <div className="card" style={S.card}>
        <div className="card__body">
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
            <div style={S.badge}>🔐</div>
            <h1 style={{ margin: '0 0 6px', fontSize: 'var(--fs-xl)', fontWeight: 800, letterSpacing: '-.02em' }}>Créer votre mot de passe</h1>
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--fs-base)' }}>
              Choisissez un mot de passe sécurisé pour accéder à l'application.
            </p>
          </div>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: '8px',
              padding: '10px 14px', background: 'var(--status-occupied-bg)',
              border: '1px solid var(--status-occupied-fg)',
              borderRadius: 'var(--radius-md)', color: 'var(--status-occupied-fg)',
              fontSize: 'var(--fs-sm)', fontWeight: 500, marginBottom: 'var(--space-4)',
            }}>
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="field">
              <label className="label">Nouveau mot de passe</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  style={{ paddingRight: '44px' }}
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Au moins 6 caractères"
                  autoComplete="new-password"
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
              {password && (
                <div style={{ marginTop: '4px' }}>
                  <div style={{ height: '4px', background: 'var(--color-surface-3)', borderRadius: 'var(--radius-full)', overflow: 'hidden', marginBottom: '4px' }}>
                    <div style={{ height: '100%', width: `${strength.pct}%`, background: strength.color, borderRadius: 'var(--radius-full)', transition: 'all 0.3s' }} />
                  </div>
                  <span style={{ fontSize: 'var(--fs-xs)', color: strength.color, fontWeight: 700 }}>{strength.label}</span>
                </div>
              )}
            </div>

            <div className="field">
              <label className="label">Confirmer le mot de passe</label>
              <input
                className="input"
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Répétez le mot de passe"
                autoComplete="new-password"
                style={confirm && confirm !== password ? { borderColor: 'var(--status-occupied-fg)' } : undefined}
                required
              />
              {confirm && confirm !== password && (
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--status-occupied-fg)', marginTop: '2px' }}>
                  Les mots de passe ne correspondent pas
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn--primary btn--block"
              disabled={loading}
              style={{ marginTop: 'var(--space-2)', padding: '12px' }}
            >
              {loading ? 'Activation…' : 'Activer mon compte'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
