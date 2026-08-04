/**
 * AdaptUs dealership inventory embed
 * Usage:
 *   <div data-adaptus-inventory data-dealership="UUID" data-token="aix_…"></div>
 *   <script async src="https://YOUR_HOST/embed/inventory.js"></script>
 *
 * WordPress: paste into a Custom HTML block.
 */
(function () {
  "use strict";

  var ATTR = "data-adaptus-inventory";
  var STYLE_ID = "adaptus-inventory-embed-css";

  function scriptOrigin() {
    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i].src || "";
      if (src.indexOf("/embed/inventory.js") !== -1) {
        try {
          return new URL(src).origin;
        } catch (e) {
          /* fall through */
        }
      }
    }
    return window.location.origin;
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var css =
      ".adaptus-inv{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;box-sizing:border-box}" +
      ".adaptus-inv *,.adaptus-inv *:before,.adaptus-inv *:after{box-sizing:border-box}" +
      ".adaptus-inv__status{padding:1.25rem;text-align:center;color:#64748b;font-size:.875rem}" +
      ".adaptus-inv__grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1rem}" +
      ".adaptus-inv__card{display:flex;flex-direction:column;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;background:#fff;text-decoration:none;color:inherit;transition:border-color .15s ease,box-shadow .15s ease}" +
      ".adaptus-inv__card:hover{border-color:#94a3b8;box-shadow:0 4px 14px rgba(15,23,42,.06)}" +
      ".adaptus-inv__photo{aspect-ratio:16/10;background:#f1f5f9;overflow:hidden}" +
      ".adaptus-inv__photo img{width:100%;height:100%;object-fit:cover;display:block}" +
      ".adaptus-inv__body{padding:.85rem 1rem 1rem;display:flex;flex-direction:column;gap:.35rem;flex:1}" +
      ".adaptus-inv__title{font-size:1rem;font-weight:650;line-height:1.25;margin:0;letter-spacing:-.01em}" +
      ".adaptus-inv__meta{font-size:.75rem;color:#64748b;margin:0}" +
      ".adaptus-inv__price{font-size:1.05rem;font-weight:700;margin-top:auto;padding-top:.5rem;font-variant-numeric:tabular-nums}" +
      ".adaptus-inv__hdr{display:flex;align-items:baseline;justify-content:space-between;gap:.75rem;margin-bottom:.85rem}" +
      ".adaptus-inv__hdr h2{font-size:1.125rem;font-weight:700;margin:0;letter-spacing:-.02em}" +
      ".adaptus-inv__hdr p{font-size:.75rem;color:#64748b;margin:0}";
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function formatPrice(n) {
    if (n == null || n === "" || isNaN(Number(n))) return "Call for price";
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "CAD",
        maximumFractionDigits: 0,
      }).format(Number(n));
    } catch (e) {
      return "$" + Number(n).toLocaleString();
    }
  }

  function formatMiles(n) {
    if (n == null || n === "") return "";
    return Number(n).toLocaleString() + " km";
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function injectJsonLd(vehicles) {
    if (!vehicles || !vehicles.length) return;
    var existing = document.getElementById("adaptus-inv-jsonld");
    if (existing) existing.remove();
    var graph = vehicles.map(function (v) {
      return {
        "@context": "https://schema.org",
        "@type": "Car",
        name: [v.year, v.make, v.model, v.trim].filter(Boolean).join(" "),
        brand: { "@type": "Brand", name: v.make },
        model: v.model,
        vehicleModelDate: v.year,
        color: v.exterior_color || undefined,
        image: v.photos || (v.photo ? [v.photo] : []),
        offers: {
          "@type": "Offer",
          priceCurrency: "CAD",
          price: v.special_price != null ? v.special_price : v.retail_price,
          availability: "https://schema.org/InStock",
        },
      };
    });
    var script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "adaptus-inv-jsonld";
    script.textContent = JSON.stringify(graph.length === 1 ? graph[0] : graph);
    document.head.appendChild(script);
  }

  function render(el, payload) {
    var vehicles = payload.data || [];
    var dealer = payload.dealership || {};
    var vdpBase = el.getAttribute("data-vdp-base") || "";
    var limitAttr = el.getAttribute("data-limit");
    var limit = limitAttr ? parseInt(limitAttr, 10) : vehicles.length;
    if (!isNaN(limit) && limit > 0) vehicles = vehicles.slice(0, limit);

    var hdr =
      '<div class="adaptus-inv__hdr"><h2>' +
      esc(dealer.name || "Inventory") +
      "</h2><p>" +
      vehicles.length +
      " vehicle" +
      (vehicles.length === 1 ? "" : "s") +
      "</p></div>";

    if (!vehicles.length) {
      el.innerHTML =
        '<div class="adaptus-inv">' +
        hdr +
        '<div class="adaptus-inv__status">No vehicles available right now.</div></div>';
      return;
    }

    var cards = vehicles
      .map(function (v) {
        var title = [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ");
        var photo = v.photo || (v.photos && v.photos[0]) || "";
        var price = formatPrice(
          v.special_price != null ? v.special_price : v.retail_price
        );
        var metaParts = [];
        if (v.stock_number) metaParts.push("Stock #" + v.stock_number);
        if (v.odometer != null) metaParts.push(formatMiles(v.odometer));
        if (v.exterior_color) metaParts.push(v.exterior_color);
        var href = vdpBase
          ? vdpBase.replace(/\/$/, "") +
            (vdpBase.indexOf("?") >= 0 ? "&" : "/") +
            encodeURIComponent(v.id)
          : "#";
        var tag = vdpBase ? "a" : "div";
        var hrefAttr = vdpBase ? ' href="' + esc(href) + '" target="_blank" rel="noopener"' : "";
        return (
          "<" +
          tag +
          ' class="adaptus-inv__card"' +
          hrefAttr +
          ">" +
          '<div class="adaptus-inv__photo">' +
          (photo
            ? '<img src="' + esc(photo) + '" alt="' + esc(title) + '" loading="lazy" />'
            : "") +
          "</div>" +
          '<div class="adaptus-inv__body">' +
          '<p class="adaptus-inv__title">' +
          esc(title) +
          "</p>" +
          '<p class="adaptus-inv__meta">' +
          esc(metaParts.join(" · ")) +
          "</p>" +
          '<p class="adaptus-inv__price">' +
          esc(price) +
          "</p>" +
          "</div></" +
          tag +
          ">"
        );
      })
      .join("");

    el.innerHTML =
      '<div class="adaptus-inv">' +
      hdr +
      '<div class="adaptus-inv__grid">' +
      cards +
      "</div></div>";

    if (el.getAttribute("data-jsonld") !== "0") {
      injectJsonLd(vehicles);
    }
  }

  function mount(el) {
    ensureStyles();
    var dealership = el.getAttribute("data-dealership") || "";
    var slug = el.getAttribute("data-slug") || "";
    var token = el.getAttribute("data-token") || "";
    var origin = el.getAttribute("data-api-origin") || scriptOrigin();
    var limit = el.getAttribute("data-limit") || "24";

    if (!dealership && !slug && !token) {
      el.innerHTML =
        '<div class="adaptus-inv"><div class="adaptus-inv__status">Missing dealership scope (data-dealership, data-slug, or data-token).</div></div>';
      return;
    }

    el.innerHTML =
      '<div class="adaptus-inv"><div class="adaptus-inv__status">Loading inventory…</div></div>';

    var qs = [];
    if (dealership) qs.push("dealership_id=" + encodeURIComponent(dealership));
    if (slug) qs.push("slug=" + encodeURIComponent(slug));
    if (token) qs.push("token=" + encodeURIComponent(token));
    qs.push("limit=" + encodeURIComponent(limit));
    qs.push("jsonld=1");

    var url = origin.replace(/\/$/, "") + "/api/vehicles/public?" + qs.join("&");

    fetch(url, { credentials: "omit" })
      .then(function (res) {
        return res.json().then(function (body) {
          if (!res.ok) throw new Error(body.error || "Failed to load inventory");
          return body;
        });
      })
      .then(function (payload) {
        render(el, payload);
      })
      .catch(function (err) {
        el.innerHTML =
          '<div class="adaptus-inv"><div class="adaptus-inv__status">' +
          esc(err.message || "Unable to load inventory") +
          "</div></div>";
      });
  }

  function boot() {
    var nodes = document.querySelectorAll("[" + ATTR + "]");
    for (var i = 0; i < nodes.length; i++) mount(nodes[i]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.AdaptusInventoryEmbed = { refresh: boot };
})();
