import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { User } from '../users/entities/user.entity';
import { AuthTokens } from './interfaces/auth-tokens.interface';

interface TokenPayload {
  sub: string;
  email: string;
}

@Injectable()
export class AuthService {
  private readonly accessTokenExpiresIn: number;
  private readonly refreshTokenExpiresIn: number;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.accessTokenExpiresIn = this.parseExpiration(
      configService.get<string>('JWT_ACCESS_TOKEN_EXPIRATION', '3600'),
    );
    this.refreshTokenExpiresIn = this.parseExpiration(
      configService.get<string>('JWT_REFRESH_TOKEN_EXPIRATION', '604800'),
    );
  }

  async register(payload: CreateUserDto): Promise<{ user: User; tokens: AuthTokens }> {
    const existing = await this.usersService.findByEmail(payload.email);
    if (existing) {
      throw new ConflictException('이미 사용 중인 이메일입니다.');
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const user = await this.usersService.createUser({
      ...payload,
      passwordHash,
    });

    const tokens = await this.generateTokens(user);
    return { user, tokens };
  }

  async login(email: string, password: string): Promise<{ user: User; tokens: AuthTokens }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    const tokens = await this.generateTokens(user);
    return { user, tokens };
  }

  async refresh(user: User): Promise<AuthTokens> {
    return this.generateTokens(user);
  }

  async refreshWithToken(refreshToken: string): Promise<{ user: User; tokens: AuthTokens }> {
    const payload = await this.jwtService.verifyAsync<TokenPayload>(refreshToken, {
      secret: this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET', 'dev-refresh-secret'),
    });

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
    }

    const tokens = await this.generateTokens(user);
    return { user, tokens };
  }

  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_TOKEN_SECRET', 'dev-secret'),
        expiresIn: this.accessTokenExpiresIn,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET', 'dev-refresh-secret'),
        expiresIn: this.refreshTokenExpiresIn,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenExpiresIn,
      refreshTokenExpiresIn: this.refreshTokenExpiresIn,
    };
  }

  private parseExpiration(expiration: string): number {
    if (!expiration) {
      return 0;
    }

    if (/^\d+$/.test(expiration)) {
      return parseInt(expiration, 10);
    }

    const match = expiration.match(/^(\d+)([smhd])$/i);
    if (!match) {
      return parseInt(expiration, 10);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return value;
    }
  }
}

