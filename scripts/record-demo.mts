/**
 * Records the looping video on /demo: a client booking a haircut at Lakeside
 * Barbers on a phone, on the real booking page.
 *
 *   1. A scratch database with the example shops (never production: this makes
 *      a real booking):
 *        export DATABASE_URL=file:/tmp/bookslot-demo.db
 *        npx tsx scripts/migrate.ts && npx tsx scripts/seed-examples.ts
 *   2. A production build served on it: `npm run build && npm start`
 *   3. `npm run demo:record -- http://localhost:3000`
 *
 * Writes public/demo/booking.{mp4,webm} and booking-poster.webp. Uses the
 * installed Google Chrome (CHROME_PATH to override) and ffmpeg.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import puppeteer, { type Page } from "puppeteer-core";
import sharp from "sharp";

const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = "public/demo";
const WORK = ".demo-recording";
const VIEWPORT = { width: 390, height: 780, deviceScaleFactor: 2 };
const FPS = 30;

const CLIENT = { name: "Arta Selmani", phone: "070 123 456", email: "arta@example.com" };

/**
 * Stop-motion recording: a full-resolution screenshot after every change, each
 * held for an exact time, assembled at a steady frame rate. (Chrome's
 * screencast only sends frames at CSS size, so it would be blurry on retina.)
 */
class Film {
  private frames: { file: string; seconds: number }[] = [];
  private tap = { x: VIEWPORT.width / 2, y: VIEWPORT.height * 0.75 };

  constructor(
    private page: Page,
    private dir: string,
  ) {
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
  }

  /** Waits for React to render and the browser to paint, then holds a frame. */
  async shot(seconds: number) {
    await this.page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const file = path.join(this.dir, `${String(this.frames.length).padStart(5, "0")}.png`);
    await this.page.screenshot({ path: file as `${string}.png` });
    this.frames.push({ file: path.resolve(file), seconds });
  }

  /** The finger: a translucent dot drawn into the page so it shows in the frames. */
  async showFinger() {
    await this.page.evaluate(({ x, y }) => {
      const dot = document.createElement("div");
      dot.id = "demo-finger";
      Object.assign(dot.style, {
        position: "fixed",
        left: "0",
        top: "0",
        width: "38px",
        height: "38px",
        margin: "-19px 0 0 -19px",
        borderRadius: "50%",
        background: "rgba(24, 24, 27, 0.22)",
        border: "2px solid rgba(255, 255, 255, 0.95)",
        boxShadow: "0 4px 14px rgba(0, 0, 0, 0.25)",
        pointerEvents: "none",
        zIndex: "2147483647",
        transform: `translate(${x}px, ${y}px)`,
      });
      document.body.append(dot);
    }, this.tap);
  }

  private async placeFinger(x: number, y: number, scale = 1) {
    await this.page.evaluate(
      ({ x, y, scale }) => {
        const dot = document.getElementById("demo-finger");
        if (dot) dot.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
      },
      { x, y, scale },
    );
  }

  /** Moves the finger to (x, y) over `seconds`, eased. */
  async moveFinger(x: number, y: number, seconds = 0.45) {
    const from = { ...this.tap };
    const n = Math.max(1, Math.round(seconds * FPS));
    for (let i = 1; i <= n; i++) {
      const k = ease(i / n);
      await this.placeFinger(from.x + (x - from.x) * k, from.y + (y - from.y) * k);
      await this.shot(1 / FPS);
    }
    this.tap = { x, y };
  }

  /** Scrolls so `selector` sits in the upper part of the screen, eased. */
  async scrollTo(selector: string, seconds = 0.6) {
    const [from, to] = await this.page.evaluate((selector) => {
      const el = document.querySelector(selector);
      if (!el) throw new Error(`not found: ${selector}`);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const target = window.scrollY + el.getBoundingClientRect().top - window.innerHeight * 0.3;
      return [window.scrollY, Math.max(0, Math.min(max, target))];
    }, selector);
    if (Math.abs(to - from) < 4) return;
    const n = Math.max(1, Math.round(seconds * FPS));
    for (let i = 1; i <= n; i++) {
      await this.page.evaluate((y) => window.scrollTo(0, y), from + (to - from) * ease(i / n));
      await this.shot(1 / FPS);
    }
  }

