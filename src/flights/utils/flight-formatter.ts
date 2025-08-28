import { v4 as uuid4 } from 'uuid';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { Cache } from 'cache-manager';


function isNumeric(value: any): boolean {
    return !isNaN(value) && value !== null && value !== '';
}


function formatDynamic(obj: any): any {
    if (obj === null || obj === undefined) return null;
    if (Array.isArray(obj)) {
        return obj.map(formatDynamic);
    }
    else if (typeof obj === 'object') {
        const formatted: any = {};
        for (const key in obj) {
            const value = obj[key];
            if (Array.isArray(value) || typeof value === 'object') {
                formatted[key] = formatDynamic(value); 
            } else if (isNumeric(value)) {
                formatted[key] = Number(value);
            } else if (typeof value === 'string') {
                formatted[key] = value ?? null;
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


function Generatehashtoken(): string {
    return crypto.randomBytes(12).toString("hex");
}

export function formatAsJourneyList(raw: any) {
    const journeys: any[] = raw?.Search?.FlightDataList?.JourneyList || [];
    const formattedJourneys = journeys.map(journey =>
        journey.map(flight => {
            if (!flight?.ResultToken) {
                throw new Error('Missing ResultToken');
            }
            const originalResultToken = flight.ResultToken;
            const hashtoken = Generatehashtoken();

            const clientObj = {
                FlightDetails: formatDynamic(flight.FlightDetails),
                Price: formatDynamic(flight.Price),
                Attr: formatDynamic(flight.Attr ?? {}),
                ResultToken: hashtoken,
            };

            const cacheObj = {
                ...clientObj,
                OriginalResultToken: originalResultToken,
            };

            (clientObj as any).cacheObject = cacheObj;
            return clientObj;
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



export async function formatFareQuote(raw: any) {
    if (!raw?.UpdateFareQuote || raw?.Status != 1) {
        return {
            response: {
                Status: raw?.Status ?? false,
                Message: raw?.Message ?? " "
            },
            cacheObj: null
        };
    }

    const journey = raw?.UpdateFareQuote?.FareQuoteDetails?.JourneyList ?? null;
    if (!journey || !journey.ResultToken) {
        throw new Error('Missing journey details');
    }

    const OriginalResultToken = journey.ResultToken;
    const hashtoken = Generatehashtoken();

    const response = {
        Status: raw?.Status ?? false,
        Message: raw?.Message ?? '',
        UpdateFareQuote: {
            FareQuoteDetails: {
                JourneyList: {
                    FlightDetails: formatDynamic(journey.FlightDetails),
                    Price: formatDynamic(journey.Price),
                    Attr: formatDynamic(journey.Attr ?? {}),
                    ResultToken: hashtoken,
                    HoldTicket: journey.HoldTicket ?? false,
                }
            }
        }
    };
    const cacheObj = {
        ...response.UpdateFareQuote.FareQuoteDetails.JourneyList,
        OriginalResultToken
    };
    return { response, cacheObj };
}


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








export function GenerateAppRefernce() {
    return 'FB' + uuid4().replace(/-/g, '').substring(0, 18);
}

















//encryption/decryption



const key = crypto.randomBytes(32);



export function Encryption(token: string) {
    const compressedToken = zlib.gzipSync(token)
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);

    let encrpted = cipher.update(token, "utf8", "base64");

    encrpted = encrpted + cipher.final("base64");

    return iv.toString("base64") + ":" + encrpted;

}



export function Decryption(encrptedData: string) {
    const [ivBase64, encrptedKey] = encrptedData.split(":");
    const iv = Buffer.from(ivBase64, "base64");
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrpted = decipher.update(encrptedKey, "base64", "utf8");
    decrpted += decipher.final("utf8");
    return decrpted;
}