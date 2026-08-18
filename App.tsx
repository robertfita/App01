import { CameraView, useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { Image, StyleSheet, Text, View } from 'react-native';

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();

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
        source={require('./assets/reference-placeholder.png')}
        style={styles.overlay}
        resizeMode="contain"
      />
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
    opacity: 0.5,
  },
});
