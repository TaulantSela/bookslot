import { afterEach } from "vitest";

const originalTz = process.env.TZ;

/**
 * Runs `fn` once per server timezone and returns the results. Node applies a
 * changed process.env.TZ immediately, so this catches code that silently
 * depends on the timezone of the machine it runs on (as Vercel runs in UTC).
 */
export function acrossServerTimezones<T>(fn: () => T) {
  return ["UTC", "Europe/Skopje", "America/Los_Angeles", "Asia/Tokyo"].map(
    (tz) => {
      process.env.TZ = tz;
      return fn();
    },
  );
}

export function restoreServerTimezone() {
  afterEach(() => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  });
}
