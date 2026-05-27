import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Spinner } from './Spinner';
import { api } from '../services/api';
import { useUiStore } from '../store/uiStore';
import type { User } from '../types/api.types';

/* ─── Générateur de mot de passe robuste ────────────────────────────────────── */
function randByte(): number {
  return crypto.getRandomValues(new Uint8Array(1))[0];
}

function generatePassword(): string {
  const upper   = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sans I, O ambigus
  const lower   = 'abcdefghjkmnpqrstuvwxyz';  // sans i, l, o ambigus
  const digits  = '23456789';                  // sans 0, 1 ambigus
  const special = '!@#$%&*+?';
  const all     = upper + lower + digits + special;

  // Au moins 1 de chaque catégorie + 6 aléatoires
  const chars = [
    upper  [randByte() % upper.length],
    lower  [randByte() % lower.length],
    digits [randByte() % digits.length],
    special[randByte() % special.length],
    ...Array.from({ length: 6 }, () => all[randByte() % all.length]),
  ];

  // Mélange Fisher-Yates
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randByte() % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

/* ─── Indicateur de robustesse ───────────────────────────────────────────────── */
function passwordStrength(pwd: string): { score: number; label: string; color: string } {
  if (!pwd) return { score: 0, label: '', color: '#e5e7eb' };
  let s = 0;
  if (pwd.length >= 8)              s++;
  if (pwd.length >= 12)             s++;
  if (/[A-Z]/.test(pwd))           s++;
  if (/[a-z]/.test(pwd))           s++;
  if (/\d/.test(pwd))              s++;
  if (/[^A-Za-z0-9]/.test(pwd))   s++;
  if (s <= 2) return { score: s, label: 'Faible',  color: '#dc2626' };
  if (s <= 4) return { score: s, label: 'Moyen',   color: '#d97706' };
  return            { score: s, label: 'Robuste', color: '#16a34a' };
}

interface Props {
  open: boolean;
  user: User | null;   // null = création
  onClose: () => void;
  onSaved: () => void;
}

export function UserModal({ open, user, onClose, onSaved }: Props) {
  const isEdit = !!user;
  const { addToast } = useUiStore();

  /* ── form state ── */
  const [firstName,     setFirstName]     = useState('');
  const [lastName,      setLastName]      = useState('');
  const [accessId,      setAccessId]      = useState('');
  const [pin,           setPin]           = useState('');
  const [showPin,       setShowPin]       = useState(false);
  const [copied,        setCopied]        = useState(false);
  const [role,          setRole]          = useState<'USER' | 'ADMIN'>('USER');
  const [active,        setActive]        = useState(true);
  const [loading,       setLoading]       = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [error,         setError]         = useState('');

  /* ── pré-remplissage ── */
  useEffect(() => {
    if (!open) return;
    setError('');
    setDeleteConfirm(false);
    setLoading(false);
    setShowPin(false);
    setCopied(false);

    if (user) {
      const parts = user.name.trim().split(' ');
      setFirstName(parts[0] ?? '');
      setLastName(parts.slice(1).join(' '));
      setAccessId(user.accessId);
      setPin(user.pin ?? '');              // pré-rempli si renvoyé par l'API admin
      setRole((user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') ? 'ADMIN' : 'USER');
      setActive(user.active !== false);
    } else {
      setFirstName('');
      setLastName('');
      setAccessId('');
      setPin('');
      setRole('USER');
      setActive(true);
    }
  }, [open, user]);

  /* ── validation ── */
  function validate() {
    if (!firstName.trim())         { setError('Le prénom est obligatoire.');                    return false; }
    if (!accessId.trim())          { setError("L'identifiant est obligatoire.");                return false; }
    if (accessId.length > 6)       { setError("L'identifiant ne peut pas dépasser 6 caractères."); return false; }
    if (!isEdit && !pin)           { setError('Le mot de passe est obligatoire à la création.');  return false; }
    if (pin && pin.length < 6)    { setError('Le mot de passe doit faire au moins 6 caractères.'); return false; }
    return true;
  }

  /* ── submit ── */
  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    setError('');
    try {
      const name = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
      const payload = {
        name,
        accessId: accessId.trim().toUpperCase(),
        ...(pin ? { pin } : {}),
        role,
        active,
      };
      if (isEdit && user) {
        await api.updateUser(user.id, payload);
        addToast('Utilisateur modifié', 'success');
      } else {
        await api.createUser({ ...payload, pin: pin });
        addToast('Utilisateur créé', 'success');
      }
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  /* ── delete ── */
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
    fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)',
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
      <button
        type="button"
        onClick={onClick}
        style={{
          flex: 1, padding: '10px',
          border: `2px solid ${isActive ? 'var(--color-primary)' : 'var(--color-border)'}`,
          borderRadius: '8px',
          background: isActive ? '#eff6ff' : 'var(--color-surface)',
          color: isActive ? 'var(--color-primary)' : 'var(--color-text)',
          fontSize: '13px', fontWeight: 600, cursor: 'pointer',
        }}
      >
        {label}
      </button>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Modifier — ${user?.name}` : 'Nouvel utilisateur'}
    >
      {/* ── Error ── */}
      {error && (
        <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#dc2626', fontSize: '13px', marginBottom: '16px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Prénom / Nom ── */}
      <div style={section}>
        <label style={labelStyle}>Identité</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>Prénom *</label>
            <input
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="Jean"
              style={input}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px', display: 'block' }}>Nom</label>
            <input
              type="text"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              placeholder="Dupont"
              style={input}
            />
          </div>
        </div>
      </div>

      {/* ── Identifiant ── */}
      <div style={section}>
        <label style={labelStyle}>Identifiant de connexion *</label>
        <input
          type="text"
          value={accessId}
          onChange={e => setAccessId(e.target.value.toUpperCase().slice(0, 6))}
          placeholder="Ex : USR004"
          maxLength={6}
          style={{ ...input, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}
        />
        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
          6 caractères max — sera utilisé à la place du nom de connexion
        </div>
      </div>

      {/* ── Mot de passe ── */}
      <div style={section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '7px' }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>
            Mot de passe {!isEdit && <span style={{ color: '#dc2626' }}>*</span>}
          </label>
          {isEdit && (
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              Laisser vide = inchangé
            </span>
          )}
        </div>

        {/* Champ + œil */}
        <div style={{ position: 'relative', marginBottom: '8px' }}>
          <input
            type={showPin ? 'text' : 'password'}
            value={pin}
            onChange={e => setPin(e.target.value.slice(0, 64))}
            placeholder={isEdit ? '(inchangé)' : 'Mot de passe…'}
            autoComplete="new-password"
            style={{ ...input, paddingRight: '44px', fontFamily: showPin ? 'inherit' : 'monospace' }}
          />
          <button
            type="button"
            onClick={() => setShowPin(v => !v)}
            style={{
              position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
              border: 'none', background: 'transparent', cursor: 'pointer',
              color: 'var(--color-text-muted)', fontSize: '16px', padding: '4px',
            }}
            title={showPin ? 'Masquer' : 'Afficher'}
          >
            {showPin ? '🙈' : '👁'}
          </button>
        </div>

        {/* Boutons d'action */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
          <button
            type="button"
            onClick={() => { const p = generatePassword(); setPin(p); setShowPin(true); setCopied(false); }}
            style={{
              flex: 1, padding: '7px 10px',
              border: '1px solid var(--color-primary)',
              borderRadius: '7px',
              background: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
              fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            🔐 Générer un mot de passe
          </button>
          {pin && (
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(pin);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              style={{
                padding: '7px 12px',
                border: `1px solid ${copied ? '#86efac' : 'var(--color-border)'}`,
                borderRadius: '7px',
                background: copied ? '#f0fdf4' : 'var(--color-surface)',
                color: copied ? '#16a34a' : 'var(--color-text-muted)',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              title="Copier dans le presse-papier"
            >
              {copied ? '✓ Copié' : '📋 Copier'}
            </button>
          )}
        </div>

        {/* Indicateur de robustesse */}
        {pin && (() => {
          const { score, label, color } = passwordStrength(pin);
          const pct = Math.round((score / 6) * 100);
          return (
            <div>
              <div style={{ height: '4px', background: 'var(--color-border)', borderRadius: '2px', overflow: 'hidden', marginBottom: '4px' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '2px', transition: 'width 0.3s, background 0.3s' }} />
              </div>
              <div style={{ fontSize: '11px', color, fontWeight: 600 }}>{label}</div>
            </div>
          );
        })()}
      </div>

      {/* ── Profil ── */}
      <div style={section}>
        <label style={labelStyle}>Profil</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <ToggleBtn active={role === 'USER'}  label="👤 Utilisateur" onClick={() => setRole('USER')} />
          <ToggleBtn active={role === 'ADMIN'} label="🛡 Admin"        onClick={() => setRole('ADMIN')} />
        </div>
      </div>

      {/* ── Statut ── */}
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

      {/* ── Footer ── */}
      {deleteConfirm ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ textAlign: 'center', fontSize: '14px', padding: '6px 0', color: 'var(--color-text)' }}>
            Supprimer définitivement <strong>{user?.name}</strong>&nbsp;?
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setDeleteConfirm(false)}
              style={{ padding: '12px', border: '1px solid var(--color-border)', borderRadius: '10px', background: 'var(--color-surface)', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={loading}
              style={{ padding: '12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '10px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '14px', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              {loading ? <Spinner size={16} /> : 'Oui, supprimer'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={loading}
            style={{ padding: '14px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {loading ? <Spinner size={18} /> : isEdit ? '✏️ Enregistrer' : '✅ Créer l\'utilisateur'}
          </button>
          {isEdit && (
            <button
              type="button"
              onClick={() => setDeleteConfirm(true)}
              style={{ padding: '11px', background: 'transparent', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
            >
              🗑 Supprimer cet utilisateur
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}
