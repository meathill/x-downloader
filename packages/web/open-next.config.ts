const sharedOverride = {
  converter: 'edge',
  proxyExternalRequest: 'fetch',
  incrementalCache: 'dummy',
  tagCache: 'dummy',
  queue: 'dummy',
} as const;

const config = {
  default: {
    override: {
      wrapper: 'cloudflare-node',
      ...sharedOverride,
    },
  },
  edgeExternals: ['node:crypto'],
  middleware: {
    external: true,
    override: {
      wrapper: 'cloudflare-edge',
      ...sharedOverride,
    },
  },
};

export default config;
