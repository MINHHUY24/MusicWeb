import { Buffer } from "node:buffer";
import { createServer } from "node:http";

const PORT = Number(process.env.PORT || process.env.API_PORT || 3001);
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const AUDIO_BUCKET = process.env.SUPABASE_AUDIO_BUCKET || "track-audio";
const COVER_BUCKET = process.env.SUPABASE_COVER_BUCKET || "track-covers";
const PLAYLIST_SCHEMA_SETUP_MESSAGE =
  "Chưa có bảng playlists/playlist_tracks trong Supabase. Hãy chạy SQL trong supabase-auth-setup.sql rồi thử lại.";
const PLAYLIST_TONES = new Set(["blue", "mint", "rose", "amber"]);

function requireSupabaseConfig() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.");
  }
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

function sendNoContent(response) {
  response.writeHead(204);
  response.end();
}

function handleGetAuthConfig(response) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    sendJson(response, 500, {
      error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env.",
    });
    return;
  }

  sendJson(response, 200, {
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: SUPABASE_ANON_KEY,
  });
}

function collectRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

function parseMultipartForm(body, contentType) {
  const boundary =
    contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/)?.[1] ??
    contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/)?.[2];

  if (!boundary) {
    throw new Error("Missing multipart boundary.");
  }

  const fields = {};
  const files = {};
  const bodyText = body.toString("binary");
  const sections = bodyText.split(`--${boundary}`);

  sections.forEach((section) => {
    if (!section || section === "--\r\n" || section === "--") return;

    const trimmedSection = section.replace(/^\r\n/, "").replace(/\r\n$/, "");
    const [rawHeaders, ...contentChunks] = trimmedSection.split("\r\n\r\n");
    const content = contentChunks.join("\r\n\r\n");
    const disposition = rawHeaders.match(/content-disposition:\s*form-data;([^\r\n]+)/i)?.[1];
    const contentTypeHeader = rawHeaders.match(/content-type:\s*([^\r\n]+)/i)?.[1];

    if (!disposition) return;

    const name = disposition.match(/name="([^"]+)"/)?.[1];
    const fileName = disposition.match(/filename="([^"]*)"/)?.[1];

    if (!name) return;

    if (fileName) {
      files[name] = {
        fileName,
        contentType: contentTypeHeader || "application/octet-stream",
        buffer: Buffer.from(content.replace(/\r\n$/, ""), "binary"),
      };
      return;
    }

    fields[name] = Buffer.from(content.replace(/\r\n$/, ""), "binary").toString("utf8");
  });

  return { fields, files };
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sanitizeStorageFileName(fileName, fallbackName) {
  const normalizedFileName = fileName || fallbackName;
  const dotIndex = normalizedFileName.lastIndexOf(".");
  const name = dotIndex > 0 ? normalizedFileName.slice(0, dotIndex) : normalizedFileName;
  const ext = dotIndex > 0 ? normalizedFileName.slice(dotIndex).replace(/[^a-zA-Z0-9.]/g, "") : "";
  const safeName = slugify(name) || slugify(fallbackName);

  return `${Date.now()}-${safeName}${ext.toLowerCase()}`;
}

function encodeStoragePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function getPublicStorageUrl(bucket, objectPath) {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${encodeStoragePath(objectPath)}`;
}

function getSupabaseHeaders(extraHeaders = {}) {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    ...extraHeaders,
  };
}

function getBearerToken(request) {
  const authorization = request.headers.authorization || "";

  return authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
}

async function getAuthenticatedUser(request) {
  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return null;
  }

  requireSupabaseConfig();

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: getSupabaseHeaders({
      Authorization: `Bearer ${accessToken}`,
    }),
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

async function requireAuthenticatedUser(request, response) {
  const user = await getAuthenticatedUser(request);

  if (!user?.id) {
    sendJson(response, 401, { error: "Bạn cần đăng nhập Google để dùng tính năng này." });
    return null;
  }

  return user;
}

async function supabaseFetch(path, options = {}) {
  requireSupabaseConfig();

  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: getSupabaseHeaders(options.headers),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Supabase request failed with ${response.status}.`);
  }

  if (response.status === 204) {
    return null;
  }

  const responseText = await response.text();

  if (!responseText) {
    return null;
  }

  return JSON.parse(responseText);
}

