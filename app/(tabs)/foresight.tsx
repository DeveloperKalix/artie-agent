import { useCallback, useEffect, useRef } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import {
  ForesightEmptyScrollable,
  ForesightErrorState,
  ForesightList,
  ForesightLoadingState,
  ForesightRefreshBanner,
  useForesightRecommendations,
} from '@/components/foresight';

export default function ForesightScreen() {
  const {
    newItems,
    viewedItems,
    disclaimer,
    pendingNewsCount,
    status,
    errorMessage,
    refreshing,
    generating,
    toast,
    refetch,
    generate,
    markViewed,
    dismissToast,
  } = useForesightRecommendations();

  // Stable refs so useFocusEffect subscribes exactly once per focus, not per
  // identity change of the fetch/mark functions.
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;
  const markViewedRef = useRef(markViewed);
  markViewedRef.current = markViewed;

  useFocusEffect(
    useCallback(() => {
      void refetchRef.current();
    }, []),
  );

  // Auto-dismiss the toast after 2.5s.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(dismissToast, 2500);
    return () => clearTimeout(t);
  }, [toast, dismissToast]);

  const totalItems = newItems.length + viewedItems.length;
  const banner = (
    <ForesightRefreshBanner
      pendingNewsCount={pendingNewsCount}
      onRefresh={() => {
        void generate();
      }}
      generating={generating}
    />
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <View className="border-b border-slate-100 bg-slate-50 px-6 pb-3 pt-4">
        <Text className="text-2xl font-bold text-slate-900">Foresight</Text>
        <Text className="mt-1 text-sm text-slate-500">Recommendations from your agent</Text>
      </View>

      <View className="flex-1 px-4">
        {status === 'loading' && totalItems === 0 ? (
          <ForesightLoadingState />
        ) : status === 'error' && errorMessage && totalItems === 0 ? (
          <ForesightErrorState message={errorMessage} onRetry={refetch} />
        ) : totalItems === 0 ? (
          <ForesightEmptyScrollable
            onRefresh={refetch}
            refreshing={refreshing}
            disclaimer={disclaimer}
            headerBanner={banner}
          />
        ) : (
          <ForesightList
            newItems={newItems}
            viewedItems={viewedItems}
            onRefresh={refetch}
            refreshing={refreshing}
            disclaimer={disclaimer}
            onViewItem={(id) => {
              void markViewedRef.current(id);
            }}
            headerBanner={banner}
          />
        )}
      </View>

      {toast ? (
        <View
          pointerEvents="none"
          className="absolute bottom-4 left-4 right-4 items-center">
          <View className="rounded-full bg-slate-900 px-4 py-2 shadow-lg">
            <Text className="text-sm font-medium text-white">{toast}</Text>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
