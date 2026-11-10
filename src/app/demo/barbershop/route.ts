import { readFile } from "node:fs/promises";
import path from "node:path";

// Serves examples/html-free/index.html unchanged except for the widget
// address, which points at this BookSlot instead of localhost.
export async function GET(request: Request) {
  const file = path.join(process.cwd(), "examples", "html-free", "index.html");
  const html = await readFile(file, "utf8");
  const origin = new URL(request.url).origin;
  return new Response(
    html.replace('src="http://localhost:3000/widget.js"', `src="${origin}/widget.js"`),
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    },
  );
}
