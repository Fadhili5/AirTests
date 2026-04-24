export const emiratesFlights = [
  {
    id: "EK202",
    airline: "Emirates",
    route: "DXB-LHR",
    originAirport: "DXB",
    destinationAirport: "LHR",
    aircraftType: "B777F",
    haulType: "LONG_HAUL",
    status: "DELAYED",
    delayMinutes: 48,
    stage: "TRANSFER_HUB",
    scheduledDeparture: "2026-04-24T08:30:00.000Z",
    estimatedDeparture: "2026-04-24T09:18:00.000Z",
    exposureDrivers: ["DXB_HEAT", "TRANSFER_BUFFER", "LHR_COLD_ARRIVAL"],
  },
];

export function getPrimaryFlight() {
  return emiratesFlights[0];
}
