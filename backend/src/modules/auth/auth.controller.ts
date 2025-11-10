import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { LoginRequestDto } from './dto/login-request.dto';
import { RefreshRequestDto } from './dto/refresh-request.dto';
import { RegisterRequestDto } from './dto/register-request.dto';
import { User } from '../users/entities/user.entity';

@ApiTags('Auth')
@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: '회원가입' })
  async register(@Body() payload: RegisterRequestDto) {
    const { user, tokens } = await this.authService.register(payload);
    return {
      success: true,
      data: {
        user,
        tokens,
      },
    };
  }

  @Post('login')
  @ApiOperation({ summary: '로그인' })
  @HttpCode(HttpStatus.OK)
  async login(@Body() payload: LoginRequestDto) {
    const { user, tokens } = await this.authService.login(payload.email, payload.password);
    return {
      success: true,
      data: {
        user,
        tokens,
      },
    };
  }

  @Post('refresh')
  @ApiOperation({ summary: '토큰 갱신' })
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() payload: RefreshRequestDto) {
    const { user, tokens } = await this.authService.refreshWithToken(payload.refreshToken);
    return {
      success: true,
      data: {
        user,
        tokens,
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Post('logout')
  @ApiOperation({ summary: '로그아웃 (클라이언트 토큰 폐기)' })
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: User) {
    return {
      success: true,
      data: {
        userId: user.id,
      },
    };
  }
}