  /** Scrolls the element into view, moves the finger onto it and taps it. */
  async tapOn(selector: string, { click = true } = {}) {
    await this.scrollTo(selector);
    const box = await this.page.evaluate((selector) => {
      const r = document.querySelector(selector)!.getBoundingClientRect();
      return { x: r.left + Math.min(r.width / 2, 120), y: r.top + r.height / 2 };
    }, selector);
    await this.moveFinger(box.x, box.y);
    for (const scale of [0.9, 0.8]) {
      await this.placeFinger(box.x, box.y, scale);
      await this.shot(1 / FPS);
    }
    if (click) await this.page.click(selector);
    for (const scale of [0.9, 1]) {
      await this.placeFinger(box.x, box.y, scale);
      await this.shot(1 / FPS);
    }
  }

  async type(selector: string, text: string) {
    await this.tapOn(selector);
    for (const ch of text) {
      await this.page.keyboard.type(ch);
      await this.shot(0.075);
    }
    await this.shot(0.35);
  }

  write(out: string): string {
    const step = 1 / FPS;
    const last = this.frames.at(-1)!;
    const entries = this.frames.slice(0, -1).map((f) => [f.file, f.seconds] as const);
    // ffmpeg holds the final frame for as long as the gap before it, and the
    // concat format wants the last file repeated. So the last hold ends with a
    // one-frame step, then the repeat: otherwise the last hold plays twice.
    entries.push([last.file, Math.max(step, last.seconds - step)], [last.file, step]);
    const list = entries.map(([file, seconds]) => `file '${file}'\nduration ${seconds.toFixed(4)}`).join("\n");
    const listFile = path.join(this.dir, "list.txt");
    writeFileSync(listFile, `${list}\nfile '${last.file}'\n`);
    execFileSync("ffmpeg", [
      "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", listFile,
      "-vf", `fps=${FPS},format=yuv420p`, "-c:v", "libx264", "-crf", "14", "-preset", "fast", out,
    ]);
    const total = this.frames.reduce((sum, f) => sum + f.seconds, 0);
    console.log(`filmed ${this.frames.length} frames, ${total.toFixed(1)} s`);
    return out;
  }
}

function ease(k: number) {
  return k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
}

/** Marks the element `selector` matches whose text includes `text`, and returns a selector for it. */
async function mark(page: Page, selector: string, text: string, name: string) {
  const found = await page.evaluate(
    ({ selector, text, name }) => {
      const el = [...document.querySelectorAll(selector)].find((e) => e.textContent?.includes(text));
      el?.setAttribute("data-demo", name);
      return !!el;
    },
    { selector, text, name },
  );
  if (!found) throw new Error(`no ${selector} containing "${text}"`);
  return `[data-demo="${name}"]`;
}

/** Sets the native date input the way a picker would (headless Chrome draws no picker). */
async function pickDate(page: Page, date: string) {
  await page.evaluate((date) => {
    const input = document.querySelector<HTMLInputElement>("#date")!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, date);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, date);
}

const slotButtons = 'button[aria-pressed]';
const hasSlots = (page: Page) =>
  page.evaluate(
    (sel) => [...document.querySelectorAll(sel)].some((b) => /^\d\d:\d\d$/.test(b.textContent ?? "")),
    slotButtons,
  );

/** The next day (from two days out) that has free times, so the video shows a full grid. */
async function findOpenDate(page: Page) {
  for (let offset = 2; offset < 14; offset++) {
    const date = new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
    await pickDate(page, date);
    try {
      await page.waitForFunction(
        (sel) =>
          [...document.querySelectorAll(sel)].some((b) => /^\d\d:\d\d$/.test(b.textContent ?? "")) ||
          /Closed|No free times|no times/i.test(document.body.innerText),
        { timeout: 5000 },
        slotButtons,
      );
    } catch {
      continue;
    }
    if (await hasSlots(page)) return date;
  }
  throw new Error("no open day in the next two weeks");
}

