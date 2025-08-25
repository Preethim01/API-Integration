import { v4 as uuid4 } from 'uuid';
import * as crypto from 'crypto';
import * as zlib from 'zlib';

/** Dynamic formatting helper */
function isNumeric(value: any): boolean {
  return !isNaN(value) && value !== null && value !== '';
}

function formatDynamic(obj: any): any {
  if (obj === null || obj === undefined) return null;

  if (Array.isArray(obj)) return obj.map(formatDynamic);
  if (typeof obj === 'object') {
    const formatted: any = {};
    for (const key in obj) {
      const value = obj[key];
      formatted[key] = Array.isArray(value) || typeof value === 'object'
        ? formatDynamic(value)
        : isNumeric(value) ? Number(value) : value ?? null;
    }
    return formatted;
  }
  return isNumeric(obj) ? Number(obj) : obj ?? null;
}

/** Format search response */
export function formatAsJourneyList(raw: any) {
  const journeys: any[] = raw?.Search?.FlightDataList?.JourneyList || [];
  const formattedJourneys = journeys.map(journey =>
    journey.map(flight => {
      if (!flight?.ResultToken)
        throw new Error('Missing mandatory ResultToken from API response.');
      return {
        FlightDetails: formatDynamic(flight.FlightDetails),
        Price: formatDynamic(flight.Price),
        Attr: formatDynamic(flight.Attr ?? {}),
        ResultToken: flight.ResultToken, // raw token, will encrypt in service
      };
    }),
  );
  return {
    Status: raw?.Status ?? false,
    Message: raw?.Message ?? '',
    Search: { FlightDataList: { JourneyList: formattedJourneys } },
  };
}

/** Format FareQuote */
export function formatFareQuote(raw: any) {

   if (!raw?.UpdateFareQuote || raw?.Status != 1) {
        return {
            Status: raw?.Status ?? false,
            Message: raw?.Message ?? " "
 
        }
 
    }

  const journey = raw?.UpdateFareQuote?.FareQuoteDetails?.JourneyList ?? null;
  if (!journey || !journey.ResultToken)
    throw new Error('Missing mandatory journey details from API response.');

  return {
    Status: raw?.Status ?? false,
    Message: raw?.Message ?? '',
    UpdateFareQuote: {
      FareQuoteDetails: {
        JourneyList: {
          FlightDetails: formatDynamic(journey.FlightDetails),
          Price: formatDynamic(journey.Price),
          Attr: formatDynamic(journey.Attr ?? {}),
          ResultToken: journey.ResultToken,
          HoldTicket: journey.HoldTicket ?? false,
        },
      },
    },
  };
}

/** Format Booking */
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
            Details: formatDynamic(booking?.JourneyList?.FlightDetails?.Details ?? []),
          },
        },
        Price: formatDynamic(booking?.Price ?? {}),
        Attr: booking?.Attr ?? null,
      },
    },
  };
}

/** 🔑 Encryption / Decryption */
const key = crypto.randomBytes(32);

export function Encryption(token: string) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(token, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return iv.toString('base64') + ':' + encrypted;
}

export function Decryption(encryptedData: string) {
  if (!encryptedData || !encryptedData.includes(':')) {
    throw new Error('Invalid token format for decryption.');
  }

  const [ivBase64, encryptedToken] = encryptedData.split(':');
  if (!ivBase64 || !encryptedToken) {
    throw new Error('Invalid token format for decryption.');
  }

  const iv = Buffer.from(ivBase64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedToken, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}


/** Generate AppReference */
export function GenerateAppRefernce() {
  return 'FB' + uuid4().replace(/-/g, '').substring(0, 18);
}
