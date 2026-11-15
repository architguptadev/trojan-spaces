"use client";
import { useEffect, useRef } from "react";
import type { Room } from "@/lib/catalog";
import "leaflet/dist/leaflet.css";
export default function CampusMap({
  rooms,
  onSelect,
}: {
  rooms: Room[];
  onSelect: (r: Room) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let map: import("leaflet").Map | undefined;
    let disposed = false;
    import("leaflet").then((L) => {
      if (disposed || !el.current) return;
      map = L.map(el.current, { scrollWheelZoom: false }).setView(
        [34.0205, -118.286],
        16,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);
      rooms.forEach((r) => {
        L.marker([r.lat, r.lng], {
          icon: L.divIcon({
            className: "map-marker",
            html: `<span>${r.capacity}</span>`,
            iconSize: [38, 38],
          }),
        })
          .addTo(map!)
          .on("click", () => onSelect(r))
          .bindTooltip(r.building);
      });
    });
    return () => {
      disposed = true;
      map?.remove();
    };
  }, [rooms, onSelect]);
  return (
    <div
      className="campus-map"
      ref={el}
      aria-label="Interactive USC campus map with approximate building locations"
    />
  );
}
