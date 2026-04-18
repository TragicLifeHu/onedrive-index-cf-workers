import type { OdFileObject } from '../../types'

import React, { FC, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'

import Loading from '../Loading'
import DownloadButtonGroup from '../DownloadBtnGtoup'
import { DownloadBtnContainer } from './Containers'
import { getStoredToken } from '../../utils/protectedRouteHandler'
import { Rendition } from 'epubjs'

// Dynamically import ReactReader to avoid SSR issues and typing incompatibilities
const ReactReader: any = dynamic(() => import('react-reader').then(m => (m as any).ReactReader ?? (m as any).default), {
  ssr: false,
})

const EPUBPreview: FC<{ file: OdFileObject }> = ({ file: _file }) => {
  const { asPath } = useRouter()
  const hashedToken = getStoredToken(asPath)

  const [epubContainerWidth, setEpubContainerWidth] = useState(400)
  const epubContainer = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setEpubContainerWidth(epubContainer.current ? epubContainer.current.offsetWidth : 400)
  }, [])

  const [location, setLocation] = useState<string>()
  const onLocationChange = (cfiStr: string) => setLocation(cfiStr)

  // Fix for not valid epub files according to
  // https://github.com/gerhardsletten/react-reader/issues/33#issuecomment-673964947
  const fixEpub = (rendition: Rendition) => {
    const spineGet = rendition.book.spine.get.bind(rendition.book.spine)
    rendition.book.spine.get = function (target: string) {
      const targetStr = target as string
      let t = spineGet(target)
      while (t == null && targetStr.startsWith('../')) {
        target = targetStr.substring(3)
        t = spineGet(target)
      }
      return t
    }
  }

  return (
    <div>
      <div
        className="no-scrollbar flex w-full flex-col overflow-scroll rounded bg-white md:p-3 dark:bg-gray-900"
        style={{ maxHeight: '90vh' }}
      >
        <div className="no-scrollbar w-full flex-1 overflow-scroll" ref={epubContainer} style={{ minHeight: '70vh' }}>
          <div
            style={{
              position: 'absolute',
              width: epubContainerWidth,
              height: '70vh',
            }}
          >
            <ReactReader
              url={`/api/raw?path=${encodeURIComponent(asPath)}${hashedToken ? '&odpt=' + hashedToken : ''}`}
              getRendition={rendition => fixEpub(rendition)}
              loadingView={<Loading loadingText={'Loading EPUB ...'} />}
              location={location ?? null}
              locationChanged={onLocationChange}
              epubInitOptions={{ openAs: 'epub' }}
              epubOptions={{ flow: 'scrolled', allowPopups: true }}
            />
          </div>
        </div>
      </div>
      <DownloadBtnContainer>
        <DownloadButtonGroup />
      </DownloadBtnContainer>
    </div>
  )
}

export default EPUBPreview
