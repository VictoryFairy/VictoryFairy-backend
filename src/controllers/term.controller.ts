import { Controller, Get } from '@nestjs/common';
import { TermService } from '../services/term.service';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { TermListResponseDto } from 'src/dtos/term.dto';

@ApiTags('Term')
@Controller('term')
export class TermController {
  constructor(private readonly termService: TermService) {}

  @Get()
  @ApiOperation({ description: '필수/선택 약관의 리스트를 가져옵니다' })
  @ApiOkResponse({ type: [TermListResponseDto] })
  @ApiNotFoundResponse({ description: '약관 리스트가 없는 경우' })
  async getTermList(): Promise<TermListResponseDto[]> {
    const termList = await this.termService.getActiveTerm();
    return termList.map((term) => new TermListResponseDto(term));
  }
}
