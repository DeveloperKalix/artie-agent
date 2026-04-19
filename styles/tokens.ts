/**
 * Design tokens — single source of truth for brand colors, spacing, and motion.
 * Import from `@/styles/tokens` (or `@/styles`) in components; keeps values tree-shakeable and easy to tune.
 */
export const tokens = {
  color: {
    /** Primary teal — fox / favicon mid-tone */
    brandTeal: '#2EB8B8',
    /** Lighter aqua — highlights, soft glows */
    brandTealLight: '#B2F2EF',
    /** Deep teal — accents */
    brandTealDark: '#0D7377',
    white: '#ffffff',
    slate: {
      50: '#f8fafc',
      500: '#64748b',
      600: '#475569',
      900: '#0f172a',
    },
  },

  /** Login / brand halo around favicon */
  aura: {
    /** Wrapper that fits outer bloom without clipping */
    haloContainerSize: 148,
    /** Hollow ring diameter (matches favicon frame) */
    ringSize: 112,
    ringBorderWidth: 3,
    /** Soft filled layer behind the ring (diameter multiplier × ringSize). Peak size toned down ~20% vs 1.42 so it stays clear of title text. */
    bloomDiameterRatio: 1.136,
    bloom: {
      opacityMin: 0.14,
      opacityMax: 0.48,
      scaleMin: 0.94,
      scaleMax: 1.2,
    },
    ring: {
      opacityMin: 0.5,
      opacityMax: 1,
      scaleMin: 1,
      scaleMax: 1.12,
    },
    /** Inverse pulse for sparkle dots (twinkle) */
    sparkle: {
      opacityMin: 0.25,
      opacityMax: 0.95,
      dotSize: 5,
      orbit: 52,
    },
    shadow: {
      bloom: {
        ios: {
          shadowOffset: { width: 0, height: 0 } as const,
          shadowRadius: 28,
          shadowOpacity: 0.55,
        },
        android: { elevation: 10 },
      },
      ring: {
        ios: {
          shadowOffset: { width: 0, height: 0 } as const,
          shadowRadius: 16,
          shadowOpacity: 0.45,
        },
        android: { elevation: 8 },
      },
    },
    timing: {
      breatheMs: 2600,
    },
  },

  /** Foresight recommendation actions — icon halos + semantic accents */
  foresight: {
    buy: {
      icon: 'trending-up' as const,
      gradient: ['#2EB8B8', '#0D7377', 'transparent'] as const,
      halo: 'rgba(46, 184, 184, 0.35)',
      innerBg: 'rgba(255, 255, 255, 0.94)',
      iconColor: '#0f172a',
    },
    sell: {
      icon: 'trending-down' as const,
      gradient: ['#f59e0b', '#d97706', 'transparent'] as const,
      halo: 'rgba(245, 158, 11, 0.35)',
      innerBg: 'rgba(255, 255, 255, 0.94)',
      iconColor: '#0f172a',
    },
    liquidate: {
      icon: 'flash' as const,
      gradient: ['#f43f5e', '#be123c', 'transparent'] as const,
      halo: 'rgba(244, 63, 94, 0.4)',
      innerBg: '#9f1239',
      iconColor: '#ffffff',
    },
  },

  /** “NEW” and small labels */
  tag: {
    new: {
      background: '#ecfeff',
      text: '#0d7377',
      border: '#99f6e4',
    },
  },
} as const;

export type Tokens = typeof tokens;
