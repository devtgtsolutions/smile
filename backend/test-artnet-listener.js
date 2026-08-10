// test-artnet-listener.js
const dgram = require('dgram');
const socket = dgram.createSocket('udp4');
socket.on('message', (msg) => {
  console.log(`Received ${msg.length} bytes of Art-Net data at`, new Date().toISOString());
});
socket.bind(6454); // standard Art-Net UDP port
console.log('Listening for Art-Net packets on port 6454...');