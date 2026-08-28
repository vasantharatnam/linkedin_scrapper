

export interface HealthResponse {
    success: true;
    data: {
        status:        "healthy";
        service:       string;
        version:       string;
        environment:   string;
        uptimeSeconds: number;
        timestamp:     string;
    }
}