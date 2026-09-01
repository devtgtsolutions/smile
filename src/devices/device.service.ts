import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateTokenDto, DeviceRole } from './dto/generate-token.dto'; 
import { ClaimTokenDto} from './dto/claim-token.dto'; 
import { UpdateDeviceDto} from './dto/update-device.dto'; 


@Injectable()
export class DeviceService {
  constructor(private prisma: PrismaService) {}

  // ---------- Existing methods (with minor adjustments) ----------

  async getDevices(tenantId: string) {
    return this.prisma.device.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDevice(tenantId: string, deviceId: string) {
    const device = await this.prisma.device.findUnique({
      where: { deviceId },
    });
    if (!device || device.tenantId !== tenantId) {
      throw new NotFoundException('Device not found');
    }
    return device;
  }

  // Update device (only name, type, maybe other non-critical fields)
  async updateDevice(tenantId: string, deviceId: string, dto: UpdateDeviceDto) {
    await this.getDevice(tenantId, deviceId);
    return this.prisma.device.update({
      where: { deviceId },
      data: {
        name: dto.name,
        type: dto.type,
        updatedAt: new Date(),
      },
    });
  }

  async deleteDevice(tenantId: string, deviceId: string) {
    await this.getDevice(tenantId, deviceId);
    return this.prisma.device.delete({ where: { deviceId } });
  }

  async updateLastSeen(deviceId: string) {
    await this.prisma.device.update({
      where: { deviceId },
      data: { lastSeen: new Date() },
    });
  }

  // ---------- New token-based registration flow ----------

  /**
   * Step 1: Admin generates a registration token.
   * Validates room limits: max 1 MAIN, max 4 BUZZER per room.
   */
  async generateToken(tenantId: string, dto: GenerateTokenDto) {
    const { room, role, playerNumber, color } = dto;

    // Validate BUZZER requires playerNumber and color
    if (role === DeviceRole.BUZZER) {
      if (!playerNumber || !color) {
        throw new BadRequestException('BUZZER requires playerNumber and color');
      }
      if (playerNumber < 1 || playerNumber > 4) {
        throw new BadRequestException('playerNumber must be between 1 and 4');
      }
    } else {
      // MAIN does not need playerNumber/color
      if (playerNumber || color) {
        throw new BadRequestException('MAIN does not need playerNumber or color');
      }
    }

    // Count existing devices + unused tokens for this (tenant, room, role)
    const existingDevices = await this.prisma.device.count({
      where: {
        tenantId,
        room,
        role,
        ...(role === DeviceRole.BUZZER ? { playerNumber } : {}), // if buzzer, also count same playerNumber? Actually we need to count total buzzers, not per number.
      },
    });

    const existingTokens = await this.prisma.deviceToken.count({
      where: {
        tenantId,
        room,
        role,
        used: false,
        ...(role === DeviceRole.BUZZER ? { playerNumber } : {}),
      },
    });

    // Total used + pending tokens must not exceed limit
    const total = existingDevices + existingTokens;
    const limit = role === DeviceRole.MAIN ? 1 : 4;

    if (total >= limit) {
      throw new BadRequestException(
        `Room "${room}" already has ${existingDevices} ${role} device(s) and ${existingTokens} pending token(s). Maximum ${limit} allowed.`,
      );
    }

    // Optionally ensure that for BUZZER, playerNumber is unique within the room (i.e., no other device/token with same playerNumber)
    if (role === DeviceRole.BUZZER) {
      const sameNumber = await this.prisma.device.count({
        where: { tenantId, room, role: DeviceRole.BUZZER, playerNumber },
      });
      const sameNumberTokens = await this.prisma.deviceToken.count({
        where: { tenantId, room, role: DeviceRole.BUZZER, playerNumber, used: false },
      });
      if (sameNumber + sameNumberTokens > 0) {
        throw new BadRequestException(`Player number ${playerNumber} is already taken in room "${room}"`);
      }
    }

    // Generate a unique token (e.g., UUID v4)
    const token = this.generateRandomToken();

    // Create token record
    const deviceToken = await this.prisma.deviceToken.create({
      data: {
        token,
        tenantId,
        room,
        role,
        playerNumber: role === DeviceRole.BUZZER ? playerNumber : null,
        color: role === DeviceRole.BUZZER ? color : null,
        used: false,
      },
    });

    return { token: deviceToken.token };
  }

  /**
   * Step 2: Tablet app calls this with the token and its tabletId.
   * Validates token, creates the Device record, marks token as used.
   */
  async claimToken(claimDto: ClaimTokenDto) {
    const { token, tabletId } = claimDto;

    // Find the token
    const deviceToken = await this.prisma.deviceToken.findUnique({
      where: { token },
    });

    if (!deviceToken) {
      throw new NotFoundException('Invalid token');
    }
    if (deviceToken.used) {
      throw new BadRequestException('Token already used');
    }
    if (deviceToken.expiresAt && deviceToken.expiresAt < new Date()) {
      throw new BadRequestException('Token expired');
    }

    // Check if tabletId is already used by another device
    const existingDevice = await this.prisma.device.findUnique({
      where: { deviceId: tabletId },
    });
    if (existingDevice) {
      throw new BadRequestException('This tablet is already registered');
    }

    // Check constraints again (though we checked at generation, but race conditions possible)
    // Count existing devices for same room/role
    const existingDevices = await this.prisma.device.count({
      where: {
        tenantId: deviceToken.tenantId,
        room: deviceToken.room,
        role: deviceToken.role,
        ...(deviceToken.role === DeviceRole.BUZZER ? { playerNumber: deviceToken.playerNumber } : {}),
      },
    });
    const limit = deviceToken.role === DeviceRole.MAIN ? 1 : 4;
    if (existingDevices >= limit) {
      throw new BadRequestException(`Room "${deviceToken.room}" already has maximum ${limit} ${deviceToken.role} devices`);
    }

    // Create the device
    const newDevice = await this.prisma.device.create({
      data: {
        deviceId: tabletId,
        tenantId: deviceToken.tenantId,
        room: deviceToken.room,
        role: deviceToken.role,
        playerNumber: deviceToken.playerNumber,
        color: deviceToken.color,
        // name and type can be set later or derived
        name: `${deviceToken.role} ${deviceToken.playerNumber || ''}`.trim(),
        type: deviceToken.role.toLowerCase(),
        lastSeen: new Date(),
      },
    });

    // Mark token as used
    await this.prisma.deviceToken.update({
      where: { token },
      data: { used: true },
    });

    return newDevice;
  }

  // Helper to generate a random token (e.g., 8-digit alphanumeric)
  private generateRandomToken(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }
}