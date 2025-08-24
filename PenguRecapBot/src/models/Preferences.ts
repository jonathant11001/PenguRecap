export interface Item {
  id: number;
  name: string;
  weight: number;
  preference_id: number;
  updated_at: Date;
}

export interface Preferences {
  id: number;
  category: string;
}

export interface CategoryPreferences {
  category: string;
  items: Item[];
  totalItems: number;
}

export interface NewItem {
  name: string;
  weight: number;
  preference_id: number;
}

export interface NewPreferences {
  category: string;
}
