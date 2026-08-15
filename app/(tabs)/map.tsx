import { MapPin, X } from 'lucide-react-native';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ActivityIndicator, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { BirdImage } from '../../components/BirdImage';
import { MOCK_BIRDS } from '../../constants/mockBirds';
import { useAvedexStore } from '../../hooks/useAvedexStore';
import { useTranslation } from 'react-i18next';
import { getNearbyHotspots, getHotspotSpecies, EbirdObservation } from '../../services/api/ebird';
import { getDistanceKm, openDirections, openGoogleFlights, getCurrentUserLocation } from '../../utils/navigation';

export default function MapScreen() {
  const { t } = useTranslation();
  const iframeRef = useRef<any>(null);
  const webViewRef = useRef<WebView | null>(null);

  const [filter, setFilter] = useState<'hotspots' | 'mine'>('hotspots');
  const userSightings = useAvedexStore(state => state.userSightings);
  const unlockedSpeciesIds = useAvedexStore(state => state.unlockedSpeciesIds);

  const colombiaRegion = useMemo(() => ({
    latitude: 4.5709,
    longitude: -74.2973,
    latitudeDelta: 10,
    longitudeDelta: 10,
  }), []);

  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number }>({
    latitude: 4.5709,
    longitude: -74.2973,
  });

  const [dynamicHotspots, setDynamicHotspots] = useState<any[]>([]);
  const [loadingHotspots, setLoadingHotspots] = useState(false);
  const [mapRegion, setMapRegion] = useState<{ latitude: number; longitude: number }>({
    latitude: colombiaRegion.latitude,
    longitude: colombiaRegion.longitude,
  });

  const [selectedHotspot, setSelectedHotspot] = useState<any | null>(null);
  const [hotspotSpecies, setHotspotSpecies] = useState<EbirdObservation[]>([]);
  const [loadingSpecies, setLoadingSpecies] = useState(false);

  useEffect(() => {
    getCurrentUserLocation().then((loc) => {
      setUserLocation({
        latitude: loc.lat,
        longitude: loc.lng,
      });
    });
  }, []);

  const fetchHotspots = useCallback(async (lat: number, lng: number) => {
    try {
      setLoadingHotspots(true);
      const data = await getNearbyHotspots(lat, lng);

      const formattedHotspots = data.map(h => ({
        id: h.locId,
        locId: h.locId,
        name: h.locName,
        locName: h.locName,
        lat: h.lat,
        lng: h.lng,
        coordinates: { latitude: h.lat, longitude: h.lng },
        isHotspot: true,
      }));
      setDynamicHotspots(formattedHotspots);
    } catch (err) {
      console.error('Failed to fetch hotspots:', err);
    } finally {
      setLoadingHotspots(false);
    }
  }, []);

  useEffect(() => {
    fetchHotspots(colombiaRegion.latitude, colombiaRegion.longitude);
  }, [fetchHotspots, colombiaRegion]);

  const getBirdName = useCallback((item: any) => {
    if (item.name) return item.name;
    const bird = MOCK_BIRDS.find(b => b.id === item.speciesId);
    return bird ? bird.commonName : t('unknown_bird');
  }, [t]);

  const markers = useMemo(() => {
    return filter === 'mine' ? userSightings : dynamicHotspots;
  }, [filter, userSightings, dynamicHotspots]);

  const postMarkersToMap = useCallback(() => {
    const formattedMarkers = markers.map((m: any) => ({
      ...m,
      name: getBirdName(m),
      typeLabel: m.isHotspot ? t('hotspot') : (m.date ? new Date(m.date).toLocaleDateString() : '')
    }));

    const payload = JSON.stringify({ type: 'updateMarkers', markers: formattedMarkers });

    if (Platform.OS === 'web') {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(payload, '*');
      }
    } else {
      if (webViewRef.current) {
        webViewRef.current.postMessage(payload);
      }
    }
  }, [markers, getBirdName, t]);

  useEffect(() => {
    postMarkersToMap();
  }, [postMarkersToMap]);

  const handleIncomingData = useCallback((data: any) => {
    if (!data || typeof data !== 'object') return;

    if (data.type === 'MAP_MOVED') {
      if (typeof data.lat === 'number' && typeof data.lng === 'number') {
        setMapRegion({ latitude: data.lat, longitude: data.lng });
        fetchHotspots(data.lat, data.lng);
      }
    } else if (data.type === 'selectHotspot') {
      const h = data.hotspot;
      if (h) {
        setSelectedHotspot({
          id: h.id || h.locId,
          locId: h.locId || h.id,
          name: h.name || h.locName,
          locName: h.locName || h.name,
          lat: h.lat ?? h.coordinates?.latitude,
          lng: h.lng ?? h.coordinates?.longitude,
          coordinates: h.coordinates || { latitude: h.lat, longitude: h.lng },
          isHotspot: h.isHotspot,
          speciesId: h.speciesId,
          date: h.date,
          notes: h.notes,
        });
      }
    } else if (data.type === 'mapReady') {
      postMarkersToMap();
    }
  }, [fetchHotspots, postMarkersToMap]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleWebMessage = (event: any) => {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          handleIncomingData(data);
        } catch (e) {
          // Ignorar mensajes no válidos
        }
      };
      window.addEventListener('message', handleWebMessage);
      return () => window.removeEventListener('message', handleWebMessage);
    }
  }, [handleIncomingData]);

  const handleNativeMessage = useCallback((event: any) => {
    try {
      const rawData = event.nativeEvent.data;
      const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
      handleIncomingData(data);
    } catch (e) {
      console.error('Error parsing webview message:', e);
    }
  }, [handleIncomingData]);

  useEffect(() => {
    if (!selectedHotspot) {
      setHotspotSpecies([]);
      return;
    }

    if (!selectedHotspot.isHotspot && selectedHotspot.speciesId) {
      const matchedBird = MOCK_BIRDS.find(b => b.id === selectedHotspot.speciesId);
      if (matchedBird) {
        setHotspotSpecies([{
          speciesCode: matchedBird.id,
          comName: matchedBird.commonName,
          sciName: matchedBird.scientificName,
          imageUrl: matchedBird.imageUrl,
          locId: selectedHotspot.id,
          locName: matchedBird.commonName,
          obsDt: selectedHotspot.date || '',
          howMany: 1,
          lat: selectedHotspot.coordinates?.latitude || 0,
          lng: selectedHotspot.coordinates?.longitude || 0,
        }]);
      } else {
        setHotspotSpecies([]);
      }
      setLoadingSpecies(false);
      return;
    }

    let isMounted = true;
    setLoadingSpecies(true);

    const locId = selectedHotspot.locId || selectedHotspot.id;
    const lat = selectedHotspot.lat ?? selectedHotspot.coordinates?.latitude;
    const lng = selectedHotspot.lng ?? selectedHotspot.coordinates?.longitude;

    getHotspotSpecies(locId, lat, lng)
      .then((data) => {
        if (!isMounted) return;
        const topSpecies = (data || []).slice(0, 6);
        setHotspotSpecies(topSpecies);
      })
      .catch((err) => {
        console.error('Error fetching hotspot species:', err);
        if (isMounted) setHotspotSpecies([]);
      })
      .finally(() => {
        if (isMounted) setLoadingSpecies(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedHotspot]);

  const isSpeciesUnlocked = useCallback(
    (obs: EbirdObservation) => {
      const matchedBird = MOCK_BIRDS.find(
        (b) =>
          b.scientificName.toLowerCase() === obs.sciName?.toLowerCase() ||
          b.commonName.toLowerCase() === obs.comName?.toLowerCase()
      );

      if (matchedBird) {
        return (
          unlockedSpeciesIds.includes(matchedBird.id) ||
          userSightings.some((s) => s.speciesId === matchedBird.id)
        );
      }

      return (
        unlockedSpeciesIds.includes(obs.speciesCode) ||
        unlockedSpeciesIds.includes(obs.sciName) ||
        userSightings.some(
          (s) => s.speciesId === obs.speciesCode || s.speciesId === obs.sciName
        )
      );
    },
    [unlockedSpeciesIds, userSightings]
  );

  const getSpeciesImage = useCallback((obs: EbirdObservation) => {
    if (obs.imageUrl) {
      return obs.imageUrl;
    }
    const matchedBird = MOCK_BIRDS.find(
      (b) =>
        b.scientificName.toLowerCase() === obs.sciName?.toLowerCase() ||
        b.commonName.toLowerCase() === obs.comName?.toLowerCase()
    );
    if (matchedBird?.imageUrl) {
      return matchedBird.imageUrl;
    }
    return 'https://images.unsplash.com/photo-1552728089-57168b64ff1c?auto=format&fit=crop&w=400&q=80';
  }, []);

  const hotspotDistance = useMemo(() => {
    if (!selectedHotspot) return 0;
    const destLat = selectedHotspot.lat ?? selectedHotspot.coordinates?.latitude;
    const destLng = selectedHotspot.lng ?? selectedHotspot.coordinates?.longitude;
    return getDistanceKm(userLocation.latitude, userLocation.longitude, destLat, destLng);
  }, [selectedHotspot, userLocation]);

  const distanceText = useMemo(() => {
    if (hotspotDistance < 10) {
      return `A ${hotspotDistance.toFixed(1)} km de ti`;
    }
    return `A ${Math.round(hotspotDistance)} km de ti`;
  }, [hotspotDistance]);

  const mapHtml = useMemo(() => `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script src="https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js"></script>
        <style>
            * { box-sizing: border-box; }
            body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: #f3f4f6; }
            #map { width: 100vw; height: 100vh; }
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script>
            function sendToRN(msg) {
                var strMsg = typeof msg === 'string' ? msg : JSON.stringify(msg);
                if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                    window.ReactNativeWebView.postMessage(strMsg);
                }
                if (window.parent && window.parent.postMessage) {
                    window.parent.postMessage(strMsg, '*');
                }
            }

            var map = L.map('map', { zoomControl: false }).setView([${colombiaRegion.latitude}, ${colombiaRegion.longitude}], 5);
            L.control.zoom({ position: 'bottomright' }).addTo(map);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© OpenStreetMap'
            }).addTo(map);

            var markersGroup = L.markerClusterGroup({
                spiderfyOnMaxZoom: true,
                showCoverageOnHover: false,
                zoomToBoundsOnClick: true
            });
            map.addLayer(markersGroup);

            var moveTimeout = null;
            function handleMapMove() {
                if (moveTimeout) {
                    clearTimeout(moveTimeout);
                }
                moveTimeout = setTimeout(function() {
                    var center = map.getCenter();
                    var bounds = map.getBounds();
                    sendToRN({
                        type: 'MAP_MOVED',
                        lat: center.lat,
                        lng: center.lng,
                        bounds: {
                            minLat: bounds.getSouth(),
                            maxLat: bounds.getNorth(),
                            minLng: bounds.getWest(),
                            maxLng: bounds.getEast()
                        }
                    });
                }, 400);
            }

            map.on('moveend', handleMapMove);
            map.on('zoomend', handleMapMove);

            function handleIncomingMessage(event) {
                try {
                    var data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                    if (data && data.type === 'updateMarkers') {
                        markersGroup.clearLayers();
                        var newMarkers = data.markers || [];
                        newMarkers.forEach(function(m) {
                            var lat = m.coordinates ? m.coordinates.latitude : m.lat;
                            var lng = m.coordinates ? m.coordinates.longitude : m.lng;
                            if (lat === undefined || lng === undefined) return;

                            var color = m.isHotspot ? '#dc2626' : '#16a34a';

                            var marker = L.circleMarker([lat, lng], {
                                color: color,
                                fillColor: color,
                                fillOpacity: 0.85,
                                radius: 8,
                                weight: 2
                            });

                            marker.on('click', function(e) {
                                if (e && e.originalEvent) {
                                    e.originalEvent.stopPropagation();
                                }
                                sendToRN({
                                    type: 'selectHotspot',
                                    hotspot: m
                                });
                            });

                            markersGroup.addLayer(marker);
                        });
                    }
                } catch(e) {}
            }

            window.addEventListener('message', handleIncomingMessage);
            document.addEventListener('message', handleIncomingMessage);

            sendToRN({ type: 'mapReady' });
        </script>
    </body>
    </html>
  `, [colombiaRegion.latitude, colombiaRegion.longitude]);

  const renderHotspotDrawer = () => {
    if (!selectedHotspot) return null;

    const destLat = selectedHotspot.lat ?? selectedHotspot.coordinates?.latitude;
    const destLng = selectedHotspot.lng ?? selectedHotspot.coordinates?.longitude;
    const hotspotName = selectedHotspot.locName || selectedHotspot.name || 'Hotspot';

    return (
      <View
        className="absolute inset-0 z-40 bg-black/30 flex justify-end md:justify-center md:items-center"
        pointerEvents="box-none"
      >
        <TouchableOpacity
          className="absolute inset-0"
          activeOpacity={1}
          onPress={() => setSelectedHotspot(null)}
        />
        <View
          className="bg-white rounded-t-3xl md:rounded-2xl p-5 shadow-2xl border border-gray-100 w-full md:w-[480px] max-h-[85vh] z-50"
          pointerEvents="auto"
        >
          {/* Header */}
          <View className="flex-row items-start justify-between pb-3 border-b border-gray-100">
            <View className="flex-1 pr-3">
              <View className="flex-row items-center mb-1">
                <MapPin size={20} color={selectedHotspot.isHotspot ? "#dc2626" : "#16a34a"} className="mr-2" />
                <Text className="text-lg font-bold text-gray-900 flex-1" numberOfLines={1}>
                  {hotspotName}
                </Text>
              </View>
              <Text className="text-xs font-semibold text-emerald-700 ml-7">
                {distanceText}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setSelectedHotspot(null)}
              className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-full"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={18} color="#4b5563" />
            </TouchableOpacity>
          </View>

          <ScrollView className="mt-3 max-h-[60vh]" showsVerticalScrollIndicator={false}>
            {/* Section 1: Aves esperadas / Registro de especie */}
            <View className="mb-5">
              <Text className="text-sm font-bold text-gray-800 mb-2">
                {selectedHotspot.isHotspot ? 'Aves esperadas esta temporada' : 'Detalles de la observación'}
              </Text>
              {loadingSpecies ? (
                <View className="py-6 items-center justify-center flex-row bg-gray-50 rounded-xl">
                  <ActivityIndicator size="small" color="#047857" />
                  <Text className="text-xs text-gray-500 font-medium ml-2">
                    Cargando información...
                  </Text>
                </View>
              ) : hotspotSpecies.length === 0 ? (
                <View className="p-4 bg-gray-50 rounded-xl items-center">
                  <Text className="text-xs text-gray-500">
                    No hay registros recientes para este lugar.
                  </Text>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="flex-row space-x-3 py-1"
                >
                  {hotspotSpecies.map((item, index) => {
                    const unlocked = isSpeciesUnlocked(item);
                    const imageUrl = getSpeciesImage(item);
                    return (
                      <View
                        key={item.speciesCode || index}
                        className="w-36 bg-gray-50 rounded-xl p-2.5 mr-3 border border-gray-100 shadow-sm flex-col justify-between"
                      >
                        <View>
                          <BirdImage
                            source={{ uri: imageUrl }}
                            className="w-full h-20 rounded-lg mb-2 bg-gray-200"
                            resizeMode="cover"
                          />
                          <Text
                            className="text-xs font-bold text-gray-800 leading-tight"
                            numberOfLines={1}
                          >
                            {item.comName || 'Especie'}
                          </Text>
                          <Text
                            className="text-[10px] italic text-gray-500 mt-0.5"
                            numberOfLines={1}
                          >
                            {item.sciName || ''}
                          </Text>
                        </View>
                        <View className="mt-2">
                          <View
                            className={`py-0.5 px-2 rounded-full self-start ${
                              unlocked ? 'bg-emerald-100' : 'bg-amber-100'
                            }`}
                          >
                            <Text
                              className={`text-[10px] font-bold ${
                                unlocked ? 'text-emerald-800' : 'text-amber-800'
                              }`}
                            >
                              {unlocked ? 'Obtenida' : '¡No la tienes!'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* Section 2: Cómo llegar */}
            <View className="mb-2">
              <Text className="text-sm font-bold text-gray-800 mb-2">
                Cómo llegar
              </Text>
              <View className="flex-row flex-wrap gap-2">
                <TouchableOpacity
                  onPress={() =>
                    openDirections({
                      destLat,
                      destLng,
                      destName: hotspotName,
                      mode: 'walk',
                    })
                  }
                  className="flex-1 min-w-[70px] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 py-2.5 px-2 rounded-xl items-center justify-center flex-row shadow-sm"
                >
                  <Text className="text-base mr-1">🚶</Text>
                  <Text className="text-xs font-semibold text-emerald-800">Caminar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    openDirections({
                      destLat,
                      destLng,
                      destName: hotspotName,
                      mode: 'bicycling',
                    })
                  }
                  className="flex-1 min-w-[70px] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 py-2.5 px-2 rounded-xl items-center justify-center flex-row shadow-sm"
                >
                  <Text className="text-base mr-1">🚴</Text>
                  <Text className="text-xs font-semibold text-emerald-800">Bici</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    openDirections({
                      destLat,
                      destLng,
                      destName: hotspotName,
                      mode: 'driving',
                    })
                  }
                  className="flex-1 min-w-[70px] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 py-2.5 px-2 rounded-xl items-center justify-center flex-row shadow-sm"
                >
                  <Text className="text-base mr-1">🚗</Text>
                  <Text className="text-xs font-semibold text-emerald-800">Auto</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    openDirections({
                      destLat,
                      destLng,
                      destName: hotspotName,
                      mode: 'motorcycle',
                    })
                  }
                  className="flex-1 min-w-[70px] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 py-2.5 px-2 rounded-xl items-center justify-center flex-row shadow-sm"
                >
                  <Text className="text-base mr-1">🏍️</Text>
                  <Text className="text-xs font-semibold text-emerald-800">Moto</Text>
                </TouchableOpacity>
              </View>

              {hotspotDistance > 300 && (
                <TouchableOpacity
                  onPress={() => openGoogleFlights(hotspotName, destLat, destLng)}
                  className="mt-3 bg-sky-600 hover:bg-sky-700 py-3 px-4 rounded-xl items-center justify-center flex-row shadow-md"
                >
                  <Text className="text-lg mr-2">✈️</Text>
                  <Text className="text-sm font-bold text-white">
                    Buscar Vuelos en Google Flights
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1">
      {/* Header Selector */}
      <View className="absolute top-12 left-4 right-4 z-10 flex-row justify-between items-center bg-white/90 p-2 rounded-2xl shadow-md">
        <Text className="text-lg font-bold text-gray-800 ml-2">{t('sightings')}</Text>
        <View className="flex-row bg-gray-100 rounded-full p-1">
          <TouchableOpacity
            onPress={() => setFilter('hotspots')}
            className={`px-3 py-1.5 rounded-full ${filter === 'hotspots' ? 'bg-white shadow' : ''}`}
          >
            <Text className={`text-sm ${filter === 'hotspots' ? 'font-bold text-green-700' : 'text-gray-600'}`}>
              {t('all_hotspots')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setFilter('mine')}
            className={`px-3 py-1.5 rounded-full ${filter === 'mine' ? 'bg-white shadow' : ''}`}
          >
            <Text className={`text-sm ${filter === 'mine' ? 'font-bold text-green-700' : 'text-gray-600'}`}>
              {t('my_sightings')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Map Content */}
      {Platform.OS === 'web' ? (
        <iframe
          ref={iframeRef}
          srcDoc={mapHtml}
          style={{ width: '100%', height: '100%', border: 'none', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}
          onLoad={() => postMarkersToMap()}
        />
      ) : (
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: mapHtml }}
          onMessage={handleNativeMessage}
          onLoadEnd={() => postMarkersToMap()}
          style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mixedContentMode="always"
          allowFileAccess={true}
        />
      )}


      {/* Hotspot/Sighting Drawer */}
      {renderHotspotDrawer()}
    </View>
  );
}
