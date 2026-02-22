import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState, type ComponentProps } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { getRedirectUri, startOAuthLogin } from "@/constants/oauth";
import { useColors } from "@/hooks/use-colors";
import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { appLogger } from "@/lib/_core/logger";
import { markOnboardingCompleted } from "@/lib/_core/onboarding";
import { toAuthUser } from "@/lib/_core/session-user";
import { getSupabaseClient, isSupabaseAuthEnabled } from "@/lib/supabase/client";

type AuthMode = "login" | "signup";

function normalizeMode(value: unknown): AuthMode {
  if (value === "signup") return "signup";
  return "login";
}

export default function AuthScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const colors = useColors();

  const normalizedMode = normalizeMode(params.mode);
  const [mode, setMode] = useState<AuthMode>(normalizedMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const supabaseEnabled = isSupabaseAuthEnabled();

  const isSignup = mode === "signup";

  useEffect(() => {
    setMode(normalizedMode);
  }, [normalizedMode]);

  const handleModeChange = (nextMode: AuthMode) => {
    setMode(nextMode);
    setNotice(null);
    setErrorMessage(null);
  };

  const completeSession = async (accessToken: string) => {
    await Auth.setSessionToken(accessToken);
    const apiUser = await Api.getMe();

    if (apiUser) {
      await Auth.setUserInfo(toAuthUser(apiUser));
    }

    await markOnboardingCompleted();
    router.replace("/(tabs)");
  };

  const validate = (): boolean => {
    if (!email.trim()) {
      setErrorMessage("Informe seu e-mail.");
      return false;
    }
    if (!password) {
      setErrorMessage("Informe sua senha.");
      return false;
    }
    if (password.length < 6) {
      setErrorMessage("A senha precisa ter pelo menos 6 caracteres.");
      return false;
    }

    if (isSignup) {
      if (!name.trim()) {
        setErrorMessage("Informe seu nome.");
        return false;
      }
      if (password !== confirmPassword) {
        setErrorMessage("As senhas nao conferem.");
        return false;
      }
    }

    return true;
  };

  const submitSupabase = async () => {
    if (!validate()) return;

    setBusy(true);
    setNotice(null);
    setErrorMessage(null);

    try {
      const supabase = getSupabaseClient();
      const trimmedEmail = email.trim().toLowerCase();

      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            emailRedirectTo: getRedirectUri(),
            data: {
              name: name.trim(),
              full_name: name.trim(),
            },
          },
        });

        if (error) {
          throw error;
        }

        if (data.session?.access_token) {
          await completeSession(data.session.access_token);
          return;
        }

        setNotice(
          "Conta criada. Enviamos um e-mail de confirmacao. Abra o link para validar sua conta e depois faca login.",
        );
        setMode("login");
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        throw error;
      }

      const accessToken = data.session?.access_token;
      if (!accessToken) {
        throw new Error("Nenhuma sessao foi retornada.");
      }

      await completeSession(accessToken);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha na autenticacao.";
      appLogger.warn("auth.email_password_failed", { message, mode });

      if (/email.*confirm/i.test(message) || /Email not confirmed/i.test(message)) {
        setErrorMessage("Seu e-mail ainda nao foi confirmado. Use o link enviado por e-mail.");
      } else {
        setErrorMessage(message);
      }
    } finally {
      setBusy(false);
    }
  };

  const resendConfirmation = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      Alert.alert("Reenviar confirmacao", "Informe o e-mail cadastrado.");
      return;
    }

    setResending(true);
    setErrorMessage(null);
    setNotice(null);

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: trimmedEmail,
        options: {
          emailRedirectTo: getRedirectUri(),
        },
      });

      if (error) {
        throw error;
      }

      setNotice("Enviamos um novo e-mail de confirmacao. Verifique sua caixa de entrada.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao foi possivel reenviar o e-mail.";
      appLogger.warn("auth.resend_confirmation_failed", { message });
      setErrorMessage(message);
    } finally {
      setResending(false);
    }
  };

  const startLegacyOAuthFallback = async () => {
    const loginUrl = await startOAuthLogin();
    if (loginUrl) return;
    Alert.alert("Autenticacao indisponivel", "Ative o Supabase Auth ou configure o provedor legado.");
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} className="px-5 pb-6">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.logoBlock, { backgroundColor: colors.primary }]}>
              <Text style={[styles.logoLetter, { color: colors.background }]}>N</Text>
            </View>
            <Text style={[styles.heroTitle, { color: colors.foreground }]}>Acesse sua conta</Text>
            <Text style={[styles.heroSubtitle, { color: colors.muted }]}>Entre ou crie sua conta em poucos segundos.</Text>
          </View>

          <View style={[styles.segmented, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SegmentButton
              active={mode === "login"}
              label="Entrar"
              onPress={() => handleModeChange("login")}
              colors={{ foreground: colors.foreground, primary: colors.primary, surface: colors.surface, border: colors.border, background: colors.background }}
            />
            <SegmentButton
              active={mode === "signup"}
              label="Cadastrar"
              onPress={() => handleModeChange("signup")}
              colors={{ foreground: colors.foreground, primary: colors.primary, surface: colors.surface, border: colors.border, background: colors.background }}
            />
          </View>

          <View style={styles.form}>
            {isSignup && (
              <Field
                label="Nome"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                placeholder="Seu nome"
                colors={colors}
              />
            )}

            <Field
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              placeholder="voce@email.com"
              colors={colors}
            />

            <Field
              label="Senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType={isSignup ? "newPassword" : "password"}
              placeholder={isSignup ? "Minimo de 6 caracteres" : "Sua senha"}
              colors={colors}
            />

            {isSignup && (
              <Field
                label="Confirmar senha"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
                placeholder="Repita a senha"
                colors={colors}
              />
            )}
          </View>

          {isSignup && (
            <Text style={[styles.helpText, { color: colors.muted }]}>
              Apos o cadastro, voce recebera um e-mail de confirmacao para validar a conta.
            </Text>
          )}

          {notice && (
            <View style={[styles.messageBox, { backgroundColor: `${colors.success}12`, borderColor: `${colors.success}55` }]}>
              <Text style={[styles.messageText, { color: colors.foreground }]}>{notice}</Text>
            </View>
          )}

          {errorMessage && (
            <View style={[styles.messageBox, { backgroundColor: `${colors.error}10`, borderColor: `${colors.error}50` }]}>
              <Text style={[styles.messageText, { color: colors.error }]}>{errorMessage}</Text>
            </View>
          )}

          {!supabaseEnabled && (
            <View style={[styles.messageBox, { backgroundColor: `${colors.warning}12`, borderColor: `${colors.warning}55` }]}>
              <Text style={[styles.messageText, { color: colors.foreground }]}>Supabase Auth nao esta habilitado neste build.</Text>
              <Pressable onPress={() => void startLegacyOAuthFallback()} style={styles.inlineAction}>
                <Text style={[styles.inlineActionText, { color: colors.primary }]}>Usar login legado</Text>
              </Pressable>
            </View>
          )}

          <Pressable
            disabled={busy || !supabaseEnabled}
            onPress={() => void submitSupabase()}
            style={({ pressed }) => [
              styles.submitButton,
              {
                backgroundColor: colors.primary,
                opacity: busy || !supabaseEnabled ? 0.55 : pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.99 : 1 }],
              },
            ]}
          >
            {busy ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={[styles.submitLabel, { color: colors.background }]}>{isSignup ? "Criar conta" : "Entrar"}</Text>
            )}
          </Pressable>

          <View style={styles.bottomRow}>
            <Text style={[styles.bottomHint, { color: colors.muted }]}>Nao recebeu o e-mail?</Text>
            <Pressable disabled={resending || busy} onPress={() => void resendConfirmation()}>
              <Text style={[styles.bottomAction, { color: resending ? colors.muted : colors.primary }]}>
                {resending ? "Reenviando..." : "Reenviar confirmacao"}
              </Text>
            </Pressable>
          </View>

          <Pressable onPress={() => router.replace("/(tabs)")} style={styles.backAction}>
            <Text style={[styles.backText, { color: colors.muted }]}>Voltar</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

