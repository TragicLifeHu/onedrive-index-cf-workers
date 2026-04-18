import type { OdFileObject } from '../../types'

import React, { FC, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import toast from 'react-hot-toast'
import type { PlyrOptions, PlyrSource } from 'plyr-react'
import { useClipboard } from 'use-clipboard-copy'
import dynamic from 'next/dynamic'
import useSWR from 'swr'

import { getBaseUrl } from '../../utils/getBaseUrl'
import { getExtension } from '../../utils/getFileIcon'
import { getStoredToken } from '../../utils/protectedRouteHandler'
import { fetcher } from '../../utils/fetchWithSWR'

import { DownloadButton } from '../DownloadBtnGtoup'
import { DownloadBtnContainer, PreviewContainer } from './Containers'
import Loading from '../Loading'
import CustomEmbedLinkMenu from '../CustomEmbedLinkMenu'
// import Plyr from 'plyr-react'
const Plyr = dynamic(() => import('plyr-react').then(mod => mod.Plyr), { ssr: false })

import 'plyr-react/plyr.css'

// Helper function to escape characters for inclusion in a regular expression
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
}

// Helper to ensure a valid aspect ratio string for Plyr
function getValidRatio(width?: number, height?: number): string {
  const w = Number.isFinite(width) && width! > 0 ? Math.round(width!) : 16
  const h = Number.isFinite(height) && height! > 0 ? Math.round(height!) : 9
  return `${w}:${h}`
}

const VideoPlayer: FC<{
  videoName: string
  videoUrl: string
  width?: number
  height?: number
  thumbnail: string
  subtitles: {
    label: string
    src: string
  }[]
  isFlv: boolean
  mpegts: any
}> = ({ videoName, videoUrl, width, height, thumbnail, subtitles, isFlv, mpegts }) => {
  useEffect(() => {
    if (isFlv) {
      const loadFlv = () => {
        // Really hacky way to get the exposed video element from Plyr
        const video = document.getElementById('plyr') as HTMLVideoElement | null
        if (!video) return
        const flv = mpegts.createPlayer({ url: videoUrl, type: 'flv' })
        flv.attachMediaElement(video)
        flv.load()
      }
      loadFlv()
    }
  }, [videoUrl, isFlv, mpegts])

  // Inject subtitles via blob URLs to improve reliability across environments
  useEffect(() => {
    const revoked: string[] = []
    const timer = window.setTimeout(async () => {
      try {
        if (!subtitles.length) return
        const video = document.querySelector('video') as HTMLVideoElement | null
        if (!video) return
        const tracks = Array.from(video.querySelectorAll('track'))
        for (let i = 0; i < Math.min(tracks.length, subtitles.length); i++) {
          const tr = tracks[i]
          const s = subtitles[i]
          if (!tr || !s?.src) continue
          try {
            const resp = await fetch(s.src, { credentials: 'same-origin' })
            if (!resp.ok) continue
            const blob = await resp.blob()
            const url = URL.createObjectURL(blob)
            tr.setAttribute('src', url)
            revoked.push(url)
          } catch { /* empty */ }
        }
        // Force textTracks to show
        const tt = video.textTracks
        for (let i = 0; i < tt.length; i++) {
          tt[i].mode = i === 0 ? 'showing' : 'hidden'
        }
      } catch { /* empty */ }
    }, 300)
    return () => {
      window.clearTimeout(timer)
      revoked.forEach(u => URL.revokeObjectURL(u))
    }
  }, [subtitles])

  // Common plyr configs, including the video source and plyr options
  const plyrSource = {
    type: 'video',
    title: videoName,
    poster: thumbnail,
    tracks: subtitles.map((subtitle, index) => ({
      kind: 'captions',
      label: subtitle.label,
      srclang: subtitle.label === 'Default' ? 'und' : subtitle.label.toLowerCase(),
      src: subtitle.src,
      default: subtitle.label.toLowerCase() === 'default' || index === 0,
    })),
    sources: !isFlv ? [{ src: videoUrl }] : [],
  }
  const plyrOptions: PlyrOptions = {
    ratio: getValidRatio(width, height),
    fullscreen: { iosNative: true },
    captions: { active: true, update: true },
  }
  if (!isFlv) {
    return <Plyr source={plyrSource as PlyrSource} options={plyrOptions} />
  }
  // For FLV, Plyr is not used for playback, just for UI
  return (
    <video id="plyr" controls poster={thumbnail} style={{ width: '100%', height: '100%' }}>
      {subtitles.map((subtitle, index) => (
        <track
          key={`${subtitle.label}-${index}`}
          kind="captions"
          label={subtitle.label}
          srcLang={subtitle.label === 'Default' ? 'und' : subtitle.label.toLowerCase()}
          src={subtitle.src}
          default={subtitle.label.toLowerCase() === 'default' || index === 0}
        />
      ))}
    </video>
  )
}

