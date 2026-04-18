import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LogScreen() {
  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <View className="flex-1 px-6 pt-4">
        <Text className="text-2xl font-bold text-slate-900">Log</Text>
        <Text className="mt-2 text-slate-500">
          Activity and history will show here.
        </Text>
      </View>
    </SafeAreaView>
  );
}
