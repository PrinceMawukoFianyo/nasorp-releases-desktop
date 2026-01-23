module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    ...(process.env.NODE_ENV === 'production' && {
      cssnano: {
        preset: [
          'default',
          {
            // Disable ALL optimizations that could cause issues
            calc: false,
            colormin: false,
            convertValues: false,
            discardComments: { removeAll: true },
            discardDuplicates: true,
            discardEmpty: true,
            discardOverridden: true,
            mergeLonghand: false,
            mergeRules: false,
            minifyFontValues: false,
            minifyGradients: false,
            minifyParams: false,
            minifySelectors: false,
            normalizeCharset: false,
            normalizeDisplayValues: false,
            normalizePositions: false,
            normalizeRepeatStyle: false,
            normalizeString: false,
            normalizeTimingFunctions: false,
            normalizeUnicode: false,
            normalizeUrl: false,
            normalizeWhitespace: false,
            orderedValues: false,
            reduceIdents: false,
            reduceInitial: false,
            reduceTransforms: false,
            svgo: false,
            uniqueSelectors: false,
          },
        ],
      },
    }),
  },
}