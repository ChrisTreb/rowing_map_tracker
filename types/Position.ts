export type Position = {
    latitude: number;
    longitude: number;
};

export class ClassPosition {
    private latitude: number;
    private longitude: number;
    private timestamp: number;

    constructor(latitude: number, longitude: number) {
        this.latitude = latitude;
        this.longitude = longitude;
        this.timestamp = new Date().getTime();
    }

    public getLatitude() {
        return this.latitude;
    }

    public getLongitude() {
        return this.longitude;
    }

    public getTimestamp() {
        return this.timestamp;
    }

    public toJSON() {
        return {
            latitude: this.latitude,
            longitude: this.longitude,
            timestamp: this.timestamp
        };
    }
}