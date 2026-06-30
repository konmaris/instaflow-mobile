import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

export const LOCATION_TASK = "instaflow-location-tracking";
const CTX_KEY = "instaflow-tracking-ctx";

interface TrackingCtx {
  restaurantId: string;
  riderId: string;
}

/**
 * Background location task. Runs even when the app is backgrounded/terminated
 * (iOS UIBackgroundModes=location, Android foreground service). It reads the
 * rider context from AsyncStorage and looks up the rider's in-progress delivery
 * so each breadcrumb is attributed to the right order. The supabase client reads
 * its session from AsyncStorage, so auth works in this headless context.
 */
TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error || !data) return;
  const { locations } = data as { locations: Location.LocationObject[] };
  const fix = locations?.[locations.length - 1];
  if (!fix) return;

  const raw = await AsyncStorage.getItem(CTX_KEY);
  if (!raw) return;
  const ctx = JSON.parse(raw) as TrackingCtx;

  // Which delivery is this rider currently working (if any)?
  const { data: order } = await supabase
    .from("orders")
    .select("id")
    .eq("assigned_rider_id", ctx.riderId)
    .eq("status", "out_for_delivery")
    .order("assigned_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { latitude, longitude, heading, speed, accuracy } = fix.coords;
  await supabase.from("rider_locations").insert({
    restaurant_id: ctx.restaurantId,
    rider_id: ctx.riderId,
    order_id: order?.id ?? null,
    location: `SRID=4326;POINT(${longitude} ${latitude})`,
    heading: heading ?? null,
    speed: speed ?? null,
    accuracy: accuracy ?? null,
  });
});

/** Start streaming the rider's GPS (foreground + background) while on shift. */
export async function startTracking(opts: {
  restaurantId: string;
  riderId: string;
}): Promise<{ ok: boolean; reason?: string }> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== "granted") return { ok: false, reason: "Location permission denied" };
  // Background is best-effort: if the user only grants "While Using", tracking
  // still works while the app is open.
  const bg = await Location.requestBackgroundPermissionsAsync();

  await AsyncStorage.setItem(
    CTX_KEY,
    JSON.stringify({ restaurantId: opts.restaurantId, riderId: opts.riderId }),
  );

  const already = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
  if (already) await Location.stopLocationUpdatesAsync(LOCATION_TASK);

  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 10000,
    distanceInterval: 25,
    showsBackgroundLocationIndicator: true,
    pausesUpdatesAutomatically: false,
    foregroundService: {
      notificationTitle: "Instaflow — on shift",
      notificationBody: "Sharing your location so customers can track deliveries.",
    },
  });

  return { ok: true, reason: bg.status === "granted" ? undefined : "foreground-only" };
}

export async function stopTracking() {
  await AsyncStorage.removeItem(CTX_KEY);
  const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
  if (started) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
}

export async function isTrackingAsync() {
  return Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false);
}
