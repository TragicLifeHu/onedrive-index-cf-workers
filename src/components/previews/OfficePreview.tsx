import type { OdFileObject } from '../../types'
import React, { FC } from 'react'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'

// import DocViewer from 'react-doc-viewer'
const DocViewer: any = dynamic(() => import('react-doc-viewer').then(m => (m as any).default ?? (m as any)), {
  ssr: false,
})

import DownloadButtonGroup from '../DownloadBtnGtoup'
import { DownloadBtnContainer } from './Containers'
import { getBaseUrl } from '../../utils/getBaseUrl'
import { getStoredToken } from '../../utils/protectedRouteHandler'

const OfficePreview: FC<{ file: OdFileObject }> = ({ file }) => {
  const { asPath } = useRouter()
  const hashedToken = getStoredToken(asPath)

  // prepare documents for DocViewer
  const docUrl = encodeURIComponent(
    `${getBaseUrl()}/api/raw?path=${encodeURIComponent(asPath)}${hashedToken ? `&odpt=${hashedToken}` : ''}`,
  )
  const docs = [{ uri: decodeURIComponent(docUrl) }]

  return (
    <>
      <DocViewer documents={docs} />
      <DownloadBtnContainer>
        <DownloadButtonGroup />
      </DownloadBtnContainer>
    </>
  )
}

export default OfficePreview