function getMissingSchemaColumn(error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const findMissingColumn = (message) => {
    const postgrestMissingColumn = message.match(/Could not find the '([^']+)' column/)?.[1];
    const postgresMissingColumn = message.match(/column\s+["']?([a-zA-Z0-9_.]+)["']?\s+does not exist/)?.[1];
    const missingColumn = postgrestMissingColumn || postgresMissingColumn || "";

    return missingColumn.split(".").pop() || "";
  };

  try {
    const payload = JSON.parse(errorMessage);
    const message = payload?.message || "";
    return findMissingColumn(message);
  } catch {
    return findMissingColumn(errorMessage);
  }
}

function getIsEmbeddedResourceError(error) {
  const errorMessage = error instanceof Error ? error.message : String(error);

  try {
    const payload = JSON.parse(errorMessage);
    const code = payload?.code || "";
    const message = payload?.message || "";

    return code === "PGRST200" || message.includes("relationship") || message.includes("embed");
  } catch {
    return errorMessage.includes("PGRST200") || errorMessage.includes("relationship") || errorMessage.includes("embed");
  }
}

function getIsMissingPlaylistSchemaError(error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  let message = errorMessage;

  try {
    const payload = JSON.parse(errorMessage);
    message = `${payload?.message || ""} ${payload?.details || ""} ${payload?.hint || ""}`;
  } catch {
    // Keep the original message.
  }

  return (
    (message.includes("playlists") || message.includes("playlist_tracks")) &&
    (message.includes("schema cache") ||
      message.includes("relation") ||
      message.includes("does not exist") ||
      message.includes("Could not find the table"))
  );
}

async function uploadStorageObject(bucket, objectPath, file) {
  requireSupabaseConfig();

  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${bucket}/${encodeStoragePath(objectPath)}`,
    {
      method: "POST",
      headers: getSupabaseHeaders({
        "Content-Type": file.contentType,
        "x-upsert": "false",
      }),
      body: file.buffer,
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Cannot upload file to Supabase Storage.");
  }

  return response.json();
}

async function removeStorageObjects(bucket, objectPaths) {
  const paths = objectPaths.filter(Boolean);

  if (!paths.length) return;

  await supabaseFetch(`/storage/v1/object/${bucket}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prefixes: paths }),
  });
}

function normalizeTrack(row) {
  const category = row.categories ?? row.category ?? null;
  const categoryLabel = category?.name ?? row.category_label ?? "Other";

  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    category: row.category_id ?? "other",
    categoryLabel,
    description: row.description || "Track upload Supabase",
    duration: row.duration_label || "Chưa rõ",
    durationLabel: row.duration_label || "Chưa rõ",
    durationSeconds: row.duration_seconds,
    minutes: Math.max(1, Math.round((row.duration_seconds || 0) / 60)),
    clicks: row.clicks ?? 0,
    cover: row.cover_url || (row.cover_path ? getPublicStorageUrl(COVER_BUCKET, row.cover_path) : ""),
    audio: row.audio_url || (row.audio_path ? getPublicStorageUrl(AUDIO_BUCKET, row.audio_path) : ""),
    audioPath: row.audio_path,
    coverPath: row.cover_path,
    createdAt: row.created_at,
  };
}

function normalizeCategory(row, tracks) {
  const categoryTracks = tracks.filter((track) => track.category === row.id);

  return {
    id: row.id,
    title: row.name,
    description: row.description,
    tone: row.tone || "blue",
    songCount: categoryTracks.length,
    cover: categoryTracks.find((track) => track.cover)?.cover || "",
  };
}

