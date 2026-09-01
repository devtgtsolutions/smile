import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as mqtt from 'mqtt';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private client: mqtt.MqttClient;
  private logger = new Logger('MqttService');

onModuleInit() {
  const brokerUrl = (process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883');
  if (!brokerUrl) {
    // this.logger.warn('MQTT_BROKER_URL not set — MQTT features disabled (expected in cloud testing)');
    return;
  }
  this.client = mqtt.connect(brokerUrl);

    this.client.on('connect', () => {
      // this.logger.log('Connected to Mosquitto broker');
    });

    this.client.on('error', (err) => {
      // this.logger.error(`MQTT connection error: ${err.message}`);
    });
  }

  onModuleDestroy() {
    this.client?.end();
  }
  publish(topic: string, payload: Record<string, any>) {
  if (!this.client) return; // silently no-op if MQTT was never connected
  this.client.publish(topic, JSON.stringify(payload), { qos: 1 });
}
  // publish(topic: string, payload: Record<string, any>) {
  //   this.client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
  //     if (err) this.logger.error(`Failed to publish to ${topic}: ${err.message}`);
  //   });
  // }

  subscribe(topic: string, onMessage: (payload: any) => void) {
    this.client.subscribe(topic, { qos: 1 });
    this.client.on('message', (receivedTopic, message) => {
      if (receivedTopic === topic) {
        // onMessage(JSON.parse(message.toString()));
      }
    });
  }
  
}