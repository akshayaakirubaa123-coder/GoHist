import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';

type Mode = 'sign-in' | 'create';

/** Sign in, or create an account so your passport follows you to any phone. */
export default function SignInScreen() {
  const { available, signIn, signUp } = useAuth();
  const theme = useTheme();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();

  const inputStyle = [styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }];
  const canSubmit = email.trim() !== '' && password.length >= 6 && (mode === 'sign-in' || name.trim() !== '');

  const submit = async () => {
    setBusy(true);
    setMessage(undefined);
    if (mode === 'sign-in') {
      const error = await signIn(email, password);
      setBusy(false);
      if (error) setMessage(error);
      else router.back();
    } else {
      const { error, needsConfirmation } = await signUp(email, password, name);
      setBusy(false);
      if (error) setMessage(error);
      else if (needsConfirmation) {
        setMode('sign-in');
        setMessage('Check your email for a link to confirm your account, then sign in here.');
      } else router.back();
    }
  };

  if (!available) {
    return (
      <ThemedView style={[styles.container, styles.padded]}>
        <ThemedText type="small" themeColor="textSecondary">
          Accounts aren&apos;t switched on in this version of GoHist yet. Your passport is still saved on
          this phone.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.padded} keyboardShouldPersistTaps="handled">
          <View style={styles.tabs} accessibilityRole="tablist">
            {(['sign-in', 'create'] as const).map((option) => {
              const selected = option === mode;
              return (
                <Pressable
                  key={option}
                  style={styles.tab}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setMode(option);
                    setMessage(undefined);
                  }}>
                  <ThemedView type={selected ? 'backgroundSelected' : 'backgroundElement'} style={styles.tabInner}>
                    <ThemedText type={selected ? 'smallBold' : 'small'}>
                      {option === 'sign-in' ? 'Sign in' : 'Create account'}
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              );
            })}
          </View>

          <ThemedText type="small" themeColor="textSecondary">
            {mode === 'sign-in'
              ? 'Welcome back. Your passport and map will be copied to this phone.'
              : 'Your account keeps your passport and visited-places map safe, and brings them to any phone you sign in on.'}
          </ThemedText>

          {mode === 'create' ? (
            <TextInput
              style={inputStyle}
              placeholder="Your name"
              placeholderTextColor={theme.textSecondary}
              value={name}
              onChangeText={setName}
              autoComplete="name"
              textContentType="name"
            />
          ) : null}
          <TextInput
            style={inputStyle}
            placeholder="Email"
            placeholderTextColor={theme.textSecondary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <TextInput
            style={inputStyle}
            placeholder={mode === 'create' ? 'Password (at least 6 characters)' : 'Password'}
            placeholderTextColor={theme.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
            textContentType={mode === 'create' ? 'newPassword' : 'password'}
            onSubmitEditing={canSubmit ? submit : undefined}
          />

          {message ? <ThemedText type="small">{message}</ThemedText> : null}

          <Pressable
            accessibilityRole="button"
            disabled={!canSubmit || busy}
            onPress={submit}
            style={[styles.button, { backgroundColor: theme.text, opacity: canSubmit && !busy ? 1 : 0.4 }]}>
            {busy ? (
              <ActivityIndicator color={theme.background} />
            ) : (
              <ThemedText type="smallBold" style={{ color: theme.background }}>
                {mode === 'sign-in' ? 'Sign in' : 'Create account'}
              </ThemedText>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  padded: {
    gap: Spacing.three,
    padding: Spacing.three,
  },
  tabs: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  tab: {
    flex: 1,
  },
  tabInner: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  input: {
    fontSize: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    borderRadius: Spacing.three,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: Spacing.three,
  },
});
