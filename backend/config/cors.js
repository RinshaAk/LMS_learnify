const defaultProductionOrigins = [
  "https://stackversehub.in",
  "https://www.stackversehub.in",
];

export const buildAllowedCorsOrigins = (env = {}) =>
  new Set(
    [
      env.CLIENT_URL,
      ...(env.CLIENT_URLS || []),
      ...defaultProductionOrigins,
    ].filter(Boolean)
  );

export const isCorsOriginAllowed = (origin, allowedOrigins) =>
  !origin || allowedOrigins.has(origin);




