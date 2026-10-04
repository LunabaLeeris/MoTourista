import { generateMapCss } from './mapStyles';
import { getMapRuntimeScript } from './mapRuntime';

export function buildMapHtml(): string {
  const css = generateMapCss();
  const script = getMapRuntimeScript();

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>MoTourista Map</title>
    <link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" />
    <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
    <style>
${css}
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script>
${script}
    </script>
  </body>
</html>`;
}

export const MAP_HTML = buildMapHtml();
