import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { SocialProvider } from 'src/modules/auth/const/auth.const';

@Injectable()
export class ProviderParamCheckPipe implements PipeTransform {
  transform(value: SocialProvider) {
    if (!Object.values(SocialProvider).includes(value)) {
      throw new BadRequestException('유효하지 않은 요청 url');
    }
    return value;
  }
}
