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

  console.error(`API call to ${endpoint} failed:`, error);
  throw new InternalServerErrorException('An error occurred while communicating with the flight API.');
}
  }



  private formatLocation(rawLocation: any) {
    if (!rawLocation) return null;
    return {
      AirportCode: rawLocation.AirportCode ?? '',
      CityName: rawLocation.CityName ?? '',
      AirportName: rawLocation.AirportName ?? '',
      DateTime: rawLocation.DateTime ?? '',
      Terminal: rawLocation.Terminal ?? '',
      FDTV: rawLocation.FDTV ?? '',
    };
  }

  private formatFlightSegment(rawSegment: any) {
    if (!rawSegment) return null;
    return {
      Origin: this.formatLocation(rawSegment.Origin),
      Destination: this.formatLocation(rawSegment.Destination),
      OperatorCode: rawSegment.OperatorCode ?? '',
      OperatorName: rawSegment.OperatorName ?? '',
      FlightNumber: rawSegment.FlightNumber ?? '',
      Duration: rawSegment.Duration ? Number(rawSegment.Duration) : 0,
      CabinClass: rawSegment.CabinClass ?? '',
      Attr: {
        Baggage: rawSegment.Attr?.Baggage ?? '',
        CabinBaggage: rawSegment.Attr?.CabinBaggage ?? '',
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
      Currency: rawPrice.Currency ?? '',
      TotalDisplayFare: rawPrice.TotalDisplayFare ? Number(rawPrice.TotalDisplayFare) : '',
      PriceBreakup: {
        BasicFare: priceBreakup.BasicFare ? Number(priceBreakup.BasicFare) : 0,
        Tax: priceBreakup.Tax ? Number(priceBreakup.Tax) : 0,
        AgentCommission: priceBreakup.AgentCommission ? Number(priceBreakup.AgentCommission) : 0,
        AgentTdsOnCommision: priceBreakup.AgentTdsOnCommision ? Number(priceBreakup.AgentTdsOnCommision) : 0,
      },
      PassengerBreakup: {
        ADT: {
          BasePrice: passengerBreakup.ADT?.BasePrice ? Number(passengerBreakup.ADT?.BasePrice) : 0,
          Tax: passengerBreakup.ADT?.Tax ? Number(passengerBreakup.ADT?.Tax) : 0,
          TotalPrice: passengerBreakup.ADT?.TotalPrice ? Number(passengerBreakup.ADT?.TotalPrice) : 0,
          PassengerCount: passengerBreakup.ADT?.PassengerCount ? Number(passengerBreakup.ADT?.PassengerCount) : 0,
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