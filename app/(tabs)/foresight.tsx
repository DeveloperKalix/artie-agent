import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ForesightEmptyScrollable,
  ForesightErrorState,
  ForesightList,
  useForesightRecommendations,
} from '@/components/foresight';

export default function ForesightScreen() {
  const { items, status, errorMessage, refreshing, refetch } = useForesightRecommendations();

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <View className="border-b border-slate-100 bg-slate-50 px-6 pb-3 pt-4">
        <Text className="text-2xl font-bold text-slate-900">Foresight</Text>
        <Text className="mt-1 text-sm text-slate-500">Recommendations from your agent</Text>
      </View>

      <View className="flex-1 px-4">
        {status === 'error' && errorMessage ? (
          <ForesightErrorState message={errorMessage} onRetry={refetch} />
        ) : items.length === 0 ? (
          <ForesightEmptyScrollable onRefresh={refetch} refreshing={refreshing} />
        ) : (
          <ForesightList data={items} onRefresh={refetch} refreshing={refreshing} />
        )}
      </View>
    </SafeAreaView>
  );
}
