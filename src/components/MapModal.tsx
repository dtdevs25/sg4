'use client'

import React from 'react'
import { MapPin, X, ExternalLink, Navigation } from 'lucide-react'

interface MapModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  latitude: number
  longitude: number
}

export function MapModal({
  isOpen,
  onClose,
  title,
  subtitle,
  latitude,
  longitude,
}: MapModalProps) {
  if (!isOpen || latitude == null || longitude == null) return null

  const lat = Number(latitude)
  const lng = Number(longitude)
  if (isNaN(lat) || isNaN(lng)) return null

  const bboxDelta = 0.006
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${(lng - bboxDelta).toFixed(6)}%2C${(lat - bboxDelta).toFixed(6)}%2C${(lng + bboxDelta).toFixed(6)}%2C${(lat + bboxDelta).toFixed(6)}&layer=mapnik&marker=${lat.toFixed(6)}%2C${lng.toFixed(6)}`

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
  const wazeUrl = `https://www.waze.com/ul?ll=${lat},${lng}&navigate=yes`

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '100%',
          maxWidth: 640,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(to right, #f8fafc, #fff)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MapPin size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#1e293b' }}>
                {title}
              </h3>
              {subtitle && (
                <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#64748b' }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Coordenadas badge */}
        <div
          style={{
            padding: '10px 20px',
            background: '#f8fafc',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
            fontSize: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569' }}>
            <span style={{ fontWeight: 700 }}>Coordenadas GPS:</span>
            <code
              style={{
                background: '#e2e8f0',
                padding: '2px 6px',
                borderRadius: 4,
                fontFamily: 'monospace',
                fontWeight: 600,
                color: '#0f172a',
              }}
            >
              {lat.toFixed(6)}, {lng.toFixed(6)}
            </code>
          </div>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>
            Local registrado no momento do lançamento móvel
          </span>
        </div>

        {/* Map iframe */}
        <div style={{ position: 'relative', width: '100%', height: 380, background: '#f1f5f9' }}>
          <iframe
            title="Mapa de Localização"
            width="100%"
            height="380"
            style={{ border: 'none', display: 'block' }}
            scrolling="no"
            src={osmEmbedUrl}
          />
        </div>

        {/* Footer actions */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            flexWrap: 'wrap',
            background: '#fff',
          }}
        >
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 8,
                background: '#3b82f6',
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 1px 2px rgba(59, 130, 246, 0.2)',
              }}
            >
              <ExternalLink size={14} /> Google Maps
            </a>
            <a
              href={wazeUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 8,
                background: '#00d2f0',
                color: '#0f172a',
                fontSize: 13,
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 1px 2px rgba(0, 210, 240, 0.2)',
              }}
            >
              <Navigation size={14} /> Waze
            </a>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: '#fff',
              color: '#475569',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

