import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { formatKES, formatDate, enumLabel } from "@nyumba360/shared";
import type { Payment } from "@nyumba360/supabase";
import { supabase } from "../lib/supabase";
import { theme } from "../theme";

type Row = Pick<Payment, "id" | "amount" | "payment_date" | "method" | "receipt_number">;

export function PaymentsScreen() {
  const [rows, setRows] = useState<Row[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("payments")
      .select("id, amount, payment_date, method, receipt_number")
      .order("payment_date", { ascending: false });
    setRows(data ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={rows}
      keyExtractor={(r) => r.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={<Text style={styles.empty}>No payments yet.</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.left}>
            <Text style={styles.amount}>{formatKES(item.amount)}</Text>
            <Text style={styles.sub}>
              {formatDate(item.payment_date)} · {enumLabel(item.method)}
            </Text>
          </View>
          <Text style={styles.receipt}>{item.receipt_number ?? "—"}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 16, gap: 10 },
  empty: { color: theme.muted, textAlign: "center", marginTop: 40 },
  card: { backgroundColor: theme.card, borderRadius: 12, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", elevation: 1 },
  left: { flex: 1 },
  amount: { fontSize: 16, fontWeight: "700", color: theme.text },
  sub: { color: theme.muted, fontSize: 13, marginTop: 2 },
  receipt: { color: theme.green, fontWeight: "600", fontSize: 12 },
});
