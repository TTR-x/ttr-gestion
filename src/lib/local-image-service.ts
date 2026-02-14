import { db, LocalImage, ImageUploadQueueItem } from './db';
import { v4 as uuidv4 } from 'uuid';

export const localImageService = {
    isProcessing: false,
    onSyncRequired: null as (() => void) | null,

    /**
     * Save an image file to IndexedDB and return a local URL
     */
    async saveImageLocally(file: File, stockItemId?: string): Promise<string> {
        const imageId = uuidv4();

        const localImage: LocalImage = {
            id: imageId,
            stockItemId,
            blob: file,
            fileName: file.name,
            fileSize: file.size,
            uploadStatus: 'pending',
            createdAt: Date.now()
        };

        await db.localImages.put(localImage);

        // Add to upload queue
        await this.queueCloudinaryUpload(imageId);

        // Process queue immediately if online
        if (navigator.onLine) {
            this.processUploadQueue().catch(err => console.error("Immediate upload processing failed:", err));
        }

        // Return local URL identifier
        return `local://${imageId}`;
    },

    /**
     * Get a blob URL for displaying a local image
     */
    async getLocalImageUrl(imageId: string): Promise<string | null> {
        const localImage = await db.localImages.get(imageId);
        if (!localImage) return null;

        // Create a blob URL for display
        return URL.createObjectURL(localImage.blob);
    },

    /**
     * Get image by ID
     */
    async getLocalImage(imageId: string): Promise<LocalImage | undefined> {
        return await db.localImages.get(imageId);
    },

    /**
     * Add image to upload queue
     */
    async queueCloudinaryUpload(imageId: string): Promise<void> {
        const queueItem: ImageUploadQueueItem = {
            imageId,
            timestamp: Date.now(),
            retryCount: 0
        };

        await db.imageUploadQueue.add(queueItem);
    },

    /**
     * Process the upload queue - upload pending images to Cloudinary
     */
    async processUploadQueue(): Promise<void> {
        if (!navigator.onLine || this.isProcessing) return;

        this.isProcessing = true;
        try {
            const queueItems = await db.imageUploadQueue.orderBy('timestamp').toArray();

            for (const item of queueItems) {
                try {
                    const localImage = await db.localImages.get(item.imageId);
                    if (!localImage) {
                        // Image not found, remove from queue
                        if (item.id) await db.imageUploadQueue.delete(item.id);
                        continue;
                    }

                    // Skip if already uploaded
                    if (localImage.uploadStatus === 'uploaded') {
                        if (item.id) await db.imageUploadQueue.delete(item.id);
                        continue;
                    }

                    // Update status to uploading
                    await db.localImages.update(item.imageId, { uploadStatus: 'uploading' });

                    // Upload to Cloudinary
                    const cloudinaryUrl = await this.uploadToCloudinary(localImage.blob, localImage.fileName);

                    // Update image status
                    await this.updateImageStatus(item.imageId, cloudinaryUrl);

                    // Update any database entities using this local image URL
                    await this.updateEntitiesWithCloudinaryUrl(item.imageId, cloudinaryUrl);

                    // Remove from queue
                    if (item.id) await db.imageUploadQueue.delete(item.id);

                    console.log(`[ImageSync] Successfully uploaded image ${item.imageId} to Cloudinary`);

                    // Trigger sync if callback exists - this will push the updated StockItem to Firebase
                    if (this.onSyncRequired) {
                        this.onSyncRequired();
                    }

                } catch (error: any) {
                    console.error(`Failed to upload image ${item.imageId}:`, error);

                    // Update retry count
                    if (item.id) {
                        await db.imageUploadQueue.update(item.id, {
                            retryCount: (item.retryCount || 0) + 1,
                            lastError: error.message
                        });
                    }

                    // Mark as failed if too many retries
                    if ((item.retryCount || 0) >= 3) {
                        await db.localImages.update(item.imageId, { uploadStatus: 'failed' });
                    }
                }
            }
        } finally {
            this.isProcessing = false;
        }
    },

    /**
     * Upload blob to Cloudinary
     */
    async uploadToCloudinary(blob: Blob, fileName: string): Promise<string> {
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UNSIGNED_PRESET;

        if (!cloudName || !uploadPreset) {
            console.error('[Cloudinary] Configuration missing!', { cloudName, uploadPreset });
            throw new Error("Configuration Cloudinary manquante (Cloud Name ou Preset). Vérifiez votre fichier .env.local");
        }

        const formData = new FormData();
        formData.append('file', blob, fileName);
        formData.append('upload_preset', uploadPreset);

        console.log(`[Cloudinary] Uploading to cloud: ${cloudName}`);

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            {
                method: 'POST',
                body: formData,
            }
        );

        const data = await response.json();

        if (!response.ok || !data.secure_url) {
            throw new Error(`Cloudinary upload failed: ${data.error?.message || 'Invalid response'}`);
        }

        return data.secure_url;
    },

    /**
     * Update image status after successful upload
     */
    async updateImageStatus(imageId: string, cloudinaryUrl: string): Promise<void> {
        await db.localImages.update(imageId, {
            uploadStatus: 'uploaded',
            cloudinaryUrl,
            uploadedAt: Date.now()
        });
    },

    /**
     * Update any database entities (like StockItems) that are using a local:// image URL
     * with the new Cloudinary URL.
     */
    async updateEntitiesWithCloudinaryUrl(imageId: string, cloudinaryUrl: string): Promise<void> {
        const localUrl = `local://${imageId}`;

        try {
            // Find stock items using this local URL
            // We iterate over all stock as imageUrl isn't indexed
            const stockItems = await db.stock.toArray();
            const itemsToUpdate = stockItems.filter(item => item.imageUrl === localUrl);

            for (const item of itemsToUpdate) {
                const updatedItem = {
                    ...item,
                    imageUrl: cloudinaryUrl,
                    updatedAt: Date.now()
                };

                // Update local DB
                await db.stock.put(updatedItem);

                // Add to sync queue for Firebase update
                await db.syncQueue.add({
                    collection: 'stock',
                    action: 'update',
                    data: updatedItem,
                    timestamp: Date.now()
                });

                console.log(`[ImageSync] Updated stock item ${item.id} with Cloudinary URL`);
            }

            // Check if business profile logo needs update
            const businessProfile = await db.syncMetadata.get('businessProfile');
            if (businessProfile && businessProfile.value?.logoUrl === localUrl) {
                const updatedProfile = {
                    ...businessProfile.value,
                    logoUrl: cloudinaryUrl,
                    updatedAt: Date.now()
                };
                await db.syncMetadata.put({
                    key: 'businessProfile',
                    value: updatedProfile,
                    updatedAt: Date.now()
                });
                // Note: Business profile sync is usually handled via its own hook or full sync
            }
        } catch (error) {
            console.error('[ImageSync] Failed to update entities:', error);
        }
    },

    /**
     * Cache a remote image locally for offline use
     */
    async cacheRemoteImage(url: string, stockItemId?: string): Promise<void> {
        if (!url || url.startsWith('local://') || !url.startsWith('http')) return;

        try {
            // Check if already cached
            const existing = await db.localImages.where('cloudinaryUrl').equals(url).first();
            if (existing) return;

            // Fetch image blob
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch remote image: ${response.statusText}`);
            const blob = await response.blob();

            const imageId = uuidv4();
            const localImage: LocalImage = {
                id: imageId,
                stockItemId,
                blob,
                fileName: url.split('/').pop() || 'downloaded-image',
                fileSize: blob.size,
                uploadStatus: 'uploaded',
                cloudinaryUrl: url,
                createdAt: Date.now(),
                uploadedAt: Date.now()
            };

            await db.localImages.put(localImage);
            console.log(`[Cache] Successfully cached remote image: ${url}`);
        } catch (error) {
            console.error(`[Cache] Failed to cache remote image ${url}:`, error);
        }
    },

    /**
     * Resolve image URL - returns Cloudinary URL if uploaded, otherwise local blob URL
     */
    async resolveImageUrl(imageUrl: string): Promise<string | null> {
        if (!imageUrl) return null;

        // If it's a Cloudinary URL, check if we have a local cache
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            const cached = await db.localImages.where('cloudinaryUrl').equals(imageUrl).first();
            if (cached) {
                return URL.createObjectURL(cached.blob);
            }
            return imageUrl;
        }

        // If it's a local URL, resolve it
        if (imageUrl.startsWith('local://')) {
            const imageId = imageUrl.replace('local://', '');
            const localImage = await db.localImages.get(imageId);

            if (!localImage) return null;

            // If uploaded, return Cloudinary URL (or blob if we want to save bandwidth, but Cloudinary is safer for persistence)
            // Actually, if we have the blob, blob is faster.
            return URL.createObjectURL(localImage.blob);
        }

        return imageUrl;
    },

    /**
     * Calculate total size of pending images
     */
    async calculatePendingImageSize(): Promise<number> {
        const pendingImages = await db.localImages
            .where('uploadStatus')
            .anyOf(['pending', 'uploading', 'failed'])
            .toArray();

        return pendingImages.reduce((total, img) => total + img.fileSize, 0);
    },

    /**
     * Get count of pending images
     */
    async getPendingImageCount(): Promise<number> {
        return await db.localImages
            .where('uploadStatus')
            .anyOf(['pending', 'uploading', 'failed'])
            .count();
    }
};
