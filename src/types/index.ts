export type FoodPreference = 'italian' | 'greek' | 'turkish' | 'asian' | 'other'

export type EventStatus = 'upcoming' | 'voting' | 'past'

export type MessageType = 'broadcast' | 'late-notice'

export interface Profile {
  id: string
  name: string
  avatar_url: string | null
  food_pref: FoodPreference | null
  expo_token: string | null
  created_at: string
}

export interface Group {
  id: string
  name: string
  invite_code: string
  created_by: string
  created_at: string
}

export interface GroupMember {
  id: string
  group_id: string
  user_id: string
  host_order: number
  joined_at: string
  profile?: Profile
}

export interface Event {
  id: string
  group_id: string
  host_id: string
  date: string
  location: string
  status: EventStatus
  voting_open: boolean
  food_pref_result: string | null
  created_at: string
  host?: Profile
}

export interface GameSuggestion {
  id: string
  event_id: string
  suggested_by: string
  game_name: string
  description: string | null
  image_url: string | null
  created_at: string
  profile?: Profile
  vote_count?: number
  user_voted?: boolean
}

export interface Vote {
  id: string
  event_id: string
  suggestion_id: string
  user_id: string
  created_at: string
}

export interface Rating {
  id: string
  event_id: string
  user_id: string
  host_rating: number
  food_rating: number
  evening_rating: number
  comment: string | null
  created_at: string
}

export interface Message {
  id: string
  group_id: string
  sender_id: string
  text: string
  type: MessageType
  created_at: string
  profile?: Profile
}

export interface FoodOrder {
  id: string
  event_id: string
  user_id: string
  food_pref: string
  order_text: string | null
  created_at: string
}
