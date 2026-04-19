import { Text, View } from 'react-native';

import type { Recommendation } from '@/components/foresight/foresight-types';
import { RecommendationIcon } from '@/components/foresight/recommendation-icon';
import { Tag } from '@/components/tag';

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

interface RecommendationCardProps {
  item: Recommendation;
}

export function RecommendationCard({ item }: RecommendationCardProps) {
  return (
    <View className="flex-row rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <RecommendationIcon action={item.action} />
      <View className="ml-3 flex-1 justify-center">
        <View className="flex-row items-start justify-between gap-2">
          <Text className="flex-1 text-base font-semibold leading-snug text-slate-900" numberOfLines={3}>
            {item.title}
          </Text>
          {!item.viewed ? <Tag /> : null}
        </View>
        <Text className="mt-1.5 text-xs text-slate-500">{formatTimestamp(item.timestamp)}</Text>
      </View>
    </View>
  );
}
