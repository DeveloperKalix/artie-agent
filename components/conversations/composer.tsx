import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';

import { tokens } from '@/styles/tokens';

interface ComposerProps {
  onSendText: (text: string) => void | Promise<void>;
  onSendVoice: (uri: string) => void | Promise<void>;
  disabled?: boolean;
  pending?: boolean;
}

/**
 * Text + mic composer. Extracted from the previous single-screen Agent tab so
 * it can be dropped into other chat surfaces later without duplication.
 *
 * - Voice path captures with `expo-audio` `HIGH_QUALITY` preset and hands the
 *   file URI to `onSendVoice`; the caller owns the multipart upload.
 * - Text path drains the input and forwards to `onSendText`.
 */
export function Composer({
  onSendText,
  onSendVoice,
  disabled = false,
  pending = false,
}: ComposerProps) {
  const [text, setText] = useState('');
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const isRecording = recorderState.isRecording;

  const isEmpty = text.trim().length === 0;

  const submitText = useCallback(async () => {
    if (isEmpty || disabled || pending) return;
    const value = text;
    setText('');
    Keyboard.dismiss();
    try {
      await onSendText(value);
    } catch (e) {
      // Restore the user's text so they don't lose it on unexpected errors.
      setText(value);
      const msg = e instanceof Error ? e.message : 'Could not send message';
      Alert.alert('Send', msg);
    }
  }, [text, isEmpty, disabled, pending, onSendText]);

  const toggleMic = useCallback(async () => {
    if (disabled || pending) return;

    if (isRecording) {
      try {
        await audioRecorder.stop();
        const uri = audioRecorder.uri;
        await setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
        });
        if (uri) {
          Keyboard.dismiss();
          await onSendVoice(uri);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Could not stop recording';
        Alert.alert('Recording', msg);
      }
      return;
    }

    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert(
          'Microphone',
          'Please allow microphone access in Settings to record voice commands.',
        );
        return;
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not start recording';
      Alert.alert('Recording', msg);
    }
  }, [audioRecorder, isRecording, disabled, pending, onSendVoice]);

  return (
    <View style={styles.column}>
      {isRecording ? (
        <View style={styles.recordingBanner}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>Recording… tap mic again to stop</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="Type a command or question…"
          placeholderTextColor="#94a3b8"
          multiline
          value={text}
          onChangeText={setText}
          textAlignVertical="top"
          editable={!disabled}
        />
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.iconBtn, isRecording && styles.iconBtnActive]}
            activeOpacity={0.7}
            accessibilityLabel={isRecording ? 'Stop recording' : 'Record voice'}
            onPress={() => void toggleMic()}
            disabled={disabled || pending}>
            <Ionicons
              name={isRecording ? 'stop' : 'mic'}
              size={24}
              color={isRecording ? '#dc2626' : '#475569'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sendBtn,
              {
                backgroundColor: tokens.color.brandTeal,
                opacity: isEmpty || disabled || pending ? 0.5 : 1,
              },
            ]}
            activeOpacity={0.85}
            onPress={() => void submitText()}
            disabled={isEmpty || disabled || pending}>
            {pending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendLabel}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    flexShrink: 0,
    paddingBottom: 8,
  },
  recordingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
    gap: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#dc2626',
  },
  recordingText: {
    fontSize: 13,
    color: '#64748b',
    flex: 1,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    padding: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  input: {
    minHeight: 100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#0f172a',
  },
  actions: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  iconBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
  },
  iconBtnActive: {
    backgroundColor: '#fef2f2',
  },
  sendBtn: {
    marginLeft: 12,
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendLabel: {
    fontWeight: '600',
    fontSize: 16,
    color: '#fff',
  },
});
