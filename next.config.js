/** @type {import('next').NextConfig} */
const nextConfig = {
    // Can be safely removed in newer version  s of Next.js
    future: {

        // by default, if you customize webpack config, they switch back to version 4.
        // Looks like backward compatibility approach.
        webpack5: true,
    },

    webpack(config) {
        config.resolve.fallback = {

            // if you miss it, all the other options in fallback, specified
            // by next.js will be dropped.
            ...config.resolve.fallback,

            fs: require.resolve('browserify-fs'), //
            http: require.resolve('http-browserify'), //
            https: require.resolve('https-browserify'), //
            path: require.resolve('path-browserify'), //
            stream: require.resolve('stream-browserify'),
            zlib: require.resolve('browserify-zlib'),
        };

        return config;
    },
};

module.exports = nextConfig;
