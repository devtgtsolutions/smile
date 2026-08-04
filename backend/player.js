const mqtt = require('mqtt');
const player = require('play-sound')({});
const path = require('path');

const client = mqtt.connect('mqtt://localhost:1883');

client.on('connect', () => {
    console.log('✅ Connected to MQTT');

    client.subscribe('audio/play');
});

client.on('message', (topic, message) => {
    const payload = JSON.parse(message.toString());

    console.log('Received:', payload);

    const file = path.join(__dirname, 'audio', payload.track);

    player.play(file, (err) => {
        if (err) {
            console.error(err);
        } else {
            console.log('Finished playing');
        }
    });
});