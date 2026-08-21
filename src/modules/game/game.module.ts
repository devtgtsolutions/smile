import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AudioModule } from '../audio/audio.module';
import { DmxModule } from '../../dmx/dmx.module';
import { LoggingModule } from '../../logging/logging.module';
import { MagichanismModule } from '../magichanism/magichanism.module';
@Module({
    imports: [
        ConfigModule,
        PassportModule,
        PrismaModule,
        DmxModule,
        AudioModule,
        LoggingModule,
        MagichanismModule,
        // JwtModule.registerAsync({
        //     inject: [ConfigService],
        //     useFactory: (config: ConfigService) => ({
        //         secret: config.get<string>('JWT_ACCESS_SECRET'),
        //         signOptions: {
        //             expiresIn: '15m',
        //         },
        //     }),
        // }),
    ],
    controllers: [GameController],
    providers: [GameService, GameGateway],
    exports: [GameGateway],
})
export class GameModule {}
