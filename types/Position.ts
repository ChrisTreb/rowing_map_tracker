export type Position = {
    latitude: number;
    longitude: number;
};

export class ClassPosition {
    private latitude: number;
    private longitude: number;

    constructor(latitude: number, longitude: number) {
        this.latitude = latitude;
        this.longitude = longitude;
    }

    public getLatitude() {
        return this.latitude;
    }

    public getLongitude() {
        return this.longitude;
    }
}