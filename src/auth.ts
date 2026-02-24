import { importPKCS8, SignJWT } from "jose";
import type { Auth } from "./types.js";

export interface ServiceAccountAuthConfig {
    /** The service account private key (PEM format) */
    privateKey: string;
    /** The service account email */
    clientEmail: string;
}

export async function createJWT(
    config: ServiceAccountAuthConfig,
): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        iss: config.clientEmail,
        sub: config.clientEmail,
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
        scope: "https://www.googleapis.com/auth/datastore",
    };

    try {
        const privateKey = await importPKCS8(config.privateKey, "RS256");

        const token = await new SignJWT(payload)
            .setProtectedHeader({
                alg: "RS256",
                typ: "JWT",
            })
            .sign(privateKey);

        return token;
    } catch (error) {
        throw error;
    }
}

export async function getFirestoreToken(
    config: ServiceAccountAuthConfig,
): Promise<string> {
    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion: await createJWT(config),
        }),
    });

    const data = (await response.json()) as { access_token: unknown };
    if (typeof data.access_token !== "string") {
        throw new Error("Invalid access token");
    }

    return data.access_token;
}

export interface AccessToken {
    token: string;
    expiry: number;
}
export interface TokenCache {
    get(): Promise<AccessToken>;
    set(token: AccessToken): Promise<void>;
}

export class ServiceAccountAuth implements Auth {
    private _token: string | null = null;
    private _tokenExpiry: number = 0;

    constructor(
        private readonly _config: ServiceAccountAuthConfig,
        private readonly _tokenCache: TokenCache = {
            get: async () => ({
                token: this._token,
                expiry: this._tokenExpiry,
            }),
            set: async ({ token, expiry }) => {
                this._token = token;
                this._tokenExpiry = expiry;
            },
        },
    ) {}

    async getToken(): Promise<string> {
        const { token, expiry } = await this._tokenCache.get();
        if (token && Date.now() < expiry - 60000) {
            return token;
        }

        const accessToken = {
            token: await getFirestoreToken(this._config),
            expiry: Date.now() + 3600 * 1000,
        };
        await this._tokenCache.set(accessToken);

        return accessToken.token;
    }
}

export class NoAuth implements Auth {
    constructor(private readonly token: string = "") {}

    async getToken(): Promise<string> {
        return this.token;
    }
}
