export interface ProjectGalleryItem {
  url: string;
  width?: number;
  height?: number;
  orientation?: 'landscape' | 'portrait' | 'square';
  aspectRatio?: string;
  caption?: string;
}

export interface Project {
  id: string;
  slug: string;
  title: string;
  year?: string;
  city?: string;
  category: 'public-art' | 'canvas' | 'other';
  coverImage: string;
  galleryImages: string[];
  galleryItems?: ProjectGalleryItem[];
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

export interface LightboxItem {
  id?: string;
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
    linktree?: string;
  };
  credits: {
    studioName: string;
    studioUrl: string;
    collectiveName: string;
    collectiveUrl: string;
    brandName?: string;
    brandUrl?: string;
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

export interface PressArticle {
  id: string;
  title: string;
  titleEn?: string;
  outlet: string;
  date?: string;
  year: string;
  type: 'Magazine' | 'Daily' | 'Webzine' | 'Art Review' | 'Interview';
  project?: string;
  city?: string;
  quote: string;
  quoteEn?: string;
  url: string;
  urlEn?: string;
  featured?: boolean;
}
