import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { enumLabel, formatDate } from "@nyumba360/shared";
import type { MaintenanceRequest } from "@nyumba360/supabase";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/auth";
import { theme } from "../theme";

type Row = Pick<MaintenanceRequest, "id" | "category" | "description" | "status" | "created_at">;

export function MaintenanceScreen() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("maintenance_requests")
      .select("id, category, description, status, created_at")
      .order("created_at", { ascending: false });
    setRows(data ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function pickPhoto() {
    const res = await ImagePicker.launchCameraAsync({ quality: 0.6 }).catch(() =>
      ImagePicker.launchImageLibraryAsync({ quality: 0.6 }),
    );
    if (res && !res.canceled && res.assets[0]) setPhotoUri(res.assets[0].uri);
  }

  async function submit() {
    if (!user || category.trim().length < 2 || description.trim().length < 3) {
      Alert.alert("Please enter a category and description.");
      return;
    }
    setSubmitting(true);
    const orgId = (user.app_metadata as { org_id?: string } | undefined)?.org_id ?? "";

    const { data: tenant } = await supabase.from("tenants").select("id").eq("user_id", user.id).maybeSingle();
    const { data: lease } = await supabase
      .from("leases")
      .select("unit_id")
      .eq("tenant_id", tenant?.id ?? "")
      .eq("status", "active")
      .maybeSingle();

    if (!tenant || !lease) {
      setSubmitting(false);
      Alert.alert("No active lease found on your account.");
      return;
    }

    const { data: created, error } = await supabase
      .from("maintenance_requests")
      .insert({
        org_id: orgId,
        unit_id: lease.unit_id,
        tenant_id: tenant.id,
        category: category.trim(),
        description: description.trim(),
        status: "new",
        priority: "medium",
      })
      .select("id")
      .single();

    if (!error && created && photoUri) {
      try {
        const blob = await (await fetch(photoUri)).blob();
        const path = `${orgId}/maintenance/${created.id}/photo.jpg`;
        await supabase.storage.from("maintenance-photos").upload(path, blob, { contentType: "image/jpeg" });
      } catch {
        // ignore photo failures
      }
    }

    setSubmitting(false);
    if (error) {
      Alert.alert("Could not submit", error.message);
      return;
    }
    setCategory("");
    setDescription("");
    setPhotoUri(null);
    load();
  }

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={rows}
      keyExtractor={(r) => r.id}
      ListHeaderComponent={
        <View style={styles.form}>
          <Text style={styles.formTitle}>New request</Text>
          <TextInput style={styles.input} placeholder="Category (Plumbing…)" value={category} onChangeText={setCategory} />
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Describe the issue"
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <View style={styles.actions}>
            <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
              <Text style={styles.photoBtnText}>{photoUri ? "Photo added ✓" : "Add photo"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit</Text>}
            </TouchableOpacity>
          </View>
        </View>
      }
      ListEmptyComponent={<Text style={styles.empty}>No requests yet.</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.left}>
            <Text style={styles.category}>{item.category}</Text>
            <Text style={styles.sub}>{item.description}</Text>
            <Text style={styles.date}>{formatDate(item.created_at)}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{enumLabel(item.status)}</Text>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 16, gap: 10 },
  form: { backgroundColor: theme.card, borderRadius: 12, padding: 16, marginBottom: 6, elevation: 1 },
  formTitle: { fontSize: 15, fontWeight: "700", color: theme.text, marginBottom: 10 },
  input: { borderWidth: 1, borderColor: theme.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 8 },
  multiline: { minHeight: 70, textAlignVertical: "top" },
  actions: { flexDirection: "row", gap: 8 },
  photoBtn: { flex: 1, borderWidth: 1, borderColor: theme.green, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  photoBtnText: { color: theme.green, fontWeight: "600" },
  submitBtn: { flex: 1, backgroundColor: theme.green, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  submitText: { color: "#fff", fontWeight: "600" },
  empty: { color: theme.muted, textAlign: "center", marginTop: 24 },
  card: { backgroundColor: theme.card, borderRadius: 12, padding: 16, flexDirection: "row", justifyContent: "space-between", elevation: 1 },
  left: { flex: 1, paddingRight: 8 },
  category: { fontSize: 15, fontWeight: "700", color: theme.text },
  sub: { color: theme.muted, fontSize: 13, marginTop: 2 },
  date: { color: theme.muted, fontSize: 11, marginTop: 4 },
  badge: { backgroundColor: "#e8f1ec", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
  badgeText: { color: theme.green, fontSize: 11, fontWeight: "600" },
});
