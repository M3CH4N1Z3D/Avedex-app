import { Tabs, useRouter, usePathname } from 'expo-router';
import { Camera, Home, Map as MapIcon, Users, Settings } from 'lucide-react-native';
import { useWindowDimensions, View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();

  const tabs = [
    { name: 'index', title: t('home'), icon: Home, path: '/' },
    { name: 'map', title: t('map'), icon: MapIcon, path: '/map' },
    { name: 'capture', title: t('capture'), icon: Camera, path: '/capture' },
    { name: 'community', title: t('community'), icon: Users, path: '/community' },
    { name: 'profile', title: t('profile'), icon: Settings, path: '/profile' },
  ];

  const TabsComponent = (
    <View style={{ flex: 1 }}>
      <Tabs screenOptions={{
        tabBarActiveTintColor: '#208AEF',
        headerShown: true,
        tabBarStyle: isDesktop ? { display: 'none' } : {}
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('home'),
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: t('map'),
          tabBarIcon: ({ color }) => <MapIcon size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          title: t('capture'),
          tabBarIcon: ({ color }) => <Camera size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: t('community'),
          tabBarIcon: ({ color }) => <Users size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('profile'),
          tabBarIcon: ({ color }) => <Settings size={24} color={color} />,
        }}
      />
    </Tabs>
    </View>
  );

  if (isDesktop) {
    return (
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <View style={{ width: 250, backgroundColor: 'white', borderRightWidth: 1, borderColor: '#e5e7eb', paddingTop: 40 }}>
          <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1f2937' }}>Avedex</Text>
          </View>
          {tabs.map((tab) => {
            const isActive = pathname === tab.path || (pathname === '/' && tab.name === 'index');
            const color = isActive ? '#208AEF' : '#6b7280';
            return (
              <Pressable
                key={tab.name}
                onPress={() => router.push(tab.path as any)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  backgroundColor: isActive ? '#eff6ff' : 'transparent',
                }}
              >
                <tab.icon size={24} color={color} />
                <Text style={{ marginLeft: 12, fontSize: 16, fontWeight: isActive ? '600' : '400', color }}>
                  {tab.title}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {TabsComponent}
      </View>
    );
  }

  return TabsComponent;
}
