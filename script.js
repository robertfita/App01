const video = document.getElementById('camera');
const status = document.getElementById('status');

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    status.textContent = 'Camera API not supported in this browser.';
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    });
    video.srcObject = stream;
  } catch (err) {
    status.textContent = `Camera access failed: ${err.message}`;
  }
}

startCamera();
