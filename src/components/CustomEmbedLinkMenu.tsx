import React, { Dispatch, Fragment, SetStateAction, useRef, useState } from 'react'
import { Description, Dialog, DialogTitle, Transition, TransitionChild } from '@headlessui/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useClipboard } from 'use-clipboard-copy'

import { getBaseUrl } from '../utils/getBaseUrl'
import { getStoredToken } from '../utils/protectedRouteHandler'
import { getReadablePath } from '../utils/getReadablePath'

function LinkContainer({ title, value }: { title: string; value: string }) {
  const clipboard = useClipboard({ copiedTimeout: 1000 })
  return (
    <>
      <h4 className="py-2 text-xs font-medium tracking-wider uppercase">{title}</h4>
      <div className="group relative mb-2 max-h-24 overflow-y-auto rounded border border-gray-400/20 bg-gray-50 p-2.5 font-mono break-all dark:bg-gray-800">
        <div className="opacity-80">{value}</div>
        <button
          onClick={() => clipboard.copy(value)}
          className="dark:bg-gray-850 absolute top-[0.2rem] right-[0.2rem] w-8 rounded border border-gray-400/40 bg-gray-100 py-1.5 opacity-0 transition-all duration-100 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          {clipboard.copied ? <FontAwesomeIcon icon="check" /> : <FontAwesomeIcon icon="copy" />}
        </button>
      </div>
    </>
  )
}

export default function CustomEmbedLinkMenu({
  path,
  menuOpen,
  setMenuOpen,
}: {
  path: string
  menuOpen: boolean
  setMenuOpen: Dispatch<SetStateAction<boolean>>
}) {
  const hashedToken = getStoredToken(path)

  // Focus on input automatically when menu modal opens
  const focusInputRef = useRef<HTMLInputElement>(null)
  const closeMenu = () => setMenuOpen(false)

  const readablePath = getReadablePath(path)
  const filename = readablePath.substring(readablePath.lastIndexOf('/') + 1)
  const [name, setName] = useState(filename)

  return (
    <Transition appear show={menuOpen} as={Fragment}>
      <Dialog as="div" className="fixed inset-0 z-200 overflow-y-auto" onClose={closeMenu} initialFocus={focusInputRef}>
        {/* Overlay */}
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-100"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 z-0 bg-white/60 dark:bg-gray-800/60" aria-hidden="true" />
        </TransitionChild>

        {/* Modal Panel */}
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-100"
          enterFrom="opacity-0 scale-95"
          enterTo="opacity-100 scale-100"
          leave="ease-in duration-100"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <div className="fixed inset-0 z-10 flex items-start justify-center px-4 text-center" onClick={closeMenu}>
            <div
              className="mt-24 mb-12 inline-block max-h-[80vh] w-full max-w-3xl transform overflow-hidden rounded border border-gray-400/30 bg-white text-left align-middle text-sm shadow-xl transition-all dark:bg-gray-900 dark:text-white"
              onClick={e => e.stopPropagation()}
            >
              <div className="relative flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
                <DialogTitle as="h3" className="text-xl font-bold">
                  {'Customise direct link'}
                </DialogTitle>
              </div>
              <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(80vh - 120px)' }}>
                <Description as="p" className="py-2 opacity-80">
                  <>
                    {'Change the raw file direct link to a URL ending with the extension of the file.'}{' '}
                    <a
                      href="https://ovi.swo.moe/docs/features/customise-direct-link"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 underline"
                    >
                      {'What is this?'}
                    </a>
                  </>
                </Description>

                <div className="mt-4">
                  <h4 className="py-2 text-xs font-medium tracking-wider uppercase">{'Filename'}</h4>
                  <input
                    className="mb-2 w-full rounded border border-gray-600/10 p-2.5 font-mono focus:ring focus:ring-blue-300 focus:outline-none dark:bg-gray-600 dark:text-white dark:focus:ring-blue-700"
                    ref={focusInputRef}
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />

                  <LinkContainer
                    title={'Default'}
                    value={`${getBaseUrl()}/api/raw?path=${encodeURIComponent(readablePath)}${hashedToken ? `&odpt=${hashedToken}` : ''}`}
                  />
                  <LinkContainer
                    title={'URL encoded'}
                    value={`${getBaseUrl()}/api/raw?path=${encodeURIComponent(path)}${hashedToken ? `&odpt=${hashedToken}` : ''}`}
                  />
                  <LinkContainer
                    title={'Customised'}
                    value={`${getBaseUrl()}/api/name/${encodeURIComponent(name)}?path=${encodeURIComponent(readablePath)}${
                      hashedToken ? `&odpt=${hashedToken}` : ''
                    }`}
                  />
                  <LinkContainer
                    title={'Customised and encoded'}
                    value={`${getBaseUrl()}/api/name/${encodeURIComponent(name)}?path=${encodeURIComponent(path)}${hashedToken ? `&odpt=${hashedToken}` : ''}`}
                  />
                </div>
              </div>
            </div>
          </div>
        </TransitionChild>
      </Dialog>
    </Transition>
  )
}
