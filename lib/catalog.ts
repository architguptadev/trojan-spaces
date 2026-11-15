export type Room = {
  id: string;
  name: string;
  building: string;
  area: string;
  capacity: number;
  amenities: string[];
  lat: number;
  lng: number;
  minutes: number;
  school: "usc" | "marshall" | "unverified";
  url: string;
  image: string;
  color: string;
};
// Building locations are approximate; all room IDs, capacities, amenities and photos are demo fixtures.
export const rooms: Room[] = [
  {
    id: "leavey-203",
    name: "The sunlit study room",
    building: "Leavey Library",
    area: "LVL · Demo room 203",
    capacity: 6,
    amenities: ["Whiteboard", "Outlets", "Natural light"],
    lat: 34.0218,
    lng: -118.2829,
    minutes: 4,
    school: "usc",
    url: "https://libcal.usc.edu/",
    image: "photo-1497366811353-6870744d04b2",
    color: "#e4dccb",
  },
  {
    id: "doheny-116",
    name: "A little room for big ideas",
    building: "Doheny Memorial Library",
    area: "DML · Demo room 116",
    capacity: 8,
    amenities: ["Whiteboard", "Display", "Outlets"],
    lat: 34.0202,
    lng: -118.284,
    minutes: 6,
    school: "usc",
    url: "https://libcal.usc.edu/",
    image: "photo-1497366754035-f200968a6e72",
    color: "#cbb998",
  },
  {
    id: "science-204",
    name: "Your next breakthrough",
    building: "Science & Engineering Library",
    area: "SSL · Demo room 204",
    capacity: 4,
    amenities: ["Whiteboard", "Outlets"],
    lat: 34.0197,
    lng: -118.2888,
    minutes: 8,
    school: "usc",
    url: "https://libcal.usc.edu/",
    image: "photo-1524758631624-e2822e304c36",
    color: "#d4dfd9",
  },
  {
    id: "marshall-310",
    name: "The team huddle",
    building: "Gaughan & Tiberti Library",
    area: "JFF · Demo room 310",
    capacity: 6,
    amenities: ["Display", "Whiteboard", "Outlets"],
    lat: 34.0187,
    lng: -118.2829,
    minutes: 7,
    school: "marshall",
    url: "https://libraries.usc.edu/locations/gaughan-tiberti-library/gaughan-tiberti-library-technology",
    image: "photo-1497366216548-37526070297c",
    color: "#cfcec5",
  },
  {
    id: "viterbi-pod",
    name: "A quieter kind of focus",
    building: "Viterbi · Ginsburg Hall",
    area: "GCS · Illustrative study pod",
    capacity: 2,
    amenities: ["Outlets"],
    lat: 34.0194,
    lng: -118.2902,
    minutes: 10,
    school: "unverified",
    url: "https://www.cs.usc.edu/",
    image: "photo-1521737711867-e3b97375f902",
    color: "#dbd8ce",
  },
];
export const sourceLinks = [
  {
    title: "USC Libraries · reservations & eligibility",
    url: "https://libcal.usc.edu/",
  },
  {
    title: "Leavey · reservation and confirmation policies",
    url: "https://libraries.usc.edu/locations/leavey-library/leavey-library-collaborative-workroom-reservation-policies-and-procedures",
  },
  {
    title: "Marshall · EMS access requirements",
    url: "https://libraries.usc.edu/locations/gaughan-tiberti-library/gaughan-tiberti-library-technology",
  },
  {
    title: "USC · authorized EMS access",
    url: "https://software.usc.edu/ems/",
  },
];
