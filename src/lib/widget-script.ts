// Source of /widget.js, the script host sites load. Kept dependency-free and
// written in plain ES2017 so it runs on any site. `base` (our origin) is the
// only value injected, via JSON.stringify.
//
// Usage on a host page:
//   <script src="https://…/widget.js" data-shop="demo-salon" async></script>
// or, from an app:
//   const widget = BookSlot.mount("#booking", { shop: "demo-salon", onBooked });
//
// Events arrive as callbacks (onReady/onResize/onBooked/onError, or
// widget.on(...)) and as bubbling DOM events ("bookslot:booked", …) on the
// element the widget was mounted into.

export function widgetScript(base: string) {
  return `(function () {
  "use strict";
  var BASE = ${JSON.stringify(base)};
  var BASE_ORIGIN = new URL(BASE).origin;
  var THEME_KEYS = ["primary", "background", "text", "radius", "font", "scheme"];
  var EVENTS = ["ready", "resize", "booked", "error"];

  function createApi() {
    var instances = {};
    var seq = 0;

    function injectStyles() {
      if (document.getElementById("bookslot-styles")) return;
      var style = document.createElement("style");
      style.id = "bookslot-styles";
      // :where() keeps specificity at zero so host CSS always wins.
      style.textContent =
        ":where(.bookslot-frame){display:block;width:100%;max-width:480px;border:0;" +
        "border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,.08);transition:height .15s ease}";
      (document.head || document.documentElement).appendChild(style);
    }

    function mount(target, options) {
      var el = typeof target === "string" ? document.querySelector(target) : target;
      if (!el) throw new Error("BookSlot: mount target not found");
      options = options || {};
      if (!options.shop) throw new Error("BookSlot: options.shop is required");
      injectStyles();

      var id = "bs" + ++seq + "-" + Math.random().toString(36).slice(2, 8);
      var query = new URLSearchParams();
      query.set("instance", id);
      query.set("origin", window.location.origin);
      var theme = options.theme || {};
      THEME_KEYS.forEach(function (key) {
        if (theme[key] != null && theme[key] !== "") query.set(key, String(theme[key]));
      });
      if (options.service) query.set("service", String(options.service));
      if (options.staff) query.set("staff", String(options.staff));

      var iframe = document.createElement("iframe");
      iframe.className = "bookslot-frame";
      iframe.title = options.title || "Book an appointment";
      iframe.src = BASE + "/embed/" + encodeURIComponent(options.shop) + "?" + query.toString();
      iframe.style.height = (Number(options.height) || 720) + "px";
      if (options.maxWidth) {
        iframe.style.maxWidth =
          typeof options.maxWidth === "number" ? options.maxWidth + "px" : String(options.maxWidth);
      }
      el.appendChild(iframe);

      var handlers = {};
      var record = {
        el: el,
        iframe: iframe,
        ready: false,
        outbox: [],
        autoHeight: options.autoHeight !== false,
      };

      record.emit = function (type, detail) {
        (handlers[type] || []).slice().forEach(function (fn) {
          try { fn(detail); } catch (err) { setTimeout(function () { throw err; }); }
        });
        el.dispatchEvent(new CustomEvent("bookslot:" + type, { detail: detail, bubbles: true }));
      };

      record.send = function (message) {
        message.source = "bookslot";
        message.instance = id;
        if (!record.ready || !iframe.contentWindow) {
          record.outbox.push(message);
          return;
        }
        iframe.contentWindow.postMessage(message, BASE_ORIGIN);
      };

      var widget = {
        id: id,
        iframe: iframe,
        on: function (type, fn) {
          (handlers[type] = handlers[type] || []).push(fn);
          return widget;
        },
        off: function (type, fn) {
          handlers[type] = (handlers[type] || []).filter(function (h) { return h !== fn; });
          return widget;
        },
        /** Fill in customer details, and optionally pick a service and staff member (Pro plan). Safe to call before the widget loads. */
        prefill: function (customer, service, staff) {
          record.send({ type: "prefill", customer: customer || {}, service: service, staff: staff });
          return widget;
        },
        destroy: function () {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
          delete instances[id];
        },
      };

      EVENTS.forEach(function (type) {
        var callback = options["on" + type.charAt(0).toUpperCase() + type.slice(1)];
        if (typeof callback === "function") widget.on(type, callback);
      });
      instances[id] = record;
      if (options.prefill) widget.prefill(options.prefill);
      return widget;
    }

    window.addEventListener("message", function (event) {
      if (event.origin !== BASE_ORIGIN) return;
      var data = event.data;
      if (!data || data.source !== "bookslot") return;
      var record = instances[data.instance];
      if (!record || event.source !== record.iframe.contentWindow) return;

      if (data.type === "ready") {
        record.ready = true;
        record.outbox.splice(0).forEach(record.send);
        record.emit("ready", { shop: data.shop });
      } else if (data.type === "resize") {
        var height = Math.ceil(Number(data.height));
        if (record.autoHeight && height > 0) record.iframe.style.height = height + "px";
        record.emit("resize", { height: height });
      } else if (data.type === "booked") {
        record.emit("booked", data.booking);
      } else if (data.type === "error") {
        record.emit("error", { message: data.message });
      }
    });

    return { version: 1, origin: BASE_ORIGIN, mount: mount };
  }

  // One API per BookSlot address, so a page can load widgets from two
  // BookSlots (hosted and self-hosted) without the second silently using
  // the first. Loading the same widget.js twice reuses its API.
  // window.BookSlot stays the first one loaded.
  var registry = (window.__bookslot = window.__bookslot || {});
  var api = registry[BASE_ORIGIN] || createApi();
  registry[BASE_ORIGIN] = api;
  if (!window.BookSlot || !window.BookSlot.version) window.BookSlot = api;

  // One-line embed: <script src=".../widget.js" data-shop="…"> mounts itself
  // right after the script tag. ?shop= in the src still works (older snippets).
  var script = document.currentScript;
  if (!script || !script.src) return;
  var shop = script.getAttribute("data-shop") || new URL(script.src, location.href).searchParams.get("shop");
  if (!shop) return;
  var d = script.dataset;
  var container = document.createElement("div");
  container.className = "bookslot-widget";
  script.parentNode.insertBefore(container, script.nextSibling);
  api.mount(container, {
    shop: shop,
    height: d.height,
    maxWidth: d.maxWidth,
    service: d.service,
    staff: d.staff,
    theme: {
      primary: d.primary || d.color,
      background: d.background,
      text: d.text,
      radius: d.radius,
      font: d.font,
      scheme: d.scheme,
    },
  });
})();
`;
}
