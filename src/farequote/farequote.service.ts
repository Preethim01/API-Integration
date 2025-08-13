import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FareQuoteService {
  constructor(
    private readonly http: HttpService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  formatFareQuote(raw: any) {
    const journey = raw?.UpdateFareQuote?.FareQuoteDetails?.JourneyList ?? null;
    const price = journey?.Price ?? null;

    
    const redisToken = uuidv4();

    return {
      Status: raw?.Status ?? 0,
      Message: raw?.Message ?? "",
      UpdateFareQuote: {
        FareQuoteDetails: {
          JourneyList: {
            FlightDetails: {
              Details: (journey?.FlightDetails?.Details ?? []).map((flightArray: any[]) =>
                flightArray.map((flight: any) => ({
                  Origin: {
                    AirportCode: flight?.Origin?.AirportCode ?? null,
                    CityName: flight?.Origin?.CityName ?? null,
                    AirportName: flight?.Origin?.AirportName ?? null,
                    DateTime: flight?.Origin?.DateTime ?? null,
                    Terminal: flight?.Origin?.Terminal ?? null,
                    FDTV: flight?.Origin?.FDTV ?? null,
                  },
                  Destination: {
                    AirportCode: flight?.Destination?.AirportCode ?? null,
                    CityName: flight?.Destination?.CityName ?? null,
                    AirportName: flight?.Destination?.AirportName ?? null,
                    DateTime: flight?.Destination?.DateTime ?? null,
                    Terminal: flight?.Destination?.Terminal ?? null,
                    FDTV: flight?.Destination?.FDTV ?? null,
                  },
                  OperatorCode: flight?.OperatorCode ?? null,
                  DisplayOperatorCode: flight?.DisplayOperatorCode ?? null,
                  ValidatingAirline: flight?.ValidatingAirline ?? null,
                  OperatorName: flight?.OperatorName ?? null,
                  FlightNumber: flight?.FlightNumber ?? null,
                  CabinClass: flight?.CabinClass ?? null,
                  Operatedbyairline: flight?.Operatedbyairline ?? null,
                  Operatedbyairlinename: flight?.Operatedbyairlinename ?? null,
                  Duration: flight?.Duration ?? null,
                  Attr: {
                    Baggage: flight?.Attr?.Baggage ?? null,
                    CabinBaggage: flight?.Attr?.CabinBaggage ?? null,
                  },
                  stop_over: flight?.stop_over ?? null,
                })),
              ),
            },
            Price: {
              Currency: price?.Currency ?? null,
              TotalDisplayFare: price?.TotalDisplayFare ?? null,
              PriceBreakup: {
                BasicFare: price?.PriceBreakup?.BasicFare ?? null,
                Tax: price?.PriceBreakup?.Tax ?? null,
                AgentCommission: price?.PriceBreakup?.AgentCommission ?? null,
                AgentTdsOnCommision: price?.PriceBreakup?.AgentTdsOnCommision ?? null,
              },
              PassengerBreakup: price?.PassengerBreakup ?? {},
            },
            ResultToken: journey?.ResultToken ?? null,
            Attr: {
              IsRefundable: journey?.Attr?.IsRefundable ?? null,
              AirlineRemark: journey?.Attr?.AirlineRemark ?? null,
              FareType: journey?.Attr?.FareType ?? null,
              IsLCC: journey?.Attr?.IsLCC ?? null,
              ExtraBaggage: journey?.Attr?.ExtraBaggage ?? null,
              conditions: journey?.Attr?.conditions ?? null,
            },
            HoldTicket: journey?.HoldTicket ?? false,

            redisToken, 
          },
        },
      },
    };
  }

async FetchFareQuoteFromApi(apiResultToken: string) {
  console.log("Result token received:", apiResultToken);

  try {
    const apiRes = await firstValueFrom(
      this.http.post(
        'http://test.services.travelomatix.com/webservices/index.php/flight/service/UpdateFareQuote',
        { ResultToken: apiResultToken },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-Username': 'test245274',
            'x-Password': 'test@245',
            'x-DomainKey': 'TMX3372451534825527',
            'x-System': 'test',
          },
        },
      ),
    );

    console.log("API Response:", apiRes.data);

    const formatted = this.formatFareQuote(apiRes.data);

    const key = formatted.UpdateFareQuote.FareQuoteDetails.JourneyList.redisToken;
    const providerResultToken = formatted.UpdateFareQuote.FareQuoteDetails.JourneyList.ResultToken;

    
    await this.cacheManager.set(key, formatted, 36000);
    await this.cacheManager.set(`${key}:providerToken`, providerResultToken, 36000);

    return {
      ...formatted,
      ProviderResultToken: providerResultToken 
    };

  } catch (error) {
    console.error("Error fetching fare quote:", error.response?.data || error.message);
    throw error;
  }
}

  
  async GetByRedisToken(redisToken: string) {
    const cleanToken = redisToken.trim();
    const result = await this.cacheManager.get(cleanToken);
    if (!result) throw new NotFoundException('FareQuote results not found for this token');
    return result;
  }
}
