import Image from 'next/image'
import React from 'react'

const FourOhFour: React.FC<{ errorMsg: string; errorStatus?: number }> = ({ errorMsg, errorStatus }) => {
  return (
    <div className="my-12">
      <div className="mx-auto w-1/3">
        <Image src="/images/fabulous-rip-2.png" alt="404" width={912} height={912} priority />
      </div>
      <div className="mx-auto mt-6 max-w-xl text-gray-500">
        <div className="mb-8 text-xl font-bold">
          Oops, that&apos;s a{' '}
          <span className="underline decoration-red-500 decoration-wavy">
            {errorStatus == 404 ? 'four-oh-four' : (errorStatus ?? 'four-oh-four')}
          </span>
          .
        </div>
        <div className="mb-4 overflow-hidden rounded border border-gray-400/20 bg-gray-50 p-2 font-mono text-xs break-all dark:bg-gray-800">
          {errorMsg}
        </div>
        <div className="text-sm">
          Press{' '}
          <kbd className="rounded border border-gray-400/20 bg-gray-100 px-1 font-mono text-xs dark:bg-gray-800">
            F12
          </kbd>{' '}
          and open devtools for more details, and report this issue to{' '}
          <a
            className="text-blue-600 hover:text-blue-700 hover:underline"
            href="https://github.com/lyc8503/onedrive-cf-index-ng/issues"
            target="_blank"
            rel="noopener noreferrer"
          >
            onedrive-cf-index-ng issues
          </a>
          .
        </div>
      </div>
    </div>
  )
}

export default FourOhFour
