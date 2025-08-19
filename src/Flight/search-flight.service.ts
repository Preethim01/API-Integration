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
    const rawJourneys: any[] = raw?.Search?.FlightDataList?.JourneyList || [];
    const formattedJourneys: any[] = [];

    for (const journey of rawJourneys) {
      const rawFlight = journey[0];
      if (!rawFlight) continue;

      const priceBreakup = rawFlight?.Price?.PriceBreakup ?? {};
      const passengerBreakup = rawFlight?.Price?.PassengerBreakup ?? {};
      const attributes = rawFlight?.Attr ?? {};
      const redisToken = uuidv4();
      const rawDetails = rawFlight?.FlightDetails?.Details ?? [];

      const flightOption: any = {
        FlightDetails: {
          Details: (rawDetails ?? []).map((FlightStops: any[]) =>
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
          Currency: rawFlight.Price?.Currency ?? null,
          TotalDisplayFare: rawFlight.Price?.TotalDisplayFare ?? null,
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
        apiResultToken: rawFlight.ResultToken ?? null,
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
      formattedJourneys.push(flightOption);
    }
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
    const journeyType = payload.JourneyType || 'OneWay';
    const origin = payload.Segments[0]?.Origin;
    const destination = payload.Segments[0]?.Destination;
    const departureDate = payload.Segments[0]?.DepartureDate;
    const returnDate = payload.Segments.length > 1 ? payload.Segments[1]?.DepartureDate : null;
    const cacheKey = `${journeyType}-${origin}-${destination}-${departureDate}-${returnDate}`;

    const cachedData = await this.cacheManager.get(cacheKey);
    if (cachedData) {
      console.log('Returning data from cache.');
      return cachedData;
    }

    let apiPayload = payload;
    if (payload.JourneyType === 'Return' && payload.Segments.length === 1) {
      const outboundSegment = payload.Segments[0];
      if (outboundSegment.ReturnDate) {
        const returnSegment = {
          Origin: outboundSegment.Destination,
          Destination: outboundSegment.Origin,
          DepartureDate: outboundSegment.ReturnDate,
        };
        apiPayload = {
          ...payload,
          Segments: [
            {
              Origin: outboundSegment.Origin,
              Destination: outboundSegment.Destination,
              DepartureDate: outboundSegment.DepartureDate,
            },
            returnSegment,
          ],
        };
      }
    }

    console.log('Fetching data from the API.');
    const apiResp = await firstValueFrom(
      this.http.post(
        'http://test.services.travelomatix.com/webservices/index.php/flight/service/Search',
        apiPayload, 
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

    await this.cacheManager.set(cacheKey, formatted, { ttlSeconds: 360 } as any);

    const journeyList = formatted.Search.FlightDataList.JourneyList;
    const ttlMilliseconds = 3600 * 1000;
    for (const flight of journeyList) {
      if ((flight as any).redisToken) {
        await this.cacheManager.set((flight as any).redisToken, flight as any, ttlMilliseconds);
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