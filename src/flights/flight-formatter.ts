import { v4 as uuid4 } from 'uuid';

function isNumeric(value: any): boolean {
  return !isNaN(value) && value !== null && value !== '';
}

function formatDynamic(obj: any): any {
  if (obj === null || obj === undefined) return null;

  if (Array.isArray(obj)) {
    return obj.map(formatDynamic);
  } else if (typeof obj === 'object') {
    const formatted: any = {};
    for (const key in obj) {
      const value = obj[key];
      if (Array.isArray(value) || typeof value === 'object') {
        formatted[key] = formatDynamic(value);
      } else if (isNumeric(value)) {
        formatted[key] = Number(value);
      } else {
        formatted[key] = value ?? null;
      }
    }
    return formatted;
  } else if (isNumeric(obj)) {
    return Number(obj);
  } else {
    return obj ?? null;
  }
}

/** 🔍 Format Search Response */
export function formatAsJourneyList(raw: any) {
  const journeys: any[] = raw?.Search?.FlightDataList?.JourneyList || [];
  const formattedJourneys = journeys.map(journey =>
    journey.map(flight => {
      if (!flight?.ResultToken) {
        throw new Error('Missing mandatory ResultToken from API response.');
      }

      return {
        FlightDetails: formatDynamic(flight.FlightDetails),
        Price: formatDynamic(flight.Price),
        Attr: formatDynamic(flight.Attr ?? {}),
        ResultToken: createAccessToken(flight.ResultToken),
      };
    }),
  );

  return {
    Status: raw?.Status ?? false,
    Message: raw?.Message ?? '',
    Search: {
      FlightDataList: {
        JourneyList: formattedJourneys,
      },
    },
  };
}

/** 💰 Format FareQuote Response */
export function formatFareQuote(raw: any) {
  if (!raw?.UpdateFareQuote || raw?.Status != 1) {
    return {
      Status: raw?.Status ?? false,
      Message: raw?.Message ?? ' ',
    };
  }

  const journey = raw?.UpdateFareQuote?.FareQuoteDetails?.JourneyList ?? null;
  if (!journey || !journey.ResultToken) {
    throw new Error('Missing mandatory journey details from API response.');
  }

  return {
    Status: raw?.Status ?? false,
    Message: raw?.Message ?? '',
    UpdateFareQuote: {
      FareQuoteDetails: {
        JourneyList: {
          FlightDetails: formatDynamic(journey.FlightDetails),
          Price: formatDynamic(journey.Price),
          Attr: formatDynamic(journey.Attr ?? {}),
          ResultToken: journey.ResultToken, // provider token → used for CommitBooking
          HoldTicket: journey.HoldTicket ?? false,
        },
      },
    },
  };
}

/** 📑 Format Booking */
export function formatBooking(raw: any, type: 'CommitBooking' | 'HoldTicket') {
  const booking = raw?.[type]?.BookingDetails ?? {};

  return {
    Status: raw?.Status ?? null,
    Message: raw?.Message ?? null,
    [type]: {
      BookingDetails: {
        BookingId: booking?.BookingId ?? null,
        PNR: booking?.PNR ?? null,
        TicketingTimeLimit: booking?.TicketingTimeLimit ?? null,
        PassengerDetails: formatDynamic(booking?.PassengerDetails ?? []),
        JourneyList: {
          FlightDetails: {
            Details: formatDynamic(
              booking?.JourneyList?.FlightDetails?.Details ?? [],
            ),
          },
        },
        Price: formatDynamic(booking?.Price ?? {}),
        Attr: booking?.Attr ?? null,
      },
    },
  };
}

/** 🔑 Access Token Helpers */
export function createAccessToken(apiResultToken: string): string {
  return Buffer.from(`${apiResultToken}`).toString('base64').replace(/=/g, '');
}

export function decodeAccessToken(accessToken: string): string {
  return Buffer.from(accessToken, 'base64').toString('utf8');
}

export function GenerateAppRefernce() {
  return 'FB' + uuid4().replace(/-/g, '').substring(0, 18);
}
