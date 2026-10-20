"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Search, LocateFixed, Loader2, MapPin } from "lucide-react";

interface MapPickerProps {
    lat: number | null;
    lng: number | null;
    onChange: (lat: number, lng: number) => void;
}

// PSU Hat Yai as a sensible default centre.
const DEFAULT_CENTER = { lat: 7.0086, lng: 100.4986 };

// Emerald teardrop pin as an inline SVG (avoids Leaflet's broken default icon paths).
const pinIcon = L.divIcon({
    className: "",
    html: `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))">
        <path d="M12 2C7.6 2 4 5.6 4 10c0 5.4 7 11.5 7.3 11.7.4.4 1 .4 1.4 0C13 21.5 20 15.4 20 10c0-4.4-3.6-8-8-8z" fill="#1468c2" stroke="#fff" stroke-width="1.5"/>
        <circle cx="12" cy="10" r="3" fill="#fff"/>
    </svg>`,
    iconSize: [34, 34],
    iconAnchor: [17, 32],
});

export default function MapPicker({ lat, lng, onChange }: MapPickerProps) {
    const mapEl = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const [search, setSearch] = useState("");
    const [searching, setSearching] = useState(false);
    const [locating, setLocating] = useState(false);

    // Initialise the map once.
    useEffect(() => {
        if (!mapEl.current || mapRef.current) return;

        const start = lat != null && lng != null ? { lat, lng } : DEFAULT_CENTER;
        const map = L.map(mapEl.current, { zoomControl: true }).setView([start.lat, start.lng], 16);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap",
            maxZoom: 19,
        }).addTo(map);

        const marker = L.marker([start.lat, start.lng], { draggable: true, icon: pinIcon }).addTo(map);
        marker.on("dragend", () => {
            const p = marker.getLatLng();
            onChangeRef.current(p.lat, p.lng);
        });
        map.on("click", (e: L.LeafletMouseEvent) => {
            marker.setLatLng(e.latlng);
            onChangeRef.current(e.latlng.lat, e.latlng.lng);
        });

        mapRef.current = map;
        markerRef.current = marker;

        // The modal animates in, so the container size isn't final on first paint.
        const timer = setTimeout(() => {
            if (mapRef.current && mapEl.current) {
                mapRef.current.invalidateSize();
            }
        }, 150);

        return () => {
            clearTimeout(timer);
            map.remove();
            mapRef.current = null;
            markerRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Keep the marker in sync when lat/lng change from outside (edit load, search, GPS, manual inputs).
    useEffect(() => {
        if (lat == null || lng == null || !mapRef.current || !markerRef.current) return;
        const current = markerRef.current.getLatLng();
        if (Math.abs(current.lat - lat) < 1e-7 && Math.abs(current.lng - lng) < 1e-7) return;
        markerRef.current.setLatLng([lat, lng]);
        mapRef.current.panTo([lat, lng]);
    }, [lat, lng]);

    const runSearch = async () => {
        if (!search.trim()) return;
        setSearching(true);
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(search)}`,
                { headers: { "Accept-Language": "th" } },
            );
            const data = await res.json();
            if (data[0]) {
                const found = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
                mapRef.current?.setView([found.lat, found.lng], 17);
                onChangeRef.current(found.lat, found.lng);
            }
        } catch {
            /* ignore search errors */
        } finally {
            setSearching(false);
        }
    };

    const useCurrentLocation = () => {
        if (!navigator.geolocation) return;
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                mapRef.current?.setView([p.lat, p.lng], 17);
                onChangeRef.current(p.lat, p.lng);
                setLocating(false);
            },
            () => setLocating(false),
            { enableHighAccuracy: true, timeout: 8000 },
        );
    };

    return (
        <div className="space-y-2">
            {/* Search + current-location toolbar */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                runSearch();
                            }
                        }}
                        placeholder="ค้นหาสถานที่ เช่น มอ.หาดใหญ่, คณะวิศวกรรมศาสตร์"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-line rounded-lg bg-surface-2 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
                    />
                </div>
                <button
                    type="button"
                    onClick={runSearch}
                    disabled={searching}
                    className="px-3 py-2 text-sm font-medium rounded-lg bg-sky-500 hover:bg-sky-600 text-white flex items-center gap-1.5 disabled:opacity-60"
                >
                    {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    ค้นหา
                </button>
                <button
                    type="button"
                    onClick={useCurrentLocation}
                    disabled={locating}
                    title="ใช้ตำแหน่งปัจจุบัน"
                    className="px-3 py-2 text-sm font-medium rounded-lg border border-line hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 disabled:opacity-60"
                >
                    {locating ? <Loader2 size={16} className="animate-spin" /> : <LocateFixed size={16} />}
                </button>
            </div>

            {/* Map */}
            <div
                ref={mapEl}
                className="h-72 w-full rounded-xl overflow-hidden border border-line z-0"
            />

            {/* Hint + readout */}
            <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1">
                    <MapPin size={13} className="text-emerald-500" />
                    คลิกบนแผนที่เพื่อปักหมุด หรือลากหมุดเพื่อปรับตำแหน่ง
                </span>
                {lat != null && lng != null && (
                    <span className="font-mono text-slate-600 dark:text-slate-400">
                        {lat.toFixed(6)}, {lng.toFixed(6)}
                    </span>
                )}
            </div>
        </div>
    );
}