function normalizePlaylist(row, trackIds = []) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || "",
    tone: row.tone || "blue",
    cover: row.cover_url || "",
    trackIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function applyPublishedTrackFilters(query, queryOptions) {
  if (queryOptions.filterByStatus) {
    query.set("status", "eq.published");
  }

  if (queryOptions.userFilterMode === "user_id_or_path") {
    query.set(
      "or",
      `(user_id.eq.${queryOptions.userId},audio_path.like.tracks/${queryOptions.userId}/%)`,
    );
  }

  if (queryOptions.userFilterMode === "path_only") {
    query.set("audio_path", `like.tracks/${queryOptions.userId}/%`);
  }

  if (queryOptions.orderByCreatedAt) {
    query.set("order", "created_at.desc");
  }
}

async function getPublishedTracks({ userId = "", onlyUserUploads = false } = {}) {
  const queryOptions = {
    embedCategories: true,
    filterByStatus: true,
    userFilterMode: userId && onlyUserUploads ? "user_id_or_path" : "none",
    userId,
    orderByCreatedAt: true,
  };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const query = new URLSearchParams({
      select: queryOptions.embedCategories ? "*,categories(id,name,tone,description)" : "*",
    });

    applyPublishedTrackFilters(query, queryOptions);

    try {
      const rows = await supabaseFetch(`/rest/v1/tracks?${query.toString()}`);

      return rows.map(normalizeTrack);
    } catch (error) {
      const missingColumn = getMissingSchemaColumn(error);

      if (missingColumn === "user_id" && queryOptions.userFilterMode === "user_id_or_path") {
        queryOptions.userFilterMode = "path_only";
        continue;
      }

      if (missingColumn === "status" && queryOptions.filterByStatus) {
        queryOptions.filterByStatus = false;
        continue;
      }

      if (missingColumn === "created_at" && queryOptions.orderByCreatedAt) {
        queryOptions.orderByCreatedAt = false;
        continue;
      }

      if (queryOptions.embedCategories && getIsEmbeddedResourceError(error)) {
        queryOptions.embedCategories = false;
        continue;
      }

      throw error;
    }
  }

  return [];
}

async function insertTrack(insertPayload) {
  const payload = { ...insertPayload };
  let embedCategories = true;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const select = embedCategories ? "*,categories(id,name,tone,description)" : "*";

      return await supabaseFetch(`/rest/v1/tracks?select=${encodeURIComponent(select)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      const missingColumn = getMissingSchemaColumn(error);

      if (missingColumn && Object.hasOwn(payload, missingColumn)) {
        delete payload[missingColumn];
        continue;
      }

      if (embedCategories && getIsEmbeddedResourceError(error)) {
        embedCategories = false;
        continue;
      }

      throw error;
    }
  }

  throw new Error("Cannot insert track with current Supabase schema.");
}

async function updateTrack(updateQuery, updatePayload) {
  const payload = { ...updatePayload };
  let embedCategories = true;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      const select = embedCategories ? "*,categories(id,name,tone,description)" : "*";
      const separator = updateQuery.includes("?") ? "&" : "?";

      return await supabaseFetch(
        `${updateQuery}${separator}select=${encodeURIComponent(select)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify(payload),
        },
      );
    } catch (error) {
      const missingColumn = getMissingSchemaColumn(error);

      if (missingColumn && Object.hasOwn(payload, missingColumn)) {
        delete payload[missingColumn];
        continue;
      }

      if (embedCategories && getIsEmbeddedResourceError(error)) {
        embedCategories = false;
        continue;
      }

      throw error;
    }
  }

  throw new Error("Cannot update track with current Supabase schema.");
}

async function handleGetCategories(request, response) {
  const categoryQuery = new URLSearchParams({
    select: "*",
    is_active: "eq.true",
    order: "sort_order.asc",
  });
  const [categoryRows, tracks] = await Promise.all([
    supabaseFetch(`/rest/v1/categories?${categoryQuery.toString()}`),
    getPublishedTracks(),
  ]);

  sendJson(response, 200, {
    categories: categoryRows.map((category) => normalizeCategory(category, tracks)),
  });
}

