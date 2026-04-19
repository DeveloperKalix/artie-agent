import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { alertError } from '@/lib/api/error-alert';
import { getProfile, patchProfile } from '@/lib/profile/api';
import type { ExperienceLevel } from '@/lib/profile/types';
import { useAuth } from '@/context/auth-context';
import { tokens } from '@/styles/tokens';

const LEVELS: { id: ExperienceLevel; label: string }[] = [
  { id: 'novice', label: 'Novice' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'veteran', label: 'Veteran' },
];

/**
 * Segmented control for `experience_level`. Reads once on mount, writes on
 * change. Local state only — the agent re-reads the profile on every turn, so
 * no provider is needed.
 */
export function ExperienceLevelSegmented() {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const userId = session?.user?.id ?? null;

  const [level, setLevel] = useState<ExperienceLevel | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<ExperienceLevel | null>(null);

  useEffect(() => {
    if (!token || !userId) {
      setLevel(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await getProfile(token, userId);
      if (!cancelled) {
        if (error) alertError('Could not load profile', error);
        setLevel(data?.experience_level ?? null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, userId]);

  const select = useCallback(
    async (next: ExperienceLevel) => {
      if (!token || !userId || next === level || saving) return;
      const previous = level;
      setLevel(next);
      setSaving(next);
      const { data, error } = await patchProfile(token, userId, { experience_level: next });
      setSaving(null);
      if (error || !data) {
        setLevel(previous);
        alertError('Could not update experience level', error ?? 'Unknown error');
        return;
      }
      setLevel(data.experience_level);
    },
    [token, userId, level, saving],
  );

  return (
    <View style={s.card}>
      <View style={s.header}>
        <Text style={s.title}>Experience level</Text>
        <Text style={s.subtitle}>
          Artie tailors explanations and risk framing to your level.
        </Text>
      </View>

      {loading ? (
        <View style={s.loading}>
          <ActivityIndicator color={tokens.color.brandTealDark} />
        </View>
      ) : (
        <View style={s.segmented}>
          {LEVELS.map((opt) => {
            const isActive = level === opt.id;
            const isBusy = saving === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[s.segment, isActive && s.segmentActive]}
                activeOpacity={0.8}
                onPress={() => void select(opt.id)}
                disabled={saving !== null}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}>
                {isBusy ? (
                  <ActivityIndicator size="small" color={isActive ? '#fff' : '#475569'} />
                ) : (
                  <Text style={[s.segmentLabel, isActive && s.segmentLabelActive]}>
                    {opt.label}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  header: { marginBottom: 12 },
  title: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  subtitle: { marginTop: 2, fontSize: 13, color: '#64748b' },
  loading: { paddingVertical: 12, alignItems: 'center' },
  segmented: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: tokens.color.brandTealDark,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentLabel: { fontSize: 14, fontWeight: '600', color: '#475569' },
  segmentLabelActive: { color: '#ffffff' },
});
