import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { KaraokeController } from './karaoke.controller';
import { KaraokeService } from './karaoke.service';
import { GameModule } from '../game/game.module'; 
import { AudioModule } from '../audio/audio.module';
import { DmxModule } from 'src/dmx/dmx.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
     imports: [
            ConfigModule,
            PassportModule,
            PrismaModule,
            DmxModule,
            AudioModule,
            GameModule,
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
  controllers: [KaraokeController],
  providers: [KaraokeService],
})
export class KaraokeModule {}