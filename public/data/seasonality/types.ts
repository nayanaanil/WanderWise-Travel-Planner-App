export type Month = 'Jan' | 'Feb' | 'Mar' | 'Apr' | 'May' | 'Jun' | 'Jul' | 'Aug' | 'Sep' | 'Oct' | 'Nov' | 'Dec';

export type SeasonalityLabel = 'our_pick' | 'second_best' | 'off_season';

export interface MonthData {
  label: SeasonalityLabel;
  tempC?: string;
  note?: string;
}

export type Seasonality = {
  [K in Month]?: MonthData;
};


