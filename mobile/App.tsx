import React, { useEffect } from 'react'
import { View, StyleSheet, ActivityIndicator } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClientProvider } from '@tanstack/react-query'
import Toast from 'react-native-toast-message'

import { queryClient } from './src/api/hooks'
import { useAppStore } from './src/store/appStore'

import { LoginScreen } from './src/screens/auth/LoginScreen'
import { OwnerDashboardScreen } from './src/screens/owner/OwnerDashboardScreen'
import { OrdersListScreen } from './src/screens/orders/OrdersListScreen'
import { OnlineOrdersScreen } from './src/screens/online/OnlineOrdersScreen'
import { TableGridScreen } from './src/screens/server/TableGridScreen'
import { ReservationsScreen } from './src/screens/reservations/ReservationsScreen'
import { InventoryScreen } from './src/screens/inventory/InventoryScreen'
import { AttendanceScreen } from './src/screens/workforce/AttendanceScreen'
import { KdsStationScreen } from './src/screens/kitchen/KdsStationScreen'
import { WaitlistScreen } from './src/screens/waitlist/WaitlistScreen'
import { Menu86Screen } from './src/screens/menu/Menu86Screen'
import { BottomTabBar, TabKey } from './src/components/BottomTabBar'
import { ModulesHubModal, AllModulesKey } from './src/components/ModulesHubModal'
import { Colors } from './src/theme/colors'


function AppShell() {
  const {
    user,
    isRestoringSession,
    activeTab,
    hubVisible,
    restoreSession,
    login,
    logout,
    setActiveTab,
    setHubVisible,
    switchRole,
  } = useAppStore()

  useEffect(() => {
    restoreSession()
  }, [])

  if (isRestoringSession) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={Colors.systemBlue} />
      </View>
    )
  }

  if (!user) {
    return <LoginScreen onLoginSuccess={login} />
  }

  return (
    <View style={styles.appShell}>
      <View style={styles.screenArea}>
        {/* ── Operations & Analytics ─────────────────── */}
        {activeTab === 'OVERVIEW' && (
          <OwnerDashboardScreen
            user={user}
            onLogout={logout}
            onSwitchRole={switchRole as any}
          />
        )}
        {activeTab === 'TABLES' && (
          <TableGridScreen
            user={user}
            onLogout={logout}
            onSwitchRole={switchRole as any}
          />
        )}
        {activeTab === 'ORDERS' && (
          <OrdersListScreen
            user={user}
            onOpenHub={() => setHubVisible(true)}
          />
        )}
        {activeTab === 'ONLINE_ORDERS' && (
          <OnlineOrdersScreen
            user={user}
            onOpenHub={() => setHubVisible(true)}
          />
        )}
        {activeTab === 'KDS' && (
          <KdsStationScreen
            user={user}
            onLogout={logout}
            onSwitchRole={switchRole as any}
          />
        )}

        {/* ── Guest Experience ───────────────────────── */}
        {activeTab === 'WAITLIST' && (
          <WaitlistScreen
            user={user}
            onOpenHub={() => setHubVisible(true)}
          />
        )}
        {activeTab === 'BOOKINGS' && <ReservationsScreen user={user} />}

        {/* ── Kitchen & Inventory ────────────────────── */}
        {activeTab === 'MENU_86' && (
          <Menu86Screen
            user={user}
            onOpenHub={() => setHubVisible(true)}
          />
        )}
        {activeTab === 'STOCK' && <InventoryScreen user={user} />}

        {/* ── Workforce ──────────────────────────────── */}
        {activeTab === 'STAFF' && <AttendanceScreen user={user} />}
      </View>


      {/* Universal Native Bottom Tab Navigation */}
      <BottomTabBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenHub={() => setHubVisible(true)}
      />

      {/* Master Modules Hub Modal */}
      <ModulesHubModal
        visible={hubVisible}
        activeTab={activeTab as AllModulesKey}
        onSelectModule={(key) => setActiveTab(key as TabKey)}
        onClose={() => setHubVisible(false)}
        restaurantName={user.restaurantName}
      />
    </View>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <View style={styles.container}>
          <AppShell />
        </View>
        {/* Global Toast notifications — shows success/error messages */}
        <Toast />
      </SafeAreaProvider>
    </QueryClientProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.systemGroupedBackground,
  },
  appShell: {
    flex: 1,
  },
  screenArea: {
    flex: 1,
  },
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.systemGroupedBackground,
  },
})
