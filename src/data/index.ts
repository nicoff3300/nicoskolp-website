import type { Project, GraffitiPiece, ArchiveItem, SiteConfig, HeroArtwork } from '../types';
import siteData from './site.json';
import publicArtData from './public-art.json';
import graffitiData from './graffiti.json';
import archiveData from './archive.json';
import heroData from './hero.json';

export const siteConfig: SiteConfig = siteData;
export const publicArtProjects: Project[] = publicArtData as Project[];
export const graffitiPieces: GraffitiPiece[] = graffitiData as GraffitiPiece[];
export const archiveItems: ArchiveItem[] = archiveData as ArchiveItem[];
export const heroArtworks: HeroArtwork[] = heroData as HeroArtwork[];

export default {
  site: siteConfig,
  publicArt: publicArtProjects,
  graffiti: graffitiPieces,
  archive: archiveItems,
  hero: heroArtworks,
};
