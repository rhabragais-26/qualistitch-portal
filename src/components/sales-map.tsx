'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

type SalesMapProps = {
  salesByCityData: {
    city: string;
    amount: number;
    orderCount: number;
  }[];
  totalSales: number;
};

const cityCoordinates: { [key: string]: [number, number] } = {
    // NCR
    'Manila': [14.5995, 120.9842],
    'Quezon City': [14.6760, 121.0437],
    'Caloocan': [14.6560, 120.9847],
    'Las Piñas': [14.4445, 120.9939],
    'Makati': [14.5547, 121.0244],
    'Malabon': [14.6633, 120.9633],
    'Mandaluyong': [14.5833, 121.0333],
    'Marikina': [14.6500, 121.1000],
    'Muntinlupa': [14.3833, 121.0333],
    'Navotas': [14.6711, 120.9419],
    'Parañaque': [14.4792, 121.0194],
    'Paranaque': [14.4792, 121.0194],
    'Pasay': [14.5378, 121.0014],
    'Pasig': [14.5764, 121.0851],
    'Pateros': [14.5458, 121.0658],
    'San Juan': [14.6017, 121.0306],
    'Taguig': [14.5176, 121.0509],
    'Valenzuela': [14.7000, 120.9833],

    // Abra
    'Bangued': [17.5956, 120.6181],
    'Boliney': [17.3828, 120.7853],
    'Bucay': [17.5469, 120.6728],
    'Bucloc': [17.4403, 120.8142],
    'Daguioman': [17.3000, 120.9333],
    'Danglas': [17.7167, 120.6500],
    'Dolores': [17.6539, 120.7183],
    'La Paz': [17.6953, 120.6869],
    'Lacub': [17.5833, 120.8167],
    'Lagangilang': [17.6333, 120.6667],
    'Lagayan': [17.7500, 120.6667],
    'Langiden': [17.5703, 120.5989],
    'Licuan-Baay': [17.5000, 120.8000],
    'Luba': [17.3500, 120.7000],
    'Malibcong': [17.5833, 120.8833],
    'Manabo': [17.4333, 120.7167],
    'Peñarrubia': [17.5667, 120.6500],
    'Pidigan': [17.5667, 120.5833],
    'Pilar': [17.3333, 120.5833],
    'Sallapadan': [17.4333, 120.7833],
    'San Isidro': [15.1500, 120.8833],
    'San Quintin': [17.5333, 120.5167],
    'Tayum': [17.6167, 120.6167],
    'Tineg': [17.7833, 120.8667],
    'Tubo': [17.2833, 120.9000],
    'Villaviciosa': [17.4000, 120.6333],

    // Agusan del Norte
    'Buenavista': [8.9711, 125.4072],
    'Cabadbaran': [9.1231, 125.5414],
    'Carmen': [9.0167, 125.2833],
    'Jabonga': [9.3333, 125.5167],
    'Kitcharao': [9.4667, 125.5500],
    'Las Nieves': [8.7167, 125.6000],
    'Magallanes': [8.9950, 125.5219],
    'Nasipit': [8.9667, 125.3500],
    'Remedios T. Romualdez': [9.0069, 125.5786],
    'Santiago': [9.2000, 125.5167],
    'Tubay': [9.2500, 125.4333],

    // Agusan del Sur
    'Bayugan': [8.7175, 125.7444],
    'Bunawan': [8.2000, 125.9833],
    'Esperanza': [8.6500, 125.6500],
    'Loreto': [8.1667, 125.8833],
    'Prosperidad': [8.5667, 125.9333],
    'Rosario': [8.3333, 126.0167],
    'San Francisco': [8.5103, 125.9753],
    'San Luis': [8.5500, 125.7500],
    'Santa Josefa': [8.0667, 126.0667],
    'Sibagat': [8.8475, 125.6883],
    'Talacogon': [8.4833, 125.7833],
    'Trento': [8.0500, 126.0667],
    'Veruela': [8.0000, 125.9667],

    // Aklan
    'Altavas': [11.5167, 122.4833],
    'Balete': [11.5833, 122.3833],
    'Banga': [11.6333, 122.3333],
    'Batan': [11.6167, 122.5000],
    'Buruanga': [11.8833, 121.8833],
    'Ibajay': [11.8211, 122.1625],
    'Kalibo': [11.7075, 122.3653],
    'Lezo': [11.6833, 122.3333],
    'Libacao': [11.4833, 122.2833],
    'Madalag': [11.5167, 122.3000],
    'Makato': [11.7167, 122.2833],
    'Malay': [11.9008, 121.9214],
    'Malinao': [11.6500, 122.2833],
    'Nabas': [11.8833, 122.0833],
    'New Washington': [11.6500, 122.4333],
    'Numancia': [11.7000, 122.3333],
    'Tangalan': [11.7833, 122.2500],

    // Albay
    'Bacacay': [13.2958, 123.7917],
    'Camalig': [13.1611, 123.6361],
    'Daraga': [13.1558, 123.7028],
    'Guinobatan': [13.1906, 123.6006],
    'Jovellar': [13.0667, 123.6000],
    'Legazpi': [13.1361, 123.7439],
    'Libon': [13.3000, 123.4333],
    'Ligao': [13.2328, 123.5244],
    'Malilipot': [13.3250, 123.7500],
    'Manito': [13.1167, 123.8667],
    'Oas': [13.2500, 123.4667],
    'Pio Duran': [13.0333, 123.4500],
    'Polangui': [13.2917, 123.4833],
    'Rapu-Rapu': [13.1833, 124.1333],
    'Santo Domingo': [13.2333, 123.7667],
    'Tabaco': [13.3589, 123.7317],
    'Tiwi': [13.4611, 123.6806],

    // Bataan
    'Abucay': [14.7239, 120.5369],
    'Bagac': [14.5978, 120.3950],
    'Balanga': [14.6781, 120.5408],
    'Dinalupihan': [14.8697, 120.4658],
    'Hermosa': [14.8319, 120.5053],
    'Limay': [14.5614, 120.5967],
    'Mariveles': [14.4333, 120.4833],
    'Morong': [14.6761, 120.2644],
    'Orani': [14.8017, 120.5372],
    'Orion': [14.6200, 120.5819],
    'Samal': [14.7675, 120.5461],
    
    // Batanes
    'Basco': [20.4486, 121.9702],
    'Itbayat': [20.7881, 121.8419],
    'Ivana': [20.3789, 121.9444],
    'Mahatao': [20.4219, 121.9506],
    'Sabtang': [20.3325, 121.8708],
    'Uyugan': [20.3547, 121.9303],

    // Batangas
    'Agoncillo': [13.9333, 120.9333],
    'Alitagtag': [13.8833, 121.0167],
    'Balayan': [13.9333, 120.7333],
    'Bauan': [13.7933, 120.9789],
    'Calaca': [13.9333, 120.8167],
    'Calatagan': [13.8333, 120.6333],
    'Cuenca': [13.9167, 121.0500],
    'Ibaan': [13.8167, 121.1333],
    'Laurel': [14.0500, 120.9000],
    'Lemery': [13.8833, 120.9167],
    'Lian': [14.0333, 120.6500],
    'Lipa': [13.9411, 121.1622],
    'Lobo': [13.6500, 121.2500],
    'Mabini': [13.7500, 120.9333],
    'Malvar': [14.0500, 121.1500],
    'Mataasnakahoy': [13.9667, 121.1167],
    'Nasugbu': [14.0667, 120.6333],
    'Padre Garcia': [13.8833, 121.2167],
    'San Nicolas': [13.9167, 120.9500],
    'San Pascual': [13.8000, 121.0333],
    'Santa Teresita': [13.8833, 120.9667],
    'Santo Tomas': [14.0833, 121.1833],
    'Taal': [13.8833, 120.9167],
    'Talisay': [14.0833, 121.0167],
    'Tanauan': [14.0833, 121.1500],
    'Taysan': [13.7667, 121.2333],
    'Tingloy': [13.6500, 120.8667],
    'Tuy': [14.0167, 120.7333],

    // Benguet
    'Atok': [16.6167, 120.7667],
    'Baguio': [16.4167, 120.5833],
    'Bakun': [16.7833, 120.6833],
    'Bokod': [16.4833, 120.8333],
    'Buguias': [16.7167, 120.8333],
    'Itogon': [16.3667, 120.6667],
    'Kabayan': [16.6167, 120.8333],
    'Kapangan': [16.5833, 120.6333],
    'Kibungan': [16.6500, 120.6333],
    'La Trinidad': [16.4500, 120.5833],
    'Mankayan': [16.8500, 120.7833],
    'Sablan': [16.5000, 120.5333],
    'Tuba': [16.3333, 120.5667],
    'Tublay': [16.5167, 120.6000],
    
    // Bohol
    'Alburquerque': [9.6333, 123.95],
    'Alicia': [9.9167, 124.4833],
    'Anda': [9.7333, 124.5667],
    'Antequera': [9.7667, 123.9],
    'Baclayon': [9.6167, 123.9167],
    'Balilihan': [9.7833, 123.9667],
    'Batuan': [9.8, 124.1333],
    'Bilar': [9.7167, 124.1167],
    'Calape': [9.9167, 123.8333],
    'Candijay': [9.8667, 124.4667],
    'Catigbian': [9.8333, 123.9833],
    'Clarin': [9.9667, 123.9],
    'Corella': [9.6833, 123.9],
    'Cortes': [9.7167, 123.8667],
    'Dagohoy': [9.8667, 124.2833],
    'Danao': [9.9, 124.2333],
    'Dauis': [9.6, 123.8667],
    'Dimiao': [9.6167, 124.1333],
    'Duero': [9.75, 124.4],
    'Garcia Hernandez': [9.6833, 124.2667],
    'Guindulman': [9.7667, 124.4833],
    'Inabanga': [10.0, 124.0667],
    'Jagna': [9.65, 124.3667],
    'Jetafe': [10.15, 124.2667],
    'Lila': [9.6, 124.0833],
    'Loay': [9.5833, 123.95],
    'Loboc': [9.65, 124.0167],
    'Loon': [9.8333, 123.8],
    'Mabini': [9.8833, 124.5167],
    'Maribojoc': [9.75, 123.8333],
    'Panglao': [9.5833, 123.7667],
    'President Carlos P. Garcia': [10.1, 124.6],
    'Sagbayan': [9.9167, 124.0667],
    'Sevilla': [9.7, 124.05],
    'Sierra Bullones': [9.8167, 124.3167],
    'Sikatuna': [9.6667, 123.95],
    'Tagbilaran': [9.65, 123.85],
    'Talibon': [10.1333, 124.3167],
    'Trinidad': [10.0833, 124.3333],
    'Ubay': [10.05, 124.4667],
    'Valencia': [9.6167, 124.2167],
    'Alaminos': [14.0667, 121.25],
    'Bay': [14.1833, 121.2833],
    'Biñan': [14.3333, 121.0833],
    'Cabuyao': [14.2833, 121.1167],
    'Calauan': [14.15, 121.3167],
    'Cavinti': [14.25, 121.5],
    'Famy': [14.45, 121.45],
    'Kalayaan': [14.3333, 121.5333],
    'Liliw': [14.15, 121.45],
    'Los Baños': [14.1667, 121.2167],
    'Lumban': [14.3, 121.4667],
    'Mabitac': [14.45, 121.3833],
    'Magdalena': [14.2, 121.4333],
    'Majayjay': [14.15, 121.4833],
    'Nagcarlan': [14.1333, 121.4167],
    'Paete': [14.3667, 121.4833],
    'Pagsanjan': [14.2667, 121.45],
    'Pakil': [14.3833, 121.4833],
    'Pangil': [14.4, 121.4667],
    'Pila': [14.2333, 121.3667],
    'Rizal': [14.6987, 121.1290],
    'San Pablo': [14.0667, 121.3167],
    'Santa Cruz': [14.2833, 121.4167],
    'Santa Maria': [14.4833, 121.4333],
    'Santa Rosa': [14.3167, 121.1167],
    'Siniloan': [14.4167, 121.45],
    'Victoria': [14.2333, 121.3167],
    'San Mateo': [14.6987, 121.1290],
    'Gumaca': [13.9189, 122.0952],
    'Virac': [13.5856, 124.2339],

    // Existing coordinates
    'Davao City': [7.1907, 125.4553],
    'Cebu City': [10.3157, 123.8854],
    'Zamboanga City': [6.9214, 122.0790],
    'Cagayan de Oro': [8.4542, 124.6319],
    'Bacolod': [10.6755, 122.9511],
    'General Santos': [6.1167, 125.1667],
    'Iloilo City': [10.7202, 122.5621],
    'San Jose del Monte': [14.8167, 121.0500],
    'Batangas': [13.7569, 121.0583],
    'Zamboanga': [6.9214, 122.0790],
    'Butuan': [8.9475, 125.5408],
    'San Jose': [12.35, 121.05],
    'Santa Barbara': [15.9961, 120.4081],
    'Tuguegarao': [17.6133, 121.7289],
    'Taytay': [14.5667, 121.1333],
    'Tarlac': [15.4833, 120.5833],
    'Iloilo': [10.7202, 122.5621],
    'San Carlos': [10.4833, 123.4167],
    'Naga': [13.6233, 123.1833],
    'Naga City': [13.6233, 123.1833],
    'Dasmariñas': [14.3294, 120.9366],
    'Bacoor': [14.4608, 120.9645],
    'Imus': [14.4286, 120.9366],
    'Calamba': [14.2117, 121.1667],
    'Cainta': [14.5683, 121.1219],
    'San Pedro': [14.35, 121.05],
    'Olongapo': [14.8333, 120.2833],
    'Lucena': [13.9333, 121.6167],
    'Puerto Princesa': [9.7392, 118.7353],
    'Mandaue': [10.3333, 123.9333],
    'Ormoc': [11.0069, 124.6083],
    'Tacloban': [11.2429, 125.0044],
    'Pagadian': [7.8333, 123.4333],
    'Koronadal': [6.5, 124.85],
    'Digos': [6.75, 125.35],
    'Tagum': [7.45, 125.8],
    'Panabo': [7.3, 125.6833],
    'Malolos': [14.8433, 120.8114]
};


