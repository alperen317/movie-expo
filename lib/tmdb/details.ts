import type { TMDBCastMember, TMDBImages, TMDBMovieDetails, TMDBTVShowDetails } from './types';

export interface MediaCastMember {
  id: number;
  name: string;
  character: string;
  profilePath: string | null;
}

export interface MediaDetails {
  id: number;
  mediaType: 'movie' | 'tv';
  title: string;
  overview: string;
  backdropPath: string | null;
  voteAverage: number;
  year: string | null;
  runtimeLabel: string | null;
  certification: string | null;
  genres: string[];
  cast: MediaCastMember[];
  backdrops: string[];
}

function formatRuntime(minutes: number | null | undefined): string | null {
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function mapCast(cast: TMDBCastMember[]): MediaCastMember[] {
  return cast.slice(0, 10).map((member) => ({
    id: member.id,
    name: member.name,
    character: member.character,
    profilePath: member.profile_path,
  }));
}

function mapBackdrops(images: TMDBImages | undefined): string[] {
  return (images?.backdrops ?? []).slice(0, 12).map((image) => image.file_path);
}

function getUSMovieCertification(release_dates: TMDBMovieDetails['release_dates']): string | null {
  const us = release_dates?.results.find((entry) => entry.iso_3166_1 === 'US');
  return us?.release_dates.find((entry) => entry.certification)?.certification || null;
}

export function toMovieDetails(movie: TMDBMovieDetails): MediaDetails {
  return {
    id: movie.id,
    mediaType: 'movie',
    title: movie.title,
    overview: movie.overview,
    backdropPath: movie.backdrop_path,
    voteAverage: movie.vote_average,
    year: movie.release_date?.slice(0, 4) || null,
    runtimeLabel: formatRuntime(movie.runtime),
    certification: getUSMovieCertification(movie.release_dates),
    genres: movie.genres.map((genre) => genre.name),
    cast: mapCast(movie.credits.cast),
    backdrops: mapBackdrops(movie.images),
  };
}

export function toTVDetails(show: TMDBTVShowDetails): MediaDetails {
  const usRating = show.content_ratings?.results.find((entry) => entry.iso_3166_1 === 'US');

  return {
    id: show.id,
    mediaType: 'tv',
    title: show.name,
    overview: show.overview,
    backdropPath: show.backdrop_path,
    voteAverage: show.vote_average,
    year: show.first_air_date?.slice(0, 4) || null,
    runtimeLabel: formatRuntime(show.episode_run_time?.[0]),
    certification: usRating?.rating || null,
    genres: show.genres.map((genre) => genre.name),
    cast: mapCast(show.credits.cast),
    backdrops: mapBackdrops(show.images),
  };
}
