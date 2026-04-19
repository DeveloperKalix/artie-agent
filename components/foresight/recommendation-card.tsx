import { Pressable, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import type { Recommendation } from '@/components/foresight/foresight-types';
import { RecommendationIcon } from '@/components/foresight/recommendation-icon';
import { Tag } from '@/components/tag';
import { tokens } from '@/styles/tokens';

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
    <View className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <View className="flex-row">
        <RecommendationIcon action={item.action} />
        <View className="ml-3 flex-1 justify-center">
          <View className="flex-row items-start justify-between gap-2">
            <Text
              className="flex-1 text-base font-semibold leading-snug text-slate-900"
              numberOfLines={3}>
              {item.title}
            </Text>
            {!item.viewed ? <Tag /> : null}
          </View>
          <Text className="mt-1.5 text-xs text-slate-500">{formatTimestamp(item.timestamp)}</Text>
        </View>
      </View>

      {item.explanation ? (
        <Text className="mt-3 text-sm leading-relaxed text-slate-600">{item.explanation}</Text>
      ) : null}

      {item.supporting_articles && item.supporting_articles.length > 0 ? (
        <View className="mt-3 flex-row flex-wrap gap-1.5">
          {item.supporting_articles.map((article, idx) => (
            <Pressable
              key={article.id ?? `${article.url}-${idx}`}
              onPress={() => void WebBrowser.openBrowserAsync(article.url)}
              className="max-w-full flex-row items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 active:opacity-75"
              accessibilityLabel={`Open article: ${article.title}`}>
              <Text
                className="max-w-[220px] text-[11px] font-medium"
                numberOfLines={1}
                style={{ color: tokens.color.brandTealDark }}>
                {article.title}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
