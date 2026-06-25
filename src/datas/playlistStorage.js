async function readJsonResponse(response, fallbackMessage) {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 404 && payload.error === "Not found.") {
      throw new Error(
        "Backend chưa nhận API danh sách phát. Hãy restart npm run dev:api rồi thử lại.",
      );
    }

    throw new Error(payload.error || fallbackMessage);
  }

  return payload;
}

function getAuthHeaders(accessToken, extraHeaders = {}) {
  return {
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...extraHeaders,
  };
}

export async function getStoredPlaylists(accessToken) {
  const response = await fetch("/api/me/playlists", {
    headers: getAuthHeaders(accessToken),
  });
  const payload = await readJsonResponse(
    response,
    "Không thể đọc danh sách phát từ server.",
  );

  return {
    playlists: payload.playlists ?? [],
    setupRequired: Boolean(payload.setupRequired),
    warning: payload.warning || "",
  };
}

export async function createStoredPlaylist(playlist, accessToken) {
  const response = await fetch("/api/playlists", {
    method: "POST",
    headers: getAuthHeaders(accessToken, {
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(playlist),
  });
  const payload = await readJsonResponse(
    response,
    "Không thể lưu danh sách phát lên server.",
  );

  return payload.playlist;
}

export async function updateStoredPlaylist(playlistId, playlist, accessToken) {
  const response = await fetch(`/api/playlists/${encodeURIComponent(playlistId)}`, {
    method: "PATCH",
    headers: getAuthHeaders(accessToken, {
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(playlist),
  });
  const payload = await readJsonResponse(
    response,
    "Không thể cập nhật danh sách phát trên server.",
  );

  return payload.playlist;
}

export async function deleteStoredPlaylist(playlistId, accessToken) {
  const response = await fetch(`/api/playlists/${encodeURIComponent(playlistId)}`, {
    method: "DELETE",
    headers: getAuthHeaders(accessToken),
  });

  if (!response.ok && response.status !== 204) {
    await readJsonResponse(response, "Không thể xóa danh sách phát khỏi server.");
  }
}
