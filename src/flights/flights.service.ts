import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { formatAsJourneyList, formatFareQuote, decodeAccessToken, formatBooking, Decryption } from './utils/flight-formatter';
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



  // Function to call external API
  public async CallApi(http: HttpService, endpoint: string, payload: any): Promise<any> {
    // Fetch environment variables using ConfigService
    const headers = {
      'Content-Type': this.ConfigService.get<string>('Content-Type'),   // Use the environment variable for content type
      'x-Username': this.ConfigService.get<string>('x-Username'),       // Fetch 'x-Username' from .env
      'x-Password': this.ConfigService.get<string>('x-Password'),       // Fetch 'x-Password' from .env
      'x-DomainKey': this.ConfigService.get<string>('x-DomainKey'),    // Fetch 'x-DomainKey' from .env
      'x-System': this.ConfigService.get<string>('x-System'),           // Fetch 'x-System' from .env
    };

    try {
      const url = `${this.ConfigService.get<string>('baseUrl')}${endpoint}`;  // Fetch base URL from .env
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
  const apiResponse = await this.CallApi(this.http, 'Search', payload);
   logFile('flightSearch', payload, apiResponse); 

  const formatted = formatAsJourneyList(apiResponse);
  
  for (const journey of formatted.Search.FlightDataList.JourneyList.flat()) {
      
      const token = journey.ResultToken;
      
      const cacheObject = (journey as any).cacheObject;
      await this.cacheManager.set(token, cacheObject, { ttl: 3600 } as any);
      delete (journey as any).cacheObject;
  }
  
  return formatted;
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
    // const EncrptedToken = payload.ResultToken;
    // const DecptedToken = Decryption(EncrptedToken);
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
    return formatBooking(apiResponse, 'HoldTicket');
  }







  public GenerateAppRefernce() {
    return 'FB' + uuid4().replace(/-/g, '').substring(0, 18);
  }





  async getByToken(token: string) {
    const cleanToken = token.trim();
    console.log(' Looking up flight token in cache:', cleanToken);
    const result = await this.cacheManager.get(cleanToken);
    if (!result) {
      console.log(' Token not found in cache:', cleanToken);
      throw new NotFoundException('Result not found for this token');
    }

    console.log(' Token found in cache:', cleanToken);
    return result;
  }
}