async function handleGetTracks(request, response) {
  const tracks = await getPublishedTracks();

  sendJson(response, 200, { tracks });
}

async function handleGetCurrentUserTracks(request, response) {
  const user = await requireAuthenticatedUser(request, response);

  if (!user) return;

  const tracks = await getPublishedTracks({
    userId: user.id,
    onlyUserUploads: true,
  });

  sendJson(response, 200, { tracks });
}

function normalizeTrackIds(trackIds) {
  if (!Array.isArray(trackIds)) return [];

  const seenTrackIds = new Set();

  return trackIds
    .map((trackId) => String(trackId || "").trim())
    .filter((trackId) => {
      if (!trackId || seenTrackIds.has(trackId)) return false;

      seenTrackIds.add(trackId);
      return true;
    });
}

async function getPlaylistTrackIds(playlistIds) {
  if (!playlistIds.length) return new Map();

  const query = new URLSearchParams({
    select: "playlist_id,track_id,position",
    playlist_id: `in.(${playlistIds.join(",")})`,
    order: "position.asc",
  });
  const rows = await supabaseFetch(`/rest/v1/playlist_tracks?${query.toString()}`);
  const trackIdsByPlaylist = new Map();

  rows.forEach((row) => {
    const currentTrackIds = trackIdsByPlaylist.get(row.playlist_id) ?? [];

    currentTrackIds.push(row.track_id);
    trackIdsByPlaylist.set(row.playlist_id, currentTrackIds);
  });

  return trackIdsByPlaylist;
}

async function getCurrentUserPlaylists(userId) {
  const query = new URLSearchParams({
    select: "*",
    user_id: `eq.${userId}`,
    order: "created_at.desc",
  });
  const playlistRows = await supabaseFetch(`/rest/v1/playlists?${query.toString()}`);
  const playlistIds = playlistRows.map((playlist) => playlist.id);
  const trackIdsByPlaylist = await getPlaylistTrackIds(playlistIds);

  return playlistRows.map((playlist) =>
    normalizePlaylist(playlist, trackIdsByPlaylist.get(playlist.id) ?? []),
  );
}

async function handleGetCurrentUserPlaylists(request, response) {
  const user = await requireAuthenticatedUser(request, response);

  if (!user) return;

  try {
    const playlists = await getCurrentUserPlaylists(user.id);

    sendJson(response, 200, { playlists });
  } catch (error) {
    if (getIsMissingPlaylistSchemaError(error)) {
      sendJson(response, 200, {
        playlists: [],
        setupRequired: true,
        warning: PLAYLIST_SCHEMA_SETUP_MESSAGE,
      });
      return;
    }

    throw error;
  }
}

async function insertPlaylistTrackRows(playlistId, trackIds) {
  if (!trackIds.length) return;

  const rows = trackIds.map((trackId, index) => ({
    playlist_id: playlistId,
    track_id: trackId,
    position: index,
  }));

  await supabaseFetch("/rest/v1/playlist_tracks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(rows),
  });
}

async function deletePlaylistTrackRows(playlistId) {
  const query = new URLSearchParams({
    playlist_id: `eq.${playlistId}`,
  });

  await supabaseFetch(`/rest/v1/playlist_tracks?${query.toString()}`, {
    method: "DELETE",
  });
}

async function getOwnedPlaylist(playlistId, userId) {
  const query = new URLSearchParams({
    select: "*",
    id: `eq.${playlistId}`,
    user_id: `eq.${userId}`,
  });
  const rows = await supabaseFetch(`/rest/v1/playlists?${query.toString()}`);

  return rows[0] ?? null;
}

