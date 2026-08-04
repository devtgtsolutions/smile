// test-ws-room.js
const { io } = require('socket.io-client');
const socket = io('http://localhost:3000');

const TENANT_ID = process.argv[2]; // pass a real tenant UUID as arg

socket.on('connect', () => {
  console.log('connected:', socket.id);
  socket.emit('joinRoom', { tenantId: TENANT_ID });
});
socket.on('joinedRoom', (d) => console.log('joined:', d));
socket.on('question:show', (d) => console.log('QUESTION:', d));
socket.on('question:timeUp', (d) => console.log('TIME UP:', d));