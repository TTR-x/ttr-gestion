// Client-side offline-first implementation
import { localImageService } from './local-image-service';

export async function uploadToCloudinary(file: File): Promise<string> {
    // Save locally first, return local URL immediately
    const localUrl = await localImageService.saveImageLocally(file);

    // Show toast if offline
    if (!navigator.onLine) {
        // Toast will be shown by the calling component
        console.log('Image saved locally, will sync when online');
    }

    return localUrl;
}

export async function uploadDataUriToCloudinary(dataUri: string): Promise<string> {
    // Convert data URI to blob
    const response = await fetch(dataUri);
    const blob = await response.blob();
    const file = new File([blob], 'image.png', { type: blob.type });

    return uploadToCloudinary(file);
}
