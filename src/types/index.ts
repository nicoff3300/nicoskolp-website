export interface Project {
  id: string;
  slug: string;
  title: string;
  year?: string;
  city?: string;
  category: 'public-art' | 'canvas' | 'other';
  coverImage: string;
  galleryImages: string[];
  description?: string;
}

export interface GraffitiPiece {
  id: string;
  title: string;
  year?: string;
  city?: string;
  image: string;
  description?: string;
}

export interface ArchiveItem {
  id: string;
  year: string;
  title: string;
  image: string;
  city?: string;
  description?: string;
}

export interface SiteConfig {
  name: string;
  tagline: string;
  subtagline: string;
  bio: string[];
  social: {
    instagram: string;
    behance: string;
  };
  credits: {
    studioName: string;
    studioUrl: string;
    collectiveName: string;
    collectiveUrl: string;
  };
}

export interface HeroArtwork {
  id: string;
  title: string;
  image: string;
  slug?: string;
  category?: string;
  year?: string;
  description?: string;
}
