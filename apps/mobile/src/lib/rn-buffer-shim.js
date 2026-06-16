// bwip-js's RN build does `import Buffer from 'react-zlib-js/buffer.js'`
// expecting the Buffer constructor, but that UMD bundle exports the whole
// module namespace ({ Buffer, SlowBuffer, ... }), which crashes Hermes at
// load time ("constructor is not callable"). metro.config.js redirects the
// import here so bwip-js gets a real Buffer constructor.
module.exports = require('buffer').Buffer;
