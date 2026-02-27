"use client"

import React, { useEffect, useRef } from 'react'

export function AdContainer() {
  const adRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!adRef.current) return

    // Inyectar script del Multitag (All-in-One) de Monetag
    const script = document.createElement('script')
    script.src = 'https://quge5.com/88/tag.min.js'
    script.setAttribute('data-zone', '214756')
    script.setAttribute('data-cfasync', 'false')
    script.async = true

    adRef.current.appendChild(script)

    return () => {
      if (adRef.current && script.parentNode === adRef.current) {
        adRef.current.removeChild(script)
      }
    }
  }, [])

  return (
    <div className="w-[160px] md:w-[300px] h-full flex flex-col items-center justify-start py-4">
      <div className="text-[10px] text-zinc-500/60 mb-2 uppercase tracking-widest font-semibold">
        Publicidad
      </div>
      <div
        ref={adRef}
        id="monetag-ad-zone"
        className="w-full h-full min-h-[300px] rounded-lg flex items-center justify-center overflow-hidden"
      >
        {/* Anuncios Monetag Multitag - zone 214756 */}
      </div>
    </div>
  )
}
