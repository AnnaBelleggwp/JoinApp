import { useCallback, useEffect, useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { FormButton } from "../components/FormButton";
import { MessageBox } from "../components/MessageBox";
import type { EventsStackParamList } from "../navigation/types";
import {
  cancelJoinRequest,
  formatEventDateTime,
  getEventDetails,
  joinEvent,
  leaveEvent,
  type MobileEventCard,
} from "../services/events";
import { colors } from "../theme/colors";

type EventDetailsScreenProps = NativeStackScreenProps<EventsStackParamList, "EventDetails">;

export function EventDetailsScreen({ route }: EventDetailsScreenProps) {
  const { eventId } = route.params;
  const [event, setEvent] = useState<MobileEventCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setEvent(await getEventDetails(eventId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось загрузить событие");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleJoin() {
    setPending(true);
    setError(null);
    setMessage(null);

    try {
      const result = await joinEvent(eventId);
      setMessage(result.participationStatus === "pending" ? "Заявка отправлена организатору." : "Вы присоединились к событию.");
      setEvent(await getEventDetails(eventId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось присоединиться");
    } finally {
      setPending(false);
    }
  }

  async function handleLeave() {
    setPending(true);
    setError(null);
    setMessage(null);

    try {
      await leaveEvent(eventId);
      setMessage("Вы больше не участвуете в событии.");
      setEvent(await getEventDetails(eventId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось выйти из события");
    } finally {
      setPending(false);
    }
  }

  async function handleCancelRequest() {
    setPending(true);
    setError(null);
    setMessage(null);

    try {
      await cancelJoinRequest(eventId);
      setMessage("Заявка отменена.");
      setEvent(await getEventDetails(eventId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось отменить заявку");
    } finally {
      setPending(false);
    }
  }

  if (loading && !event) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Загружаем событие</Text>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.center}>
        {error ? <MessageBox tone="error">{error}</MessageBox> : <Text style={styles.muted}>Событие не найдено.</Text>}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.kicker}>{event.categoryName || "Событие"}</Text>
        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.meta}>{formatEventDateTime(event.startsAt)}</Text>
        <Text style={styles.meta}>{event.locationName || event.city || "Локация не указана"}</Text>
      </View>

      {error ? <MessageBox tone="error">{error}</MessageBox> : null}
      {message ? <MessageBox>{message}</MessageBox> : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Описание</Text>
        <Text style={styles.body}>{event.description || "Организатор пока не добавил описание."}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Участники</Text>
        <Text style={styles.body}>{attendeesText(event)}</Text>
        {event.pendingRequestsCount > 0 ? <Text style={styles.muted}>{event.pendingRequestsCount} заявок ожидают решения</Text> : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Организатор</Text>
        <Text style={styles.body}>{event.organizerName || "Организатор"}</Text>
      </View>

      <View style={styles.actions}>{renderAction(event, pending, handleJoin, handleLeave, handleCancelRequest)}</View>
    </ScrollView>
  );
}

function attendeesText(event: MobileEventCard) {
  const current = event.hideAttendees ? "Список участников скрыт" : `${event.attendeesCount} участников`;
  if (!event.maxAttendees) return current;
  return `${current}, мест всего: ${event.maxAttendees}`;
}

function isEventFull(event: MobileEventCard) {
  return Boolean(event.maxAttendees && event.attendeesCount >= event.maxAttendees);
}

function renderAction(
  event: MobileEventCard,
  pending: boolean,
  onJoin: () => void,
  onLeave: () => void,
  onCancelRequest: () => void,
) {
  if (event.isOrganizer) {
    return <MessageBox>Вы организатор этого события.</MessageBox>;
  }

  if (event.participationStatus === "joined") {
    return (
      <>
        <MessageBox>Вы участвуете в этом событии.</MessageBox>
        <FormButton disabled={pending} variant="secondary" onPress={onLeave}>
          Выйти из события
        </FormButton>
      </>
    );
  }

  if (event.participationStatus === "pending") {
    return (
      <>
        <MessageBox>Заявка уже отправлена. Организатор увидит ее в списке заявок.</MessageBox>
        <FormButton disabled={pending} variant="secondary" onPress={onCancelRequest}>
          Отменить заявку
        </FormButton>
      </>
    );
  }

  if (isEventFull(event)) {
    return <MessageBox>Свободных мест больше нет.</MessageBox>;
  }

  return (
    <>
      {event.participationStatus === "rejected" ? <MessageBox tone="error">Предыдущая заявка была отклонена.</MessageBox> : null}
      <FormButton disabled={pending} onPress={onJoin}>
        {event.requiresApproval ? "Отправить заявку" : "Присоединиться"}
      </FormButton>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    padding: 20,
    paddingBottom: 34,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: colors.background,
  },
  header: {
    gap: 9,
    paddingTop: 12,
  },
  kicker: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontSize: 31,
    fontWeight: "900",
    lineHeight: 37,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 21,
  },
  section: {
    gap: 8,
    borderRadius: 8,
    padding: 16,
    backgroundColor: colors.surface,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
  },
  body: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 23,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    gap: 12,
  },
});
