"use client"

import React from 'react'

export function AdContainer() {
  return (
    <div className="w-[160px] md:w-[300px] h-full flex flex-col items-center justify-start py-4">
      <div className="text-xs text-muted-foreground mb-2 uppercase tracking-widest font-semibold">
        Publicidad
      </div>
      <div 
        id="monetag-ad-zone"
        className="w-full h-full min-h-[250px] bg-muted/30 rounded-lg border-2 border-dashed border-muted flex items-center justify-center overflow-hidden"
      >
        {/* Aquí se inyectará el código de la Zona de Banner */}
        <span className="text-muted-foreground text-[10px] text-center px-4">
          Espacio para Banner Monetag
        </span>
      </div>
    </div>
  )
}
