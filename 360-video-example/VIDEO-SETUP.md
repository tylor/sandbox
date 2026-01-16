# Video Setup Instructions

To view the 360 video example, you need to add a 360-degree video file.

## Quick Setup

1. Download a sample 360 video (see sources below)
2. Place it in this directory as `sample-360-video.mp4`
3. Open `index.html` in your browser

## Where to Get 360 Videos

### Free Sample Videos

1. **Sample Videos GitHub Repo**
   - [github.com/timmyg/360-video-player](https://github.com/timmyg/360-video-player) (check samples)

2. **Archive.org**
   - Search for "360 video" or "equirectangular video"
   - Download: [Sample 360 videos on Internet Archive](https://archive.org/search.php?query=360+video)

3. **Free Stock Sites**
   - [Pexels 360 Videos](https://www.pexels.com/search/videos/360/)
   - [Pixabay VR Videos](https://pixabay.com/videos/search/360/)

4. **Sample Test Videos**
   ```bash
   # Download a sample video using curl or wget
   curl -L "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4" -o sample-360-video.mp4
   ```

### Using Your Own Video

If you have a 360 camera (Insta360, GoPro MAX, etc.):

1. Export your video in equirectangular format (2:1 aspect ratio)
2. Name it `sample-360-video.mp4` or update the path in `index.html`
3. Recommended specs:
   - Resolution: 3840×1920 (4K) or higher
   - Format: MP4 (H.264)
   - Frame rate: 30fps or 60fps

## Using a Remote Video URL

Instead of a local file, you can use a remote URL. Edit `index.html` and change:

```javascript
<Video360 src="./sample-360-video.mp4" />
```

To:

```javascript
<Video360 src="https://example.com/your-360-video.mp4" />
```

**Note**: The remote server must have CORS enabled for video access.

## For GitHub Pages Deployment

When deploying to GitHub Pages, place your video file in the repository and commit it:

```bash
git add sample-360-video.mp4
git commit -m "Add sample 360 video"
git push
```

**Warning**: GitHub has file size limits (100MB for free accounts). For larger videos:
- Use [Git LFS](https://git-lfs.github.com/) for large files
- Host the video elsewhere and use a remote URL
- Use a compressed version for demo purposes

## Video Format Requirements

Your 360 video should be:
- **Format**: Equirectangular projection (also called spherical or lat-long)
- **Aspect Ratio**: 2:1 (e.g., 3840×1920, 4096×2048)
- **Codec**: H.264 (MP4), VP8/VP9 (WebM), or Theora (OGG)
- **Quality**: Higher resolution is better (4K+ recommended)

## Troubleshooting

### Video Doesn't Load

1. Check the file path in `index.html`
2. Verify the video file exists in the correct location
3. Check browser console for errors
4. Try a different video format/codec

### CORS Errors with Remote Videos

If using a remote URL, the server must include proper CORS headers:
```
Access-Control-Allow-Origin: *
```

### Video Quality Issues

- Use higher resolution source video (4K+)
- Check that video is in equirectangular format
- Reduce compression artifacts in source video
