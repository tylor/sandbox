# 360 Video Files

Place your 360-degree video files in this directory.

## Required Files

The example is configured to use the following files:

1. `beach-360.mp4` - Beach scene
2. `mountain-360.mp4` - Mountain scene
3. `city-360.mp4` - City scene

## Quick Setup with Sample Videos

### Option 1: Use the download script (recommended)

Run the provided script to automatically download free sample videos:

```bash
bash ../download-sample-videos.sh
```

### Option 2: Manual download

Download free 360 videos from these sources:

**Pixabay (No attribution required)**
- Visit: https://pixabay.com/videos/search/panorama%20360/
- Download 3 different 360 videos
- Rename them to match the filenames above

**Videezy (Free with attribution)**
- Visit: https://www.videezy.com/free-video/360-video
- Select "Free" filter
- Download and rename accordingly

**Pexels (Free to use)**
- Visit: https://www.pexels.com/search/videos/360/
- Download free 360 videos

### Option 3: Use your own videos

If you have your own 360 videos:

1. Ensure they are in equirectangular format (2:1 aspect ratio)
2. Rename them to match the expected filenames
3. Recommended format: MP4 (H.264), resolution 3840×1920 or higher

## Using Different Video Names

If you want to use different filenames, edit `../index.html` and update the `VIDEO_SCENES` configuration:

```javascript
const VIDEO_SCENES = [
    {
        id: 1,
        name: 'Beach Scene',
        src: './videos/your-video-name.mp4',  // Change this
        // ...
    },
    // ...
];
```

## Video Format Requirements

- **Projection**: Equirectangular (spherical)
- **Aspect Ratio**: 2:1 (width:height)
- **Format**: MP4 (H.264), WebM (VP8/VP9), or OGG (Theora)
- **Resolution**: 3840×1920 (4K) or higher recommended
- **File Size**: Keep under 50MB for better loading times

## CORS Considerations

If serving videos from a different domain, ensure the server has CORS enabled:
- The server must send `Access-Control-Allow-Origin` header
- Or serve videos from the same domain as the HTML file

## Example Video Sources

Some specific free 360 videos you can use:

1. **360 Beach Video** - Search Pixabay for "360 beach" or "360 ocean"
2. **360 Mountain Video** - Search for "360 mountain" or "360 nature"
3. **360 City Video** - Search for "360 city" or "360 street"

## Testing Without Videos

If you don't have videos yet, the example will still load but won't display video content. You'll see:
- The 3D environment with portal spheres
- The UI controls
- Console warnings about missing video files

Once you add videos, refresh the page to see them.
