import type { OdFileObject } from '../../types'
import { FC, useEffect, useRef, useState } from 'react'
import type { IAudioMetadata } from 'music-metadata'

import ReactAudioPlayer from 'react-audio-player'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useRouter } from 'next/router'

import DownloadButtonGroup from '../DownloadBtnGtoup'
import { DownloadBtnContainer, PreviewContainer } from './Containers'
import { LoadingIcon } from '../Loading'
import { formatModifiedDateTime } from '../../utils/fileDetails'
import { getStoredToken } from '../../utils/protectedRouteHandler'

enum PlayerState {
  Loading,
  Ready,
  Playing,
  Paused,
}

const AudioPreview: FC<{ file: OdFileObject }> = ({ file }) => {
  const { asPath } = useRouter()
  const hashedToken = getStoredToken(asPath)

  const rapRef = useRef<ReactAudioPlayer>(null)
  const [playerStatus, setPlayerStatus] = useState(PlayerState.Loading)
  const [playerVolume, setPlayerVolume] = useState(1)

  // Render audio thumbnail, and also check for broken thumbnails
  const thumbnail = `/api/thumbnail?path=${encodeURIComponent(asPath)}&size=medium${hashedToken ? `&odpt=${hashedToken}` : ''}`
  const [brokenThumbnail, setBrokenThumbnail] = useState(false)

  const [metadata, setMetadata] = useState<IAudioMetadata | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const { parseBlob } = await import('music-metadata')
        const audioUrl = `/api/raw?path=${asPath}${hashedToken ? `&odpt=${hashedToken}` : ''}`
        const res = await fetch(audioUrl)
        if (!res.ok) return
        const blob = await res.blob()
        const meta = await parseBlob(blob)
        setMetadata(meta)
      } catch (err) {
        console.error('Failed to fetch audio metadata:', err)
      }
    })()
  }, [asPath, hashedToken])

  useEffect(() => {
    // Manually get the HTML audio element and set onplaying event.
    // - As the default event callbacks provided by the React component does not guarantee playing state to be set
    // - properly when the user seeks through the timeline or the audio is buffered.
    const rap = rapRef.current?.audioEl.current
    if (rap) {
      rap.oncanplay = () => setPlayerStatus(PlayerState.Ready)
      rap.onended = () => setPlayerStatus(PlayerState.Paused)
      rap.onpause = () => setPlayerStatus(PlayerState.Paused)
      rap.onplay = () => setPlayerStatus(PlayerState.Playing)
      rap.onplaying = () => setPlayerStatus(PlayerState.Playing)
      rap.onseeking = () => setPlayerStatus(PlayerState.Loading)
      rap.onwaiting = () => setPlayerStatus(PlayerState.Loading)
      rap.onerror = () => setPlayerStatus(PlayerState.Paused)
      rap.onvolumechange = () => setPlayerVolume(rap.volume)
    }
  }, [])

  return (
    <>
      <PreviewContainer>
        <div className="flex flex-col space-y-4 md:flex-row md:space-x-4">
          <div className="relative flex aspect-square w-full items-center justify-center rounded bg-gray-100 transition-all duration-75 md:w-48 dark:bg-gray-700">
            <div
              className={`absolute z-20 flex h-full w-full items-center justify-center transition-all duration-300 ${
                playerStatus === PlayerState.Loading
                  ? 'bg-white opacity-80 dark:bg-gray-800'
                  : 'bg-transparent opacity-0'
              }`}
            >
              <LoadingIcon className="z-10 inline-block h-5 w-5 animate-spin" />
            </div>

            {!brokenThumbnail ? (
              <div className="absolute m-4 aspect-square rounded-full shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className={`h-full w-full rounded-full object-cover object-top ${
                    playerStatus === PlayerState.Playing ? 'animate-spin-slow' : ''
                  }`}
                  src={thumbnail}
                  alt={file.name}
                  onError={() => setBrokenThumbnail(true)}
                />
              </div>
            ) : (
              <FontAwesomeIcon
                className={`z-10 h-5 w-5 ${playerStatus === PlayerState.Playing ? 'animate-spin' : ''}`}
                icon="music"
                size="2x"
              />
            )}
          </div>

          <div className="flex w-full flex-col justify-between">
            <div>
              <div className="mb-2 font-medium text-lg leading-snug truncate">
                {metadata?.common?.title || file.name}
              </div>
              {metadata && (
                <div className="mb-2 flex flex-col space-y-0.5">
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                    {metadata.common.artist || 'Unknown Artist'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {[
                      metadata.common.album,
                      metadata.common.track.no ? `Track ${metadata.common.track.no}` : null,
                    ]
                      .filter(Boolean)
                      .join(' • ')}
                  </div>
                  {metadata.common.albumartist && metadata.common.albumartist !== metadata.common.artist && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      Album Artist: {metadata.common.albumartist}
                    </div>
                  )}
                </div>
              )}

              <div className="mb-4 text-xs text-gray-400 font-mono truncate">{file.name}</div>

              <div className="mb-4 text-sm text-gray-500">
                {'Last modified:' + ' ' + formatModifiedDateTime(file.lastModifiedDateTime)}
              </div>
            </div>

            <ReactAudioPlayer
              className="h-11 w-full"
              src={`/api/raw?path=${asPath}${hashedToken ? `&odpt=${hashedToken}` : ''}`}
              ref={rapRef}
              controls
              preload="auto"
              volume={playerVolume}
            />
          </div>
        </div>
      </PreviewContainer>

      <DownloadBtnContainer>
        <DownloadButtonGroup />
      </DownloadBtnContainer>
    </>
  )
}

export default AudioPreview
