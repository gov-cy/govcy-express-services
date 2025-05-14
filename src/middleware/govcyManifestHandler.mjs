/**
 * Middleware to handle rendering of manifest.json
 */
export function govcyManifestHandler() {
  return (req, res, next) => {
    try {
      const { site } = req.serviceData;

      // Generate the manifest JSON dynamically
      const manifest = {
        short_name: site.title[site.lang],
        name: site.title[site.lang],
        description: site.description[site.lang],
        icons: [
          {
            src: `${site.cdn.dist}/img/icons-128.png`,
            type: "image/png",
            sizes: "128x128"
          },
          {
            src: `${site.cdn.dist}/img/icons-192.png`,
            type: "image/png",
            sizes: "192x192"
          },
          {
            src: `${site.cdn.dist}/img/icons-512.png`,
            type: "image/png",
            sizes: "512x512"
          }
        ],
        start_url: `/${req.params.siteId}/index`,
        background_color: "#31576F",
        display: "standalone",
        scope: `/${req.params.siteId}/`,
        theme_color: "#31576F",
        dir: "ltr"
      };

      // Set the Content-Type to application/json and send the manifest
      res.setHeader('Content-Type', 'application/json');
      res.json(manifest);
    } catch (error) {
      return next(error);  // Pass error to govcyHttpErrorHandler
    }
  };
}
