# 360 Video Example with React Three Fiber

A simple, static HTML implementation of a 360-degree video viewer using React Three Fiber. This example combines concepts from R3F's 360 photo panorama and video texture examples, with interactive portals for switching between multiple 360 video scenes.

## Features

- 360-degree video playback in an immersive sphere
- **Interactive Portal Spheres** - Click floating spheres to switch between scenes
- Multiple 360 video environments (beach, mountain, city)
- Mouse/touch drag to look around
- Scroll to zoom in/out
- Play/pause and mute/unmute controls
- Animated portal spheres with hover effects
- No build tools required - just open in a browser!

## How It Works

The implementation uses several key techniques:

1. **Inverted Sphere**: A sphere geometry with inverted scale `[-1, 1, 1]` makes the texture visible from inside
2. **Video Texture**: A video element is mapped as a texture onto the sphere using `THREE.VideoTexture`
3. **BackSide Material**: Using `THREE.BackSide` ensures the texture is visible from inside the sphere
4. **Portal Spheres**: Smaller interactive spheres float in the scene, allowing users to switch between different 360 videos
5. **Orbit Controls**: Allows intuitive camera control for looking around the 360 environment
6. **State Management**: React state controls which video is currently displayed

## Demo

![Portal Spheres Animation](https://img.shields.io/badge/Status-Interactive-brightgreen)

Look around the 360 environment and you'll see glowing colored spheres floating in space. Each sphere represents a different 360 video scene:
- **Blue sphere** - Beach scene
- **Green sphere** - Mountain view
- **Orange sphere** - City streets

Click any portal sphere to instantly transition to that scene!

## Usage

### Quick Start

1. **Download sample videos** (or provide your own):
   ```bash
   cd 360-video-example
   bash download-sample-videos.sh
   ```
   Or manually download 360 videos to the `videos/` directory

2. **Open in browser**:
   - Open `index.html` in a modern web browser
   - No server or build process needed!

3. **Explore**:
   - Drag to look around the 360 environment
   - Look for the colored floating spheres (portals)
   - Click any portal sphere to switch to that scene

### Adding Your Own Videos

1. Place your 360 videos in the `videos/` directory
2. Name them: `beach-360.mp4`, `mountain-360.mp4`, `city-360.mp4`
3. Or edit `index.html` to customize the scene configuration

### Customizing Portal Scenes

Edit the `VIDEO_SCENES` array in `index.html`:

```javascript
const VIDEO_SCENES = [
    {
        id: 1,
        name: 'Beach Scene',
        description: 'Relaxing beach environment',
        src: './videos/beach-360.mp4',
        portalPosition: [50, 0, -100],  // X, Y, Z position
        portalColor: '#4fc3f7'           // Hex color
    },
    // Add more scenes...
];
```

### Where to Get 360 Videos

**Automated Download:**
- Run `download-sample-videos.sh` for guided setup

**Free Sources:**
- **Pixabay**: https://pixabay.com/videos/search/panorama%20360/ (No attribution required)
- **Pexels**: https://www.pexels.com/search/videos/360/ (Free to use)
- **Videezy**: https://www.videezy.com/free-video/360-video (Free with attribution)
- **Vecteezy**: 1,400+ free 360 panorama videos

**Create Your Own:**
- Use a 360 camera like Insta360, GoPro MAX, or Ricoh Theta

### Supported Formats

- MP4 (H.264) - Recommended
- WebM (VP8/VP9)
- OGG (Theora)

**Requirements:**
- Equirectangular format (2:1 aspect ratio)
- Recommended resolution: 3840×1920 (4K) or higher

## Customization

### Change 360 Sphere Size

Adjust the `radius` parameter in the `Video360` component:

```javascript
function Video360({ src, radius = 500 }) {  // Change default radius
```

### Portal Sphere Appearance

Modify portal properties in `VIDEO_SCENES`:

```javascript
{
    portalPosition: [50, 0, -100],  // Move portal location
    portalColor: '#ff0000',         // Change color
}
```

Or adjust the `PortalSphere` component:

```javascript
<sphereGeometry args={[5, 32, 32]} />  // [radius, width segments, height segments]
```

### Portal Animation

Edit the `useFrame` hook in `PortalSphere`:

```javascript
useFrame((state) => {
    if (meshRef.current) {
        meshRef.current.rotation.y += 0.01;  // Rotation speed
        meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 2;  // Float height
    }
});
```

### Modify Camera Settings

Edit the Canvas camera prop:

```javascript
<Canvas camera={{ position: [0, 0, 0.1], fov: 90 }}>
```

### Adjust Control Sensitivity

Modify the OrbitControls props:

```javascript
<OrbitControls
    enableZoom={true}
    enablePan={false}
    rotateSpeed={-0.5}
    minDistance={1}
    maxDistance={1000}
/>
```

### Add More Scenes

Simply add more objects to the `VIDEO_SCENES` array:

```javascript
const VIDEO_SCENES = [
    // ... existing scenes ...
    {
        id: 4,
        name: 'Space Station',
        description: 'International Space Station view',
        src: './videos/space-360.mp4',
        portalPosition: [0, -50, -100],
        portalColor: '#9c27b0'
    }
];
```

## Browser Compatibility

Requires a modern browser with ES Modules support:
- Chrome 61+
- Firefox 60+
- Safari 11+
- Edge 79+

## Technical Details

### Import Maps

The example uses import maps to load dependencies from CDN without a build step:

```javascript
{
    "imports": {
        "react": "https://esm.sh/react@18.3.1",
        "three": "https://esm.sh/three@0.170.0",
        "@react-three/fiber": "https://esm.sh/@react-three/fiber@8.17.10",
        "@react-three/drei": "https://esm.sh/@react-three/drei@9.117.3"
    }
}
```

### Video Texture Configuration

For optimal quality, the texture is configured with:

```javascript
texture.minFilter = THREE.LinearFilter;
texture.magFilter = THREE.LinearFilter;
texture.format = THREE.RGBFormat;
```

## Troubleshooting

### Video Doesn't Play

- Check browser console for errors
- Ensure the video file path is correct
- Try clicking the "Play" button (autoplay restrictions)
- Verify the video file is accessible (CORS for remote URLs)

### Poor Video Quality

- Use a higher resolution video (4K recommended for 360)
- Ensure video is in equirectangular format
- Check video compression settings

### Performance Issues

- Reduce video resolution
- Lower the sphere segment count: `<sphereGeometry args={[radius, 32, 16]} />`
- Use a more compressed video codec

## GitHub Pages Deployment

This example is ready for GitHub Pages:

1. The `.nojekyll` file prevents Jekyll processing
2. All assets use relative paths
3. No build process required

To deploy:
```bash
# Commit your changes
git add .
git commit -m "Add 360 video example"

# Push to your branch
git push -u origin your-branch-name

# Enable GitHub Pages in repository settings
# Set source to your branch and root directory
```

**Note:** Large video files (>100MB) may require Git LFS or external hosting.

## Project Structure

```
360-video-example/
├── index.html                  # Main application (all code in one file)
├── .nojekyll                   # GitHub Pages configuration
├── download-sample-videos.sh   # Helper script for downloading videos
├── README.md                   # This file
├── VIDEO-SETUP.md             # Detailed video setup instructions
├── videos/
│   ├── README.md              # Video directory instructions
│   ├── beach-360.mp4          # Beach scene video (user-provided)
│   ├── mountain-360.mp4       # Mountain scene video (user-provided)
│   └── city-360.mp4           # City scene video (user-provided)
└── public/
    └── .gitkeep               # Placeholder for additional assets
```

## References

This example is based on and inspired by:

- [React Three Fiber Documentation](https://docs.pmnd.rs/react-three-fiber/)
- [React Three Fiber Events and Interaction](https://r3f.docs.pmnd.rs/tutorials/events-and-interaction)
- [360 Photo Texture Examples](https://github.com/pmndrs/react-three-fiber/discussions/1731)
- [Video Texture Examples - Drei](https://drei.docs.pmnd.rs/loaders/video-texture-use-video-texture)
- [Portal Transitions with R3F](https://discourse.threejs.org/t/portal-transitions-with-r3f/84340)
- [MeshPortalMaterial Documentation](https://drei.docs.pmnd.rs/portals/mesh-portal-material)
- [Wawa Sensei - Image and Video Textures](https://wawasensei.dev/courses/react-three-fiber/lessons/image-and-video-textures)
- [Free 360 Videos - Mettle](https://www.mettle.com/360vr-master-series-free-360-downloads-page/)
- [Pixabay 360 Videos](https://pixabay.com/videos/search/panorama%20360/)

## License

Free to use and modify for any purpose.
