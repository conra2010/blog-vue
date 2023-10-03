export const AP_ENTRYPOINT = import.meta.env.VITE_AP_ENTRYPOINT

export const MERCURE_ENTRYPOINT = import.meta.env.VITE_MERCURE_ENTRYPOINT

//  the URL that Caddy uses to contact Mercure
export const CADDY_MERCURE_URL = import.meta.env.VITE_CADDY_MERCURE_URL


export const GRAPHQL_ENTRYPOINT = AP_ENTRYPOINT + '/graphql';

export const MERCURE_WELL_KNOWN = MERCURE_ENTRYPOINT + '/.well-known/mercure';

export const MERCURE_TOPICS_PREFIX = AP_ENTRYPOINT
