import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/context/auth";
import { LoginScreen } from "./src/screens/LoginScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { PaymentsScreen } from "./src/screens/PaymentsScreen";
import { MaintenanceScreen } from "./src/screens/MaintenanceScreen";
import { theme } from "./src/theme";

const Tab = createBottomTabNavigator();

function TenantTabs() {
  const { signOut } = useAuth();
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.green,
        headerStyle: { backgroundColor: theme.card },
        headerTitleStyle: { color: theme.text },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Payments" component={PaymentsScreen} />
      <Tab.Screen name="Maintenance" component={MaintenanceScreen} />
      <Tab.Screen
        name="Sign out"
        component={HomeScreen}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            signOut();
          },
        }}
      />
    </Tab.Navigator>
  );
}

function Root() {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.bg }}>
        <ActivityIndicator color={theme.green} size="large" />
      </View>
    );
  }
  return (
    <NavigationContainer>
      {session ? <TenantTabs /> : <LoginScreen />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthProvider>
        <Root />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
