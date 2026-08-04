import { Module, Global } from '@nestjs/common';
import { MqttService } from './mqtt.service';

@Global() // same reasoning as RedisModule — Game, Room, and Audio all need this
@Module({
  providers: [MqttService],
  exports: [MqttService],
})

export class MqttModule {
    
}