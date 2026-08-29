

export interface LinkedinSessionCredentials {
    liAt: string;
    jsessionId: string;
}

export type LinkedinAuthHeadersProvider = () => Record<string, string>;