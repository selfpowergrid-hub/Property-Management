import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { ROLE_LABELS, type UserRole } from "@nyumba360/shared";
import { supabase } from "./src/lib/supabase";

/**
 * Phase 1 mobile skeleton: a login stub that proves the Expo app consumes the
 * shared workspace packages and the typed Supabase client. The full tenant app
 * (portal parity, push, offline cache) is built in Phase 4 (PRD §7.2, §12).
 */
export default function App() {
  const [email, setEmail] = useState("tenant@demo.test");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function signIn() {
    setLoading(true);
    setMessage(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }
    const role = data.user?.app_metadata?.user_role as UserRole | undefined;
    setMessage(role ? `Signed in as ${ROLE_LABELS[role]}` : "Signed in.");
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style="light" />
      <View style={styles.brand}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>N</Text>
        </View>
        <Text style={styles.title}>Nyumba360</Text>
        <Text style={styles.subtitle}>Tenant app</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Text style={styles.label}>Password</Text>
        <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />

        <TouchableOpacity style={styles.button} onPress={signIn} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign in</Text>
          )}
        </TouchableOpacity>

        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const GREEN = "#147a55";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f7f6", justifyContent: "center", padding: 24 },
  brand: { alignItems: "center", marginBottom: 32 },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { color: "#fff", fontSize: 28, fontWeight: "700" },
  title: { fontSize: 22, fontWeight: "700", marginTop: 12, color: "#10241c" },
  subtitle: { color: "#5b6b64", marginTop: 2 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  label: { fontSize: 13, fontWeight: "600", color: "#3a4742", marginBottom: 6, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#dbe3df",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  button: {
    backgroundColor: GREEN,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  message: { marginTop: 14, color: "#3a4742", textAlign: "center" },
});
