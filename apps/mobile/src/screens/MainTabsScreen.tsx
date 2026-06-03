import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, Text } from "react-native";
import { signOut, type ProfileRow } from "../services/bootstrap";
import type { MainTabParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { EventsStackScreen } from "./EventsStackScreen";
import { PlaceholderScreen } from "./PlaceholderScreen";

const Tab = createBottomTabNavigator<MainTabParamList>();

interface MainTabsScreenProps {
  profile: ProfileRow;
}

export function MainTabsScreen({ profile }: MainTabsScreenProps) {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerStyle: styles.header,
          headerTitleStyle: styles.headerTitle,
          headerTintColor: colors.text,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: styles.tabLabel,
        }}
      >
        <Tab.Screen name="Events" component={EventsStackScreen} options={{ headerShown: false, title: "События", tabBarLabel: "События" }} />
        <Tab.Screen
          name="Map"
          options={{ title: "Карта", tabBarLabel: "Карта" }}
        >
          {() => <PlaceholderScreen title="Карта" description="Здесь появятся события рядом с выбранной локацией." />}
        </Tab.Screen>
        <Tab.Screen
          name="Chats"
          options={{ title: "Чаты", tabBarLabel: "Чаты" }}
        >
          {() => <PlaceholderScreen title="Чаты" description="Здесь будут диалоги и чаты событий." />}
        </Tab.Screen>
        <Tab.Screen
          name="MyEvents"
          options={{ title: "Мои события", tabBarLabel: "Мои" }}
        >
          {() => <PlaceholderScreen title="Мои события" description="Здесь будут ваши события, заявки и участия." />}
        </Tab.Screen>
        <Tab.Screen
          name="Profile"
          options={{
            title: "Профиль",
            tabBarLabel: "Профиль",
            headerRight: () => (
              <Pressable accessibilityRole="button" onPress={() => void signOut()} style={styles.signOutButton}>
                <Text style={styles.signOutText}>Выйти</Text>
              </Pressable>
            ),
          }}
        >
          {() => <PlaceholderScreen title={profile.display_name} description={`@${profile.username}`} />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.surface,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  signOutButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  signOutText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "800",
  },
});
