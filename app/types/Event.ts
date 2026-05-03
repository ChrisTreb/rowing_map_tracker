export type Event = {
    user_id: number;
    name: string;
    visibility: boolean;
    start_at: number;
    end_at: number;
    random_id_edit: string;
    random_id_viewer: string;
    latitude: number;
    longitude: number;
    zoom: number;
    map_layer: string;
};