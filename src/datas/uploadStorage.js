async function readJsonResponse(response, fallbackMessage) {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || fallbackMessage);
  }

  return payload;
}

function getAuthHeaders(accessToken) {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

export function isUploadStorageAvailable() {
  return typeof fetch === "function";
}

export async function getStoredTracks(accessToken) {
  const response = await fetch("/api/tracks", {
    headers: getAuthHeaders(accessToken),
  });
  const payload = await readJsonResponse(response, "Không thể đọc danh sách track từ server.");

  return payload.tracks ?? [];
}

export async function saveUploadedTrackToFiles(track, accessToken) {
  const formData = new FormData();
  const { audioBlob, coverBlob, ...trackInfo } = track;

  formData.append("track", JSON.stringify(trackInfo));
  formData.append("audio", audioBlob, track.audioFileName || "track.mp3");

  if (coverBlob) {
    formData.append("cover", coverBlob, track.coverFileName || "cover.jpg");
  }

  const response = await fetch("/api/tracks", {
    method: "POST",
    headers: getAuthHeaders(accessToken),
    body: formData,
  });
  const payload = await readJsonResponse(response, "Không thể lưu track lên server.");

  return payload.track;
}

export async function deleteStoredTrack(trackId, accessToken) {
  const response = await fetch(`/api/tracks/${encodeURIComponent(trackId)}`, {
    method: "DELETE",
    headers: getAuthHeaders(accessToken),
  });

  if (!response.ok && response.status !== 204) {
    await readJsonResponse(response, "Không thể xóa track khỏi server.");
  }
}
