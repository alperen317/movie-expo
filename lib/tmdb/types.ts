export interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  backdrop_path: string | null;
  poster_path: string | null;
  vote_average: number;
  release_date: string;
  genre_ids: number[];
}

export interface TMDBTrendingResponse {
  page: number;
  results: TMDBMovie[];
  total_pages: number;
  total_results: number;
}

export interface TMDBTVShow {
  id: number;
  name: string;
  overview: string;
  backdrop_path: string | null;
  poster_path: string | null;
  vote_average: number;
  first_air_date: string;
  genre_ids: number[];
}

export interface TMDBPopularTVResponse {
  page: number;
  results: TMDBTVShow[];
  total_pages: number;
  total_results: number;
}

export interface TMDBMultiSearchResult {
  id: number;
  media_type: 'movie' | 'tv' | 'person';
  title?: string;
  name?: string;
  poster_path: string | null;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
}

export interface TMDBMultiSearchResponse {
  page: number;
  results: TMDBMultiSearchResult[];
  total_pages: number;
  total_results: number;
}

export interface TMDBDiscoverMovieResponse {
  page: number;
  results: TMDBMovie[];
  total_pages: number;
  total_results: number;
}

export interface TMDBGenreDetail {
  id: number;
  name: string;
}

export interface TMDBCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface TMDBCrewMember {
  id: number;
  name: string;
  job: string;
}

export interface TMDBCreator {
  id: number;
  name: string;
}

export interface TMDBImage {
  file_path: string;
  width: number;
  height: number;
}

export interface TMDBImages {
  backdrops: TMDBImage[];
}

export interface TMDBVideo {
  key: string;
  site: string;
  type: string;
  official: boolean;
}

export interface TMDBVideos {
  results: TMDBVideo[];
}

export interface TMDBWatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export interface TMDBWatchProviderRegion {
  link: string;
  flatrate?: TMDBWatchProvider[];
  rent?: TMDBWatchProvider[];
  buy?: TMDBWatchProvider[];
}

export interface TMDBWatchProviders {
  results: Record<string, TMDBWatchProviderRegion>;
}

export interface TMDBMovieDetails {
  id: number;
  title: string;
  overview: string;
  backdrop_path: string | null;
  poster_path: string | null;
  vote_average: number;
  release_date: string;
  runtime: number | null;
  genres: TMDBGenreDetail[];
  credits: { cast: TMDBCastMember[]; crew?: TMDBCrewMember[] };
  release_dates: {
    results: { iso_3166_1: string; release_dates: { certification: string }[] }[];
  };
  images: TMDBImages;
  videos: TMDBVideos;
  'watch/providers'?: TMDBWatchProviders;
}

export interface TMDBSeasonSummary {
  id: number;
  season_number: number;
  name: string;
  episode_count: number;
  air_date: string | null;
  poster_path: string | null;
}

export interface TMDBEpisodeToAir {
  id: number;
  name: string;
  overview: string;
  season_number: number;
  episode_number: number;
  air_date: string | null;
  still_path: string | null;
}

export interface TMDBTVShowDetails {
  id: number;
  name: string;
  overview: string;
  backdrop_path: string | null;
  poster_path: string | null;
  vote_average: number;
  first_air_date: string;
  episode_run_time: number[];
  genres: TMDBGenreDetail[];
  credits: { cast: TMDBCastMember[]; crew?: TMDBCrewMember[] };
  created_by?: TMDBCreator[];
  content_ratings: {
    results: { iso_3166_1: string; rating: string }[];
  };
  images: TMDBImages;
  videos: TMDBVideos;
  seasons: TMDBSeasonSummary[];
  number_of_seasons: number;
  number_of_episodes: number;
  in_production: boolean;
  next_episode_to_air: TMDBEpisodeToAir | null;
  last_episode_to_air: TMDBEpisodeToAir | null;
  'watch/providers'?: TMDBWatchProviders;
}

export interface TMDBSeasonEpisode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  air_date: string | null;
  still_path: string | null;
  runtime: number | null;
  vote_average: number;
}

export interface TMDBSeasonDetails {
  id: number;
  name: string;
  overview: string;
  season_number: number;
  air_date: string | null;
  poster_path: string | null;
  episodes: TMDBSeasonEpisode[];
}

export interface TMDBPersonCombinedCastCredit {
  id: number;
  media_type: 'movie' | 'tv';
  title?: string;
  name?: string;
  poster_path: string | null;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids: number[];
  character: string;
  popularity: number;
}

export interface TMDBPersonDetails {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string | null;
  combined_credits: { cast: TMDBPersonCombinedCastCredit[] };
}
