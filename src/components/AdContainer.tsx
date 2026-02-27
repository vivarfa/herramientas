"use client"

import React from 'react'

export function AdContainer() {
  return (
    <div className="w-[160px] md:w-[300px] h-full flex flex-col items-center justify-start py-4">
      <div className="text-[10px] text-zinc-500/60 mb-2 uppercase tracking-widest font-semibold">
        Publicidad
      </div>
      <div
        id="monetag-ad-zone"
        className="w-full h-full min-h-[300px] rounded-lg flex items-center justify-center overflow-hidden"
      >
        {/* Espacio reservado para un BANNER CLÁSICO futuro. 
            El Multitag intrusivo fue eliminado completamente de aquí. */}
      </div>
    </div>
  )
}