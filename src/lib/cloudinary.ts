export const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
export const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

export function getCloudinaryUrl(publicId: string, options?: {
  width?: number;
  height?: number;
  crop?: string;
  quality?: string;
}) {
  const transforms: string[] = [];

  if (options?.width) transforms.push(`w_${options.width}`);
  if (options?.height) transforms.push(`h_${options.height}`);
  if (options?.crop) transforms.push(`c_${options.crop}`);
  else if (options?.width || options?.height) transforms.push('c_fill');
  if (options?.quality) transforms.push(`q_${options.quality}`);
  else transforms.push('q_auto');
  transforms.push('f_auto');

  const transformStr = transforms.length > 0 ? transforms.join(',') + '/' : '';
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transformStr}${publicId}`;
}

export function getThumbnailUrl(publicId: string) {
  return getCloudinaryUrl(publicId, { width: 300, height: 300, crop: 'fill' });
}

export function getProfilePhotoUrl(publicId: string) {
  return getCloudinaryUrl(publicId, { width: 400, height: 400, crop: 'fill' });
}
