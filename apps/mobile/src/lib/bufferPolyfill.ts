// Hermes has no Node Buffer global, but bwip-js/react-native needs one
// at import time to load its built-in fonts.
import { Buffer } from 'buffer';

if (typeof global.Buffer === 'undefined' || !global.Buffer.from) {
  // @ts-expect-error Node and browser Buffer typings differ slightly
  global.Buffer = Buffer;
}
