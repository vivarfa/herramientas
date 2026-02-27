"use client"

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  ShoppingBag, TrendingUp, CheckCircle2, Trash2, Receipt, MinusCircle,
  FileBarChart, Download, Search, RefreshCw, AlertCircle, Info,
  Upload, ClipboardPaste, FileText
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import * as XLSX from 'xlsx'
import { cn } from '@/lib/utils'

// ============================================================
// TIPOS
// ============================================================
interface SireSummary {
  base18: number; igv18: number;
  base105: number; igv105: number;
  baseDGNG: number; igvDGNG: number;
  baseDNG: number; igvDNG: number;
  valorNoGravado: number;
  isc: number; icbper: number; otrosTributos: number;
  valorExportacion: number;
  descuentoBI: number; descuentoIGV: number;
  baseExonerado: number; baseInafecto: number;
  baseIVAP: number; ivap: number;
  totalBase: number; totalIGV: number; totalGeneral: number;
  totalFacturas: number; totalNotasCredito: number;
}

interface SireRow {
  razonSocial: string; ruc: string; tipoDoc: string;
  esNotaCredito: boolean; tasa: number; invalido: boolean;
  // Compras
  baseDG: number; igvDG: number;
  baseDGNG: number; igvDGNG: number;
  baseDNG: number; igvDNG: number;
  valorNG: number;
  // Ventas
  valorExport: number; baseGravada: number; igv: number;
  descuentoBI: number; descuentoIGV: number;
  exonerado: number; inafecto: number;
  baseIVAP: number; ivap: number;
  // Comunes
  isc: number; icbper: number; otrosTrib: number; totalCP: number;
}

interface ValidationResult {
  issues: string[];
  suggestions: string[];
}

interface AnalysisResult {
  summary: SireSummary;
  rows: SireRow[];
  rawAll: (string | number)[][];
  headers: string[];
  validation: ValidationResult;
  module: string;
}

const STORAGE_KEYS = { compras: 'SIRE_STATE_COMPRAS_V10', ventas: 'SIRE_STATE_VENTAS_V10' }

