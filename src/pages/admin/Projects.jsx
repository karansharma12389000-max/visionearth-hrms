// src/pages/admin/Projects.jsx
//
// Admin — Manage Project Codes
//
// ✅ DB is the single source of truth.
// ✅ Writes are awaited, then local state updates instantly (no refetch wait).
// ✅ A silent background refetch keeps state in sync — no UI blocking.
// ✅ Delete / edit / insert verify the DB actually changed.

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../services/supabase';
import BottomNavigation from '../../components/BottomNavigation';
import { THEME, isDark } from '../../utils/designTokens';

export const AdminProjects = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const dark = isDark(theme);

  // Data
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Stale-fetch protection
  const latestFetchIdRef = useRef(0);

  // Add form
  const [newName, setNewName] = useState('');

  // Search
  const [search, setSearch] = useState('');

  // Edit modal
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState('');

  // Delete modal
  const [deleting, setDeleting] = useState(null);

  // Theme helpers
  const pageBg = dark ? THEME.dark.bg : THEME.greenBg;
  const cardBg = dark ? THEME.dark.card : THEME.cardBg;
  const textPrimary = dark ? THEME.dark.text : THEME.text;
  const textSecondary = dark ? THEME.dark.textSecondary : THEME.textSecondary;
  const textMuted = dark ? THEME.dark.textMuted : THEME.textMuted;
  const border = dark ? THEME.dark.border : THEME.border;
  const cardShadow = dark ? THEME.shadowDarkSm : THEME.shadowSm;

  // ============================================
  // FETCH — stale-safe
  // ============================================
  const fetchProjects = async () => {
    latestFetchIdRef.current += 1;
    const myId = latestFetchIdRef.current;

    const { data, error } = await supabase
      .from('projects')
      .select('name')
      .order('name', { ascending: true });

    if (myId !== latestFetchIdRef.current) return false;

    if (error) {
      console.error('Failed to load projects:', error);
      toast.error(error.message || 'Failed to load projects');
      return false;
    }

    setProjects(data || []);
    return true;
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchProjects();
      setLoading(false);
    })();
  }, []);

  // ============================================
  // HELPERS
  // ============================================
  const sortNames = (arr) =>
    [...arr].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );

  // ============================================
  // LIVE DUPLICATE CHECK
  // ============================================
  const trimmedNew = newName.trim();
  const lowerNew = trimmedNew.toLowerCase();

  const exactMatch = useMemo(() => {
    if (!lowerNew) return null;
    return projects.find((p) => p.name.toLowerCase() === lowerNew) || null;
  }, [projects, lowerNew]);

  const similarCodes = useMemo(() => {
    if (lowerNew.length < 2) return [];
    return projects.filter((p) => p.name.toLowerCase().includes(lowerNew));
  }, [projects, lowerNew]);

  // ============================================
  // ADD
  // ============================================
  const handleAdd = async () => {
    const name = trimmedNew;
    if (!name) {
      toast.error('Enter a project code');
      return;
    }
    if (exactMatch) {
      toast.error(`"${exactMatch.name}" already exists`);
      return;
    }
    if (busy) return;

    setBusy(true);
    try {
      const { data: inserted, error } = await supabase
        .from('projects')
        .insert({ name })
        .select();

      if (error) {
        if (error.code === '23505') {
          toast.error(`"${name}" already exists in the database`);
        } else {
          toast.error(error.message || 'Failed to add project');
        }
        await fetchProjects();
        return;
      }

      if (!inserted || inserted.length === 0) {
        toast.error('Add was blocked by the database. Check the INSERT policy.');
        await fetchProjects();
        return;
      }

      // Instant local state update
      setProjects((prev) => sortNames([...prev, { name }]));
      setNewName('');
      setSearch('');
      toast.success(`Added: ${name}`);

      // Silent background sync
      fetchProjects();
    } finally {
      setBusy(false);
    }
  };

  // ============================================
  // EDIT
  // ============================================
  const openEdit = (project) => {
    setEditing({ original: project.name });
    setEditName(project.name);
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    const next = editName.trim();
    const original = editing.original;

    if (!next) {
      toast.error('Name cannot be empty');
      return;
    }
    if (next === original) {
      setEditing(null);
      setEditName('');
      return;
    }

    const dupe = projects.find(
      (p) => p.name !== original && p.name.toLowerCase() === next.toLowerCase()
    );
    if (dupe) {
      toast.error('Another project already has this code');
      return;
    }

    if (busy) return;
    setBusy(true);
    try {
      const { data: updated, error } = await supabase
        .from('projects')
        .update({ name: next })
        .eq('name', original)
        .select();

      if (error) {
        if (error.code === '23505') {
          toast.error('Duplicate project code');
        } else {
          toast.error(error.message || 'Failed to update');
        }
        await fetchProjects();
        return;
      }

      if (!updated || updated.length === 0) {
        toast.error('Update was blocked by the database. Check the UPDATE policy.');
        await fetchProjects();
        return;
      }

      // Instant local state update
      setProjects((prev) =>
        sortNames(
          prev.map((p) => (p.name === original ? { name: next } : p))
        )
      );
      setEditing(null);
      setEditName('');
      toast.success('Updated');

      // Silent background sync
      fetchProjects();
    } finally {
      setBusy(false);
    }
  };

  // ============================================
  // DELETE — verifies the row was actually removed
  // ============================================
  const handleDelete = async () => {
    if (!deleting) return;
    const name = deleting.name;

    if (busy) return;
    setBusy(true);
    try {
      const { data: deleted, error } = await supabase
        .from('projects')
        .delete()
        .eq('name', name)
        .select();

      if (error) {
        console.error('Delete error:', error);
        toast.error(error.message || 'Failed to delete');
        await fetchProjects();
        return;
      }

      if (!deleted || deleted.length === 0) {
        console.error('Delete affected 0 rows for:', name);
        toast.error(
          `Could not delete "${name}". A database policy may be blocking it.`
        );
        setDeleting(null);
        await fetchProjects();
        return;
      }

      // Instant local state update
      setProjects((prev) => prev.filter((p) => p.name !== name));
      setDeleting(null);
      toast.success(`Deleted: ${name}`);

      // Silent background sync
      fetchProjects();
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error(err.message || 'Failed to delete');
      await fetchProjects();
    } finally {
      setBusy(false);
    }
  };

  // ============================================
  // FILTER
  // ============================================
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => p.name.toLowerCase().includes(q));
  }, [projects, search]);

  // ============================================
  // RENDER
  // ============================================
  return (
    <div
      style={{
        maxWidth: '480px',
        margin: '0 auto',
        minHeight: '100vh',
        backgroundColor: pageBg,
        paddingBottom: '120px',
        fontFamily: THEME.font,
      }}
    >
      {/* HEADER */}
      <div style={{ padding: '16px 16px 8px' }}>
        <div
          style={{
            background: dark
              ? 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)'
              : 'linear-gradient(135deg, #FFFFFF 0%, #F0FDF4 100%)',
            borderRadius: THEME.radius2xl,
            padding: '22px 20px 20px',
            boxShadow: dark ? THEME.shadowDark : THEME.shadowLg,
            border: `1px solid ${dark ? 'rgba(255,255,255,0.05)' : '#E6F5EE'}`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -60,
              right: -60,
              width: '160px',
              height: '160px',
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '14px',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: THEME.radiusMd,
                  background: dark ? '#0F172A' : '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  boxShadow: '0 4px 12px rgba(16,185,129,0.15)',
                  border: '1px solid #D1FAE5',
                }}
              >
                📁
              </div>
              <div>
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: 800,
                    color: textPrimary,
                    letterSpacing: '0.5px',
                    lineHeight: 1.1,
                  }}
                >
                  PROJECTS
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: THEME.primary,
                    letterSpacing: '3px',
                    marginTop: '3px',
                  }}
                >
                  MANAGE CODES
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/admin')}
              style={{
                padding: '8px 14px',
                borderRadius: THEME.radiusMd,
                border: `1px solid ${border}`,
                background: 'transparent',
                color: textSecondary,
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: THEME.font,
              }}
            >
              ← Back
            </button>
          </div>

          <div
            style={{
              fontSize: '11px',
              color: textMuted,
              fontWeight: 500,
              position: 'relative',
              zIndex: 1,
            }}
          >
            📊 {projects.length} project{projects.length === 1 ? '' : 's'} in the
            database
          </div>
        </div>
      </div>

      {/* ADD FORM */}
      <div style={{ padding: '0 16px 12px' }}>
        <div
          style={{
            background: cardBg,
            borderRadius: THEME.radiusLg,
            border: `1px solid ${border}`,
            boxShadow: cardShadow,
            padding: '16px',
          }}
        >
          <label
            style={{
              display: 'block',
              fontSize: '10px',
              fontWeight: 700,
              color: textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '6px',
            }}
          >
            Add Project Code
          </label>

          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
              }}
              placeholder="Type a code, e.g. Reliance"
              style={{
                flex: 1,
                padding: '12px 14px',
                borderRadius: THEME.radiusMd,
                border: `1px solid ${
                  exactMatch
                    ? THEME.red
                    : similarCodes.length > 0
                    ? THEME.amber
                    : border
                }`,
                background: pageBg,
                color: textPrimary,
                fontSize: '13px',
                fontWeight: 600,
                outline: 'none',
                fontFamily: THEME.font,
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease',
              }}
            />
            <button
              onClick={handleAdd}
              disabled={busy || !!exactMatch}
              style={{
                padding: '12px 20px',
                borderRadius: THEME.radiusMd,
                border: 'none',
                background:
                  busy || exactMatch
                    ? '#94A3B8'
                    : `linear-gradient(135deg, ${THEME.primary}, ${THEME.primaryDark})`,
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '13px',
                cursor: busy || exactMatch ? 'not-allowed' : 'pointer',
                boxShadow: busy || exactMatch ? 'none' : THEME.shadowGreen,
                fontFamily: THEME.font,
                letterSpacing: '0.3px',
                whiteSpace: 'nowrap',
              }}
            >
              {busy ? '…' : '+ Add'}
            </button>
          </div>

          {trimmedNew.length >= 2 && (
            <>
              {exactMatch && (
                <div
                  style={{
                    marginTop: '10px',
                    padding: '10px 12px',
                    borderRadius: THEME.radiusMd,
                    background: dark ? 'rgba(239,68,68,0.12)' : THEME.redSoft,
                    border: `1px solid ${THEME.red}40`,
                    color: THEME.red,
                    fontSize: '11px',
                    fontWeight: 700,
                    lineHeight: 1.4,
                  }}
                >
                  ⛔ <strong>Exact duplicate!</strong> "{exactMatch.name}" already
                  exists. Cannot add.
                </div>
              )}

              {!exactMatch && similarCodes.length > 0 && (
                <div
                  style={{
                    marginTop: '10px',
                    padding: '10px 12px',
                    borderRadius: THEME.radiusMd,
                    background: dark
                      ? 'rgba(245,158,11,0.12)'
                      : THEME.orangeSoft,
                    border: `1px solid ${THEME.amber}40`,
                  }}
                >
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      color: dark ? '#FDE68A' : '#B45309',
                      textTransform: 'uppercase',
                      letterSpacing: '0.4px',
                      marginBottom: '6px',
                    }}
                  >
                    ⚠️ {similarCodes.length} similar code
                    {similarCodes.length === 1 ? '' : 's'} already in DB
                  </div>
                  <div
                    style={{
                      maxHeight: '120px',
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    {similarCodes.slice(0, 6).map((p) => (
                      <div
                        key={p.name}
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: dark ? '#FDE68A' : '#78350F',
                          padding: '4px 0',
                          borderBottom: `1px dashed ${THEME.amber}30`,
                          wordBreak: 'break-word',
                        }}
                      >
                        📁 {p.name}
                      </div>
                    ))}
                    {similarCodes.length > 6 && (
                      <div
                        style={{
                          fontSize: '10px',
                          color: dark ? '#FDE68A' : '#78350F',
                          fontWeight: 700,
                          marginTop: '2px',
                        }}
                      >
                        + {similarCodes.length - 6} more...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!exactMatch && similarCodes.length === 0 && (
                <div
                  style={{
                    marginTop: '10px',
                    padding: '10px 12px',
                    borderRadius: THEME.radiusMd,
                    background: dark
                      ? 'rgba(16,185,129,0.10)'
                      : THEME.primarySoft,
                    border: `1px solid ${THEME.primary}40`,
                    color: THEME.primary,
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  ✅ No similar code found in the database
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* SEARCH */}
      <div style={{ padding: '0 16px 12px' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search all codes..."
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: THEME.radiusMd,
            border: `1px solid ${border}`,
            background: cardBg,
            color: textPrimary,
            fontSize: '13px',
            fontWeight: 600,
            outline: 'none',
            fontFamily: THEME.font,
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* COUNT */}
      <div
        style={{
          padding: '0 16px 8px',
          fontSize: '11px',
          color: textMuted,
          fontWeight: 600,
        }}
      >
        {filtered.length} of {projects.length} shown
      </div>

      {/* LIST */}
      <div style={{ padding: '0 16px 16px' }}>
        {loading ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 0',
              color: textSecondary,
            }}
          >
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              padding: '40px 24px',
              textAlign: 'center',
              background: cardBg,
              borderRadius: THEME.radiusLg,
              border: `1px solid ${border}`,
              boxShadow: cardShadow,
            }}
          >
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>📁</div>
            <p
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: textSecondary,
                margin: 0,
              }}
            >
              {search ? 'No matches found' : 'No projects yet'}
            </p>
            <p
              style={{
                fontSize: '11px',
                color: textMuted,
                marginTop: '4px',
                margin: 0,
              }}
            >
              {search ? 'Try a different search' : 'Add your first project above'}
            </p>
          </div>
        ) : (
          filtered.map((project) => (
            <div
              key={project.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 14px',
                marginBottom: '8px',
                background: cardBg,
                borderRadius: THEME.radiusMd,
                border: `1px solid ${border}`,
                boxShadow: cardShadow,
              }}
            >
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  background: THEME.primary + '18',
                  color: THEME.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                📁
              </div>
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: '12px',
                  fontWeight: 700,
                  color: textPrimary,
                  wordBreak: 'break-word',
                  lineHeight: 1.4,
                }}
              >
                {project.name}
              </div>

              <button
                onClick={() => openEdit(project)}
                title="Edit"
                disabled={busy}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: `1px solid ${THEME.primary}40`,
                  background: THEME.primary + '12',
                  color: THEME.primary,
                  cursor: busy ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  flexShrink: 0,
                  opacity: busy ? 0.5 : 1,
                }}
              >
                ✏️
              </button>

              <button
                onClick={() => setDeleting(project)}
                title="Delete"
                disabled={busy}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: `1px solid ${THEME.red}40`,
                  background: THEME.red + '12',
                  color: THEME.red,
                  cursor: busy ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  flexShrink: 0,
                  opacity: busy ? 0.5 : 1,
                }}
              >
                🗑️
              </button>
            </div>
          ))
        )}
      </div>

      {/* EDIT MODAL */}
      {editing && (
        <div
          onClick={() => !busy && (setEditing(null), setEditName(''))}
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(6px)',
            zIndex: 2000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: cardBg,
              borderRadius: THEME.radiusXl,
              padding: '24px',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
          >
            <h3
              style={{
                fontSize: '17px',
                fontWeight: 800,
                color: textPrimary,
                margin: '0 0 16px',
              }}
            >
              ✏️ Edit Project Code
            </h3>

            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit();
              }}
              autoFocus
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: THEME.radiusMd,
                border: `1px solid ${border}`,
                background: pageBg,
                color: textPrimary,
                fontSize: '13px',
                fontWeight: 600,
                outline: 'none',
                fontFamily: THEME.font,
                boxSizing: 'border-box',
                marginBottom: '16px',
              }}
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => !busy && (setEditing(null), setEditName(''))}
                disabled={busy}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: THEME.radiusMd,
                  border: `1px solid ${border}`,
                  background: 'transparent',
                  color: textSecondary,
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: busy ? 'not-allowed' : 'pointer',
                  fontFamily: THEME.font,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={busy}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: THEME.radiusMd,
                  border: 'none',
                  background: busy
                    ? '#94A3B8'
                    : `linear-gradient(135deg, ${THEME.primary}, ${THEME.primaryDark})`,
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: busy ? 'not-allowed' : 'pointer',
                  boxShadow: busy ? 'none' : THEME.shadowGreen,
                  fontFamily: THEME.font,
                }}
              >
                {busy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deleting && (
        <div
          onClick={() => !busy && setDeleting(null)}
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(6px)',
            zIndex: 2100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: cardBg,
              borderRadius: THEME.radiusXl,
              padding: '24px',
              maxWidth: '400px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
          >
            <span
              style={{ fontSize: '44px', display: 'block', marginBottom: '10px' }}
            >
              ⚠️
            </span>
            <h3
              style={{
                fontSize: '17px',
                fontWeight: 800,
                color: textPrimary,
                marginBottom: '8px',
              }}
            >
              Delete Project?
            </h3>
            <p
              style={{
                fontSize: '12px',
                color: textSecondary,
                marginBottom: '18px',
                lineHeight: 1.5,
              }}
            >
              Remove{' '}
              <strong style={{ color: textPrimary }}>{deleting.name}</strong>{' '}
              from the database? This cannot be undone.
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => !busy && setDeleting(null)}
                disabled={busy}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: THEME.radiusMd,
                  border: `1px solid ${border}`,
                  background: 'transparent',
                  color: textSecondary,
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: busy ? 'not-allowed' : 'pointer',
                  fontFamily: THEME.font,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={busy}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: THEME.radiusMd,
                  border: 'none',
                  background: busy
                    ? '#94A3B8'
                    : `linear-gradient(135deg, ${THEME.red}, #DC2626)`,
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: busy ? 'not-allowed' : 'pointer',
                  fontFamily: THEME.font,
                }}
              >
                {busy ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNavigation theme={theme} />
    </div>
  );
};

export default AdminProjects;