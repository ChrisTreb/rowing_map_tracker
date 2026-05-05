export type RaceEvent = {
  re_id: number;
  re_user_id: number;

  re_event_name: string;
  re_event_start_date_and_time: number;
  re_event_end_date_and_time: number;

  re_event_visibility: number;
  re_flag_content: number;

  re_event_random_id_edit: string;
  re_event_random_id_viewer: string;

  re_viewport_latitude: number;
  re_viewport_longitude: number;
  re_viewport_zoom: number;
  re_viewport_opacity: number;
    
  re_maplayer: string;

  re_marker_timeout: number;
  re_tail_timeout: number;

  is_editable: boolean;
  nb_participants: number;

  rc_name: string;
  rc_nickname: string;
};