const emptySummary = (): SireSummary => ({
  base18: 0, igv18: 0, base105: 0, igv105: 0,
  baseDGNG: 0, igvDGNG: 0, baseDNG: 0, igvDNG: 0,
  valorNoGravado: 0, isc: 0, icbper: 0, otrosTributos: 0,
  valorExportacion: 0, descuentoBI: 0, descuentoIGV: 0,
  baseExonerado: 0, baseInafecto: 0, baseIVAP: 0, ivap: 0,
  totalBase: 0, totalIGV: 0, totalGeneral: 0,
  totalFacturas: 0, totalNotasCredito: 0
})

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export function SireAnalyzer() {
  const { toast } = useToast()
  const [currentModule, setCurrentModule] = useState<'compras' | 'ventas'>('compras')
  const [activeTab, setActiveTab] = useState('paste')
  const [pasteArea, setPasteArea] = useState('')
  const [roundingPDT, setRoundingPDT] = useState(false)
  const [results, setResults] = useState<AnalysisResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── localStorage: restaurar al cambiar de módulo ──────────
  useEffect(() => {
    try {
      const key = STORAGE_KEYS[currentModule]
      const raw = localStorage.getItem(key)
      if (raw) {
        const data = JSON.parse(raw) as AnalysisResult
        setResults(data)
      } else {
        setResults(null)
      }
    } catch { setResults(null) }
  }, [currentModule])

  // ── Helpers de conversión (idénticos a app.js) ────────────
  const smartConvert = (cell: unknown): string | number => {
    if (cell === null || cell === undefined) return ""
    let str = String(cell).trim().replace(/"/g, '')
    if (str === "") return ""
    if ((str.includes('/') || str.includes('-')) && str.length >= 8 && isNaN(Number(str))) return str
    const numericLike = str.replace(/,/g, '').replace(/\./g, '')
    if ((str.startsWith('0') && str.length > 1 && str[1] !== '.') || isNaN(Number(numericLike))) {
      if (isNaN(Number(numericLike))) return str
      if (str.startsWith('0') && !str.startsWith('0.')) return str
    }
    let normalized = str
    if (str.includes(',') && !str.includes('.') && /,\d{1,2}$/.test(str)) {
      normalized = str.replace(/\./g, '').replace(',', '.')
    } else {
      normalized = str.replace(/,/g, '')
    }
    if (!isNaN(Number(normalized)) && normalized !== "") return parseFloat(normalized)
    return str
  }

  const splitRow = (line: string, separator: string): string[] => {
    if (separator === '\t') {
      let cols = line.split('\t')
      if (cols.length < 5 && line.includes('  ')) cols = line.split(/\s{2,}/)
      return cols
    }
    return line.split(separator)
  }

  const esDocumentoIdentidadValido = (doc: string): boolean => {
    if (!doc) return false
    const clean = String(doc).replace(/\D/g, '')
    return clean.length >= 8
  }

  // ── Detectar Razón Social ─────────────────────────────────
  const detectarMejorRazonSocial = (razonCandidates: number[], lines: string[], headerIndex: number, separator: string): number => {
    const samplesEnd = Math.min(lines.length, headerIndex + 51)
    const stats = razonCandidates.map(idx => ({ idx, distinct: new Set<string>(), nonEmpty: 0, hasLetters: 0 }))
    for (let k = headerIndex + 1; k < samplesEnd; k++) {
      if (!lines[k]?.trim()) continue
      const cols = splitRow(lines[k], separator)
      stats.forEach(s => {
        if (s.idx >= cols.length) return
        const raw = String(cols[s.idx] || '').trim().toUpperCase()
        if (!raw) return
        s.nonEmpty++
        if (/[A-ZÁÉÍÓÚÑ]/.test(raw)) { s.hasLetters++; s.distinct.add(raw) }
      })
    }
    let best = stats[0]
    stats.forEach(s => {
      if (s.hasLetters > best.hasLetters) best = s
      else if (s.hasLetters === best.hasLetters && s.distinct.size > best.distinct.size) best = s
    })
    return best ? best.idx : -1
  }

  const detectarRazonSocialComprasPorContenido = (lines: string[], separator: string, headerIndex: number): number => {
    if (!lines[headerIndex]) return -1
    const headers = splitRow(lines[headerIndex], separator)
    const colCount = headers.length
    if (colCount === 0) return -1
    const stats: { idx: number; distinct: Set<string>; letters: number; numericLike: number; currencyLike: number; nonEmpty: number }[] = []
    for (let i = 0; i < colCount; i++) stats.push({ idx: i, distinct: new Set(), letters: 0, numericLike: 0, currencyLike: 0, nonEmpty: 0 })
    const end = Math.min(lines.length, headerIndex + 201)
    for (let r = headerIndex + 1; r < end; r++) {
      if (!lines[r]?.trim()) continue
      const cols = splitRow(lines[r], separator)
      for (let c = 0; c < colCount; c++) {
        if (c >= cols.length) continue
        const raw = String(cols[c] || '').trim()
        if (!raw) continue
        const upper = raw.toUpperCase()
        const st = stats[c]
        st.nonEmpty++
        if (/[A-ZÁÉÍÓÚÑ]/.test(upper)) st.letters++
        if (/^-?[0-9.,]+$/.test(raw.replace(/\s+/g, ''))) st.numericLike++
        if (/^(PEN|USD|EUR)$/.test(upper)) st.currencyLike++
        st.distinct.add(upper)
      }
    }
    const candidates = stats.filter(s => {
      if (s.nonEmpty === 0) return false
      const lr = s.letters / s.nonEmpty; const nr = s.numericLike / s.nonEmpty; const cr = s.currencyLike / s.nonEmpty
      return lr >= 0.5 && nr < 0.7 && cr < 0.5 && s.distinct.size >= 3
    })
    if (candidates.length === 0) return -1
    let best = candidates[0]
    candidates.forEach(c => {
      if (c.distinct.size > best.distinct.size) best = c
      else if (c.distinct.size === best.distinct.size && c.letters > best.letters) best = c
    })
    return best.idx
  }

  // ── buscarColumnasCompras ─────────────────────────────────
  const buscarColumnasCompras = (lines: string[], separator: string) => {
    const map: Record<string, number> = {
      headerIndex: -1, razonSocial: -1, ruc: -1, tipoDoc: -1,
      baseDG: -1, igvDG: -1, baseDGNG: -1, igvDGNG: -1,
      baseDNG: -1, igvDNG: -1, valorNG: -1,
      isc: -1, icbper: -1, otrosTrib: -1, totalCP: -1, tipoNota: -1
    }
    const keywords: Record<string, string[]> = {
      razonSocial: ['RAZON SOCIAL', 'RAZÓN SOCIAL', 'APELLIDOS NOMBRES', 'APELLIDOS Y NOMBRES', 'DENOMINACION', 'DENOMINACIÓN', 'PROVEEDOR'],
      ruc: ['NRO DOC IDENTIDAD', 'NRO DOC. IDENTIDAD', 'NRO DOC', 'NRO DOCUMENTO', 'NUM DOC', 'NUMERO DOCUMENTO', 'N° DOCUMENTO', 'Nº DOCUMENTO'],
      tipoDoc: ['TIPO CP', 'TIPO CP/DOC'],
      baseDG: ['BI GRAVADO DG'],
      igvDG: ['IGV / IPM DG', 'IGV/IPM DG'],
      baseDGNG: ['BI GRAVADO DGNG'],
      igvDGNG: ['IGV / IPM DGNG', 'IGV/IPM DGNG'],
      baseDNG: ['BI GRAVADO DNG'],
      igvDNG: ['IGV / IPM DNG', 'IGV/IPM DNG'],
      valorNG: ['VALOR ADQ. NG', 'VALOR ADQ NG'],
      isc: ['ISC'],
      icbper: ['ICBPER'],
      otrosTrib: ['OTROS TRIB'],
      totalCP: ['TOTAL CP'],
      tipoNota: ['TIPO DE NOTA']
    }
    for (let i = 0; i < Math.min(lines.length, 50); i++) {
      const row = lines[i].toUpperCase()
      if (row.includes('BI GRAVADO DG') && (row.includes('IGV / IPM DG') || row.includes('IGV/IPM DG'))) {
        map.headerIndex = i
        const headers = splitRow(lines[i], separator).map(h => h.trim().toUpperCase())
        const razonCandidates: number[] = []
        headers.forEach((h, idx) => {
          Object.keys(keywords).forEach(key => {
            if (keywords[key].some(kw => h.includes(kw))) {
              if (key === 'razonSocial') razonCandidates.push(idx)
              if (map[key] === -1) map[key] = idx
            }
          })
        })
        const proveedorIdx = headers.findIndex(h => {
          const norm = h.replace(/\s+/g, ' ')
          return norm.includes('APELLIDOS NOMBRES/ RAZÓN SOCIAL') || norm.includes('APELLIDOS NOMBRES/ RAZON SOCIAL')
        })
        if (proveedorIdx !== -1) {
          map.razonSocial = proveedorIdx
        } else {
          if (razonCandidates.length > 0) map.razonSocial = detectarMejorRazonSocial(razonCandidates, lines, i, separator)
          if (map.ruc !== -1 && map.razonSocial === -1) {
            const hRow = splitRow(lines[i], separator)
            if (map.ruc + 1 < hRow.length) map.razonSocial = map.ruc + 1
          }
          if (map.razonSocial === -1) map.razonSocial = detectarRazonSocialComprasPorContenido(lines, separator, i)
        }
        break
      }
    }
    return map
  }

  // ── buscarColumnasVentas ──────────────────────────────────
  const buscarColumnasVentas = (lines: string[], separator: string) => {
    const map: Record<string, number> = {
      headerIndex: -1, razonSocial: -1, ruc: -1, tipoDoc: -1,
      valorExport: -1, baseGravada: -1, descuentoBI: -1, igv: -1, descuentoIGV: -1,
      exonerado: -1, inafecto: -1, isc: -1, baseIVAP: -1, ivap: -1,
      icbper: -1, otrosTrib: -1, totalCP: -1, tipoNota: -1
    }
    const keywords: Record<string, string[]> = {
      razonSocial: ['RAZON SOCIAL', 'RAZÓN SOCIAL', 'APELLIDOS NOMBRES', 'APELLIDOS Y NOMBRES', 'DENOMINACION', 'DENOMINACIÓN'],
      ruc: ['NRO DOC.', 'NRO DOC', 'NRO DOCUMENTO', 'NUM DOC', 'NUMERO DOCUMENTO', 'N° DOCUMENTO', 'Nº DOCUMENTO', 'RUC', 'NUMERO DOCUMENTO IDENTIDAD', 'NÚMERO DOCUMENTO IDENTIDAD', 'DOC. IDENTIDAD', 'DOCUMENTO IDENTIDAD'],
      tipoDoc: ['TIPO CP', 'TIPO CP/DOC'],
      valorExport: ['VALOR FACTURADO EXPORTACION', 'VALOR FACTURADO EXPORTACIÓN'],
      baseGravada: ['BI GRAVADA', 'BI GRAVADO', 'BASE IMPONIBLE'],
      descuentoBI: ['DSCTO BI', 'DESCUENTO BI'],
      igv: ['IGV / IPM', 'IGV/IPM', 'IGV ', ' IGV', 'IMPUESTO GENERAL'],
      descuentoIGV: ['DSCTO IGV', 'DESCUENTO IGV'],
      exonerado: ['MTO EXONERADO', 'MONTO EXONERADO', 'EXONERADO'],
      inafecto: ['MTO INAFECTO', 'MONTO INAFECTO', 'INAFECTO'],
      isc: ['ISC'],
      baseIVAP: ['BI GRAV IVAP', 'BASE IMPONIBLE IVAP'],
      ivap: ['IVAP'],
      icbper: ['ICBPER'],
      otrosTrib: ['OTROS TRIBUTOS'],
      totalCP: ['TOTAL CP', 'IMPORTE TOTAL'],
      tipoNota: ['TIPO DE NOTA']
    }
    for (let i = 0; i < Math.min(lines.length, 50); i++) {
      const row = lines[i].toUpperCase()
      const hasBase = row.includes('BI GRAVADA') || row.includes('BI GRAVADO') || row.includes('BASE IMPONIBLE')
      const hasIgv = row.includes('IGV / IPM') || row.includes('IGV/IPM') || row.includes(' IGV') || row.includes('IMPUESTO GENERAL')
      if (hasBase && hasIgv) {
        map.headerIndex = i
        const headers = splitRow(lines[i], separator).map(h => h.trim().toUpperCase())
        const razonCandidates: number[] = []
        headers.forEach((h, idx) => {
          Object.keys(keywords).forEach(key => {
            if (keywords[key].some(kw => h.includes(kw))) {
              if (key === 'razonSocial') razonCandidates.push(idx)
              if (map[key] === -1) map[key] = idx
            }
          })
        })
        if (razonCandidates.length > 0) map.razonSocial = detectarMejorRazonSocial(razonCandidates, lines, i, separator)
        break
      }
    }
    // Fallback RUC
    if (map.headerIndex !== -1 && map.ruc === -1) {
      const score: Record<number, number> = {}
      for (let i = map.headerIndex + 1; i < Math.min(lines.length, map.headerIndex + 201); i++) {
        if (!lines[i]?.trim()) continue
        splitRow(lines[i], separator).forEach((c, idx) => {
          const clean = String(c || '').replace(/\D/g, '')
          if (clean.length >= 8 && clean.length <= 11) score[idx] = (score[idx] || 0) + 1
        })
      }
      let bestIdx = -1, bestScore = 0
      Object.entries(score).forEach(([k, v]) => { if (v > bestScore) { bestScore = v; bestIdx = parseInt(k, 10) } })
      if (bestIdx !== -1 && bestScore >= 3) map.ruc = bestIdx
    }
    return map
  }

  // ── ajustarMapeoVentasPorPatron ───────────────────────────
  const ajustarMapeoVentasPorPatron = (lines: string[], separator: string, map: Record<string, number>): { map: Record<string, number>; notice: string } => {
    if (map.headerIndex === -1) return { map, notice: '' }
    const maxRows = Math.min(lines.length, map.headerIndex + 201)
    const muestras: (string | number)[][] = []
    for (let i = map.headerIndex + 1; i < maxRows; i++) {
      if (!lines[i]?.trim()) continue
      muestras.push(splitRow(lines[i], separator).map(c => smartConvert(c)))
      if (muestras.length >= 200) break
    }
    if (muestras.length === 0) return { map, notice: '' }
    const colNums: Record<number, number> = {}
    muestras.forEach(row => row.forEach((val, idx) => {
      if (typeof val === 'number' && !isNaN(val) && val !== 0) colNums[idx] = (colNums[idx] || 0) + 1
    }))
    const candidatos = Object.entries(colNums).filter(([, v]) => v >= 3).map(([k]) => parseInt(k, 10))
    if (candidatos.length === 0) return { map, notice: '' }
    const evaluarPar = (bIdx: number, iIdx: number): number => {
      let match = 0
      muestras.forEach(row => {
        if (bIdx >= row.length || iIdx >= row.length) return
        const base = parseFloat(String(row[bIdx])) || 0
        const igv = parseFloat(String(row[iIdx])) || 0
        if (base === 0 || igv === 0) return
        const p = Math.abs(igv / base)
        if ((p >= 0.17 && p <= 0.19) || (p >= 0.09 && p <= 0.11)) match++
      })
      return match
    }
    let mejorBase = map.baseGravada, mejorIgv = map.igv
    let mejorMatch = (map.baseGravada !== -1 && map.igv !== -1) ? evaluarPar(map.baseGravada, map.igv) : 0
    candidatos.forEach(bIdx => candidatos.forEach(iIdx => {
      if (bIdx === iIdx) return
      const m = evaluarPar(bIdx, iIdx)
      if (m > mejorMatch) { mejorMatch = m; mejorBase = bIdx; mejorIgv = iIdx }
    }))
    if (mejorMatch >= 5 && (mejorBase !== map.baseGravada || mejorIgv !== map.igv)) {
      map.baseGravada = mejorBase; map.igv = mejorIgv
      return { map, notice: 'Se ajustó automáticamente el mapeo de Base e IGV según proporciones 18% y 10.5%.' }
    }
    return { map, notice: '' }
  }

  // ── extraerMontosVentasDesdeLinea ─────────────────────────
  const extraerMontosVentasDesdeLinea = (line: string) => {
    if (!line?.trim()) return null
    const tokens = line.trim().split(/\s+/)
    let cIdx = -1
    for (let i = tokens.length - 1; i >= 0; i--) {
      const t = tokens[i].toUpperCase()
      if (t === 'PEN' || t === 'USD' || t === 'EUR') { cIdx = i; break }
    }
    if (cIdx === -1) return null
    const parseNum = (idx: number): number => {
      if (idx < 0 || idx >= tokens.length) return 0
      const raw = tokens[idx]
      let str = String(raw).trim().replace(/"/g, '')
      if (!str) return 0
      const norm = str.includes(',') && !str.includes('.') && /,\d{1,2}$/.test(str)
        ? str.replace(/\./g, '').replace(',', '.')
        : str.replace(/,/g, '')
      return parseFloat(norm) || 0
    }
    return {
      valorExport:   parseNum(cIdx - 13),
      baseGravada:   parseNum(cIdx - 12),
      descuentoBI:   parseNum(cIdx - 11),
      igv:           parseNum(cIdx - 10),
      descuentoIGV:  parseNum(cIdx - 9),
      exonerado:     parseNum(cIdx - 8),
      inafecto:      parseNum(cIdx - 7),
      isc:           parseNum(cIdx - 6),
      baseIVAP:      parseNum(cIdx - 5),
      ivap:          parseNum(cIdx - 4),
      icbper:        parseNum(cIdx - 3),
      otrosTrib:     parseNum(cIdx - 2),
      totalCP:       parseNum(cIdx - 1)
    }
  }

  // ── extraerRucYRazonDesdeLinea ────────────────────────────
  const extraerRucYRazonDesdeLinea = (line: string): { ruc: string; razonSocial: string } | null => {
    if (!line?.trim()) return null
    const tokens = line.trim().split(/\s+/)
    let cIdx = -1
    for (let i = tokens.length - 1; i >= 0; i--) {
      const t = tokens[i].toUpperCase()
      if (t === 'PEN' || t === 'USD' || t === 'EUR') { cIdx = i; break }
    }
    if (cIdx === -1) return null
    const metaEnd = cIdx - 13
    if (metaEnd <= 0) return null
    let razonStart = -1
    for (let i = metaEnd - 1; i >= 0; i--) { if (/[A-ZÁÉÍÓÚÑ]/.test(tokens[i].toUpperCase())) { razonStart = i; break } }
    if (razonStart === -1) return null
    let startName = razonStart
    while (startName - 1 >= 0 && /[A-ZÁÉÍÓÚÑ]/.test(tokens[startName - 1].toUpperCase())) startName--
    let ruc = ''
    for (let i = startName - 1; i >= 0; i--) {
      const clean = tokens[i].replace(/\D/g, '')
      if (clean.length >= 8 && clean.length <= 15) { ruc = clean; break }
    }
    const razonSocial = tokens.slice(startName, metaEnd).join(' ')
    if (!razonSocial && !ruc) return null
    return { ruc, razonSocial }
  }

  // ── analizarEstructuraVentas ──────────────────────────────
  const analizarEstructuraVentas = (lines: string[], separator: string, map: Record<string, number>): ValidationResult => {
    const result: ValidationResult = { issues: [], suggestions: [] }
    if (map.headerIndex === -1) { result.issues.push('No se encontró la fila de encabezados de ventas.'); return result }
    ;['ruc', 'tipoDoc', 'baseGravada', 'igv', 'totalCP'].forEach(key => {
      if (map[key] === -1) result.issues.push(`Falta la columna requerida de ventas: ${key}.`)
    })
    const maxRows = Math.min(lines.length, map.headerIndex + 201)
    const tasasInvalidas = { count: 0, total: 0 }
    const tipoDocSet = new Set<string>()
    for (let i = map.headerIndex + 1; i < maxRows; i++) {
      if (!lines[i]?.trim()) continue
      const typed = splitRow(lines[i], separator).map(c => smartConvert(c))
      if (map.baseGravada !== -1 && map.igv !== -1 && map.baseGravada < typed.length && map.igv < typed.length) {
        const base = parseFloat(String(typed[map.baseGravada])) || 0
        const igv = parseFloat(String(typed[map.igv])) || 0
        if (base !== 0 && igv !== 0) {
          tasasInvalidas.total++
          const p = Math.abs(igv / base)
          if (p < 0.05 || p > 0.25) tasasInvalidas.count++
        }
      }
      if (map.tipoDoc !== -1 && map.tipoDoc < typed.length) {
        const v = String(typed[map.tipoDoc] || '').trim()
        if (v) tipoDocSet.add(v)
      }
    }
    if (tasasInvalidas.total > 0 && tasasInvalidas.count / tasasInvalidas.total > 0.3) {
      result.issues.push('Se detectaron proporciones IGV/Base fuera del rango esperado en múltiples filas.')
      result.suggestions.push('Verifica que las columnas de Base e IGV estén correctamente mapeadas y que el separador decimal sea correcto.')
    }
    const catalogoOK = new Set(['01', '03', '07', '08', '12', '13', '14', '15'])
    const desconocidos: string[] = []
    tipoDocSet.forEach(v => { const c = v.replace(/\D/g, ''); if (c && !catalogoOK.has(c)) desconocidos.push(v) })
    if (desconocidos.length > 0) {
      result.issues.push('Se encontraron códigos de tipo de comprobante que no coinciden con el catálogo SUNAT.')
      result.suggestions.push('Revisa la columna "Tipo CP/Doc." y verifica que use códigos SUNAT válidos.')
    }
    return result
  }

  // ── PROCESAMIENTO PRINCIPAL ───────────────────────────────
  const processText = useCallback((rawData: string) => {
    setIsProcessing(true)
    // Usamos setTimeout para no bloquear el hilo principal de la UI
    setTimeout(() => {
      try {
        const lines = rawData.split(/\r\n|\n/)
        if (lines.length < 2) throw new Error("El archivo está vacío o incompleto.")

        // Detectar separador
        let separator = '\t'
        const firstNonEmpty = lines.find(l => l?.trim()) || ''
        if (firstNonEmpty.includes('|')) separator = '|'
        else if (firstNonEmpty.includes(';')) separator = ';'
        else if (firstNonEmpty.includes(',') && /RUC|RAZON|RAZÓN|BI GRAVADA/i.test(firstNonEmpty)) separator = ','

        const validation: ValidationResult = { issues: [], suggestions: [] }

        let columnMap: Record<string, number>
        if (currentModule === 'compras') {
          columnMap = buscarColumnasCompras(lines, separator)
        } else {
          columnMap = buscarColumnasVentas(lines, separator)
          const ajuste = ajustarMapeoVentasPorPatron(lines, separator, columnMap)
          columnMap = ajuste.map
          if (ajuste.notice) validation.suggestions.push(ajuste.notice)
          const diag = analizarEstructuraVentas(lines, separator, columnMap)
          validation.issues.push(...diag.issues)
          validation.suggestions.push(...diag.suggestions)
        }

        if (columnMap.headerIndex === -1) throw new Error(`No se encontraron columnas requeridas para ${currentModule}. Incluye la fila de encabezados del SIRE.`)
        
        const headers = splitRow(lines[columnMap.headerIndex], separator).map(h => h.trim().replace(/"/g, ''))
        const summary = emptySummary()
        const rows: SireRow[] = []
        const rawAll: (string | number)[][] = []

        // Optimizamos el procesamiento de filas
        const linesToProcess = lines.slice(columnMap.headerIndex + 1)
        
        for (let i = 0; i < linesToProcess.length; i++) {
          const rawLine = linesToProcess[i]
          if (!rawLine?.trim()) continue

          // Para ventas con separador TAB: validar que la línea tiene moneda
          if (currentModule === 'ventas' && separator === '\t') {
            const montosPreview = extraerMontosVentasDesdeLinea(rawLine)
            if (!montosPreview) continue
          }

          const rawCols = splitRow(rawLine, separator)
          const typedCols = rawCols.map(c => smartConvert(c))
          rawAll.push(typedCols)

          if (currentModule === 'compras') {
            // Lógica de compras
            const razonSocial = columnMap.razonSocial !== -1 ? String(typedCols[columnMap.razonSocial] || '') : ''
            const ruc = columnMap.ruc !== -1 ? String(typedCols[columnMap.ruc] || '').trim() : ''
            const tipoDoc = columnMap.tipoDoc !== -1 ? String(typedCols[columnMap.tipoDoc] || '') : ''
            const tipoNota = columnMap.tipoNota !== -1 ? String(typedCols[columnMap.tipoNota] || '') : ''
            const baseDG = parseFloat(String(typedCols[columnMap.baseDG])) || 0
            const igvDG = parseFloat(String(typedCols[columnMap.igvDG])) || 0
            
            const baseDGNG = columnMap.baseDGNG !== -1 ? (parseFloat(String(typedCols[columnMap.baseDGNG])) || 0) : 0
            const igvDGNG = columnMap.igvDGNG !== -1 ? (parseFloat(String(typedCols[columnMap.igvDGNG])) || 0) : 0
            const baseDNG = columnMap.baseDNG !== -1 ? (parseFloat(String(typedCols[columnMap.baseDNG])) || 0) : 0
            const igvDNG = columnMap.igvDNG !== -1 ? (parseFloat(String(typedCols[columnMap.igvDNG])) || 0) : 0
            const valorNG = columnMap.valorNG !== -1 ? (parseFloat(String(typedCols[columnMap.valorNG])) || 0) : 0
            const isc = columnMap.isc !== -1 ? (parseFloat(String(typedCols[columnMap.isc])) || 0) : 0
            const icbper = columnMap.icbper !== -1 ? (parseFloat(String(typedCols[columnMap.icbper])) || 0) : 0
            const otrosTrib = columnMap.otrosTrib !== -1 ? (parseFloat(String(typedCols[columnMap.otrosTrib])) || 0) : 0
            const totalCP = columnMap.totalCP !== -1 ? (parseFloat(String(typedCols[columnMap.totalCP])) || 0) : 0
            
            const esNotaCredito = tipoDoc === '07' || /CREDITO/i.test(tipoNota) || baseDG < 0 || igvDG < 0

            const registro: SireRow = {
              razonSocial, ruc, tipoDoc, esNotaCredito, tasa: 0, invalido: false,
              baseDG, igvDG, baseDGNG, igvDGNG, baseDNG, igvDNG, valorNG,
              valorExport: 0, baseGravada: 0, igv: 0, descuentoBI: 0, descuentoIGV: 0,
              exonerado: 0, inafecto: 0, baseIVAP: 0, ivap: 0,
              isc, icbper, otrosTrib, totalCP
            }

            if (baseDG !== 0 && igvDG !== 0) {
              const prop = Math.abs(igvDG / baseDG)
              if (prop >= 0.17 && prop <= 0.19) { registro.tasa = 18; summary.base18 += baseDG; summary.igv18 += igvDG }
              else if (prop >= 0.09 && prop <= 0.11) { registro.tasa = 10.5; summary.base105 += baseDG; summary.igv105 += igvDG }
            }

            summary.baseDGNG += baseDGNG
            summary.igvDGNG += igvDGNG
            summary.baseDNG += baseDNG
            summary.igvDNG += igvDNG
            summary.valorNoGravado += valorNG
            summary.isc += isc
            summary.icbper += icbper
            summary.otrosTributos += otrosTrib

            const esValido = esDocumentoIdentidadValido(ruc) && (
              baseDG !== 0 || igvDG !== 0 || baseDGNG !== 0 || igvDGNG !== 0 ||
              baseDNG !== 0 || igvDNG !== 0 || valorNG !== 0 || totalCP !== 0
            )
            if (esValido) { if (esNotaCredito) summary.totalNotasCredito++; else summary.totalFacturas++ }
            rows.push(registro)

          } else {
            // Lógica de ventas
            let razonSocial = columnMap.razonSocial !== -1 ? String(typedCols[columnMap.razonSocial] || '') : ''
            let ruc = columnMap.ruc !== -1 ? String(typedCols[columnMap.ruc] || '').trim() : ''
            const tipoDoc = columnMap.tipoDoc !== -1 ? String(typedCols[columnMap.tipoDoc] || '') : ''
            const tipoNota = columnMap.tipoNota !== -1 ? String(typedCols[columnMap.tipoNota] || '') : ''

            const montos = extraerMontosVentasDesdeLinea(rawLine)
            const docInfo = extraerRucYRazonDesdeLinea(rawLine)
            if (docInfo) { if (docInfo.razonSocial) razonSocial = docInfo.razonSocial; if (docInfo.ruc) ruc = docInfo.ruc }

            let valorExport = 0, baseGravada = 0, descuentoBI = 0, igv = 0, descuentoIGV = 0
            let exonerado = 0, inafecto = 0, isc = 0, baseIVAP = 0, ivap = 0, icbper = 0, otrosTrib = 0, totalCP = 0

            if (montos) {
              valorExport = montos.valorExport; baseGravada = montos.baseGravada; descuentoBI = montos.descuentoBI
              igv = montos.igv; descuentoIGV = montos.descuentoIGV; exonerado = montos.exonerado
              inafecto = montos.inafecto; isc = montos.isc; baseIVAP = montos.baseIVAP
              ivap = montos.ivap; icbper = montos.icbper; otrosTrib = montos.otrosTrib; totalCP = montos.totalCP
            } else {
              valorExport = columnMap.valorExport !== -1 ? (parseFloat(String(typedCols[columnMap.valorExport])) || 0) : 0
              baseGravada = columnMap.baseGravada !== -1 ? (parseFloat(String(typedCols[columnMap.baseGravada])) || 0) : 0
              descuentoBI = columnMap.descuentoBI !== -1 ? (parseFloat(String(typedCols[columnMap.descuentoBI])) || 0) : 0
              igv = columnMap.igv !== -1 ? (parseFloat(String(typedCols[columnMap.igv])) || 0) : 0
              descuentoIGV = columnMap.descuentoIGV !== -1 ? (parseFloat(String(typedCols[columnMap.descuentoIGV])) || 0) : 0
              exonerado = columnMap.exonerado !== -1 ? (parseFloat(String(typedCols[columnMap.exonerado])) || 0) : 0
              inafecto = columnMap.inafecto !== -1 ? (parseFloat(String(typedCols[columnMap.inafecto])) || 0) : 0
              isc = columnMap.isc !== -1 ? (parseFloat(String(typedCols[columnMap.isc])) || 0) : 0
              baseIVAP = columnMap.baseIVAP !== -1 ? (parseFloat(String(typedCols[columnMap.baseIVAP])) || 0) : 0
              ivap = columnMap.ivap !== -1 ? (parseFloat(String(typedCols[columnMap.ivap])) || 0) : 0
              icbper = columnMap.icbper !== -1 ? (parseFloat(String(typedCols[columnMap.icbper])) || 0) : 0
              otrosTrib = columnMap.otrosTrib !== -1 ? (parseFloat(String(typedCols[columnMap.otrosTrib])) || 0) : 0
              totalCP = columnMap.totalCP !== -1 ? (parseFloat(String(typedCols[columnMap.totalCP])) || 0) : 0
            }

            const esNotaCredito = tipoDoc === '07' || /CREDITO/i.test(tipoNota) || baseGravada < 0 || igv < 0 || totalCP < 0
            const registro: SireRow = {
              razonSocial, ruc, tipoDoc, esNotaCredito, tasa: 0, invalido: false,
              baseDG: 0, igvDG: 0, baseDGNG: 0, igvDGNG: 0, baseDNG: 0, igvDNG: 0, valorNG: 0,
              valorExport, baseGravada, igv, descuentoBI, descuentoIGV,
              exonerado, inafecto, baseIVAP, ivap,
              isc, icbper, otrosTrib, totalCP
            }

            let proporcion = 0
            if (baseGravada !== 0 && igv !== 0) {
              proporcion = Math.abs(igv / baseGravada)
              if (proporcion >= 0.17 && proporcion <= 0.19) registro.tasa = 18
              else if (proporcion >= 0.09 && proporcion <= 0.11) registro.tasa = 10.5
            }
            if (!esNotaCredito && proporcion !== 0 && (proporcion < 0.05 || proporcion > 0.25)) registro.invalido = true

            const esValido = esDocumentoIdentidadValido(ruc) && (
              baseGravada !== 0 || igv !== 0 || valorExport !== 0 || exonerado !== 0 || inafecto !== 0 || totalCP !== 0
            )
            if (esValido) { if (esNotaCredito) summary.totalNotasCredito++; else summary.totalFacturas++ }
            rows.push(registro)
          }
        }

        // Recomputar totales finales
        if (currentModule === 'ventas') {
          summary.base18 = 0; summary.igv18 = 0; summary.base105 = 0; summary.igv105 = 0
          summary.valorExportacion = 0; summary.descuentoBI = 0; summary.descuentoIGV = 0
          summary.baseExonerado = 0; summary.baseInafecto = 0; summary.isc = 0
          summary.baseIVAP = 0; summary.ivap = 0; summary.icbper = 0; summary.otrosTributos = 0
          rows.forEach(r => {
            if (r.invalido) return
            if (r.tasa === 18) { summary.base18 += r.baseGravada; summary.igv18 += r.igv }
            else if (r.tasa === 10.5) { summary.base105 += r.baseGravada; summary.igv105 += r.igv }
            summary.valorExportacion += r.valorExport || 0
            summary.baseExonerado += r.exonerado || 0
            summary.baseInafecto += r.inafecto || 0
            summary.isc += r.isc || 0
            summary.baseIVAP += r.baseIVAP || 0
            summary.ivap += r.ivap || 0
            summary.icbper += r.icbper || 0
            summary.otrosTributos += r.otrosTrib || 0
          })
        }

        if (currentModule === 'compras') {
          summary.totalBase = summary.base18 + summary.base105 + summary.baseDGNG + summary.baseDNG
          summary.totalIGV = summary.igv18 + summary.igv105 + summary.igvDGNG + summary.igvDNG
          summary.totalGeneral = summary.totalBase + summary.totalIGV + summary.valorNoGravado + summary.isc + summary.icbper + summary.otrosTributos
        } else {
          summary.totalBase = summary.base18 + summary.base105
          summary.totalIGV = summary.igv18 + summary.igv105
          summary.totalGeneral = rows.reduce((acc, r) => acc + (r.invalido ? 0 : (r.totalCP || 0)), 0)
        }

        const analysisResult: AnalysisResult = { summary, rows, rawAll, headers, validation, module: currentModule }
        
        setResults(analysisResult)
        toast({ title: "✅ Procesamiento exitoso", description: `Se analizaron ${rows.length} registros.` })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        toast({ variant: "destructive", title: "❌ Error al procesar", description: msg })
      } finally {
        setIsProcessing(false)
      }
    }, 0)
  }, [currentModule, toast]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Carga de archivo ──────────────────────────────────────
  const readFile = useCallback((file: File) => {
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    if (ext === 'pdf') { toast({ variant: "destructive", title: "PDF no soportado", description: "Exporta el detalle a Excel/TXT y vuelve a intentar." }); return }
    if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader()
      reader.onload = e => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const csv = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]], { FS: '\t' })
        processText(csv)
      }
      reader.readAsArrayBuffer(file)
    } else {
      const reader = new FileReader()
      reader.onload = e => processText(e.target?.result as string)
      reader.readAsText(file, 'utf-8')
    }
  }, [processText])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (file) readFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files?.[0]; if (file) readFile(file)
  }

  // ── Descarga Excel ────────────────────────────────────────
  const downloadExcel = () => {
    if (!results) return
    const wb = XLSX.utils.book_new()
    const s = results.summary
    const mod = results.module.toUpperCase()
    const summaryData = [
      [`RESUMEN ANÁLISIS SIRE - ${mod}`], [''],
      ['Concepto', 'Base Imponible', 'IGV', 'Total'],
      ['Régimen 18%', s.base18, s.igv18, s.base18 + s.igv18],
      ['Tasa 10.5%', s.base105, s.igv105, s.base105 + s.igv105],
      ...(results.module === 'compras' ? [
        ['Base DGNG', s.baseDGNG, s.igvDGNG, s.baseDGNG + s.igvDGNG],
        ['Base DNG', s.baseDNG, s.igvDNG, s.baseDNG + s.igvDNG],
        ['Valor No Gravado', s.valorNoGravado, '', ''],
      ] : [
        ['Valor Exportación', s.valorExportacion, '', ''],
        ['Exonerado', s.baseExonerado, '', ''],
        ['Inafecto', s.baseInafecto, '', ''],
        ['Base IVAP', s.baseIVAP, s.ivap, ''],
      ]),
      ['ISC', s.isc, '', ''], ['ICBPER', s.icbper, '', ''], ['Otros Tributos', s.otrosTributos, '', ''],
      [''], ['Total Base', s.totalBase, '', ''], ['Total IGV', s.totalIGV, '', ''],
      ['GRAN TOTAL', '', '', s.totalGeneral], [''],
      ['Comprobantes Válidos', s.totalFacturas], ['Notas de Crédito', s.totalNotasCredito]
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Resumen')
    const detailData = [results.headers, ...results.rawAll]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(detailData), 'Detalle')
    XLSX.writeFile(wb, `SIRE_${mod}_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  // ── Formato de moneda ─────────────────────────────────────
  const fmt = (val: number) => {
    const v = roundingPDT ? Math.round(val) : val
    return v.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  // ── Filas filtradas ───────────────────────────────────────
  const filteredRows = useMemo(() => {
    if (!results) return []
    return results.rows.filter(r =>
      r.razonSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.ruc.includes(searchTerm)
    )
  }, [results, searchTerm])

  const isCompras = currentModule === 'compras'

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="flex flex-col space-y-6 p-4 max-w-7xl mx-auto">

      {/* ── HEADER ── */}
      <Card className="border shadow-md overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className={cn("p-2.5 rounded-xl", isCompras ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600")}>
                {isCompras ? <ShoppingBag className="w-6 h-6" /> : <TrendingUp className="w-6 h-6" />}
              </div>
              <div>
                <CardTitle className="text-xl font-black">SIRE SUITE PROFESIONAL V10.0</CardTitle>
                <CardDescription className="font-semibold text-sm">
                  Analizador de {isCompras ? 'Compras' : 'Ventas'} SUNAT — PDT 621
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-muted/60 p-1 rounded-xl border">
              <Button
                variant={isCompras ? "default" : "ghost"} size="sm"
                onClick={() => { setCurrentModule('compras'); setPasteArea(''); setSearchTerm('') }}
                className="rounded-lg font-bold gap-2"
              >
                <ShoppingBag className="w-4 h-4" /> Compras
              </Button>
              <Button
                variant={!isCompras ? "default" : "ghost"} size="sm"
                onClick={() => { setCurrentModule('ventas'); setPasteArea(''); setSearchTerm('') }}
                className="rounded-lg font-bold gap-2"
              >
                <FileBarChart className="w-4 h-4" /> Ventas
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* ── INPUT ── */}
      {!results && (
        <Card className="border shadow-sm">
          <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50 p-1 rounded-xl">
                <TabsTrigger value="paste" className="rounded-lg font-bold">
                  <ClipboardPaste className="w-4 h-4 mr-2" /> Pegar Datos
                </TabsTrigger>
                <TabsTrigger value="upload" className="rounded-lg font-bold">
                  <Upload className="w-4 h-4 mr-2" /> Subir Archivo
                </TabsTrigger>
              </TabsList>

              <TabsContent value="paste" className="space-y-4">
                <Textarea
                  value={pasteArea}
                  onChange={e => setPasteArea(e.target.value)}
                  className="min-h-[280px] font-mono text-[11px] bg-muted/20 rounded-xl"
                  placeholder="📋 Pega aquí los datos del SIRE o Excel (incluye la fila de encabezados)..."
                />
                <Button className="w-full h-12 text-base font-bold" disabled={!pasteArea.trim() || isProcessing} onClick={() => processText(pasteArea)}>
                  {isProcessing ? <RefreshCw className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                  {isProcessing ? "PROCESANDO..." : "ANALIZAR DATOS"}
                </Button>
              </TabsContent>

              <TabsContent value="upload">
                <div
                  className={cn("border-2 border-dashed rounded-2xl p-16 text-center transition-all cursor-pointer relative flex flex-col items-center justify-center min-h-[320px]",
                    isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:bg-muted/30")}
                  onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" accept=".csv,.txt,.xlsx,.xls" />
                  <div className="p-8 bg-muted/50 rounded-2xl mb-6">
                    <Upload className="w-10 h-10 text-primary" />
                  </div>
                  <p className="text-xl font-bold">Arrastra tus archivos aquí</p>
                  <p className="text-sm text-muted-foreground mt-1">Excel (.xlsx, .xls) o Texto del SIRE (.txt, .csv)</p>
                  <Button variant="outline" className="mt-6 rounded-xl font-bold">Explorar Archivos</Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* ── RESULTADOS ── */}
      {results && (
        <div className="space-y-5">

          {/* Barra de acciones */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-card p-4 rounded-2xl border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-bold text-sm">Análisis Completado</p>
                <p className="text-xs text-muted-foreground">{results.rows.length} registros — {currentModule.toUpperCase()}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-xl border">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Redondear PDT</Label>
                <Switch checked={roundingPDT} onCheckedChange={setRoundingPDT} className="scale-75" />
              </div>
              <Button variant="outline" size="sm" onClick={downloadExcel} className="rounded-xl font-bold gap-2">
                <Download className="w-4 h-4" /> Exportar Excel
              </Button>
              <Button variant="outline" size="sm"
                onClick={() => { try { localStorage.removeItem(STORAGE_KEYS[currentModule]) } catch { } setResults(null) }}
                className="rounded-xl font-bold gap-2 border-red-200 text-red-500 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" /> Limpiar
              </Button>
            </div>
          </div>

          {/* Cards principales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard title="Régimen 18%" base={results.summary.base18} igv={results.summary.igv18} fmt={fmt} colorClass="border-l-blue-500" />
            <SummaryCard title="Tasa 10.5%" base={results.summary.base105} igv={results.summary.igv105} fmt={fmt} colorClass="border-l-orange-500" />
            <div className="p-5 rounded-2xl border-l-4 border-l-slate-400 bg-card shadow-sm hover:-translate-y-0.5 transition-all">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                {isCompras ? 'Total Base Gravada' : 'Total Base Imponible'}
              </p>
              <p className="text-2xl font-black tabular-nums">{fmt(results.summary.totalBase)}</p>
              <p className="text-xs text-muted-foreground mt-1">IGV Total: {fmt(results.summary.totalIGV)}</p>
            </div>
            <div className="p-5 rounded-2xl bg-primary text-primary-foreground shadow-md hover:-translate-y-0.5 transition-all">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-3">Gran Total Período</p>
              <p className="text-3xl font-black tabular-nums tracking-tight">{fmt(results.summary.totalGeneral)}</p>
            </div>
          </div>

          {/* Comprobantes y NC */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-6 bg-blue-50/60 dark:bg-blue-900/10 border border-blue-200 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Comprobantes Válidos</p>
                <p className="text-5xl font-black text-blue-700 tabular-nums">{results.summary.totalFacturas}</p>
              </div>
              <Receipt className="w-14 h-14 text-blue-400/20" />
            </div>
            <div className="p-6 bg-rose-50/60 dark:bg-rose-900/10 border border-rose-200 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest mb-1">Notas de Crédito</p>
                <p className="text-5xl font-black text-rose-700 tabular-nums">{results.summary.totalNotasCredito}</p>
              </div>
              <MinusCircle className="w-14 h-14 text-rose-400/20" />
            </div>
          </div>

          {/* Conceptos Adicionales */}
          {(() => {
            const s = results.summary
            const conceptos = isCompras
              ? [
                  s.baseDGNG > 0 && { label: 'BI Gravado DGNG', value: s.baseDGNG, igv: s.igvDGNG },
                  s.baseDNG > 0 && { label: 'BI Gravado DNG', value: s.baseDNG, igv: s.igvDNG },
                  s.valorNoGravado > 0 && { label: 'Valor No Gravado', value: s.valorNoGravado },
                  s.isc > 0 && { label: 'ISC', value: s.isc },
                  s.icbper > 0 && { label: 'ICBPER', value: s.icbper },
                  s.otrosTributos > 0 && { label: 'Otros Tributos', value: s.otrosTributos },
                ].filter(Boolean)
              : [
                  s.valorExportacion > 0 && { label: 'Valor Exportación', value: s.valorExportacion },
                  s.baseExonerado > 0 && { label: 'Monto Exonerado', value: s.baseExonerado },
                  s.baseInafecto > 0 && { label: 'Monto Inafecto', value: s.baseInafecto },
                  s.baseIVAP > 0 && { label: 'Base IVAP', value: s.baseIVAP, igv: s.ivap },
                  s.descuentoBI > 0 && { label: 'Descuento BI', value: s.descuentoBI },
                  s.descuentoIGV > 0 && { label: 'Descuento IGV', value: s.descuentoIGV },
                  s.isc > 0 && { label: 'ISC', value: s.isc },
                  s.icbper > 0 && { label: 'ICBPER', value: s.icbper },
                  s.otrosTributos > 0 && { label: 'Otros Tributos', value: s.otrosTributos },
                ].filter(Boolean)
            if (conceptos.length === 0) return null
            return (
              <Card className="border shadow-sm">
                <CardContent className="pt-5">
                  <h3 className="font-bold text-sm flex items-center gap-2 mb-4">
                    <Info className="w-4 h-4 text-blue-500" /> Conceptos Adicionales Detectados
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {(conceptos as { label: string; value: number; igv?: number }[]).map((c, i) => (
                      <div key={i} className="bg-muted/40 p-3 rounded-xl border">
                        <p className="text-[9px] font-bold uppercase text-muted-foreground mb-1">{c.label}</p>
                        <p className="text-lg font-black">{fmt(c.value)}</p>
                        {c.igv !== undefined && <p className="text-[9px] text-muted-foreground mt-0.5">IGV: {fmt(c.igv)}</p>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })()}

          {/* Reporte de Validación */}
          {(results.validation.issues.length > 0 || results.validation.suggestions.length > 0) && (
            <Card className="border border-amber-200 bg-amber-50/30 shadow-sm">
              <CardContent className="pt-5">
                <h3 className="font-bold text-sm flex items-center gap-2 mb-4">
                  <AlertCircle className="w-4 h-4 text-amber-500" /> Análisis de Formato y Columnas
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="font-bold mb-2 text-red-700">Alertas detectadas:</p>
                    {results.validation.issues.length > 0
                      ? <ul className="list-disc list-inside text-red-700 space-y-1">{results.validation.issues.map((i, k) => <li key={k}>{i}</li>)}</ul>
                      : <p className="text-green-700">Sin problemas críticos.</p>}
                  </div>
                  <div>
                    <p className="font-bold mb-2 text-amber-700">Sugerencias:</p>
                    {results.validation.suggestions.length > 0
                      ? <ul className="list-disc list-inside text-amber-700 space-y-1">{results.validation.suggestions.map((s, k) => <li key={k}>{s}</li>)}</ul>
                      : <p className="text-muted-foreground">Sin ajustes adicionales.</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabla de detalle */}
          <Card className="border shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-muted/30">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                Vista Previa de Registros
                <span className="text-[10px] font-normal text-muted-foreground ml-1">({filteredRows.length} encontrados)</span>
              </h3>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar RUC o Razón Social..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 h-8 bg-background border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary/30 w-52"
                />
              </div>
            </div>
            <div className="overflow-x-auto max-h-[520px]">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 z-20 bg-muted/90 backdrop-blur-sm border-b">
                  <tr>
                    <th className="px-5 py-3 text-left font-bold text-[9px] uppercase tracking-wider text-muted-foreground">Razón Social / RUC</th>
                    <th className="px-4 py-3 text-right font-bold text-[9px] uppercase tracking-wider text-muted-foreground">
                      {isCompras ? 'BI Gravado DG' : 'Base Gravada'}
                    </th>
                    <th className="px-4 py-3 text-right font-bold text-[9px] uppercase tracking-wider text-muted-foreground">IGV Real</th>
                    <th className="px-4 py-3 text-right font-bold text-[9px] uppercase tracking-wider text-muted-foreground">IGV 18%</th>
                    <th className="px-4 py-3 text-right font-bold text-[9px] uppercase tracking-wider text-muted-foreground">IGV 10.5%</th>
                    <th className="px-4 py-3 text-center font-bold text-[9px] uppercase tracking-wider text-muted-foreground">Tasa</th>
                    <th className="px-4 py-3 text-center font-bold text-[9px] uppercase tracking-wider text-muted-foreground">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.slice(0, 200).map((row, i) => {
                    const baseVal = isCompras ? row.baseDG : row.baseGravada
                    const igvVal = isCompras ? row.igvDG : row.igv
                    const calc18 = baseVal * 0.18
                    const calc105 = baseVal * 0.105
                    const diff18 = Math.abs(igvVal - calc18)
                    const diff105 = Math.abs(igvVal - calc105)
                    let estado = '⚠️ Revisar'; let estadoClass = 'bg-amber-100 text-amber-700'
                    if (row.esNotaCredito) { estado = 'NOTA CRÉDITO'; estadoClass = 'bg-blue-100 text-blue-700' }
                    else if (diff18 < 0.02) { estado = '✅ 18%'; estadoClass = 'bg-green-100 text-green-700' }
                    else if (diff105 < 0.02) { estado = '✅ 10.5%'; estadoClass = 'bg-orange-100 text-orange-700' }
                    else if (row.invalido) { estadoClass = 'bg-red-100 text-red-700' }
                    const razonTexto = String(row.razonSocial || '').trim()
                    const baseCero = Math.abs(baseVal) < 0.005
                    const igvCero = Math.abs(igvVal) < 0.005
                    if (!razonTexto && baseCero && igvCero) return null
                    return (
                      <tr key={i} className="hover:bg-muted/40 border-b last:border-0 transition-colors">
                        <td className="px-5 py-3">
                          <p className="font-semibold max-w-[260px] truncate uppercase">{razonTexto || 'Sin datos'}</p>
                          <p className="text-[9px] font-mono text-muted-foreground mt-0.5">{row.ruc}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">{baseVal.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold">{igvVal.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-mono text-muted-foreground">{calc18.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-mono text-muted-foreground">{calc105.toFixed(2)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn("px-2 py-0.5 rounded text-[9px] font-bold uppercase",
                            row.tasa === 18 ? "bg-blue-100 text-blue-700" :
                            row.tasa === 10.5 ? "bg-orange-100 text-orange-700" : "bg-muted text-muted-foreground"
                          )}>
                            {row.tasa > 0 ? `${row.tasa}%` : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn("px-2 py-0.5 rounded text-[9px] font-bold", estadoClass)}>{estado}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {filteredRows.length === 0 && (
                <div className="py-16 text-center text-sm text-muted-foreground">No se encontraron registros con ese criterio de búsqueda.</div>
              )}
              {filteredRows.length > 200 && (
                <div className="py-3 text-center text-xs text-muted-foreground border-t">
                  Mostrando 200 de {filteredRows.length} registros. Usa el buscador para filtrar.
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

// ── Sub-componente StatCard ───────────────────────────────────
function SummaryCard({ title, base, igv, fmt, colorClass }: { title: string; base: number; igv: number; fmt: (v: number) => string; colorClass: string }) {
  return (
    <div className={cn("p-5 rounded-2xl border-l-4 bg-card shadow-sm hover:-translate-y-0.5 transition-all", colorClass)}>
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-3">{title}</p>
      <div className="space-y-2">
        <div className="flex justify-between items-baseline">
          <span className="text-[9px] font-semibold uppercase text-muted-foreground opacity-70">Base Imp.:</span>
          <span className="text-xl font-black tabular-nums">{fmt(base)}</span>
        </div>
        <div className="flex justify-between items-baseline pt-2 border-t border-muted-foreground/10">
          <span className="text-[9px] font-semibold uppercase text-muted-foreground opacity-70">IGV:</span>
          <span className="text-sm font-bold tabular-nums">{fmt(igv)}</span>
        </div>
      </div>
    </div>
  )
}

export default SireAnalyzer