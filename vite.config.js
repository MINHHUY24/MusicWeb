import { Buffer } from 'node:buffer'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const songsDir = path.join(rootDir, 'src/datas/songs')
const coversDir = path.join(rootDir, 'src/assets/image_song')
const uploadedSongsPath = path.join(rootDir, 'src/datas/uploadedSongs.json')

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function sanitizeFileName(fileName, fallbackName) {
  const parsedPath = path.parse(fileName || fallbackName)
  const safeName = slugify(parsedPath.name) || fallbackName
  const safeExt = parsedPath.ext.replace(/[^a-zA-Z0-9.]/g, '').toLowerCase()

  return `${safeName}-${Date.now()}${safeExt}`
}

function collectRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = []

    request.on('data', (chunk) => chunks.push(chunk))
    request.on('end', () => resolve(Buffer.concat(chunks)))
    request.on('error', reject)
  })
}

function parseMultipartForm(body, contentType) {
  const boundary = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/)?.[1] ?? contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/)?.[2]

  if (!boundary) {
    throw new Error('Missing multipart boundary.')
  }

  const fields = {}
  const files = {}
  const bodyText = body.toString('binary')
  const sections = bodyText.split(`--${boundary}`)

  sections.forEach((section) => {
    if (!section || section === '--\r\n' || section === '--') return

    const trimmedSection = section.replace(/^\r\n/, '').replace(/\r\n$/, '')
    const [rawHeaders, ...contentChunks] = trimmedSection.split('\r\n\r\n')
    const content = contentChunks.join('\r\n\r\n')
    const disposition = rawHeaders.match(/content-disposition:\s*form-data;([^\r\n]+)/i)?.[1]

    if (!disposition) return

    const name = disposition.match(/name="([^"]+)"/)?.[1]
    const fileName = disposition.match(/filename="([^"]*)"/)?.[1]

    if (!name) return

    if (fileName) {
      files[name] = {
        fileName,
        buffer: Buffer.from(content.replace(/\r\n$/, ''), 'binary'),
      }
      return
    }

    fields[name] = Buffer.from(content.replace(/\r\n$/, ''), 'binary').toString('utf8')
  })

  return { fields, files }
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(payload))
}

async function readUploadedSongs() {
  try {
    return JSON.parse(await readFile(uploadedSongsPath, 'utf8'))
  } catch {
    return []
  }
}

function uploadTrackPlugin() {
  return {
    name: 'musicweb-upload-track',
    configureServer(server) {
      server.middlewares.use('/api/upload-track', async (request, response) => {
        if (request.method !== 'POST') {
          sendJson(response, 405, { error: 'Method not allowed.' })
          return
        }

        try {
          const body = await collectRequestBody(request)
          const { fields, files } = parseMultipartForm(body, request.headers['content-type'] || '')
          const track = JSON.parse(fields.track || '{}')

          if (!files.audio || !track.title || !track.artist) {
            sendJson(response, 400, { error: 'Missing track info or audio file.' })
            return
          }

          await mkdir(songsDir, { recursive: true })
          await mkdir(coversDir, { recursive: true })

          const audioFileName = sanitizeFileName(files.audio.fileName, 'track.mp3')
          const audioPath = path.join(songsDir, audioFileName)
          await writeFile(audioPath, files.audio.buffer)

          let coverFileName = ''

          if (files.cover?.buffer?.length) {
            coverFileName = sanitizeFileName(files.cover.fileName, 'cover.jpg')
            await writeFile(path.join(coversDir, coverFileName), files.cover.buffer)
          }

          const song = {
            id: slugify(track.title) || `track-${Date.now()}`,
            title: track.title,
            artist: track.artist,
            category: track.categoryValue || 'other',
            categoryLabel: track.category || 'Other',
            description: track.description || 'Track upload local',
            duration: track.durationLabel || 'Chưa rõ',
            minutes: Math.max(1, Math.round((track.durationSeconds || 0) / 60)),
            clicks: 0,
            audioPath: `/src/datas/songs/${audioFileName}`,
            coverPath: coverFileName ? `/src/assets/image_song/${coverFileName}` : '',
            createdAt: track.createdAt || new Date().toISOString(),
          }
          const uploadedSongs = await readUploadedSongs()
          const nextUploadedSongs = [song, ...uploadedSongs.filter((item) => item.id !== song.id)]

          await writeFile(uploadedSongsPath, `${JSON.stringify(nextUploadedSongs, null, 2)}\n`)
          server.ws.send({ type: 'full-reload' })
          sendJson(response, 200, { song })
        } catch (error) {
          sendJson(response, 500, { error: error instanceof Error ? error.message : 'Upload failed.' })
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), uploadTrackPlugin()],
})