async function book(page: Page, film: Film) {
  await film.showFinger();
  await film.shot(1.2);

  await film.tapOn(await mark(page, slotButtons, "Haircut + beard", "service"));
  await film.shot(0.5);
  await film.tapOn(await mark(page, slotButtons, "Sam", "barber"));
  await film.shot(0.5);

  // Find an open day off camera, then clear it and pick it on camera.
  const date = await findOpenDate(page);
  await pickDate(page, "");
  await page.waitForFunction(() => /Pick a date first/.test(document.body.innerText));
  await film.tapOn("#date", { click: false });
  await pickDate(page, date);
  await page.waitForFunction(
    (sel) => [...document.querySelectorAll(sel)].some((b) => /^\d\d:\d\d$/.test(b.textContent ?? "")),
    {},
    slotButtons,
  );
  await film.shot(0.7);

  const time = await page.evaluate((sel) => {
    const times = [...document.querySelectorAll(sel)]
      .map((b) => b.textContent ?? "")
      .filter((t) => /^\d\d:\d\d$/.test(t));
    return times.find((t) => t >= "10:30") ?? times[Math.min(2, times.length - 1)];
  }, slotButtons);
  await film.tapOn(await mark(page, slotButtons, time, "time"));
  await film.shot(0.5);

  await film.type("#customerName", CLIENT.name);
  if (await page.$("#customerPhone")) await film.type("#customerPhone", CLIENT.phone);
  if (await page.$("#customerEmail")) await film.type("#customerEmail", CLIENT.email);

  await film.tapOn('button[type="submit"]');
  await page.waitForFunction(() => /You.re booked/.test(document.body.innerText), { timeout: 15000 });
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    document.getElementById("demo-finger")?.remove();
  });
  await film.shot(2.6);
}

/** mp4 (H.264) and webm (VP9), a short fade at each end so the loop is smooth, and a poster frame. */
async function encode(raw: string) {
  const dur = Number(
    execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", raw]).toString().trim(),
  );
  if (!Number.isFinite(dur)) throw new Error(`couldn't read the duration of ${raw}`);
  const vf = `fps=${FPS},fade=t=in:st=0:d=0.4,fade=t=out:st=${(dur - 0.5).toFixed(2)}:d=0.5`;
  const ff = (...args: string[]) => execFileSync("ffmpeg", ["-y", "-v", "error", "-i", raw, "-vf", vf, "-an", ...args]);
  mkdirSync(OUT, { recursive: true });
  ff("-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "27", "-preset", "slow", "-movflags", "+faststart", path.join(OUT, "booking.mp4"));
  ff("-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "40", "-row-mt", "1", path.join(OUT, "booking.webm"));
  const poster = path.join(WORK, "poster.png");
  execFileSync("ffmpeg", ["-y", "-v", "error", "-ss", "0.8", "-i", raw, "-frames:v", "1", poster]);
  await sharp(poster).webp({ quality: 80 }).toFile(path.join(OUT, "booking-poster.webp"));
  console.log(`wrote ${OUT}/booking.mp4, booking.webm and booking-poster.webp (${dur.toFixed(1)} s)`);
}

const base = process.argv[2];
if (!base) throw new Error("usage: npx tsx scripts/record-demo.mts <base-url>");
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(base)) {
  throw new Error("Record against a local server only: the script makes a real booking.");
}

mkdirSync(WORK, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--lang=en-GB"] });
try {
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.goto(new URL("/book/lakeside-barbers", base).toString(), { waitUntil: "networkidle0" });
  const film = new Film(page, path.join(WORK, "frames"));
  await book(page, film);
  await encode(film.write(path.join(WORK, "raw.mp4")));
} finally {
  await browser.close();
  rmSync(WORK, { recursive: true, force: true });
}
