import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { catchError, firstValueFrom } from 'rxjs';
import { IRefinedGame, IRefinedSchedule, IScheduleList } from 'src/types/schedule.type';

@Injectable()
export class ScrapingService {
  private readonly logger = new Logger(ScrapingService.name);

  constructor(
    private readonly httpService: HttpService
  ) {}

  getData() {
    return this.getScheduleData();
  }

  async getScheduleData() {
    const options: AxiosRequestConfig = {
      headers: {
        "accept": "application/json, text/javascript, */*; q=0.01",
        "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7,ja;q=0.6",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "sec-ch-ua": "\"Not/A)Brand\";v=\"8\", \"Chromium\";v=\"126\", \"Google Chrome\";v=\"126\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Linux\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-requested-with": "XMLHttpRequest",
        "Referer": "https://www.koreabaseball.com/Schedule/Schedule.aspx",
        "Referrer-Policy": "strict-origin-when-cross-origin"
      }
    };
    
    const payload = "leId=1&srIdList=0%2C9%2C6&seasonId=2024&gameMonth=07&teamId=";
    
    const { data } = await firstValueFrom<AxiosResponse<IScheduleList>>(
      this.httpService.post('https://www.koreabaseball.com/ws/Schedule.asmx/GetScheduleList', payload, options).pipe(
        catchError((error: AxiosError) => {
          this.logger.error(error.response.data);
          throw 'An error happened!'
        })
      )
    )

    const refinedData: IRefinedSchedule[] = data.rows.map((rowsItem, index) => {
      let date = 'no date';
      let time = 'no time';
      let detail = 'no detail';
      let stadium = 'no stadium';
      let remark = 'no remark';
      if (rowsItem.row.length === 9) {
        // 하루의 첫번째 데이터
        date = rowsItem.row[0].Text;
        time = rowsItem.row[1].Text;
        detail = rowsItem.row[2].Text;
        stadium = rowsItem.row[7].Text;
        remark = rowsItem.row[8].Text;
      } else if (rowsItem.row.length === 8) {
        // 하루의 나머지 데이터
        time = rowsItem.row[0].Text;
        detail = rowsItem.row[1].Text;
        stadium = rowsItem.row[6].Text;
        remark = rowsItem.row[7].Text;
      } else {
        // invalid data length
      }
      return {
        date,
        time,
        detail,
        
      }
    });
    

    return refinedData;
  }
}
