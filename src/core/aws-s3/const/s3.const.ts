export const S3_EXPIRES_IN = 90; // 1분 30초

export const S3_MAX_FILE_SIZE = 10 * 1024 * 1024;

export const S3Category = {
  PROFILE: 'profile',
  REGISTERED_GAME: 'registered-game',
} as const;

export type S3Category = (typeof S3Category)[keyof typeof S3Category];

export const ImgFileType = {
  JPEG: 'image/jpeg',
  JPG: 'image/jpeg',
  PNG: 'image/png',
  // GIF: 'image/gif',
  WEBP: 'image/webp',
  SVG: 'image/svg+xml',
  HEIC: 'image/heic',
  HEIF: 'image/heif',
} as const;

export type ImgFileType = (typeof ImgFileType)[keyof typeof ImgFileType];
