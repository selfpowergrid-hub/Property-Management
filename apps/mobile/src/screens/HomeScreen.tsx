import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { formatKES, formatDate, enumLabel } from "@nyumba360/shared";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/auth";
import { registerForPush } from "../lib/push";
import { theme } from "../theme";

interface HomeData {
  name: string;
  balance: number;
  nextDue: string | null;
  nextStatus: string | null;
  rent: number;
  unitLabel: string;
}

export function HomeScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<HomeData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const orgId = (user.app_metadata as { org_id?: string } | undefined)?.org_id;
    if (orgId) registerForPush(orgId, user.id).catch(() => {});

    const { data: tenant } = await supabase
      .from("tenants")
      .select("full_name, leases(rent_amount, units(unit_number, properties(name)))")
      .eq("user_id", user.id)
      .maybeSingle();
    const lease = tenant?.leases?.[0];
    const unit = lease?.units as { unit_number?: string; properties?: { name?: string } } | undefined;

    const { data: invoices } = await supabase
      .from("invoices")
      .select("amount, amount_paid, due_date, status")
      .neq("status", "paid")
      .order("due_date", { ascending: true });
    const balance = invoices?.reduce((s, i) => s + (Number(i.amount) - Number(i.amount_paid)), 0) ?? 0;
    const next = invoices?.[0];

    setData({
      name: tenant?.full_name ?? "tenant",
      balance,
      nextDue: next?.due_date ?? null,
      nextStatus: next?.status ?? null,
      rent: Number(lease?.rent_amount ?? 0),
      unitLabel: unit ? `${unit.properties?.name ?? "—"} · Unit ${unit.unit_number ?? "—"}` : "No active lease",
    });
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.greeting}>Karibu, {data?.name ?? "…"}</Text>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Current balance</Text>
        <Text style={styles.balanceValue}>{formatKES(data?.balance ?? 0)}</Text>
      </View>

      <View style={styles.row}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Next due</Text>
          <Text style={styles.statValue}>{data?.nextDue ? formatDate(data.nextDue) : "—"}</Text>
          {data?.nextStatus ? <Text style={styles.statHint}>{enumLabel(data.nextStatus)}</Text> : null}
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Monthly rent</Text>
          <Text style={styles.statValue}>{formatKES(data?.rent ?? 0)}</Text>
        </View>
      </View>

      <View style={styles.unitCard}>
        <Text style={styles.statLabel}>Your unit</Text>
        <Text style={styles.unitText}>{data?.unitLabel ?? "—"}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 16 },
  greeting: { fontSize: 20, fontWeight: "700", color: theme.text, marginBottom: 16 },
  balanceCard: { backgroundColor: theme.green, borderRadius: 14, padding: 20, marginBottom: 12 },
  balanceLabel: { color: "#cdebdd", fontSize: 13 },
  balanceValue: { color: "#fff", fontSize: 30, fontWeight: "700", marginTop: 4 },
  row: { flexDirection: "row", gap: 12, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: theme.card, borderRadius: 12, padding: 16, elevation: 1 },
  statLabel: { color: theme.muted, fontSize: 12 },
  statValue: { color: theme.text, fontSize: 18, fontWeight: "700", marginTop: 4 },
  statHint: { color: theme.muted, fontSize: 11, marginTop: 2 },
  unitCard: { backgroundColor: theme.card, borderRadius: 12, padding: 16, elevation: 1 },
  unitText: { color: theme.text, fontSize: 16, fontWeight: "600", marginTop: 4 },
});
