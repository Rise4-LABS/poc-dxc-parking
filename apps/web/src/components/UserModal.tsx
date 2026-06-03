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

  /* ── styles ── */
  const labelStyle: React.CSSProperties = {
    fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '7px', display: 'block',
  };
  const input: React.CSSProperties = {
    width: '100%', padding: '10px 12px', border: '1px solid var(--color-border)',
    borderRadius: '8px', fontSize: '14px', background: 'var(--color-surface)',
    color: 'var(--color-text)', boxSizing: 'border-box',
  };
  const section: React.CSSProperties = { marginBottom: '18px' };

  function ToggleBtn({ active: isActive, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
    return (
      <button type="button" onClick={onClick} style={{
        flex: 1, padding: '10px',
        border: `2px solid ${isActive ? 'var(--color-primary)' : 'var(--color-border)'}`,
        borderRadius: '8px',
        background: isActive ? 'var(--color-primary-light)' : 'var(--color-surface)',
        color: isActive ? 'var(--color-primary)' : 'var(--color-text)',
        fontSize: '13px', fontWeight: 600, cursor: 'pointer',
      }}>
        {label}
      </button>
    );
  }

  // Affichage du lien d'activation après création
  if (activationLink) return (
    <Modal open={open} onClose={() => { onSaved(); }} title="✅ Utilisateur créé">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text)' }}>
          Copiez ce lien et envoyez-le à <strong>{[firstName, lastName].filter(Boolean).join(' ')}</strong> pour qu'il crée son mot de passe :
        </p>
        <div style={{
          padding: '12px', background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)', borderRadius: '8px',
          fontSize: '12px', wordBreak: 'break-all', color: 'var(--color-primary)',
          fontFamily: 'monospace',
        }}>
          {activationLink}
        </div>
        <button
          onClick={() => {
            void navigator.clipboard.writeText(activationLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          style={{
            padding: '10px',
            border: `1px solid ${copied ? '#86efac' : 'var(--color-border)'}`,
            borderRadius: '8px',
            background: copied ? '#f0fdf4' : 'var(--color-surface)',
            color: copied ? '#16a34a' : 'var(--color-text)',
            fontWeight: 600, fontSize: '14px', cursor: 'pointer',
          }}
        >
          {copied ? '✓ Lien copié !' : '📋 Copier le lien'}
        </button>
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
          Le lien est à usage unique. Si l'utilisateur ne l'utilise pas, vous pourrez en générer un nouveau depuis la liste.
        </p>
        <button
          onClick={() => onSaved()}
          style={{
            padding: '12px', background: 'var(--color-primary)', color: '#fff',
            border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '14px', cursor: 'pointer',
          }}
        >
          Fermer
        </button>
      </div>
    </Modal>
  );

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? `Modifier — ${user?.name}` : 'Nouvel utilisateur'}>

      {error && (
        <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#dc2626', fontSize: '13px', marginBottom: '16px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Prénom / Nom / Trigramme */}
      <div style={section}>
        <label style={labelStyle}>Identité</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>Prénom *</label>
            <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jean" style={input} />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>Nom</label>
            <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Dupont" style={input} />
          </div>
        </div>
        <div>
          <label style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>
            Trigramme
            <span style={{ fontWeight: 400, marginLeft: '6px', color: 'var(--color-text-muted)', opacity: 0.7 }}>— affiché sur le planning (ex&nbsp;: BFE)</span>
          </label>
          <input
            type="text"
            value={trigram}
            onChange={e => setTrigram(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3))}
            placeholder="JDU"
            maxLength={3}
            style={{ ...input, width: '80px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.1em', textAlign: 'center' }}
          />
        </div>
      </div>

      {/* Email */}
      <div style={section}>
        <label style={labelStyle}>Adresse email *</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="jean.dupont@dxc.com"
          style={input}
        />
        {!isEdit && (
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Un lien d'activation sera généré — à envoyer à l'utilisateur
          </div>
        )}
      </div>

      {/* Profil */}
      <div style={section}>
        <label style={labelStyle}>Profil</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <ToggleBtn active={role === 'USER'}  label="👤 Utilisateur" onClick={() => setRole('USER')} />
          <ToggleBtn active={role === 'ADMIN'} label="🛡 Admin"        onClick={() => setRole('ADMIN')} />
        </div>
      </div>

      {/* Statut */}
      <div style={{ ...section, marginBottom: '24px' }}>
        <label style={labelStyle}>Statut</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <ToggleBtn active={active}  label="✅ Actif"   onClick={() => setActive(true)} />
          <ToggleBtn active={!active} label="🚫 Inactif" onClick={() => setActive(false)} />
        </div>
        {!active && (
          <div style={{ marginTop: '8px', padding: '8px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', fontSize: '12px', color: '#dc2626' }}>
            Cet utilisateur ne pourra plus se connecter.
          </div>
        )}
      </div>

      {/* Reset mot de passe (édition seulement) */}
      {isEdit && (
        <div style={{ marginBottom: '16px' }}>
          {activationLink ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ padding: '10px 12px', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '11px', wordBreak: 'break-all', color: 'var(--color-primary)', fontFamily: 'monospace' }}>
                {activationLink}
              </div>
              <button
                type="button"
                onClick={() => { void navigator.clipboard.writeText(activationLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                style={{ padding: '8px', border: `1px solid ${copied ? '#86efac' : 'var(--color-border)'}`, borderRadius: '7px', background: copied ? '#f0fdf4' : 'var(--color-surface)', color: copied ? '#16a34a' : 'var(--color-text)', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
              >
                {copied ? '✓ Copié' : '📋 Copier le lien'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void handleResetPassword()}
              disabled={loading}
              style={{ width: '100%', padding: '10px', border: '1px solid var(--color-border)', borderRadius: '8px', background: 'var(--color-surface)', color: 'var(--color-text-muted)', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
            >
              🔑 Réinitialiser le mot de passe
            </button>
          )}
        </div>
      )}

      {/* Footer */}
      {deleteConfirm ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ textAlign: 'center', fontSize: '14px', padding: '6px 0' }}>
            Supprimer définitivement <strong>{user?.name}</strong> ?
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button type="button" onClick={() => setDeleteConfirm(false)} style={{ padding: '12px', border: '1px solid var(--color-border)', borderRadius: '10px', background: 'var(--color-surface)', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>
              Annuler
            </button>
            <button type="button" onClick={() => void handleDelete()} disabled={loading} style={{ padding: '12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '10px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '14px', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              {loading ? <Spinner size={16} /> : 'Oui, supprimer'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button type="button" onClick={() => void handleSubmit()} disabled={loading} style={{ padding: '14px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {loading ? <Spinner size={18} /> : isEdit ? '✏️ Enregistrer' : '✅ Créer l\'utilisateur'}
          </button>
          {isEdit && (
            <button type="button" onClick={() => setDeleteConfirm(true)} style={{ padding: '11px', background: 'transparent', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
              🗑 Supprimer cet utilisateur
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}
