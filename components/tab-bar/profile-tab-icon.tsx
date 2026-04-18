import { View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { useUserProfile } from '@/hooks/use-user-profile';
import { tokens } from '@/styles/tokens';

const SIZE = 28;

type Props = {
  focused: boolean;
};

export function ProfileTabIcon({ focused }: Props) {
  const { avatarUrl } = useUserProfile();

  return (
    <View
      className="items-center justify-center rounded-full border-2 bg-slate-100"
      style={{
        width: SIZE + 4,
        height: SIZE + 4,
        borderColor: focused ? tokens.color.brandTealDark : '#e2e8f0',
      }}>
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: SIZE, height: SIZE, borderRadius: SIZE / 2 }}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View className="h-[28px] w-[28px] items-center justify-center rounded-full bg-slate-200">
          <Ionicons name="person" size={18} color="#64748b" />
        </View>
      )}
    </View>
  );
}
