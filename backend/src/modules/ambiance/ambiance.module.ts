import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AmbianceController } from './ambiance.controller';
import { AmbianceService } from './ambiance.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AudioModule } from '../audio/audio.module';
import { GameModule } from '../game/game.module';


@Module({
  imports: [
    ConfigModule,
    PassportModule,
    PrismaModule,
    AudioModule,
    GameModule,
    // JwtModule.registerAsync({
    //   inject: [ConfigService],
    //   useFactory: (config: ConfigService) => ({
    //     secret: config.get<string>('JWT_ACCESS_SECRET'),
    //     signOptions: {
    //       expiresIn: '15m',
    //     },
    //   }),
    // }),
  ],
  controllers: [AmbianceController],
  providers: [AmbianceService],
  exports: [AmbianceService],
})
export class AmbianceModule {}
