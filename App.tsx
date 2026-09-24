import Slider from '@react-native-community/slider';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

const DEFAULT_OPACITY = 0.5;

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [opacity, setOpacity] = useState(DEFAULT_OPACITY);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>
          Trace Overlay needs camera access to show the live feed underneath the reference image.
        </Text>
        <Text style={styles.link} onPress={requestPermission}>
          Grant camera permission
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={StyleSheet.absoluteFill} facing="back" />
      <Image
        source={require('./assets/reference-placeholder.jpg')}
        style={[styles.overlay, { opacity }]}
        resizeMode="contain"
      />
      <View style={styles.controls}>
        <Text style={styles.controlsLabel}>Opacity {Math.round(opacity * 100)}%</Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={1}
          value={opacity}
          onValueChange={setOpacity}
          minimumTrackTintColor="#4dabf7"
          maximumTrackTintColor="#ffffff55"
          thumbTintColor="#4dabf7"
        />
      </View>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    color: '#fff',
    textAlign: 'center',
    marginHorizontal: 32,
    marginBottom: 16,
  },
  link: {
    color: '#4dabf7',
    fontWeight: '600',
  },
  overlay: {
    position: 'absolute',
    top: '10%',
    left: '10%',
    width: '80%',
    height: '80%',
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 24,
    right: 24,
    backgroundColor: '#00000088',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  controlsLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  slider: {
    width: '100%',
    height: 40,
  },
});
