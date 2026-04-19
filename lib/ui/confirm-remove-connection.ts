import { ActionSheetIOS, Alert, Platform } from 'react-native';

/**
 * iOS: native action sheet. Android: Alert dialog.
 * Asks the user to confirm removing a linked financial connection.
 */
export function confirmRemoveConnection(
  title: string,
  message: string,
  destructiveLabel: string,
  onConfirm: () => void,
): void {
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['Cancel', destructiveLabel],
        cancelButtonIndex: 0,
        destructiveButtonIndex: 1,
        title,
        message,
      },
      (buttonIndex) => {
        if (buttonIndex === 1) onConfirm();
      },
    );
  } else {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: destructiveLabel, style: 'destructive', onPress: onConfirm },
    ]);
  }
}