const ResetViewControl = ({ center, zoom }: { center: LatLngExpression, zoom: number }) => {
  const map = useMap();

  const handleReset = () => {
    map.flyTo(center, zoom);
  };

  return (
    <div className="leaflet-top leaflet-right">
      <div className="leaflet-control mt-[10px] mr-[10px]">
        <Button onClick={handleReset} className="w-8 h-8 p-0" title="Reset view">
          <Home className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function SalesMap({ salesByCityData, totalSales }: SalesMapProps) {
  const center: LatLngExpression = [12.8797, 121.774];
  const zoomLevel = 5.5;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mapInstanceKey, setMapInstanceKey] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // @ts-ignore
    if ((el as any)._leaflet_id) {
      setMapInstanceKey((k) => k + 1);
    }
  }, []);

  const { markerData, legendItems, minSales, maxSales } = useMemo(() => {
    // Range for sales amount (for color)
    const salesValues = salesByCityData.map((d) => d.amount);
    const maxAmount = Math.max(...salesValues, 0);
    const minAmount = Math.min(...salesValues, 0);
    const salesRange = maxAmount - minAmount;

    const getColor = (amount: number) => {
      const pct = salesRange > 0 ? (amount - minAmount) / salesRange : 0;
      if (pct > 0.75) return '#ef4444'; // Very High
      if (pct > 0.5) return '#f97316';  // High
      if (pct > 0.25) return '#eab308';  // Medium
      return '#22c55e';                   // Low
    };

    const getRadius = (count: number) => {
        if (count > 15) return 20;
        if (count > 10) return 16;
        if (count > 5) return 12;
        return 8;
    };

    const markerData = salesByCityData
      .map((d) => {
        const coords = cityCoordinates[d.city] || cityCoordinates[`${d.city} City`];
        if (!coords) return null;
        const color = getColor(d.amount);
        const radius = getRadius(d.orderCount);
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

    return { markerData, legendItems, minSales: minAmount, maxSales: maxAmount };
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
    <div ref={containerRef} style={{ height: '100%', width: '100%', position: 'relative', zIndex: 1 }}>
      <MapContainer
        key={mapInstanceKey}
        center={center}
        zoom={zoomLevel}
        minZoom={2}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
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
        <ResetViewControl center={center} zoom={zoomLevel} />
      </MapContainer>
    </div>
  );
}
