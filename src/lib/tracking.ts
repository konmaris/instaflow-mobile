import * as Location from "expo-location";
import { supabase } from "./supabase";

let watcher: Location.LocationSubscription | null = null;

/**
 * Start streaming the rider's GPS to Supabase while on shift. Each fix is
 * inserted into rider_locations; a DB trigger maintains rider_current_location,
 * which the customer tracking map subscribes to. `activeOrderId` ties the
 * breadcrumb to the delivery currently in progress (nullable).
 */
export async function startTracking(opts: {
  restaurantId: string;
  riderId: string;
  getActiveOrderId: () => string | null;
}): Promise<{ ok: boolean; reason?: string }> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") return { ok: false, reason: "Location permission denied" };

  await stopTracking();
  watcher = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 8000,
      distanceInterval: 25,
    },
    async (pos) => {
      const { latitude, longitude, heading, speed, accuracy } = pos.coords;
      await supabase.from("rider_locations").insert({
        restaurant_id: opts.restaurantId,
        rider_id: opts.riderId,
        order_id: opts.getActiveOrderId(),
        // PostGIS geography accepts EWKT; longitude first
        location: `SRID=4326;POINT(${longitude} ${latitude})`,
        heading: heading ?? null,
        speed: speed ?? null,
        accuracy: accuracy ?? null,
      });
    },
  );
  return { ok: true };
}

export async function stopTracking() {
  if (watcher) {
    watcher.remove();
    watcher = null;
  }
}

export function isTracking() {
  return watcher !== null;
}