async function handleCreatePlaylist(request, response) {
  const user = await requireAuthenticatedUser(request, response);

  if (!user) return;

  try {
    const body = await collectRequestBody(request);
    const playlist = JSON.parse(body.toString("utf8") || "{}");
    const title = String(playlist.title || "").trim();

    if (!title) {
      sendJson(response, 400, { error: "Missing playlist title." });
      return;
    }

    const trackIds = normalizeTrackIds(playlist.trackIds);
    const insertPayload = {
      user_id: user.id,
      title,
      description: String(playlist.description || "").trim(),
      tone: PLAYLIST_TONES.has(playlist.tone) ? playlist.tone : "blue",
      cover_url: playlist.cover || null,
    };
    const playlistRows = await supabaseFetch("/rest/v1/playlists?select=*", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(insertPayload),
    });
    const createdPlaylist = playlistRows[0];

    await insertPlaylistTrackRows(createdPlaylist.id, trackIds);

    sendJson(response, 201, {
      playlist: normalizePlaylist(createdPlaylist, trackIds),
    });
  } catch (error) {
    if (getIsMissingPlaylistSchemaError(error)) {
      sendJson(response, 500, { error: PLAYLIST_SCHEMA_SETUP_MESSAGE });
      return;
    }

    throw error;
  }
}

