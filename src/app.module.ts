import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AuthModule } from './modules/auth/auth.module';
import { QuizModule } from './modules/quiz/quiz.module';
import { RoomModule } from './modules/room/room.module';
import { GameModule } from './modules/game/game.module';
import { RedisModule } from './redis/redis.module';
import { MqttModule } from './mqtt/mqtt.module';
import { DmxModule } from './dmx/dmx.module';
import { AudioModule } from './modules/audio/audio.module';
import { AmbianceModule } from './modules/ambiance/ambiance.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { HelpRequestModule } from './modules/help-request/help-request.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    AuthModule,
    QuizModule,
    RoomModule,
    GameModule,
    RedisModule,
    MqttModule,
    AudioModule,
    DmxModule,
    AmbianceModule,
    HelpRequestModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000, 
        limit: 100,
      },
    ]),
  ],

  controllers: [AppController],
  providers: [AppService,
     {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, 
    }
  ],
})
export class AppModule { }