import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateIf,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class PatchUserProfileDto {
  @ApiProperty({
    description: '업데이트할 필드 (nickname, image, teamId 중 하나)',
  })
  @IsNotEmpty()
  @IsIn(['nickname', 'image', 'teamId'])
  @IsString()
  field: 'nickname' | 'image' | 'teamId';

  @ApiProperty()
  @IsNotEmpty()
  @Transform(({ obj }) =>
    obj.field === 'teamId' ? parseFloat(obj.value) : obj.value,
  )
  @ValidateIf((obj) => obj.field === 'teamId')
  @IsNumber()
  @ValidateIf((obj) => obj.field !== 'teamId')
  @IsString()
  value: any;

  static getExample() {
    return {
      updateNickname: {
        summary: 'Nickname 업데이트 예제',
        value: {
          field: 'nickname',
          value: 'evans',
        },
      },
      updateImage: {
        summary: 'Image 업데이트 예제',
        value: {
          field: 'image',
          value: 'http://example.com/image.jpg',
        },
      },
      updateTeamId: {
        summary: 'Team ID 업데이트 예제',
        value: {
          field: 'teamId',
          value: 1,
        },
      },
    };
  }
}
