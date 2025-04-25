import { InternalServerErrorException } from '@nestjs/common';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';

export abstract class BaseInternalDto {
  static async createAndValidate<T extends object>(
    this: ClassConstructor<T>,
    input: unknown,
  ): Promise<T> {
    try {
      const dto = plainToInstance(this, input);
      await validateOrReject(dto, {
        whitelist: true, // DTO에 없는 값은 제거
      });
      return dto;
    } catch (error) {
      console.error(`[DTO VALIDATION ERROR - ${this.name}]`, error);
      throw new InternalServerErrorException(`${this.name} dto validate error`);
    }
  }
}
