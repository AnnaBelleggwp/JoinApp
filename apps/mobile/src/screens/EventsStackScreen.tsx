import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { EventsStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { EventDetailsScreen } from "./EventDetailsScreen";
import { EventsScreen } from "./EventsScreen";

const Stack = createNativeStackNavigator<EventsStackParamList>();

export function EventsStackScreen() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.text, fontSize: 18, fontWeight: "900" },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen name="EventsList" component={EventsScreen} options={{ title: "События" }} />
      <Stack.Screen name="EventDetails" component={EventDetailsScreen} options={{ title: "Событие" }} />
    </Stack.Navigator>
  );
}

