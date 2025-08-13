import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SearchFlightService {
  constructor(
    private readonly http: HttpService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  private formatAsJourneyList(raw: any) {
    const journeys: any[] = raw?.Search?.FlightDataList?.JourneyList || [];

    const formattedJourneys = journeys.map((journey) =>
      journey.map((flight) => {
        const priceBreakup = flight?.Price?.PriceBreakup ?? {};
        const passengerBreakup = flight?.Price?.PassengerBreakup ?? {};
        const attributes = flight?.Attr ?? {};

        
        const redisToken = uuidv4();

        return {
          FlightDetails: {
            Details: (flight?.FlightDetails?.Details ?? []).map((FlightStops: any[]) =>
              FlightStops.map((segment: any) => ({
                Origin: {
                  AirportCode: segment.Origin?.AirportCode ?? null,
                  CityName: segment.Origin?.CityName ?? null,
                  AirportName: segment.Origin?.AirportName ?? null,
                  DateTime: segment.Origin?.DateTime ?? null,
                  Terminal: segment.Origin?.Terminal ?? null,
                },
                Destination: {
                  AirportCode: segment.Destination?.AirportCode ?? null,
                  CityName: segment.Destination?.CityName ?? null,
                  AirportName: segment.Destination?.AirportName ?? null,
                  DateTime: segment.Destination?.DateTime ?? null,
                  Terminal: segment.Destination?.Terminal ?? null,
                },
                OperatorCode: segment.OperatorCode ?? null,
                OperatorName: segment.OperatorName ?? null,
                FlightNumber: segment.FlightNumber ?? null,
                Duration: segment.Duration ?? null,
                CabinClass: segment.CabinClass ?? null,
                Attr: {
                  Baggage: segment.Attr?.Baggage ?? null,
                  CabinBaggage: segment.Attr?.CabinBaggage ?? null,
                  AvailableSeats: segment.Attr?.AvailableSeats ?? null,
                },
                stop_over: segment.stop_over ?? null,
              })),
            ),
          },
          Price: {
            Currency: flight.Price?.Currency ?? null,
            TotalDisplayFare: flight.Price?.TotalDisplayFare ?? null,
            PriceBreakup: {
              BasicFare: priceBreakup.BasicFare ?? null,
              Tax: priceBreakup.Tax ?? null,
              AgentCommission: priceBreakup.AgentCommission ?? null,
            },
            PassengerBreakup: {
              ADT: {
                BasePrice: passengerBreakup.ADT?.BasePrice ?? null,
                Tax: passengerBreakup.ADT?.Tax ?? null,
                TotalPrice: passengerBreakup.ADT?.TotalPrice ?? null,
                PassengerCount: passengerBreakup.ADT?.PassengerCount ?? null,
              },
            },
          },

          
          redisToken,

          
          apiResultToken: flight.ResultToken ?? null,

          Attr: {
            IsRefundable: attributes.IsRefundable ?? null,
            AirlineRemark: attributes.AirlineRemark ?? null,
            FareType: attributes.FareType ?? null,
            IsLCC: attributes.IsLCC ?? null,
            ExtraBaggage: attributes.ExtraBaggage ?? null,
            conditions: {
              IsPassportRequiredAtBook: attributes.conditions?.IsPassportRequiredAtBook ?? null,
              IsPanRequiredAtBook: attributes.conditions?.IsPanRequiredAtBook ?? null,
            },
          },
        };
      }),
    );

    return {
      Status: raw?.Status ?? null,
      Message: raw?.Message ?? '',
      Search: {
        FlightDataList: {
          JourneyList: formattedJourneys,
        },
      },
    };
  }

  async searchFlights(payload: any) {
    const apiResp = await firstValueFrom(
      this.http.post(
        'http://test.services.travelomatix.com/webservices/index.php/flight/service/Search',
        payload,
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

    const rawData = apiResp?.data ?? {};
    const formatted = this.formatAsJourneyList(rawData);

    const journeyList = formatted.Search.FlightDataList.JourneyList.flat();

    const ttlMilliseconds = 3600 * 1000; 

    
    for (const flight of journeyList) {
      if (flight.redisToken) {
        await this.cacheManager.set(flight.redisToken, flight, ttlMilliseconds);
      }
    }

    return formatted;
  }

  async getByToken(redisToken: string) {
    const cleanToken = redisToken.trim();
    const result = await this.cacheManager.get(cleanToken);
    if (!result) {
      throw new NotFoundException('Result not found for this token');
    }
    return result;
  }
}
