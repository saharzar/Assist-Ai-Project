// Browsers expose no definitive physical/remote camera flag. These labels only
// exclude recognizable phone bridges; unnamed devices still require permission.
const PHONE_CAMERA = /windows virtual camera|cross[ -]?device|phone link|link to windows|droidcam|iriun|epoccam|continuity camera|iphone|android|\bphone\b/i;
const PC_CAMERA = /integrated|built[ -]?in|internal|usb|webcam|facetime hd/i;

/** Request a specific browser camera without falling back to a phone bridge. */
export async function openBrowserCamera(signal?: AbortSignal): Promise<MediaStream> {
  const media = navigator.mediaDevices;
  if (!media?.getUserMedia) throw new DOMException("Camera API unavailable", "NotSupportedError");
  const devices = media.enumerateDevices ? await media.enumerateDevices() : null;
  if (signal?.aborted) throw new DOMException("Camera check cancelled", "AbortError");
  const cameras = devices?.filter((device) => device.kind === "videoinput" && !PHONE_CAMERA.test(device.label));
  if (cameras && !cameras.length) throw new DOMException("No usable camera", "NotFoundError");
  const selected = cameras?.find((device) => PC_CAMERA.test(device.label)) ?? cameras?.[0];
  const stream = await media.getUserMedia({
    audio: false,
    video: {
      ...(selected?.deviceId ? { deviceId: { exact: selected.deviceId } } : {}),
      width: { ideal: 640 }, height: { ideal: 480 },
    },
  });
  // Permission can reveal a previously unnamed phone camera. Never use it for
  // face detection, and always release a late permission grant after navigation.
  try {
    if (signal?.aborted || stream.getVideoTracks().some((track) => PHONE_CAMERA.test(track.label ?? ""))) {
      throw new DOMException("Camera unavailable", signal?.aborted ? "AbortError" : "NotFoundError");
    }
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop());
    throw error;
  }
  return stream;
}
