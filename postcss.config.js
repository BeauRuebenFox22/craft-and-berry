module.exports = {
  plugins: [
    require('autoprefixer')({
      flexbox: 'no-2009',
      grid: false,
    }),
    require('postcss-sort-media-queries')({
      sort: 'mobile-first', // default value
    })
  ],
};