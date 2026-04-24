const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Icon font tree-shaking: only bundle fonts used in production.
// Ionicons (~90 imports) and Octicons (~5 imports) are the only families used.
const USED_ICON_FONTS = new Set(["Ionicons.ttf", "Octicons.ttf"]);
const ICON_FONTS_DIR = path.normalize(
    "node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/"
);

config.serializer = config.serializer || {};
const baseProcessModuleFilter = config.serializer.processModuleFilter;
config.serializer.processModuleFilter = (module) => {
    // Filter unused icon font assets from bundle
    if (module.path && module.path.includes(ICON_FONTS_DIR)) {
        if (!USED_ICON_FONTS.has(path.basename(module.path))) {
            return false;
        }
    }
    if (baseProcessModuleFilter) {
        return baseProcessModuleFilter(module);
    }
    return true;
};

// Older Expo CLI versions might skip injecting the unstable asset path.
config.transformer = config.transformer || {};
if (!config.transformer.publicPath) {
  config.transformer.publicPath = '/assets/?unstable_path=.';
}

const baseEnhanceMiddleware = config.server?.enhanceMiddleware;

config.server = config.server || {};
const baseRewriteRequestUrl = config.server.rewriteRequestUrl;
config.server.rewriteRequestUrl = (url) => {
  const rewritten = baseRewriteRequestUrl ? baseRewriteRequestUrl(url) : url;

  if (!rewritten.startsWith('/assets/')) {
    return rewritten;
  }

  const [pathname, ...queryParts] = rewritten.split('?');
  let decodedPathname = pathname;
  try {
    decodedPathname = decodeURIComponent(pathname);
  } catch {
    // Ignore decoding errors – Metro will continue with the original path
  }

  return queryParts.length
    ? `${decodedPathname}?${queryParts.join('?')}`
    : decodedPathname;
};

config.server.enhanceMiddleware = (middleware, server) => {
  const enhanced = baseEnhanceMiddleware
    ? baseEnhanceMiddleware(middleware, server)
    : middleware;

  return (req, res, next) => {
    if (req.url?.startsWith('/assets/')) {
      const [pathname, ...queryParts] = req.url.split('?');
      const decodedPathname = pathname.replace(/%2F/gi, '/');
      req.url = queryParts.length
        ? `${decodedPathname}?${queryParts.join('?')}`
        : decodedPathname;
    }

    return enhanced(req, res, next);
  };
};

module.exports = config;
