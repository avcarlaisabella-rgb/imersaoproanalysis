export interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  description: string;
}

export interface Content {
  event_title: string;
  event_date: string;
  event_location: string;
  event_description: string;
  hero_image: string;
  hero_image_mobile: string;
  gallery_image_1: string;
  gallery_image_2: string;
  theme_color: string;
  bg_color: string;
  text_color: string;
  card_bg_color: string;
  font_family: string;
  logo_image: string;
  thank_you_title: string;
  thank_you_text: string;
  thank_you_image: string;
  invitation_text: string;
  dress_code: string;
  reception_time: string;
  rsvp_deadline: string;
  schedule: string; // JSON string of ScheduleItem[]
}

export interface RSVP {
  id: number;
  name: string;
  sector: string;
  shirt_size?: string;
  created_at: string;
}
