import { useCallback, useEffect, useState } from 'react';

import { alertError } from '@/lib/api/error-alert';
import { createSkill, deleteSkill, listSkills } from '@/lib/skills/api';
import type { MemoryNote } from '@/lib/skills/types';
import { useAuth } from '@/context/auth-context';

export type MemoryStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * Single-screen hook for the Memory manager. No provider — only one consumer.
 */
export function useMemoryNotes() {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const userId = session?.user?.id ?? null;

  const [notes, setNotes] = useState<MemoryNote[]>([]);
  const [status, setStatus] = useState<MemoryStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!token || !userId) {
      setNotes([]);
      setStatus('idle');
      return;
    }
    setStatus('loading');
    setError(null);
    const { data, error: err } = await listSkills(token, userId);
    if (err) {
      setError(err);
      setStatus('error');
      return;
    }
    setNotes(data?.notes ?? []);
    setStatus('success');
  }, [token, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addNote = useCallback(
    async (content: string): Promise<boolean> => {
      const trimmed = content.trim();
      if (!trimmed || !token || !userId) return false;
      setSaving(true);
      const { data, error: err } = await createSkill(token, userId, { content: trimmed });
      setSaving(false);
      if (err || !data) {
        alertError('Could not save note', err ?? 'Unknown error');
        return false;
      }
      if (data.note && data.kind === 'note_appended') {
        // Optimistic insert at the top (backend orders newest-first).
        setNotes((prev) => [data.note as MemoryNote, ...prev]);
      } else {
        // For `level_updated` / `invalid` there's no row to insert; just refresh.
        await refresh();
      }
      return true;
    },
    [token, userId, refresh],
  );

  const removeNote = useCallback(
    async (noteId: string): Promise<boolean> => {
      if (!token || !userId) return false;
      const previous = notes;
      // Optimistic remove
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      const { error: err } = await deleteSkill(token, userId, noteId);
      if (err) {
        setNotes(previous);
        alertError('Could not delete note', err);
        return false;
      }
      return true;
    },
    [token, userId, notes],
  );

  return {
    notes,
    status,
    error,
    saving,
    refresh,
    addNote,
    removeNote,
  };
}
