'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import { formatCurrency } from '@/lib/utils';

type SalesMapProps = {
  salesByCityData: {
    city: string;
    amount: number;
    orderCount: number;
  }[];
  totalSales: number;
};

const cityCoordinates: { [key: string]: [number, number] } = {
    'Manila': [14.5995, 120.9842],
    'Quezon City': [14.6760, 121.0437],
    'Davao City': [7.1907, 125.4553],
    'Cebu City': [10.3157, 123.8854],
    'Caloocan': [14.6560, 120.9847],
    'Zamboanga City': [6.9214, 122.0790],
    'Taguig': [14.5176, 121.0509],
    'Pasig': [14.5764, 121.0851],
    'Antipolo': [14.5869, 121.1763],
    'Cagayan de Oro': [8.4542, 124.6319],
    'Parañaque': [14.4792, 121.0194],
    'Makati': [14.5547, 121.0244],
    'Bacolod': [10.6755, 122.9511],
    'General Santos': [6.1167, 125.1667],
    'Iloilo City': [10.7202, 122.5621],
    'Mandaluyong': [14.5833, 121.0333],
    'Pasay': [14.5378, 121.0014],
    'Las Piñas': [14.4445, 120.9939],
    'Muntinlupa': [14.3833, 121.0333],
    'Baguio': [16.4167, 120.5833],
};

export default function SalesMap({ salesByCityData, totalSales }: SalesMapProps) {
  const center: LatLngExpression = [12.8797, 121.774];

  // ✅ This forces a brand-new DOM node for Leaflet when React remounts in dev/StrictMode
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mapInstanceKey, setMapInstanceKey] = useState(0);

  useEffect(() => {
    // On mount: if Leaflet already attached to the container (dev double-mount), reset it.
    const el = containerRef.current;
    if (!el) return;

    // Leaflet stores an internal id on the container when initialized.
    // If it exists, we force a brand new MapContainer by changing key.
    // @ts-ignore
    if ((el as any)._leaflet_id) {
      setMapInstanceKey((k) => k + 1);
    }
  }, []);

  const { markerData, legendItems, minSales, maxSales } = useMemo(() => {
    const salesValues = salesByCityData.map((d) => d.amount);
    const max = Math.max(...salesValues, 0);
    const min = Math.min(...salesValues, 0);
    const range = max - min;

    const getColorAndRadius = (amount: number) => {
      const pct = range > 0 ? (amount - min) / range : 0;
      if (pct > 0.75) return { color: '#ef4444', radius: 18 };
      if (pct > 0.5) return { color: '#f97316', radius: 14 };
      if (pct > 0.25) return { color: '#eab308', radius: 11 };
      return { color: '#22c55e', radius: 8 };
    };

    const markerData = salesByCityData
      .map((d) => {
        const coords = cityCoordinates[d.city];
        if (!coords) return null;
        const { color, radius } = getColorAndRadius(d.amount);
        const contribution =
          totalSales > 0 ? ((d.amount / totalSales) * 100).toFixed(2) : '0.00';
        return { ...d, coords, color, radius, contribution };
      })
      .filter(Boolean) as Array<{
      city: string;
      amount: number;
      orderCount: number;
      coords: [number, number];
      color: string;
      radius: number;
      contribution: string;
    }>;

    const legendItems = [
      { color: '#ef4444', label: 'Very High' },
      { color: '#f97316', label: 'High' },
      { color: '#eab308', label: 'Medium' },
      { color: '#22c55e', label: 'Low' },
    ];

    return { markerData, legendItems, minSales: min, maxSales: max };
  }, [salesByCityData, totalSales]);

  const Legend = () => (
    <div className="leaflet-bottom leaflet-left">
      <div className="leaflet-control leaflet-bar bg-white p-2 rounded-md shadow-lg">
        <h4 className="font-bold mb-2 text-xs">Sales Amount</h4>
        {legendItems.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-xs">{item.label}</span>
          </div>
        ))}
        <div className="mt-2 text-xs text-gray-500">
          <p>Min: {formatCurrency(minSales)}</p>
          <p>Max: {formatCurrency(maxSales)}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div ref={containerRef} style={{ height: '400px', width: '100%' }}>
      <MapContainer
        key={mapInstanceKey}
        center={center}
        zoom={5}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {markerData.map((m) => (
          <CircleMarker
            key={m.city}
            center={m.coords}
            radius={m.radius}
            pathOptions={{
              color: 'white',
              fillColor: m.color,
              fillOpacity: 0.7,
              weight: 2,
            }}
          >
            <Tooltip>
              <div className="text-sm">
                <p className="font-bold">{m.city}</p>
                <p>
                  Total Sales: <span className="font-semibold">{formatCurrency(m.amount)}</span>
                </p>
                <p>
                  Number of Orders: <span className="font-semibold">{m.orderCount}</span>
                </p>
                <p>
                  Contribution: <span className="font-semibold">{m.contribution}%</span>
                </p>
              </div>
            </Tooltip>
          </CircleMarker>
        ))}

        <Legend />
      </MapContainer>
    </div>
  );
}