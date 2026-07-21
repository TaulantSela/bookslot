import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shop = searchParams.get("shop");

  if (!shop) {
    return new NextResponse("Missing shop parameter", { status: 400 });
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const js = `(function(){
  var s = document.currentScript;
  var shop = ${JSON.stringify(shop)};
  var color = s.getAttribute('data-color') || '#2563eb';
  var height = s.getAttribute('data-height') || '720';
  var container = document.createElement('div');
  container.id = 'bookslot-widget-' + shop;
  s.parentNode.insertBefore(container, s.nextSibling);
  var iframe = document.createElement('iframe');
  iframe.src = ${JSON.stringify(base)} + '/embed/' + shop;
  iframe.style.width = '100%';
  iframe.style.maxWidth = '480px';
  iframe.style.height = height + 'px';
  iframe.style.border = '0';
  iframe.style.borderRadius = '16px';
  iframe.style.boxShadow = '0 8px 30px rgba(0,0,0,0.08)';
  iframe.title = 'Book appointment';
  container.appendChild(iframe);
})();`;

  return new NextResponse(js, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
