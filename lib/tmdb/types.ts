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
  credits: { cast: TMDBCastMember[] };
  release_dates: {
    results: { iso_3166_1: string; release_dates: { certification: string }[] }[];
  };
  images: TMDBImages;
  videos: TMDBVideos;
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
  credits: { cast: TMDBCastMember[] };
  content_ratings: {
    results: { iso_3166_1: string; rating: string }[];
  };
  images: TMDBImages;
  videos: TMDBVideos;
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
