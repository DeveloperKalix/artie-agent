import { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';

import { tokens } from '@/styles/tokens';
import { AuraGlow } from '@/styles/animations/aura-glow';

export default function AgentScreen() {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);

  const isEmpty = text.trim().length === 0;
  const isRecording = recorderState.isRecording;

  const toggleMic = useCallback(async () => {
    if (isRecording) {
      try {
        const durationMs = audioRecorder.getStatus().durationMillis;
        await audioRecorder.stop();
        const uri = audioRecorder.uri;
        await setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
        });
        if (uri) {
          Alert.alert(
            'Voice captured',
            `Recorded about ${Math.round(durationMs / 1000) || 0}s. Sending voice to the agent is not wired yet; the file is on device.`,
            [{ text: 'OK' }],
          );
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
  }, [audioRecorder, isRecording]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0}>
        <View style={styles.inner}>
          <Text style={styles.title}>Agent</Text>
          <Text style={styles.subtitle}>Send audio or text to your AI assistant.</Text>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}>
            {isEmpty && (
              <View style={styles.hero}>
                <View
                  style={{
                    width: tokens.aura.haloContainerSize,
                    height: tokens.aura.haloContainerSize,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <AuraGlow />
                  <Image
                    source={require('../../assets/images/artie-favicon.png')}
                    style={styles.favicon}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.heroTitle}>What can I help with?</Text>
                <Text style={styles.heroSub}>Type a message or tap the mic below.</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.inputColumn}>
            {isRecording ? (
              <View style={styles.recordingBanner}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>Recording… tap mic again to stop</Text>
              </View>
            ) : null}
            <View style={styles.inputCard}>
              <TextInput
                style={styles.textInput}
                placeholder="Type a command or question…"
                placeholderTextColor="#94a3b8"
                multiline
                value={text}
                onChangeText={setText}
                textAlignVertical="top"
              />
              <View style={styles.inputActions}>
                <TouchableOpacity
                  style={[styles.iconBtn, isRecording && styles.iconBtnActive]}
                  activeOpacity={0.7}
                  accessibilityLabel={isRecording ? 'Stop recording' : 'Record voice'}
                  onPress={() => void toggleMic()}>
                  <Ionicons
                    name={isRecording ? 'stop' : 'mic'}
                    size={24}
                    color={isRecording ? '#dc2626' : '#475569'}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sendBtn, { backgroundColor: tokens.color.brandTeal }]}
                  activeOpacity={0.85}
                  onPress={() => {}}>
                  <Text style={styles.sendLabel}>Send</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  keyboardRoot: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 15,
    color: '#64748b',
  },
  scroll: {
    flex: 1,
    minHeight: 120,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 8,
  },
  hero: {
    flex: 1,
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  favicon: {
    width: 96,
    height: 96,
  },
  heroTitle: {
    marginTop: 24,
    fontSize: 17,
    fontWeight: '600',
    color: '#334155',
  },
  heroSub: {
    marginTop: 6,
    fontSize: 14,
    color: '#94a3b8',
  },
  inputColumn: {
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
  inputCard: {
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
  textInput: {
    minHeight: 100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#0f172a',
  },
  inputActions: {
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
