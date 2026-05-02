export type Event = {
    user_id: number;
    name: string;
    visibility: boolean;
    start_at: number;
    end_at: number;
    latitude: number;
    longitude: number;
    zoom: number;
    map_layer: string;
};