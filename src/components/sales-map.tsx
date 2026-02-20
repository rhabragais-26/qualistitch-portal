'use client';

import { useMemo, useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import { formatCurrency } from '@/lib/utils';
import { LatLngExpression } from 'leaflet';
import { Skeleton } from './ui/skeleton';

type SalesMapProps = {
    salesByCityData: {
        city: string;
        amount: number;
        orderCount: number;
    }[];
    totalSales: number;
};

// Hardcoded coordinates for major Philippine cities
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

const SalesMap = ({ salesByCityData, totalSales }: SalesMapProps) => {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const center: LatLngExpression = [12.8797, 121.7740];

    const { markers, legendItems, minSales, maxSales } = useMemo(() => {
        const salesValues = salesByCityData.map(d => d.amount);
        const max = Math.max(...salesValues, 0);
        const min = Math.min(...salesValues, 0);
        const range = max - min;

        const getColorAndRadius = (amount: number) => {
            const percentage = range > 0 ? (amount - min) / range : 0;
            if (percentage > 0.75) return { color: '#ef4444', radius: 20 }; // Red
            if (percentage > 0.5) return { color: '#f97316', radius: 16 };  // Orange
            if (percentage > 0.25) return { color: '#eab308', radius: 12 };  // Yellow
            return { color: '#22c55e', radius: 8 };   // Green
        };

        const markers = salesByCityData
            .map(data => {
                const coords = cityCoordinates[data.city];
                if (!coords) return null;
                const { color, radius } = getColorAndRadius(data.amount);
                const contribution = totalSales > 0 ? ((data.amount / totalSales) * 100).toFixed(2) : 0;
                
                return (
                    <CircleMarker
                        key={data.city}
                        center={coords}
                        radius={radius}
                        pathOptions={{ color: 'white', fillColor: color, fillOpacity: 0.7, weight: 2 }}
                    >
                        <Tooltip>
                            <div className="text-sm">
                                <p className="font-bold">{data.city}</p>
                                <p>Total Sales: <span className="font-semibold">{formatCurrency(data.amount)}</span></p>
                                <p>Number of Orders: <span className="font-semibold">{data.orderCount}</span></p>
                                <p>Contribution: <span className="font-semibold">{contribution}%</span></p>
                            </div>
                        </Tooltip>
                    </CircleMarker>
                );
            })
            .filter(Boolean);

        const legendItems = [
            { color: '#ef4444', label: 'Very High' },
            { color: '#f97316', label: 'High' },
            { color: '#eab308', label: 'Medium' },
            { color: '#22c55e', label: 'Low' },
        ];

        return { markers, legendItems, minSales: min, maxSales: max };
    }, [salesByCityData, totalSales]);

    const Legend = () => (
        <div className="leaflet-bottom leaflet-left">
            <div className="leaflet-control leaflet-bar bg-white p-2 rounded-md shadow-lg">
                <h4 className="font-bold mb-2 text-xs">Sales Amount</h4>
                {legendItems.map(item => (
                    <div key={item.label} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
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
    
    if (!isClient) {
        return null;
    }

    return (
        <div style={{ height: '400px', width: '100%' }}>
            <MapContainer center={center} zoom={5} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />
                {markers}
                <Legend />
            </MapContainer>
        </div>
    );
};

export default SalesMap;
