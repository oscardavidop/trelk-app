// import { Token } from "src/modules/auth/token.entity";
import { User } from "src/modules/users/user.entity";

export interface AuthenticatedUser {
    auth: User;
    // session: Token;
    callHeaders: CallHeaders;
    location: Location;
}



export interface CallHeaders {
    host: string;
    "x-real-ip": string;
    connection: string;
    "content-length": string;
    "cf-ray": string;
    "x-forwarded-for": string;
    "cf-region-code": string;
    "accept-encoding": string;
    "cf-postal-code": string;
    "x-forwarded-proto": string;
    "cf-iplongitude": string;
    "cf-iplatitude": string;
    "cf-visitor": string;
    "cf-timezone": string;
    "cf-ipcountry": string;
    "cf-region": string;
    "cf-ipcontinent": string;
    "cf-ipcity": string;
    "cdn-loop": string;
    "x-middleware-subrequest": string;
    "content-type": string;
    authorization: string;
    "user-agent": string;
    accept: string;
    "cache-control": string;
    "postman-token": string;
    "cf-connecting-ip": string;
}

export interface Location {
    country: string;
    city: string;
    region: string;
    latitude: string;
    longitude: string;
    timezone: string;
    ip: string;
}
