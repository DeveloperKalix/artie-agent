import { Text, View } from 'react-native';

import { tokens } from '@/styles/tokens';

export interface TagProps {
  /** Display text (default: NEW) */
  label?: string;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
}

/**
 * Small pill label — defaults use design tokens for “NEW”-style emphasis.
 */
export function Tag({
  label = 'NEW',
  backgroundColor = tokens.tag.new.background,
  textColor = tokens.tag.new.text,
  borderColor = tokens.tag.new.border,
}: TagProps) {
  return (
    <View
      className="rounded-full border px-2 py-0.5"
      style={{ backgroundColor, borderColor }}>
      <Text
        className="text-[10px] font-bold uppercase tracking-widest"
        style={{ color: textColor }}>
        {label}
      </Text>
    </View>
  );
}
