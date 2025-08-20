import { Injectable, Inject, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config'; // Import ConfigService
import { firstValueFrom } from 'rxjs';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

@Injectable()
export class FlightsService {
  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService, // Inject ConfigService
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) { }

  private async callApi(endpoint: string, payload: any): Promise<any> {
    const url = `${this.configService.get<string>('TMX_BASE_URL')}/${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'x-Username': this.configService.get<string>('TMX_USERNAME'),
      'x-Password': this.configService.get<string>('TMX_PASSWORD'),
      'x-DomainKey': this.configService.get<string>('TMX_DOMAINKEY'),
      'x-System': this.configService.get<string>('TMX_SYSTEM'),
    };
    try {
      const response = await firstValueFrom(
        this.http.post(url, payload, { headers }),
      );
      if (response?.data?.Status !== 1) {
        throw new InternalServerErrorException(`API Error: ${response?.data?.Message ?? 'Request failed.'}`);
      }
      return response.data;
    } catch (error) {
  // Log the entire error object for detailed information
  console.error(`API call to ${endpoint} failed:`, error);
  throw new InternalServerErrorException('An error occurred while communicating with the flight API.');
}
  }

  // Your existing formatting methods remain excellent and should be kept as-is
  // formatLocation, formatFlightSegment, formatPrice, generateSecureKey, etc.

  // ... (Paste your formatting methods here) ...
  // All the private methods from your code are perfect and don't need changes.

  private formatLocation(rawLocation: any) {
    if (!rawLocation) return null;
    return {
      AirportCode: rawLocation.AirportCode ?? null,
      CityName: rawLocation.CityName ?? null,
      AirportName: rawLocation.AirportName ?? null,
      DateTime: rawLocation.DateTime ?? null,
      Terminal: rawLocation.Terminal ?? null,
      FDTV: rawLocation.FDTV ?? null,
    };
  }

  private formatFlightSegment(rawSegment: any) {
    if (!rawSegment) return null;
    return {
      Origin: this.formatLocation(rawSegment.Origin),
      Destination: this.formatLocation(rawSegment.Destination),
      OperatorCode: rawSegment.OperatorCode ?? null,
      OperatorName: rawSegment.OperatorName ?? null,
      FlightNumber: rawSegment.FlightNumber ?? null,
      Duration: rawSegment.Duration ? Number(rawSegment.Duration) : null,
      CabinClass: rawSegment.CabinClass ?? null,
      Attr: {
        Baggage: rawSegment.Attr?.Baggage ?? null,
        CabinBaggage: rawSegment.Attr?.CabinBaggage ?? null,
        AvailableSeats: rawSegment.Attr?.AvailableSeats ? Number(rawSegment.Attr.AvailableSeats) : null,
      },
      stop_over: rawSegment.stop_over ?? null,
    };
  }

  private formatPrice(rawPrice: any) {
    if (!rawPrice) return null;
    const priceBreakup = rawPrice.PriceBreakup ?? {};
    const passengerBreakup = rawPrice.PassengerBreakup ?? {};

    return {
      Currency: rawPrice.Currency ?? null,
      TotalDisplayFare: rawPrice.TotalDisplayFare ? Number(rawPrice.TotalDisplayFare) : null,
      PriceBreakup: {
        BasicFare: priceBreakup.BasicFare ? Number(priceBreakup.BasicFare) : null,
        Tax: priceBreakup.Tax ? Number(priceBreakup.Tax) : null,
        AgentCommission: priceBreakup.AgentCommission ? Number(priceBreakup.AgentCommission) : null,
        AgentTdsOnCommision: priceBreakup.AgentTdsOnCommision ? Number(priceBreakup.AgentTdsOnCommision) : null,
      },
      PassengerBreakup: {
        ADT: {
          BasePrice: passengerBreakup.ADT?.BasePrice ? Number(passengerBreakup.ADT?.BasePrice) : null,
          Tax: passengerBreakup.ADT?.Tax ? Number(passengerBreakup.ADT?.Tax) : null,
          TotalPrice: passengerBreakup.ADT?.TotalPrice ? Number(passengerBreakup.ADT?.TotalPrice) : null,
          PassengerCount: passengerBreakup.ADT?.PassengerCount ? Number(passengerBreakup.ADT?.PassengerCount) : null,
        },
      },
    };
  }


  private generateSecureKey(apiToken: string): string {
    return crypto.createHash('sha256').update(apiToken).digest('hex');
  }


  private formatAsJourneyList(raw: any) {
    const journeys: any[] = raw?.Search?.FlightDataList?.JourneyList || [];
    const formattedJourneys = journeys.map((journey) =>
      journey.map((flight) => {

        if (!flight?.ResultToken) {
          throw new NotFoundException('Missing mandatory ResultToken from API response.');
        }
        const internalKey = this.generateSecureKey(flight.ResultToken);

        return {
          FlightDetails: {
            Details: (flight?.FlightDetails?.Details ?? []).map(
              (FlightStops: any[]) =>
                FlightStops.map(this.formatFlightSegment.bind(this)),
            ),
          },

          Price: this.formatPrice(flight.Price),
          Attr: flight.Attr ?? {},
          apiResultToken: flight.ResultToken,
          internalKey: internalKey,
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

  private formatFareQuote(raw: any) {
    const journey = raw?.UpdateFareQuote?.FareQuoteDetails?.JourneyList ?? null;
    if (!journey || !journey.ResultToken) {
      throw new NotFoundException('Missing mandatory journey details from API response.');
    }

    return {
      Status: raw?.Status ?? 0,
      Message: raw?.Message ?? "",
      UpdateFareQuote: {
        FareQuoteDetails: {
          JourneyList: {
            FlightDetails: {
              Details: (journey?.FlightDetails?.Details ?? []).map((flightArray: any[]) =>
                flightArray.map(this.formatFlightSegment.bind(this))
              ),
            },

            Price: this.formatPrice(journey.Price),
            ResultToken: journey.ResultToken,
            Attr: journey.Attr ?? {},
            HoldTicket: journey.HoldTicket ?? false,
          },
        },
      },
    };
  }

  public async searchFlights(payload: any) {
    const apiResponse = await this.callApi('Search', payload);
    const formatted = this.formatAsJourneyList(apiResponse);

    for (const journey of formatted.Search.FlightDataList.JourneyList.flat()) {
      await this.cacheManager.set(journey.internalKey, journey, 3600);
    }

    return formatted;
  }

  public async FetchFareQuote(resultToken: string) {
    const apiRes = await this.callApi('UpdateFareQuote', resultToken);
    return this.formatFareQuote(apiRes);
  }
}