
'use server';

export async function uploadToCloudinary(
  file: File
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UNSIGNED_PRESET!);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok || !data.secure_url) {
      console.error("Cloudinary upload failed:", data);
      throw new Error(`Échec du téléversement sur Cloudinary : ${data.error?.message || 'Réponse invalide'}`);
    }
    
    return data.secure_url;
    
  } catch (error) {
    console.error("Error in uploadToCloudinary:", error);
    if (error instanceof Error) {
        throw new Error(`Erreur réseau ou Cloudinary : ${error.message}`);
    }
    throw new Error("Une erreur inconnue est survenue lors du téléversement.");
  }
}


export async function uploadDataUriToCloudinary(dataUri: string): Promise<string> {
    const formData = new FormData();
    formData.append('file', dataUri);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UNSIGNED_PRESET!);

    try {
       const response = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok || !data.secure_url) {
        console.error("Cloudinary data URI upload failed:", data);
        throw new Error(`Échec du téléversement (Data URI) sur Cloudinary : ${data.error?.message || 'Réponse invalide'}`);
      }

      return data.secure_url;

    } catch (error) {
        console.error("Error in uploadDataUriToCloudinary:", error);
        if (error instanceof Error) {
            throw new Error(`Erreur réseau ou Cloudinary : ${error.message}`);
        }
        throw new Error("Une erreur inconnue est survenue lors du téléversement.");
    }
}