const VideoPreview: FC<{ file: OdFileObject }> = ({ file }) => {
  const { asPath } = useRouter()
  const hashedToken = getStoredToken(asPath)
  const clipboard = useClipboard()

  const [menuOpen, setMenuOpen] = useState(false)
  // Collect subtitles across all folder pages
  const [subtitles, setSubtitles] = useState<{ label: string; src: string }[]>([])

  const parentPath = asPath.substring(0, asPath.lastIndexOf('/'))
  const { data } = useSWR([`/api?path=${parentPath}`, hashedToken], fetcher)

  // Replace previous useMemo subtitles with a paginated collector
  useEffect(() => {
    const buildRegex = () => {
      const videoName = file.name.substring(0, file.name.lastIndexOf('.'))
      const safeVideoName = escapeRegExp(videoName)
      return new RegExp(`^${safeVideoName}(?:\\.([^.]+))?\\.vtt$`, 'i')
    }

    const collectFrom = (items: any[]): { label: string; src: string }[] => {
      const rx = buildRegex()
      const out: { label: string; src: string }[] = []
      for (const it of items) {
        const name: string = it.name
        const m = name.match(rx)
        if (m) {
          const label = m[1] ? m[1] : 'Default'
          const vttPath = `${parentPath}/${encodeURIComponent(name)}`
          out.push({ label, src: `/api/raw?path=${vttPath}${hashedToken ? `&odpt=${hashedToken}` : ''}&proxy=true` })
        }
      }
      return out
    }

    const run = async () => {
      if (!data || !data.folder) {
        setSubtitles([])
        return
      }
      let acc = collectFrom(data.folder.value)
      let next: string | undefined = (data as any).next
      while (next) {
        try {
          const url = `/api?path=${parentPath}&next=${encodeURIComponent(next)}`
          const resp = await fetch(url, {
            headers: hashedToken ? ({ 'od-protected-token': hashedToken } as any) : undefined,
          })
          if (!resp.ok) break
          const page = await resp.json()
          if (page?.folder?.value) acc = acc.concat(collectFrom(page.folder.value))
          next = page?.next
        } catch {
          break
        }
      }
      setSubtitles(acc)
    }

    run()
  }, [data, file.name, hashedToken, parentPath])

  // OneDrive generates thumbnails for its video files, we pick the thumbnail with the highest resolution
  const thumbnail = `/api/thumbnail?path=${encodeURIComponent(asPath)}&size=large${hashedToken ? `&odpt=${hashedToken}` : ''}`

  // Video path
  const videoUrl = `/api/raw?path=${encodeURIComponent(asPath)}${hashedToken ? `&odpt=${hashedToken}` : ''}`

  const isFlv = getExtension(file.name) === 'flv'
  const [mpegts, setMpegts] = useState<any>(null)
  useEffect(() => {
    if (typeof window === 'undefined' || !isFlv) return
    import('mpegts.js')
      .then(mod => setMpegts(mod.default))
      .catch(err => console.error('Failed to load mpegts.js:', err))
  }, [isFlv])

  return (
    <>
      <CustomEmbedLinkMenu path={asPath} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      <PreviewContainer>
        {isFlv && mpegts === null ? (
          <Loading loadingText={'Loading FLV extension...'} />
        ) : (
          <VideoPlayer
            videoName={file.name}
            videoUrl={videoUrl}
            width={file.video?.width}
            height={file.video?.height}
            thumbnail={thumbnail}
            subtitles={subtitles}
            isFlv={isFlv}
            mpegts={mpegts}
          />
        )}
      </PreviewContainer>

      <DownloadBtnContainer>
        <div className="flex flex-wrap justify-center gap-2">
          <DownloadButton
            onClickCallback={() => window.open(videoUrl)}
            btnColor="blue"
            btnText={'Download'}
            btnIcon="file-download"
          />
          <DownloadButton
            onClickCallback={() => {
              clipboard.copy(`${getBaseUrl()}/api/raw?path=${asPath}${hashedToken ? `&odpt=${hashedToken}` : ''}`)
              toast.success('Copied direct link to clipboard.')
            }}
            btnColor="pink"
            btnText={'Copy direct link'}
            btnIcon="copy"
          />
          <DownloadButton
            onClickCallback={() => setMenuOpen(true)}
            btnColor="teal"
            btnText={'Customise link'}
            btnIcon="pen"
          />
          <DownloadButton
            onClickCallback={() => {
              window.location.href = `iina://weblink?url=${getBaseUrl()}${videoUrl}`
            }}
            btnText="IINA"
            btnImage="/players/iina.png"
          />
          <DownloadButton
            onClickCallback={() => {
              window.location.href = `vlc://${getBaseUrl()}${videoUrl}`
            }}
            btnText="VLC"
            btnImage="/players/vlc.png"
          />
          <DownloadButton
            onClickCallback={() => {
              window.location.href = `potplayer://${getBaseUrl()}${videoUrl}`
            }}
            btnText="PotPlayer"
            btnImage="/players/potplayer.png"
          />
          <DownloadButton
            onClickCallback={() => {
              window.location.href = `nplayer-http://${window?.location.hostname ?? ''}${videoUrl}`
            }}
            btnText="nPlayer"
            btnImage="/players/nplayer.png"
          />
          <DownloadButton
            onClickCallback={() => {
              window.location.href = `intent://${getBaseUrl()}${videoUrl}#Intent;type=video/any;package=is.xyz.mpv;scheme=https;end;`
            }}
            btnText="mpv-android"
            btnImage="/players/mpv-android.png"
          />
        </div>
      </DownloadBtnContainer>
    </>
  )
}

export default VideoPreview