type SegmentPalette = {
  foreground: string;
  primary: string;
  surface: string;
  border: string;
  background: string;
};

function SegmentButton({
  active,
  label,
  onPress,
  colors,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  colors: SegmentPalette;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.segmentButton,
        {
          backgroundColor: active ? colors.primary : colors.surface,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text style={[styles.segmentLabel, { color: active ? colors.background : colors.foreground }]}>{label}</Text>
    </Pressable>
  );
}

function Field({
  label,
  colors,
  ...props
}: {
  label: string;
  colors: { foreground: string; muted: string; surface: string; border: string };
} & ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        style={[
          styles.fieldInput,
          {
            color: colors.foreground,
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 10,
    gap: 14,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  logoBlock: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  logoLetter: {
    fontSize: 28,
    fontWeight: "700",
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  segmented: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 4,
    flexDirection: "row",
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  form: {
    gap: 12,
  },
  fieldWrap: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  helpText: {
    fontSize: 13,
    lineHeight: 18,
  },
  messageBox: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
  },
  inlineAction: {
    alignSelf: "flex-start",
  },
  inlineActionText: {
    fontSize: 13,
    fontWeight: "700",
  },
  submitButton: {
    borderRadius: 16,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  submitLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  bottomHint: {
    fontSize: 13,
  },
  bottomAction: {
    fontSize: 13,
    fontWeight: "700",
  },
  backAction: {
    alignItems: "center",
    paddingVertical: 8,
  },
  backText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
