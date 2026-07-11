import { getPrimaryGenre, TMDB_TV_GENRE_MAP } from './genres';
import type {
  TMDBCastMember,
  TMDBImages,
  TMDBMovieDetails,
  TMDBPersonCombinedCastCredit,
  TMDBPersonDetails,
  TMDBTVShowDetails,
  TMDBVideos,
} from './types';

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
  trailerKey: string | null;
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

function getTrailerKey(videos: TMDBVideos | undefined): string | null {
  const clips = (videos?.results ?? []).filter((video) => video.site === 'YouTube');
  const trailer =
    clips.find((video) => video.type === 'Trailer' && video.official) ??
    clips.find((video) => video.type === 'Trailer') ??
    clips.find((video) => video.type === 'Teaser');
  return trailer?.key ?? null;
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
    trailerKey: getTrailerKey(movie.videos),
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
    trailerKey: getTrailerKey(show.videos),
  };
}

export interface PersonKnownForItem {
  id: number;
  title: string;
  year: string | null;
  posterPath: string | null;
  voteAverage: number;
  genre: string | null;
  mediaType: 'movie' | 'tv';
}

export interface PersonDetails {
  id: number;
  name: string;
  biography: string;
  profilePath: string | null;
  birthday: string | null;
  deathday: string | null;
  placeOfBirth: string | null;
  knownForDepartment: string | null;
  knownFor: PersonKnownForItem[];
}

function toPersonKnownForItem(credit: TMDBPersonCombinedCastCredit): PersonKnownForItem {
  const isTV = credit.media_type === 'tv';
  return {
    id: credit.id,
    title: (isTV ? credit.name : credit.title) || '',
    year: (isTV ? credit.first_air_date : credit.release_date)?.slice(0, 4) || null,
    posterPath: credit.poster_path,
    voteAverage: credit.vote_average,
    genre: getPrimaryGenre(credit.genre_ids, isTV ? TMDB_TV_GENRE_MAP : undefined),
    mediaType: isTV ? 'tv' : 'movie',
  };
}

export function toPersonDetails(person: TMDBPersonDetails): PersonDetails {
  const seen = new Set<string>();
  const knownFor = (person.combined_credits?.cast ?? [])
    .filter((credit) => credit.poster_path)
    .sort((a, b) => b.popularity - a.popularity)
    .map(toPersonKnownForItem)
    .filter((item) => {
      const key = `${item.mediaType}-${item.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return {
    id: person.id,
    name: person.name,
    biography: person.biography,
    profilePath: person.profile_path,
    birthday: person.birthday,
    deathday: person.deathday,
    placeOfBirth: person.place_of_birth,
    knownForDepartment: person.known_for_department,
    knownFor,
  };
}
