import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { MessageBox } from "../components/MessageBox";
import type { EventsStackParamList } from "../navigation/types";
import { discoverEvents, formatEventDateTime, type MobileEventCard } from "../services/events";
import { colors } from "../theme/colors";

type EventsScreenProps = NativeStackScreenProps<EventsStackParamList, "EventsList">;

export function EventsScreen({ navigation }: EventsScreenProps) {
  const [events, setEvents] = useState<MobileEventCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "initial") setLoading(true);
    if (mode === "refresh") setRefreshing(true);
    setError(null);

    try {
      setEvents(await discoverEvents());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось загрузить события");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (!loading) {
        void load("refresh");
      }
    }, [load, loading]),
  );

  return (
    <FlatList
      data={events}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load("refresh")} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.kicker}>Events</Text>
          <Text style={styles.title}>Лента событий</Text>
          <Text style={styles.subtitle}>Ближайшие опубликованные встречи и активности.</Text>
          {error ? <MessageBox tone="error">{error}</MessageBox> : null}
          {loading ? <Text style={styles.loading}>Загружаем события</Text> : null}
        </View>
      }
      ListEmptyComponent={!loading && !error ? <Text style={styles.empty}>Пока нет опубликованных событий.</Text> : null}
      renderItem={({ item }) => <EventCard event={item} onPress={() => navigation.navigate("EventDetails", { eventId: item.id })} />}
    />
  );
}

function EventCard({ event, onPress }: { event: MobileEventCard; onPress: () => void }) {
  const seats =
    event.maxAttendees == null || event.maxAttendees === 0
      ? `${event.attendeesCount} участников`
      : `${event.attendeesCount}/${event.maxAttendees} участников`;

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{event.title}</Text>
        {event.requiresApproval ? <Text style={styles.badge}>Заявка</Text> : null}
      </View>
      <Text style={styles.meta}>{formatEventDateTime(event.startsAt)}</Text>
      <Text style={styles.meta}>{event.locationName || event.city || "Локация не указана"}</Text>
      {event.description ? <Text style={styles.description} numberOfLines={3}>{event.description}</Text> : null}
      <View style={styles.footer}>
        <Text style={styles.footerText}>{seats}</Text>
        <Text style={styles.footerText}>{participationText(event.participationStatus)}</Text>
      </View>
    </Pressable>
  );
}

function participationText(status: MobileEventCard["participationStatus"]) {
  if (status === "joined") return "Вы участвуете";
  if (status === "pending") return "Заявка отправлена";
  if (status === "rejected") return "Заявка отклонена";
  return "Подробнее";
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    padding: 20,
    paddingBottom: 32,
    backgroundColor: colors.background,
  },
  header: {
    gap: 10,
    paddingTop: 24,
    paddingBottom: 6,
  },
  kicker: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 23,
  },
  loading: {
    color: colors.textMuted,
    fontSize: 15,
  },
  empty: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 16,
    backgroundColor: colors.surface,
  },
  cardPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  cardTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 19,
    fontWeight: "900",
    lineHeight: 24,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: "hidden",
    color: colors.primary,
    backgroundColor: "#ccfbf1",
    fontSize: 12,
    fontWeight: "800",
  },
  meta: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  description: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
});
