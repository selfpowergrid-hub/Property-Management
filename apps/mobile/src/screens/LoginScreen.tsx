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
import { useAuth } from "../context/auth";
import { theme } from "../theme";

export function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("tenant@demo.test");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setLoading(true);
    setError(null);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) setError(error);
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.brand}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>N</Text>
        </View>
        <Text style={styles.title}>Nyumba360</Text>
        <Text style={styles.subtitle}>Tenant app</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Text style={styles.label}>Password</Text>
        <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />
        <TouchableOpacity style={styles.button} onPress={onSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign in</Text>}
        </TouchableOpacity>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, justifyContent: "center", padding: 24 },
  brand: { alignItems: "center", marginBottom: 32 },
  logo: { width: 56, height: 56, borderRadius: 12, backgroundColor: theme.green, alignItems: "center", justifyContent: "center" },
  logoText: { color: "#fff", fontSize: 28, fontWeight: "700" },
  title: { fontSize: 22, fontWeight: "700", marginTop: 12, color: theme.text },
  subtitle: { color: theme.muted, marginTop: 2 },
  card: { backgroundColor: theme.card, borderRadius: 14, padding: 20, elevation: 2 },
  label: { fontSize: 13, fontWeight: "600", color: "#3a4742", marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: theme.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  button: { backgroundColor: theme.green, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 20 },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  error: { marginTop: 12, color: theme.danger, textAlign: "center" },
});
