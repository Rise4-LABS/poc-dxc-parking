import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Spinner } from './Spinner';
import { api } from '../services/api';
import { useUiStore } from '../store/uiStore';
import type { User } from '../types/api.types';

interface Props {
  open: boolean;
  user: User | null;   // null = création
  onClose: () => void;
  onSaved: () => void;
}

export function UserModal({ open, user, onClose, onSaved }: Props) {
  const isEdit = !!user;
  const { addToast } = useUiStore();

  const [firstName,     setFirstName]     = useState('');
  const [lastName,      setLastName]      = useState('');
  const [email,         setEmail]         = useState('');
  const [trigram,       setTrigram]       = useState('');
  const [role,          setRole]          = useState<'USER' | 'ADMIN'>('USER');
  const [active,        setActive]        = useState(true);
  const [loading,       setLoading]       = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [error,         setError]         = useState('');

  // Pour le lien d'activation (après création ou reset)
  const [activationLink, setActivationLink] = useState('');
  const [copied,         setCopied]         = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setDeleteConfirm(false);
    setLoading(false);
    setActivationLink('');
    setCopied(false);

    if (user) {
      const parts = user.name.trim().split(' ');
      setFirstName(parts[0] ?? '');
      setLastName(parts.slice(1).join(' '));
      setEmail(user.email ?? '');
      setTrigram(user.trigram ?? '');
      setRole((user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') ? 'ADMIN' : 'USER');
      setActive(user.active !== false);
    } else {
      setFirstName('');
      setLastName('');
      setEmail('');
      setTrigram('');
      setRole('USER');
      setActive(true);
    }
  }, [open, user]);

  function buildActivationLink(token: string) {
    return `${window.location.origin}/?activate=${token}`;
  }

  function validate() {
    if (!firstName.trim()) { setError('Le prénom est obligatoire.');   return false; }
    if (!email.trim())     { setError("L'email est obligatoire.");     return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Format d'email invalide."); return false; }
    return true;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    setError('');
    try {
      const name = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
      const trigramValue = trigram.trim().toUpperCase().slice(0, 3) || null;
      if (isEdit && user) {
        await api.updateUser(user.id, { name, email: email.trim().toLowerCase(), role, active, trigram: trigramValue });
        addToast('Utilisateur modifié', 'success');
        onSaved();
      } else {
        const created = await api.createUser({ name, email: email.trim().toLowerCase(), role, active, trigram: trigramValue });
        if (created.activationToken) {
          setActivationLink(buildActivationLink(created.activationToken));
        } else {
          onSaved();
        }
        addToast('Utilisateur créé', 'success');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const updated = await api.resendActivation(user.id);
      if (updated.activationToken) {
        setActivationLink(buildActivationLink(updated.activationToken));
        setCopied(false);
      }
      addToast('Nouveau lien d\'activation généré', 'success');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!user) return;
    setLoading(true);
    try {
      await api.deleteUser(user.id);
      addToast('Utilisateur supprimé', 'success');
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  function ToggleBtn({ active: isActive, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
    return (
      <button type="button" onClick={onClick} className={`chip${isActive ? ' is-active' : ''}`} style={{ flex: 1, textAlign: 'center' }}>
        {label}
      </button>
    );
  }

  // Affichage du lien d'activation après création
  if (activationLink) return (
    <Modal open={open} onClose={() => { onSaved(); }} title="✅ Utilisateur créé">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <p style={{ margin: 0, fontSize: 'var(--fs-base)', color: 'var(--color-text)' }}>
          Copiez ce lien et envoyez-le à <strong>{[firstName, lastName].filter(Boolean).join(' ')}</strong> pour qu'il crée son mot de passe :
        </p>
        <div style={{
          padding: 'var(--space-3)', background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
          fontSize: 'var(--fs-xs)', wordBreak: 'break-all', color: 'var(--accent)',
          fontFamily: 'ui-monospace, monospace',
        }}>
          {activationLink}
        </div>
        <button
          className={`btn ${copied ? 'btn--primary' : 'btn--ghost'} btn--block`}
          onClick={() => {
            void navigator.clipboard.writeText(activationLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? '✓ Lien copié !' : '📋 Copier le lien'}
        </button>
        <p style={{ margin: 0, fontSize: 'var(--fs-xs)', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
          Le lien est à usage unique. Si l'utilisateur ne l'utilise pas, vous pourrez en générer un nouveau depuis la liste.
        </p>
        <button className="btn btn--primary btn--block" onClick={() => onSaved()}>
          Fermer
        </button>
      </div>
    </Modal>
  );

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? `Modifier — ${user?.name}` : 'Nouvel utilisateur'}>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

        {error && (
          <div style={{ padding: '10px 14px', background: 'var(--status-occupied-bg)', border: '1px solid var(--status-occupied-fg)', borderRadius: 'var(--radius-md)', color: 'var(--status-occupied-fg)', fontSize: 'var(--fs-sm)' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Prénom / Nom / Trigramme */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="field">
              <label className="label">Prénom *</label>
              <input className="input" type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jean" />
            </div>
            <div className="field">
              <label className="label">Nom</label>
              <input className="input" type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Dupont" />
            </div>
          </div>
          <div className="field">
            <label className="label">
              Trigramme
              <span style={{ fontWeight: 400, marginLeft: '6px', color: 'var(--color-text-muted)' }}>— affiché sur le planning (ex&nbsp;: BFE)</span>
            </label>
            <input
              className="input"
              type="text"
              value={trigram}
              onChange={e => setTrigram(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3))}
              placeholder="JDU"
              maxLength={3}
              style={{ width: '90px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.1em', textAlign: 'center' }}
            />
          </div>
        </div>

        {/* Email */}
        <div className="field">
          <label className="label">Adresse email *</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="jean.dupont@dxc.com"
          />
          {!isEdit && (
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-muted)' }}>
              Un lien d'activation sera généré — à envoyer à l'utilisateur
            </div>
          )}
        </div>

        {/* Profil */}
        <div className="field">
          <label className="label">Profil</label>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <ToggleBtn active={role === 'USER'}  label="👤 Utilisateur" onClick={() => setRole('USER')} />
            <ToggleBtn active={role === 'ADMIN'} label="🛡 Admin"        onClick={() => setRole('ADMIN')} />
          </div>
        </div>

        {/* Statut */}
        <div className="field">
          <label className="label">Statut</label>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <ToggleBtn active={active}  label="✅ Actif"   onClick={() => setActive(true)} />
            <ToggleBtn active={!active} label="🚫 Inactif" onClick={() => setActive(false)} />
          </div>
          {!active && (
            <div style={{ marginTop: 'var(--space-2)', padding: '8px 12px', background: 'var(--status-occupied-bg)', border: '1px solid var(--status-occupied-fg)', borderRadius: 'var(--radius-md)', fontSize: 'var(--fs-xs)', color: 'var(--status-occupied-fg)' }}>
              Cet utilisateur ne pourra plus se connecter.
            </div>
          )}
        </div>

        {/* Reset mot de passe (édition seulement) */}
        {isEdit && (
          <div>
            {activationLink ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <div style={{ padding: '10px 12px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: 'var(--fs-xs)', wordBreak: 'break-all', color: 'var(--accent)', fontFamily: 'ui-monospace, monospace' }}>
                  {activationLink}
                </div>
                <button
                  type="button"
                  className={`btn ${copied ? 'btn--primary' : 'btn--ghost'} btn--sm btn--block`}
                  onClick={() => { void navigator.clipboard.writeText(activationLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                >
                  {copied ? '✓ Copié' : '📋 Copier le lien'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn--ghost btn--block"
                onClick={() => void handleResetPassword()}
                disabled={loading}
              >
                🔑 Réinitialiser le mot de passe
              </button>
            )}
          </div>
        )}

        {/* Footer */}
        {deleteConfirm ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ textAlign: 'center', fontSize: 'var(--fs-base)', padding: '6px 0' }}>
              Supprimer définitivement <strong>{user?.name}</strong> ?
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
              <button type="button" className="btn btn--ghost" onClick={() => setDeleteConfirm(false)}>
                Annuler
              </button>
              <button type="button" className="btn btn--danger" onClick={() => void handleDelete()} disabled={loading}>
                {loading ? <Spinner size={16} /> : 'Oui, supprimer'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <button type="button" className="btn btn--primary btn--block" onClick={() => void handleSubmit()} disabled={loading} style={{ padding: '13px' }}>
              {loading ? <Spinner size={18} /> : isEdit ? '✏️ Enregistrer' : '✅ Créer l\'utilisateur'}
            </button>
            {isEdit && (
              <button type="button" className="btn btn--danger btn--block" onClick={() => setDeleteConfirm(true)}>
                🗑 Supprimer cet utilisateur
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
