# Dashboard Editing

The non-Dune dashboards share one stable shell and one runtime engine:

- `catalog.js` owns dashboard copy, tabs, metrics, feed rows, palette, scene choice, videos, thumbnails, channel picker tiles, channel order, and optional identity assets.
- `prototype.js` owns the shared rendering/runtime behavior.
- `../prototype-dashboard.html` owns the shared HTML/CSS frame.

To make a dashboard visually distinct without touching the main app shell, add an `identity` block to that dashboard in `catalog.js`:

```js
identity: {
  className: "dashboard-news",
  css: "dashboards/identities/news.css",
  script: "dashboards/identities/news.js",
},
```

The CSS file can target `body[data-dashboard="news"]` or the class name above. The JS file can register a custom stage renderer:

```js
window.KATECHON_DASHBOARD_RENDERERS = window.KATECHON_DASHBOARD_RENDERERS || {};
window.KATECHON_DASHBOARD_RENDERERS.news = ({ state, helpers }) => `
  <div class="scene newsroom">
    ${state.feed.map((item) => `<article>${helpers.escapeHtml(item[1])}</article>`).join("")}
  </div>
`;
```

If no identity files are configured, the dashboard keeps using the shared scene renderer from `prototype.js`.

The main channel picker in `../index.html` also reads `channels` and `channelOrder` from this catalog. To add, remove, rename, reorder, or change the tile media for a dashboard, update those entries here instead of editing the picker HTML.
