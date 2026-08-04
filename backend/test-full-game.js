// test-full-game.js - simulate the Main tablet watching the whole session
const { io } = require('socket.io-client');

const TENANT_ID = process.argv[2];
const socket = io('http://localhost:3000');

socket.on('connect', () => socket.emit('joinRoom', { tenantId: TENANT_ID }));
socket.on('question:show', (d) => console.log('QUESTION SHOWN:', d.question.text, d.question.options));
socket.on('question:timeUp', (d) => console.log('TIME UP for session', d.sessionId));
socket.on('ranking:update', (d) => console.log('LIVE RANKING:', d));
socket.on('session:finished', (d) => console.log('SESSION FINISHED:', d.finalRanking));