import { Position } from '@/types/Position';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  View
} from "react-native";
import { WebView } from 'react-native-webview';
import LeafletMap from '../components/LeafletMap';

interface TrackerData {
  currentLocation: Position;
  distance: number;
  timeElapsed: number;
  path: Array<Position>;
  bearing: number;
  currentSpeed: number | null;
  raceEventId: number;
  raceParticipantKey: string | string[];
  webviewRef: React.Ref<WebView> | null;
}

interface NavigationModalProps {
  visible: boolean;
  onClose: () => void;
  data: TrackerData;
  onSwipeUnlocked: () => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_WIDTH = SCREEN_WIDTH - 40;
const HANDLE_SIZE = 70;
const MAX_TRANSLATE = SWIPE_WIDTH - HANDLE_SIZE - 10;

// Helper pour formater le temps en HH:MM:SS
const formatTime = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map(v => v < 10 ? "0" + v : v)
    .filter((v, i) => v !== "00" || i > 0)
    .join(":");
};

export default function NavigationModal({
  visible,
  onClose,
  data,
  onSwipeUnlocked
}: NavigationModalProps) {

  const translateX = useRef(new Animated.Value(0)).current;

  const unlock = () => {
    Animated.timing(translateX, {
      toValue: MAX_TRANSLATE,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      onSwipeUnlocked();
      onClose();
      translateX.setValue(0);
    });
  };

  const reset = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderMove: (_, gesture) => {
        let dx = gesture.dx;
        if (dx < 0) dx = 0;
        if (dx > MAX_TRANSLATE) dx = MAX_TRANSLATE;
        translateX.setValue(dx);
      },

      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > MAX_TRANSLATE * 0.7) {
          unlock();
        } else {
          reset();
        }
      }
    })
  ).current;

  useEffect(() => {
    if (!visible) {
      translateX.setValue(0);
    }
  }, [visible]);

  if (!data) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={() => {
        Alert.alert(
          "Tracking sécurisé",
          "Utilisez le swipe pour débloquer."
        );
      }}
    >
      <View style={styles.container}>

        {/* MAP */}
        <View>
          <LeafletMap webviewRef={data.webviewRef} />
        </View>

        {/* TOP INFOS */}
        <View>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Navigation</Text>
            <Text style={styles.headerSubtitle}>
              Participant #{data.raceParticipantKey}
            </Text>
          </View>

          <View style={styles.grid}>

            <View style={styles.card}>
              <Text style={styles.label}>Distance</Text>
              <Text style={styles.value}>
                {data.distance.toFixed(2)}
              </Text>
              <Text style={styles.unit}>km</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>Temps</Text>
              <Text style={styles.value}>
                {formatTime(data.timeElapsed)}
              </Text>
            </View>

          </View>

          <View style={styles.grid}>

            <View style={styles.card}>
              <Text style={styles.label}>Vitesse</Text>
              <Text style={[styles.value, { color: '#FFCE39' }]}>
                {data.currentSpeed?.toFixed(2) || '0.00'}
              </Text>
              <Text style={styles.unit}>km/h</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>Direction</Text>
              <Text style={styles.value}>
                {Math.round(data.bearing)}
              </Text>
              <Text style={styles.unit}>°</Text>
            </View>

          </View>
        </View>

        {/* SWIPE */}
        <View style={styles.swipeWrapper} pointerEvents="box-none">
          <View style={styles.swipeTrack}>
            <Text style={styles.swipeText}>
              Swipe → pour quitter
            </Text>
            <View
              style={styles.swipeGestureLayer}
              {...panResponder.panHandlers}
            >
              <Animated.View
                style={[
                  styles.swipeHandle,
                  {
                    transform: [{ translateX }]
                  }
                ]}
              >
                <Ionicons
                  name="chevron-forward"
                  size={32}
                  color="white"
                />
              </Animated.View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },

  header: {
    backgroundColor: '#0A0F0E',
    borderRadius: 18,
    padding: 15,
    marginBottom: 5,
    alignItems: 'center'
  },

  headerTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold'
  },

  headerSubtitle: {
    color: '#AAA',
    marginTop: 4
  },

  grid: {
    flexDirection: 'row',
    marginBottom: 10
  },

  card: {
    flex: 1,
    backgroundColor: '#0A0F0E',
    borderRadius: 18,
    padding: 15,
    marginHorizontal: 4,
    alignItems: 'center'
  },

  label: {
    color: '#AAA',
    fontSize: 14
  },

  value: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 6
  },

  unit: {
    color: '#AAA',
    marginTop: 4
  },

  swipeWrapper: {
    width: '100%',
    alignItems: 'center'
  },

  swipeTrack: {
    width: SWIPE_WIDTH,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#222',
    justifyContent: 'center',
    overflow: 'hidden'
  },

  swipeText: {
    position: 'absolute',
    alignSelf: 'center',
    color: '#999',
    fontSize: 16,
    fontWeight: '600'
  },

  swipeHandle: {
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: '#5a12d6',
    justifyContent: 'center',
    alignItems: 'center'
  },

  swipeGestureLayer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
  },
});