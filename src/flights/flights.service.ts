import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { SearchFlightDto } from './dto/search-flight.dto';
import { CommitBookingDto } from './dto/commit-booking.dto';
import { v4 as uuid4 } from 'uuid';
import {
  formatAsJourneyList,
  formatFareQuote,
  formatBooking,
  Encryption,
  Decryption,
  GenerateAppRefernce,
} from './flight-formatter';

@Injectable()
export class FlightsService {
  private baseUrl =
    'http://test.services.travelomatix.com/webservices/index.php/flight/service/';
  private headers = {
    'Content-Type': 'application/json',
    'x-Username': 'test245274',
    'x-Password': 'test@245',
    'x-DomainKey': 'TMX3372451534825527',
    'x-System': 'test',
  };

  constructor(
    private readonly http: HttpService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /** Generic API Call */
  private async callApi(endpoint: string, payload: any): Promise<any> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await firstValueFrom(
        this.http.post(url, payload, { headers: this.headers }),
      );

      if (response?.data?.Status !== 1) {
        throw new NotFoundException(
          `API Error: ${response?.data?.Message ?? 'Request failed.'}`,
        );
      }

      return response.data;
    } catch (error: any) {
      console.error(`API call to ${endpoint} failed:`, error.message);
      throw new NotFoundException('Error communicating with flight API.');
    }
  }

  /** 🔍 Search Flights */
  public async searchFlights(payload: SearchFlightDto) {
    const apiResponse = await this.callApi('Search', payload);
    const formatted = formatAsJourneyList(apiResponse);

    // Cache each journey with encrypted ResultToken
    for (const journey of formatted.Search.FlightDataList.JourneyList.flat()) {
      const encryptedToken = Encryption(journey.ResultToken);
      journey.ResultToken = encryptedToken; // store encrypted token
      await this.cacheManager.set(encryptedToken, journey, { ttl: 3600 } as any);
    }

    return formatted;
  }

  /** 💰 Fetch FareQuote */
  public async FetchFareQuote(payload:any) {
    //const decryptedToken = Decryption(payload.ResultToken);
    //console.log(decryptedToken);
    

    // const apiRes = await this.callApi('UpdateFareQuote', 
    //   payload
    // );

    const response=await firstValueFrom(
      this.http.post("http://test.services.travelomatix.com/webservices/index.php/flight/service/UpdateFareQuote", payload, { headers: this.headers })

    )
     return formatFareQuote(response.data);
    //return formatFareQuote(apiRes);
  }

  /** 📑 Commit Booking */
  public async CommitBooking(payload: CommitBookingDto) {
    const decryptedToken = Decryption(payload.ResultToken);

    const updatedPayload = {
      ...payload,
      ResultToken: decryptedToken,
    };

    const apiResponse = await this.callApi('CommitBooking', updatedPayload);

    return formatBooking(apiResponse, 'CommitBooking');
  }

  /** 🛑 Hold Ticket */
  public async HoldTicket(payload: CommitBookingDto) {
    const decryptedToken = Decryption(payload.ResultToken);

    const updatedPayload = {
      ...payload,
      ResultToken: decryptedToken,
    };

    const apiResponse = await this.callApi('HoldTicket', updatedPayload);

    return formatBooking(apiResponse, 'HoldTicket');
  }

  /** 🔑 Generate App Reference */
  public GenerateAppRefernce() {
    return GenerateAppRefernce();
  }

  /** 🔍 Get flight by cached token */
  public async getByToken(token: string) {
    const cleanToken = token.trim();
    const result = await this.cacheManager.get(cleanToken);
    if (!result) throw new NotFoundException('Result not found for this token');
    return result;
  }
}
