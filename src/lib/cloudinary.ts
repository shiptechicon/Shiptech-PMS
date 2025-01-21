import { Cloudinary } from '@cloudinary/url-gen';

export const cloudinary = new Cloudinary({
  cloud: {
    cloudName: 'dqbow3alz',
  },
  url: {
    secure: true,
  },
});

export const uploadToCloudinary = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'shiptech_uploads'); // Ensure this matches your upload preset
  formData.append('cloud_name', 'dqbow3alz');

  // Set resource_type based on file type
  const isImage = file.type.startsWith('image/');
  formData.append('resource_type', isImage ? 'image' : 'raw');

  try {
    const response = await fetch(
      'https://api.cloudinary.com/v1_1/dqbow3alz/upload',
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Upload failed');
    }

    const data = await response.json();
    if (!data.secure_url) {
      throw new Error('No secure URL received from Cloudinary');
    }

    return data.secure_url;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw new Error('Failed to upload file. Please try again.');
  }
};
