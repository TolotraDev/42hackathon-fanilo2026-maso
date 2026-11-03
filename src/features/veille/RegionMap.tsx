import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import type { AlertLevel } from '@/types/domain'

/** Centre approximatif de chaque région de Madagascar (latitude, longitude). */
const REGION_CENTERS: Record<string, [number, number]> = {
  'Alaotra-Mangoro': [-17.8, 48.4], "Amoron'i Mania": [-20.5, 47.0], Analamanga: [-18.9, 47.5], Analanjirofo: [-16.5, 49.4],
  Androy: [-24.9, 45.8], Anosy: [-24.4, 46.7], 'Atsimo-Andrefana': [-22.8, 44.3], 'Atsimo-Atsinanana': [-23.3, 47.3],
  Atsinanana: [-18.6, 48.8], Betsiboka: [-17.0, 46.6], Boeny: [-16.2, 46.4], Bongolava: [-18.6, 46.0], Diana: [-13.2, 49.2],
  Fitovinany: [-22.2, 47.6], 'Haute Matsiatra': [-21.7, 46.9], Ihorombe: [-22.5, 45.9], Itasy: [-19.0, 46.7],
  Melaky: [-17.8, 44.6], Menabe: [-20.2, 44.7], Sava: [-14.3, 50.0], Sofia: [-15.4, 48.2], Vakinankaratra: [-19.8, 46.9],
  Vatovavy: [-21.3, 47.9],
}

const LEVEL_COLOR: Record<AlertLevel, string> = { high: '#D64545', medium: '#E3A21A', low: '#2E9E5B' }

/** W3 — Carte de Madagascar : un cercle par région, taille selon le nombre d'alertes, couleur selon le niveau. */
export default function RegionMap({
  counts,
  selected,
  onSelect,
  label,
  ariaLabel,
}: {
  counts: Map<string, { count: number; level: AlertLevel }>
  selected: string
  onSelect: (region: string) => void
  label: (region: string, count: number) => string
  ariaLabel: string
}) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (!container.current || map.current) return
    map.current = L.map(container.current, { center: [-19.2, 46.8], zoom: 5, minZoom: 4, maxZoom: 9, scrollWheelZoom: false, attributionControl: true })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 9,
    }).addTo(map.current)
    layer.current = L.layerGroup().addTo(map.current)
    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  useEffect(() => {
    const group = layer.current
    if (!group) return
    group.clearLayers()
    for (const [region, { count, level }] of counts) {
      const center = REGION_CENTERS[region]
      if (!center) continue
      L.circleMarker(center, {
        radius: 8 + Math.min(count, 10) * 2,
        color: region === selected ? '#0A2F4F' : '#FFFFFF',
        weight: region === selected ? 3 : 1.5,
        fillColor: LEVEL_COLOR[level],
        fillOpacity: 0.8,
      })
        .bindTooltip(label(region, count))
        .on('click', () => onSelect(region === selected ? '' : region))
        .addTo(group)
    }
  }, [counts, selected, onSelect, label])

  return <div ref={container} className="h-72 w-full overflow-hidden rounded-xl border border-line lg:h-80" role="application" aria-label={ariaLabel} />
}
