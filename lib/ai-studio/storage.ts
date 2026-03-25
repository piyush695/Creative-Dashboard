/**
 * Creative Image Storage
 * 
 * Uploads generated images to Cloudinary and stores URLs in MongoDB.
 * Flow: base64 data URI → Cloudinary CDN → permanent URL stored with creative memory.
 */

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || '';
const API_KEY = process.env.CLOUDINARY_API_KEY || '';
const API_SECRET = process.env.CLOUDINARY_API_SECRET || '';

const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

/**
 * Upload a base64 data URI to Cloudinary.
 * Returns the permanent CDN URL.
 */
export async function uploadToCloudinary(
  dataUri: string,
  options: {
    folder?: string;
    publicId?: string;
    tags?: string[];
  } = {}
): Promise<{ url: string; publicId: string; width: number; height: number } | null> {
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    console.warn('[Storage] Cloudinary not configured — skipping upload');
    return null;
  }

  if (!dataUri || !dataUri.startsWith('data:')) {
    return null;
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = options.folder || 'creative-studio';
    const publicId = options.publicId || `creative-${Date.now()}`;
    const tags = options.tags || ['ai-generated', 'hola-prime'];

    // Build signature string (Cloudinary requires signed uploads)
    const signatureParams = [
      `folder=${folder}`,
      `public_id=${publicId}`,
      `tags=${tags.join(',')}`,
      `timestamp=${timestamp}`,
    ].sort().join('&') + API_SECRET;

    // Create SHA-1 signature
    const encoder = new TextEncoder();
    const data = encoder.encode(signatureParams);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const signature = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const formData = new FormData();
    formData.append('file', dataUri);
    formData.append('api_key', API_KEY);
    formData.append('timestamp', String(timestamp));
    formData.append('signature', signature);
    formData.append('folder', folder);
    formData.append('public_id', publicId);
    formData.append('tags', tags.join(','));

    const response = await fetch(CLOUDINARY_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[Storage] Cloudinary upload failed (${response.status}):`, errorText.substring(0, 200));
      return null;
    }

    const result = await response.json();
    
    console.log(`[Storage] ✓ Uploaded to Cloudinary: ${result.secure_url} (${result.width}x${result.height})`);
    
    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    };

  } catch (err: any) {
    console.warn('[Storage] Cloudinary upload error:', err.message);
    return null;
  }
}

/**
 * Upload all variant images from a generation result.
 * Replaces data URIs with permanent Cloudinary URLs.
 * Returns the updated variants array.
 */
export async function uploadVariantImages(
  variants: any[],
  generationId: string
): Promise<any[]> {
  if (!CLOUD_NAME || !API_KEY) {
    console.log('[Storage] Cloudinary not configured — images stay as data URIs');
    return variants;
  }

  const uploadableVariants = variants.filter(v => v?.imageUrl?.startsWith('data:'));
  
  if (uploadableVariants.length === 0) {
    return variants;
  }

  console.log(`[Storage] Uploading ${uploadableVariants.length} variant images to Cloudinary...`);

  const results = await Promise.allSettled(
    uploadableVariants.map(v => 
      uploadToCloudinary(v.imageUrl, {
        folder: 'creative-studio/generations',
        publicId: `${generationId}-${v.id}`,
        tags: ['ai-generated', 'hola-prime', v.id],
      })
    )
  );

  // Map back uploads to variants
  let uploadIdx = 0;
  const updatedVariants = variants.map(v => {
    if (!v?.imageUrl?.startsWith('data:')) return v;
    
    const result = results[uploadIdx++];
    if (result?.status === 'fulfilled' && result.value) {
      return {
        ...v,
        imageUrl: result.value.url,           // Replace data URI with CDN URL
        cloudinaryUrl: result.value.url,       // Keep explicit reference
        cloudinaryPublicId: result.value.publicId,
        imageWidth: result.value.width,
        imageHeight: result.value.height,
      };
    }
    return v; // Keep data URI if upload failed
  });

  const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
  console.log(`[Storage] ${successCount}/${uploadableVariants.length} images uploaded to Cloudinary`);

  return updatedVariants;
}