async function handleUpdatePlaylist(request, playlistId, response) {
  const user = await requireAuthenticatedUser(request, response);

  if (!user) return;

  try {
    const existingPlaylist = await getOwnedPlaylist(playlistId, user.id);

    if (!existingPlaylist) {
      sendJson(response, 404, { error: "Playlist not found." });
      return;
    }

    const body = await collectRequestBody(request);
    const playlist = JSON.parse(body.toString("utf8") || "{}");
    const title = String(playlist.title || "").trim();

    if (!title) {
      sendJson(response, 400, { error: "Missing playlist title." });
      return;
    }

    const trackIds = normalizeTrackIds(playlist.trackIds);
    const updatePayload = {
      title,
      description: String(playlist.description || "").trim(),
      tone: PLAYLIST_TONES.has(playlist.tone) ? playlist.tone : "blue",
      cover_url: playlist.cover || null,
    };
    const query = new URLSearchParams({
      id: `eq.${playlistId}`,
      user_id: `eq.${user.id}`,
      select: "*",
    });
    const playlistRows = await supabaseFetch(`/rest/v1/playlists?${query.toString()}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(updatePayload),
    });
    const updatedPlaylist = playlistRows[0];

    await deletePlaylistTrackRows(playlistId);
    await insertPlaylistTrackRows(playlistId, trackIds);

    sendJson(response, 200, {
      playlist: normalizePlaylist(updatedPlaylist, trackIds),
    });
  } catch (error) {
    if (getIsMissingPlaylistSchemaError(error)) {
      sendJson(response, 500, { error: PLAYLIST_SCHEMA_SETUP_MESSAGE });
      return;
    }

    throw error;
  }
}

async function handleDeletePlaylist(request, playlistId, response) {
  const user = await requireAuthenticatedUser(request, response);

  if (!user) return;

  try {
    const existingPlaylist = await getOwnedPlaylist(playlistId, user.id);

    if (!existingPlaylist) {
      sendJson(response, 404, { error: "Playlist not found." });
      return;
    }

    const query = new URLSearchParams({
      id: `eq.${playlistId}`,
      user_id: `eq.${user.id}`,
    });

    await supabaseFetch(`/rest/v1/playlists?${query.toString()}`, {
      method: "DELETE",
    });
    sendNoContent(response);
  } catch (error) {
    if (getIsMissingPlaylistSchemaError(error)) {
      sendJson(response, 500, { error: PLAYLIST_SCHEMA_SETUP_MESSAGE });
      return;
    }

    throw error;
  }
}

async function handleCreateTrack(request, response) {
  const user = await requireAuthenticatedUser(request, response);

  if (!user) return;

  const body = await collectRequestBody(request);
  const { fields, files } = parseMultipartForm(body, request.headers["content-type"] || "");
  const track = JSON.parse(fields.track || "{}");

  if (!files.audio || !track.title || !track.artist) {
    sendJson(response, 400, { error: "Missing track info or audio file." });
    return;
  }

  const audioFileName = sanitizeStorageFileName(files.audio.fileName, "track.mp3");
  const audioPath = `tracks/${user.id}/${audioFileName}`;
  let coverPath = "";

  await uploadStorageObject(AUDIO_BUCKET, audioPath, files.audio);

  if (files.cover?.buffer?.length) {
    const coverFileName = sanitizeStorageFileName(files.cover.fileName, "cover.jpg");
    coverPath = `covers/${user.id}/${coverFileName}`;
    await uploadStorageObject(COVER_BUCKET, coverPath, files.cover);
  }

  const insertPayload = {
    title: track.title,
    artist: track.artist,
    category_id: track.categoryValue || "other",
    description: track.description || "",
    duration_seconds: track.durationSeconds ? Math.round(track.durationSeconds) : null,
    duration_label: track.durationLabel || "Chưa rõ",
    audio_path: audioPath,
    cover_path: coverPath || null,
    audio_file_name: files.audio.fileName,
    audio_file_size: files.audio.buffer.length,
    cover_file_name: files.cover?.fileName || null,
    cover_file_size: files.cover?.buffer?.length || null,
    status: "published",
    user_id: user.id,
  };
  const rows = await insertTrack(insertPayload);

  sendJson(response, 201, { track: normalizeTrack(rows[0]) });
}

function buildOwnedTrackQuery(trackId, userId, userFilterMode, extraParams = {}) {
  const query = new URLSearchParams({
    id: `eq.${trackId}`,
    ...extraParams,
  });

  if (userFilterMode === "user_id_or_path") {
    query.set("or", `(user_id.eq.${userId},audio_path.like.tracks/${userId}/%)`);
  } else {
    query.set("audio_path", `like.tracks/${userId}/%`);
  }

  return query;
}

async function getOwnedTrackForMutation(trackId, userId) {
  const query = buildOwnedTrackQuery(trackId, userId, "user_id_or_path", {
    select: "id,audio_path,cover_path",
  });

  try {
    const rows = await supabaseFetch(`/rest/v1/tracks?${query.toString()}`);

    return {
      track: rows[0] ?? null,
      userFilterMode: "user_id_or_path",
    };
  } catch (error) {
    if (getMissingSchemaColumn(error) !== "user_id") {
      throw error;
    }

    const fallbackQuery = buildOwnedTrackQuery(trackId, userId, "path_only", {
      select: "id,audio_path,cover_path",
    });
    const rows = await supabaseFetch(`/rest/v1/tracks?${fallbackQuery.toString()}`);

    return {
      track: rows[0] ?? null,
      userFilterMode: "path_only",
    };
  }
}

async function deleteOwnedTrack(trackId, userId, userFilterMode) {
  const query = buildOwnedTrackQuery(trackId, userId, userFilterMode);

  await supabaseFetch(`/rest/v1/tracks?${query.toString()}`, {
    method: "DELETE",
  });
}

async function handleUpdateTrack(request, trackId, response) {
  const user = await requireAuthenticatedUser(request, response);

  if (!user) return;

  const { track: existingTrack, userFilterMode } = await getOwnedTrackForMutation(trackId, user.id);

  if (!existingTrack) {
    sendJson(response, 404, { error: "Track not found." });
    return;
  }

  const body = await collectRequestBody(request);
  const { fields, files } = parseMultipartForm(body, request.headers["content-type"] || "");
  const track = JSON.parse(fields.track || "{}");
  const title = String(track.title || "").trim();
  const artist = String(track.artist || "").trim();

  if (!title || !artist) {
    sendJson(response, 400, { error: "Missing track title or artist." });
    return;
  }

  const updatePayload = {
    title,
    artist,
    category_id: track.categoryValue || "other",
    description: track.description || "",
    duration_seconds: track.durationSeconds ? Math.round(track.durationSeconds) : null,
    duration_label: track.durationLabel || "Chưa rõ",
  };
  const replacedAudioPaths = [];
  const replacedCoverPaths = [];

  if (files.audio?.buffer?.length) {
    const audioFileName = sanitizeStorageFileName(files.audio.fileName, "track.mp3");
    const audioPath = `tracks/${user.id}/${audioFileName}`;

    await uploadStorageObject(AUDIO_BUCKET, audioPath, files.audio);
    updatePayload.audio_path = audioPath;
    updatePayload.audio_file_name = files.audio.fileName;
    updatePayload.audio_file_size = files.audio.buffer.length;
    replacedAudioPaths.push(existingTrack.audio_path);
  }

  if (files.cover?.buffer?.length) {
    const coverFileName = sanitizeStorageFileName(files.cover.fileName, "cover.jpg");
    const coverPath = `covers/${user.id}/${coverFileName}`;

    await uploadStorageObject(COVER_BUCKET, coverPath, files.cover);
    updatePayload.cover_path = coverPath;
    updatePayload.cover_file_name = files.cover.fileName;
    updatePayload.cover_file_size = files.cover.buffer.length;
    replacedCoverPaths.push(existingTrack.cover_path);
  }

  const query = buildOwnedTrackQuery(trackId, user.id, userFilterMode);
  const rows = await updateTrack(`/rest/v1/tracks?${query.toString()}`, updatePayload);

  await Promise.all([
    removeStorageObjects(AUDIO_BUCKET, replacedAudioPaths),
    removeStorageObjects(COVER_BUCKET, replacedCoverPaths),
  ]);

  sendJson(response, 200, { track: normalizeTrack(rows[0]) });
}

async function handleDeleteTrack(request, trackId, response) {
  const user = await requireAuthenticatedUser(request, response);

  if (!user) return;

  const { track, userFilterMode } = await getOwnedTrackForMutation(trackId, user.id);

  if (!track) {
    sendJson(response, 404, { error: "Track not found." });
    return;
  }

  await deleteOwnedTrack(trackId, user.id, userFilterMode);
  await Promise.all([
    removeStorageObjects(AUDIO_BUCKET, [track.audio_path]),
    removeStorageObjects(COVER_BUCKET, [track.cover_path]),
  ]);

  sendNoContent(response);
}

async function handleRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);

  try {
    if (request.method === "GET" && url.pathname === "/api/health") {
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/auth/config") {
      handleGetAuthConfig(response);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/categories") {
      await handleGetCategories(request, response);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/tracks") {
      await handleGetTracks(request, response);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/me/tracks") {
      await handleGetCurrentUserTracks(request, response);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/me/playlists") {
      await handleGetCurrentUserPlaylists(request, response);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/playlists") {
      await handleCreatePlaylist(request, response);
      return;
    }

    const playlistId = url.pathname.match(/^\/api\/playlists\/([^/]+)$/)?.[1];

    if (request.method === "PATCH" && playlistId) {
      await handleUpdatePlaylist(request, decodeURIComponent(playlistId), response);
      return;
    }

    if (request.method === "DELETE" && playlistId) {
      await handleDeletePlaylist(request, decodeURIComponent(playlistId), response);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/tracks") {
      await handleCreateTrack(request, response);
      return;
    }

    const trackId = url.pathname.match(/^\/api\/tracks\/([^/]+)$/)?.[1];

    if (request.method === "PATCH" && trackId) {
      await handleUpdateTrack(request, decodeURIComponent(trackId), response);
      return;
    }

    if (request.method === "DELETE" && trackId) {
      await handleDeleteTrack(request, decodeURIComponent(trackId), response);
      return;
    }

    sendJson(response, 404, { error: "Not found." });
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Server error.",
    });
  }
}

createServer(handleRequest).listen(PORT, "127.0.0.1", () => {
  console.log(`MusicWeb API listening on http://127.0.0.1:${PORT}`);
});
