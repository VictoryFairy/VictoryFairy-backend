import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { SocialFlowType } from 'src/types/auth.type';

@Injectable()
export class SocialFlowParamPipe implements PipeTransform {
  transform(value: SocialFlowType) {
    if (value !== 'link' && value !== 'login') {
      throw new BadRequestException('유효하지 않은 요청 url');
    }
    return value;
  }
}
