import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ActivityLogEmptyScrollable,
  ActivityLogErrorState,
  ActivityLogList,
  useActivityLog,
} from '@/components/activity-log';

export default function LogScreen() {
  const { items, status, errorMessage, refreshing, refetch } = useActivityLog();

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <View className="border-b border-slate-100 bg-slate-50 px-6 pb-3 pt-4">
        <Text className="text-2xl font-bold text-slate-900">Log</Text>
        <Text className="mt-1 text-sm text-slate-500">History and agent activity</Text>
      </View>

      <View className="flex-1 px-4">
        {status === 'error' && errorMessage ? (
          <ActivityLogErrorState message={errorMessage} onRetry={refetch} />
        ) : items.length === 0 ? (
          <ActivityLogEmptyScrollable onRefresh={refetch} refreshing={refreshing} />
        ) : (
          <ActivityLogList data={items} onRefresh={refetch} refreshing={refreshing} />
        )}
      </View>
    </SafeAreaView>
  );
}
