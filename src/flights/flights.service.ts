import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { formatAsJourneyList, formatFareQuote, formatBooking, Decryption } from './utils/flight-formatter';
import { logFile } from './utils/logger';
import { HttpService } from '@nestjs/axios';
import { FlightSearchDto } from './dtos/flight-search.dto';
import { BookingDto } from './dtos/booking.dto';
import { v4 as uuid4 } from 'uuid';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';



@Injectable()
export class FlightsApiService {
  constructor(
    private readonly http: HttpService,
    private readonly ConfigService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) { }



  
  public async CallApi(http: HttpService, endpoint: string, payload: any): Promise<any> {
    const headers = {
      'Content-Type': this.ConfigService.get<string>('Content-Type'),   
      'x-Username': this.ConfigService.get<string>('x-Username'),       
      'x-Password': this.ConfigService.get<string>('x-Password'),       
      'x-DomainKey': this.ConfigService.get<string>('x-DomainKey'),    
      'x-System': this.ConfigService.get<string>('x-System'),          
    };

    try {
      const url = `${this.ConfigService.get<string>('baseUrl')}${endpoint}`; 
      const response = await firstValueFrom(
        http.post(url, payload, { headers: headers }),
      );
      
      console.log(response.data);
      return response.data;
    }
    catch (error) {
      console.error(`API call to ${endpoint} failed:`, error.message);
      throw new NotFoundException('An error occurred while communicating with the flight API.');
    }
  }




public async searchFlights(payload: FlightSearchDto) {
  const response = await this.CallApi(this.http, 'Search', payload);
   logFile('flightSearch', payload, response); 

  const formattedResponse = formatAsJourneyList(response);
  
  for (const journey of formattedResponse.Search.FlightDataList.JourneyList.flat()) {
      
      const token = journey.ResultToken;
      
      const cacheObject = (journey as any).cacheObject;
      await this.cacheManager.set(token, cacheObject, { ttl: 3600 } as any);
      delete (journey as any).cacheObject;
  }
  
  return formattedResponse;
}


public async FetchFareQuote(payload: { ResultToken: string }) {
  const journey: any = await this.getByToken(payload.ResultToken);
  const accessToken = journey.OriginalResultToken;

  const apiRes = await this.CallApi(this.http, 'UpdateFareQuote', { ResultToken: accessToken });
  await this.cacheManager.del(payload.ResultToken);

  const { response, cacheObj } = await formatFareQuote(apiRes);

  if (!cacheObj) {
    return response; }

  await this.cacheManager.set(cacheObj.ResultToken, cacheObj, { ttl: 3600 } as any);

  return response;
}


  public async CommitBooking(payload: BookingDto) {

    const journey:any=await this.getByToken(payload.ResultToken);
    const acessToken=journey.OriginalResultToken;
    const UpdatedPayload = {
      ...payload,
      ResultToken: acessToken

    }

    const apiResponse = await this.CallApi(this.http, 'CommitBooking', UpdatedPayload);
    logFile('CommitBooking', payload, apiResponse);
    return formatBooking(apiResponse, 'CommitBooking');
  }



  public async HoldTicket(payload: BookingDto) {
    const journey:any=await this.getByToken(payload.ResultToken);
    const accessToken=journey.OriginalResultToken
    const UpdatedPayload = {
      ...payload,
      ResultToken: accessToken
    }
    const apiResponse = await this.CallApi(this.http, 'HoldTicket', UpdatedPayload);
    logFile('HoldTicket', payload, apiResponse);
    // return formatBooking(apiResponse, 'HoldTicket');
  }



  public GenerateAppRefernce() {
    return 'FB' + uuid4().replace(/-/g, '').substring(0, 18);
  }


  async getByToken(token: string) {
    const Token = token.trim();
    
    const result = await this.cacheManager.get(Token);
    if (!result) {
      throw new NotFoundException('Result not found for this token');
    }

    return result;
  }
}