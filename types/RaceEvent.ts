export type RaceEvent = {
  re_id: number;
  re_user_id: number;

  re_eventName: string;
  re_eventStartDateAndTime: number;
  re_eventEndDateAndTime: number;

  re_eventVisibility: number;
  re_flagContent: number;

  re_eventRandomId_edit: string;
  re_eventRandomId_viewer: string;

  re_viewport_latitude: number;
  re_viewport_longitude: number;
  re_viewport_zoom: number;

  re_maplayer: string;

  re_markerTimeout: number;
  re_tailTimeout: number;

  is_editable: boolean;
  nb_participants: number;

  rc_name: string;
  rc_nickname: string;
};