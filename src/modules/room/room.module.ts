import { Module } from '@nestjs/common';
// import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { RoomController } from './room.controller';
import { RoomService } from './room.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggingModule } from 'src/logging/logging.module';

@Module({
    imports: [
        ConfigModule,
        PassportModule,
        PrismaModule,
        LoggingModule,

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
    controllers: [RoomController],
    providers: [RoomService],
})
export class RoomModule { }