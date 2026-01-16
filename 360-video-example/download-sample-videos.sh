#!/bin/bash

# Download sample 360 videos for the React Three Fiber example
# This script downloads free sample videos from public sources

set -e

echo "=================================="
echo "360 Video Example - Sample Downloader"
echo "=================================="
echo ""

# Create videos directory if it doesn't exist
mkdir -p videos
cd videos

echo "ℹ️  This script will help you set up sample 360 videos."
echo ""
echo "📝 Note: Due to licensing and availability, you'll need to manually"
echo "   download 360 videos from free sources."
echo ""
echo "Recommended sources:"
echo "  • Pixabay: https://pixabay.com/videos/search/panorama%20360/"
echo "  • Pexels: https://www.pexels.com/search/videos/360/"
echo "  • Videezy: https://www.videezy.com/free-video/360-video"
echo ""
echo "=================================="
echo "Quick Setup Instructions:"
echo "=================================="
echo ""
echo "1. Visit one of the sources above"
echo "2. Download 3 different 360-degree videos"
echo "3. Save them in this 'videos' directory with these names:"
echo "   - beach-360.mp4"
echo "   - mountain-360.mp4"
echo "   - city-360.mp4"
echo ""
echo "4. Or rename the videos to anything you like and update"
echo "   the VIDEO_SCENES configuration in index.html"
echo ""
echo "=================================="
echo "Alternative: Use Your Own Videos"
echo "=================================="
echo ""
echo "If you have 360 videos from a 360 camera:"
echo "• Ensure they're in equirectangular format (2:1 aspect ratio)"
echo "• Copy them to this 'videos' directory"
echo "• Rename to match the expected filenames above"
echo ""
echo "=================================="
echo "Testing Sample URLs"
echo "=================================="
echo ""
echo "You can also use remote video URLs. Edit index.html and change:"
echo "  src: './videos/beach-360.mp4'"
echo "to:"
echo "  src: 'https://your-cdn.com/video.mp4'"
echo ""
echo "⚠️  Make sure the remote server has CORS enabled!"
echo ""

# Check if we can download a test video (some sample 360 videos from archive.org)
echo "Would you like to try downloading a small test video? (y/n)"
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo ""
    echo "Attempting to download a small 360 test video..."
    echo ""

    # Try to download a small test video
    # Note: This is a sample equirectangular video from Internet Archive
    TEST_URL="https://archive.org/download/360-test-video/360-test.mp4"

    if command -v curl &> /dev/null; then
        echo "Using curl to download..."
        curl -L "$TEST_URL" -o beach-360.mp4 2>&1 || {
            echo "❌ Download failed. Please download manually from the sources listed above."
        }
    elif command -v wget &> /dev/null; then
        echo "Using wget to download..."
        wget "$TEST_URL" -O beach-360.mp4 2>&1 || {
            echo "❌ Download failed. Please download manually from the sources listed above."
        }
    else
        echo "❌ Neither curl nor wget is available."
        echo "   Please download videos manually from the sources listed above."
    fi

    if [ -f "beach-360.mp4" ]; then
        echo ""
        echo "✅ Test video downloaded as beach-360.mp4"
        echo ""
        echo "You still need to download 2 more videos:"
        echo "  • mountain-360.mp4"
        echo "  • city-360.mp4"
        echo ""
    fi
fi

echo "=================================="
echo "Setup Complete!"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Add your 360 video files to the videos/ directory"
echo "2. Open index.html in a web browser"
echo "3. Click on the colored spheres to switch between videos"
echo ""
echo "Enjoy your 360 video experience! 🎥"
