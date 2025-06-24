# Contentful Gallery Setup Guide

## Creating the Gallery Content Model in Contentful

1. **Log in to your Contentful space**
   - Go to your Contentful dashboard
   - Select your space

2. **Create a new Content Model**
   - Go to "Content model" in the top navigation
   - Click "Add content type"
   - Name: `Gallery`
   - API Identifier: `gallery` (this should auto-generate)
   - Description: "Gallery images for Country Days website"

3. **Add the following fields:**

   a. **Title** (required)
      - Field type: Short text
      - Field ID: `title`
      - This will be the gallery title

   b. **Images** (required)
      - Field type: Media, many files
      - Field ID: `images`
      - Accept only images
      - This allows you to upload multiple images at once

4. **Save the Content Model**

## Adding Gallery Images

1. Go to "Content" in the top navigation
2. Click "Add entry" and select "Gallery"
3. Fill in the fields:
   - Title: e.g., "Country Days Gallery"
   - Click "Link existing assets" or "Create new assets and link" to add multiple images
   - You can upload multiple images at once
   - Each image can have its own title and description in the Media library
4. **IMPORTANT**: Click "Publish" to make the gallery live
   - Images in draft status will NOT appear on the website
   - Make sure all images are published in the Media library first

## Tips

- Images will be displayed in a responsive grid (2-4 columns depending on screen size)
- Click on any image to open it in a lightbox view
- The gallery will automatically fetch the first gallery entry
- If no gallery is found, fallback images will be shown
- Images are lazy-loaded for better performance
- Each image's title and description (set in Media library) will be shown on hover and in lightbox

## Managing Images

- To add images: Edit your gallery entry and add more images to the "Images" field
- To remove images: Edit your gallery entry and unlink images from the "Images" field
- To reorder images: In the gallery entry, drag and drop images in the "Images" field
- To update image titles/descriptions: Go to Media library and edit individual assets
- **Publishing**: When adding new images, make sure to:
  1. Publish the individual image assets in the Media library
  2. Publish the gallery entry that contains them
  - Both steps are required for images to appear on the website

## Troubleshooting

- Make sure your Contentful API credentials are set in the `.env` file
- Check that the content type API identifier is exactly `gallery`
- Ensure the gallery entry is published, not just saved as draft
- Only the first gallery entry will be used if multiple exist