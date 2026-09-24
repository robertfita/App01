import Slider from '@react-native-community/slider';
import { Canvas, Group, Image as SkiaImage, useImage } from '@shopify/react-native-skia';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from 'react-native';
import { computeHomography, Point } from './perspective';

const DEFAULT_OPACITY = 0.5;
const IMAGE_SIZE_RATIO = 0.8; // reference image box is 80% of the screen, matching the old fixed inset
const HANDLE_SIZE = 36;
// Widest available rear lens, so the phone doesn't need to sit far back for
// an A4 sheet to fit in frame. iOS-only: expo-camera doesn't yet expose lens
// selection on Android, so this is a no-op there.
const ULTRA_WIDE_LENS = 'builtInUltraWideCamera';

type Corners = [Point, Point, Point, Point]; // top-left, top-right, bottom-right, bottom-left
type Size = { width: number; height: number };

// Fits the image's own aspect ratio inside a box up to maxWidth x maxHeight,
// so the corner handles land exactly on the image's visible edges instead of
// a differently-shaped box around it.
function fitImageBox(naturalWidth: number, naturalHeight: number, maxWidth: number, maxHeight: number): Size {
  const scale = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight);
  return { width: naturalWidth * scale, height: naturalHeight * scale };
}

function centeredCorners(container: Size, box: Size): Corners {
  const left = (container.width - box.width) / 2;
  const top = (container.height - box.height) / 2;
  const right = left + box.width;
  const bottom = top + box.height;
  return [
    { x: left, y: top },
    { x: right, y: top },
    { x: right, y: bottom },
    { x: left, y: bottom },
  ];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function CornerHandle({
  point,
  bounds,
  onMove,
}: {
  point: Point;
  bounds: { width: number; height: number };
  onMove: (point: Point) => void;
}) {
  const pointRef = useRef(point);
  useEffect(() => {
    pointRef.current = point;
  }, [point]);
  const startRef = useRef(point);

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startRef.current = pointRef.current;
      },
      onPanResponderMove: (_evt, gestureState) => {
        onMove({
          x: clamp(startRef.current.x + gestureState.dx, 0, bounds.width),
          y: clamp(startRef.current.y + gestureState.dy, 0, bounds.height),
        });
      },
    })
  ).current;

  return (
    <View
      {...responder.panHandlers}
      style={[
        styles.handle,
        { left: point.x - HANDLE_SIZE / 2, top: point.y - HANDLE_SIZE / 2 },
      ]}
    />
  );
}

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [opacity, setOpacity] = useState(DEFAULT_OPACITY);
  const [containerSize, setContainerSize] = useState<Size | null>(null);
  const [corners, setCorners] = useState<Corners | null>(null);
  const [hasCustomCorners, setHasCustomCorners] = useState(false);
  const [alignMode, setAlignMode] = useState(false);
  const [selectedLens, setSelectedLens] = useState<string | undefined>(undefined);
  const [focusLocked, setFocusLocked] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const referenceImage = useImage(require('./assets/reference-placeholder.jpg'));

  const handleCameraReady = useCallback(() => {
    cameraRef.current
      ?.getAvailableLensesAsync()
      .then((lenses) => {
        if (lenses.includes(ULTRA_WIDE_LENS)) {
          setSelectedLens(ULTRA_WIDE_LENS);
        }
      })
      .catch(() => {
        // Not available on this platform/device (e.g. Android, or an iPhone
        // without an ultra-wide lens) — keep the default lens.
      });
  }, []);

  const imageSize =
    containerSize && referenceImage
      ? fitImageBox(
          referenceImage.width(),
          referenceImage.height(),
          containerSize.width * IMAGE_SIZE_RATIO,
          containerSize.height * IMAGE_SIZE_RATIO
        )
      : null;

  // Keeps the corners centered on the image's real aspect ratio until the
  // user actually drags one — after that, their alignment is left alone.
  useEffect(() => {
    if (hasCustomCorners || !containerSize || !imageSize) return;
    setCorners(centeredCorners(containerSize, imageSize));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCustomCorners, containerSize?.width, containerSize?.height, imageSize?.width, imageSize?.height]);

  const updateCorner = useCallback((index: number, next: Point) => {
    setHasCustomCorners(true);
    setCorners((prev) => {
      if (!prev) return prev;
      const updated = [...prev] as Corners;
      updated[index] = next;
      return updated;
    });
  }, []);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerSize({ width, height });
  };

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

  const sourceCorners: Corners | null = imageSize
    ? [
        { x: 0, y: 0 },
        { x: imageSize.width, y: 0 },
        { x: imageSize.width, y: imageSize.height },
        { x: 0, y: imageSize.height },
      ]
    : null;
  const matrix = sourceCorners && corners ? computeHomography(sourceCorners, corners) : null;

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        selectedLens={selectedLens}
        onCameraReady={handleCameraReady}
        autofocus={focusLocked ? 'on' : 'off'}
      />
      {referenceImage && imageSize && matrix && (
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          <Group matrix={matrix}>
            <SkiaImage
              image={referenceImage}
              x={0}
              y={0}
              width={imageSize.width}
              height={imageSize.height}
              fit="contain"
              opacity={opacity}
            />
          </Group>
        </Canvas>
      )}
      {alignMode &&
        containerSize &&
        corners?.map((corner, index) => (
          <CornerHandle
            key={index}
            point={corner}
            bounds={containerSize}
            onMove={(next) => updateCorner(index, next)}
          />
        ))}
      <View style={styles.controls}>
        <View style={styles.controlsRow}>
          <Text style={styles.controlsLabel}>Opacity {Math.round(opacity * 100)}%</Text>
          <Text style={styles.alignButton} onPress={() => setAlignMode((a) => !a)}>
            {alignMode ? 'Done' : 'Align corners'}
          </Text>
        </View>
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
        <View style={styles.controlsRow}>
          <Text style={styles.controlsLabel}>
            {focusLocked ? 'Focus locked' : 'Focus: continuous'}
          </Text>
          <Text style={styles.alignButton} onPress={() => setFocusLocked((f) => !f)}>
            {focusLocked ? 'Unlock focus' : 'Lock focus'}
          </Text>
        </View>
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
  handle: {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: '#4dabf755',
    borderWidth: 2,
    borderColor: '#4dabf7',
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
    paddingBottom: 10,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  controlsLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  alignButton: {
    color: '#4dabf7',
    fontSize: 13,
    fontWeight: '700',
  },
  slider: {
    width: '100%',
    height: 40,
  },
});
