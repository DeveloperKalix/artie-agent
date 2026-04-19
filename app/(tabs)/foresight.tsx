import { useCallback, useRef } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import {
  ForesightEmptyScrollable,
  ForesightErrorState,
  ForesightList,
  ForesightLoadingState,
  useForesightRecommendations,
} from '@/components/foresight';

export default function ForesightScreen() {
  const { items, status, errorMessage, disclaimer, refreshing, refetch } =
    useForesightRecommendations();

  // Keep a stable ref to refetch so useFocusEffect only subscribes once per
  // mount. Without this, a new refetch identity (caused by token/userId
  // changing after the initial render) would re-subscribe the effect, trigger
  // a second fetch, advance the news cursor, and make subsequent calls return
  // empty results.
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useFocusEffect(
    useCallback(() => {
      void refetchRef.current();
    }, []), // empty deps — intentional: we want one fetch per focus, not per refetch identity
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <View className="border-b border-slate-100 bg-slate-50 px-6 pb-3 pt-4">
        <Text className="text-2xl font-bold text-slate-900">Foresight</Text>
        <Text className="mt-1 text-sm text-slate-500">Recommendations from your agent</Text>
      </View>

      <View className="flex-1 px-4">
        {status === 'loading' && items.length === 0 ? (
          <ForesightLoadingState />
        ) : status === 'error' && errorMessage && items.length === 0 ? (
          <ForesightErrorState message={errorMessage} onRetry={refetch} />
        ) : items.length === 0 ? (
          <ForesightEmptyScrollable
            onRefresh={refetch}
            refreshing={refreshing}
            disclaimer={disclaimer}
          />
        ) : (
          <ForesightList
            data={items}
            onRefresh={refetch}
            refreshing={refreshing}
            disclaimer={disclaimer}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
