import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
constructor(configService: ConfigService) {
  super({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: configService.get<string>('JWT_REFRESH_SECRET'),
    passReqToCallback: true,
  });
}

  validate(req: Request, payload: any) {
    const refreshToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    return { userId: payload.sub, refreshToken };
  }
}