import { Injectable, Inject, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { v4 as uuidv4 } from 'uuid';
import { AxiosError } from 'axios';

@Injectable()
export class FlightsService {
  private readonly travelomatixHeaders = {
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

  // --- Utility Formatting Method ---

  private formatSearchJourneys(raw: any) {
    const rawJourneys: any[] = raw?.Search?.FlightDataList?.JourneyList || [];
    const allFlights = rawJourneys.flat();

    const formattedJourneys = allFlights.map((flight: any) => {
      const priceBreakup = flight?.Price?.PriceBreakup ?? {};
      const passengerBreakup = flight?.Price?.PassengerBreakup ?? {};
      const attributes = flight?.Attr ?? {};
      const redisToken = uuidv4();

      return {
        FlightDetails: {
          Details: (flight?.FlightDetails?.Details ?? []).map((flightStops: any[]) =>
            flightStops.map((segment: any) => ({
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
    });

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

  // --- Public Service Methods ---

  async searchFlights(payload: any) {
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

    // Generate a consistent cache key for the search request
    const cacheKey = JSON.stringify(apiPayload);
    const cachedData = await this.cacheManager.get(cacheKey);

    if (cachedData) {
      console.log('Cache hit for flight search.');
      return cachedData;
    }

    console.log('Cache miss for flight search. Calling external API.');

    try {
      const apiResp = await firstValueFrom(
        this.http.post(
          'http://test.services.travelomatix.com/webservices/index.php/flight/service/Search',
          apiPayload,
          { headers: this.travelomatixHeaders },
        ),
      );

      const rawData = apiResp?.data ?? {};
      const formatted = this.formatSearchJourneys(rawData);

      const ttlMilliseconds = 3600 * 1000;
      await this.cacheManager.set(cacheKey, formatted, ttlMilliseconds);

      // Cache individual flights for the getByToken endpoint
      const journeyList = formatted.Search.FlightDataList.JourneyList;
      for (const flight of journeyList) {
        if (flight.redisToken) {
          await this.cacheManager.set(flight.redisToken, flight, ttlMilliseconds);
        }
      }

      return formatted;
    } catch (error) {
      console.error('Search Flights error:', error.response?.data || error.message);
      throw new InternalServerErrorException(error.response?.data?.Message || 'Failed to search flights.');
    }
  }

  async getByToken(redisToken: string) {
    const cleanToken = redisToken.trim();
    const result = await this.cacheManager.get(cleanToken);
    if (!result) {
      throw new NotFoundException('Results not found for this token');
    }
    return result;
  }
}