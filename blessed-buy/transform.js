// Text replacements: religious reskin of Best Buy.
// Order matters — longer/more-specific phrases first.
export const replacements = [
  // Brand
  [/Best Buy Canada/gi, 'Blessed Buy Canada'],
  [/Best ?Buy/g, 'BlessedBuy'],
  [/best ?buy/g, 'blessedbuy'],
  [/BEST ?BUY/g, 'BLESSEDBUY'],

  // Programs / services
  [/Geek Squad/gi, 'Monk Squad'],
  [/My Best Buy/gi, 'My Blessed Buy'],
  [/Plus Members?/gi, 'Faithful'],
  [/Total Members?/gi, 'Devout'],
  [/Membership/gi, 'Communion'],
  [/Rewards/gi, 'Indulgences'],

  // Marketing copy
  [/Top Deals/gi, 'Holy Bargains'],
  [/Hot Deals/gi, 'Burning Bush Bargains'],
  [/Today'?s Deals/gi, "Today's Blessings"],
  [/Deal of the Day/gi, 'Miracle of the Day'],
  [/Deals/gi, 'Blessings'],
  [/Deal/gi, 'Blessing'],
  [/Save\b/g, 'Tithe'],
  [/save\b/g, 'tithe'],
  [/Savings/gi, 'Tithings'],
  [/Sale/gi, 'Pilgrimage'],
  [/Clearance/gi, 'Cleansing'],
  [/Open Box/gi, 'Open Ark'],

  // Categories
  [/Smart Home/gi, 'Sacred Home'],
  [/Home Theatre/gi, 'Home Cathedral'],
  [/Home Theater/gi, 'Home Cathedral'],
  [/Wearable Tech/gi, 'Wearable Relics'],
  [/Gaming/gi, 'Sacred Gaming'],
  [/Headphones/gi, 'Halo-phones'],
  [/Speakers/gi, 'Pulpits'],
  [/Tablets/gi, 'Stone Tablets'],
  [/Laptops/gi, 'Scribe Tablets'],
  [/Cameras/gi, 'All-Seeing Eyes'],
  [/Drones/gi, 'Cherubim'],
  [/Major Appliances/gi, 'Holy Appliances'],
  [/Small Appliances/gi, 'Sacred Appliances'],

  // Generic
  [/Shop/g, 'Worship'],
  [/shop/g, 'worship'],
  [/Cart/g, 'Offering Plate'],
  [/cart/g, 'offering plate'],
  [/Checkout/gi, 'Confession'],
  [/Sign In/gi, 'Receive Communion'],
  [/Sign Up/gi, 'Be Baptized'],
  [/Account/gi, 'Soul'],
  [/Wishlist/gi, 'Prayer List'],
  [/Customer Reviews?/gi, 'Testimonials'],
  [/Reviews?/gi, 'Testimonies'],
  [/Free Shipping/gi, 'Divine Delivery'],
  [/Shipping/gi, 'Pilgrimage Delivery'],
  [/Pickup/gi, 'Sanctuary Pickup'],
  [/Stores?/g, 'Temple'],
  [/Trending/gi, 'Anointed'],
  [/Featured/gi, 'Chosen'],
  [/New Arrivals?/gi, 'Newly Revealed'],
  [/Best Sellers?/gi, 'Most Blessed'],
  [/Recommended/gi, 'Ordained'],
];

export function transformText(s) {
  if (!s) return s;
  let out = s;
  for (const [from, to] of replacements) out = out.replace(from, to);
  return out;
}
