import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../../redis/redis.module'; // <-- add
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AudioModule } from '../audio/audio.module';
import { DmxModule } from '../../dmx/dmx.module';
import { LoggingModule } from '../../logging/logging.module';
import { MagichanismModule } from '../magichanism/magichanism.module';
import { DeviceModule } from 'src/devices/device.module';

@Module({
    imports: [
        ConfigModule,
        PassportModule,
        PrismaModule,
        RedisModule,
        DmxModule,
        AudioModule,
        LoggingModule,
        MagichanismModule,
        DeviceModule,
    ],
    controllers: [GameController],
    providers: [GameService, GameGateway],
    exports: [GameGateway],
})
export class GameModule { }