import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Locations that are clearly jokes or invalid
const INVALID_LOCATIONS = [
  'your heart',
  '/dev/random',
  'localhost',
  'earth',
  'nothing to see here',
  '{}',
  'building software',
];

// Manual mappings for tricky locations
const MANUAL_GEOCODES = {
  'vienna': { lat: 48.2082, lng: 16.3738, country: 'Austria' },
  'vienna, austria': { lat: 48.2082, lng: 16.3738, country: 'Austria' },
  'germany': { lat: 51.1657, lng: 10.4515, country: 'Germany' },
  'nepal': { lat: 28.3949, lng: 84.1240, country: 'Nepal' },
  'kathmandu, nepal': { lat: 27.7172, lng: 85.3240, country: 'Nepal' },
  'kathmandu,nepal': { lat: 27.7172, lng: 85.3240, country: 'Nepal' },
  'england and turkey': { lat: 51.5074, lng: -0.1278, country: 'UK' }, // Default to England
  'thailand, germany': { lat: 51.1657, lng: 10.4515, country: 'Germany' }, // Default to Germany
  'kathmandu, nepal -> bangalore, india': { lat: 12.9716, lng: 77.5946, country: 'India' }, // Current location
  'leeuwarden': { lat: 53.2012, lng: 5.7999, country: 'Netherlands' },
  'nyc': { lat: 40.7128, lng: -74.0060, country: 'USA' },
  'new york': { lat: 40.7128, lng: -74.0060, country: 'USA' },
  'west michigan': { lat: 43.0731, lng: -85.8389, country: 'USA' },
  'american fork, ut': { lat: 40.3769, lng: -111.7957, country: 'USA' },
  'maryland, usa': { lat: 39.0458, lng: -76.6413, country: 'USA' },
  'utah, usa': { lat: 39.3200, lng: -111.0937, country: 'USA' },
  'são paulo': { lat: -23.5505, lng: -46.6333, country: 'Brazil' },
  'são paulo - brasil': { lat: -23.5505, lng: -46.6333, country: 'Brazil' },
  'brasilia / brasil': { lat: -15.7975, lng: -47.8919, country: 'Brazil' },
  'fukui japan': { lat: 36.0641, lng: 136.2196, country: 'Japan' },
  'china beijing': { lat: 39.9042, lng: 116.4074, country: 'China' },
  'xi\'an china': { lat: 34.3416, lng: 108.9398, country: 'China' },
  'chandigarh in': { lat: 30.7333, lng: 76.7794, country: 'India' },
  'new delhi , delhi, india': { lat: 28.6139, lng: 77.2090, country: 'India' },
  'madurai , tamilnadu india': { lat: 9.9252, lng: 78.1198, country: 'India' },
  'bangalore': { lat: 12.9716, lng: 77.5946, country: 'India' },
  'sweden, stockholm': { lat: 59.3293, lng: 18.0686, country: 'Sweden' },
  'stockholm': { lat: 59.3293, lng: 18.0686, country: 'Sweden' },
  'västerås, sweden': { lat: 59.6099, lng: 16.5448, country: 'Sweden' },
  'berlin': { lat: 52.5200, lng: 13.4050, country: 'Germany' },
  'berlin, germany': { lat: 52.5200, lng: 13.4050, country: 'Germany' },
  'munich, germany': { lat: 48.1351, lng: 11.5820, country: 'Germany' },
  'munich': { lat: 48.1351, lng: 11.5820, country: 'Germany' },
  'oldenburg, germany': { lat: 53.1435, lng: 8.2146, country: 'Germany' },
  'germany, paderborn': { lat: 51.7189, lng: 8.7575, country: 'Germany' },
  'london, england, united kingdom': { lat: 51.5074, lng: -0.1278, country: 'UK' },
  'edinburgh, uk': { lat: 55.9533, lng: -3.1883, country: 'UK' },
  'sydney': { lat: -33.8688, lng: 151.2093, country: 'Australia' },
  'kempsey, nsw & cessnock nsw, australia': { lat: -31.0833, lng: 152.8333, country: 'Australia' },
  'building software with ♥ from barcelona (spain)': { lat: 41.3851, lng: 2.1734, country: 'Spain' },
  'białystok, poland': { lat: 53.1325, lng: 23.1688, country: 'Poland' },
  'łódź (boat)': { lat: 51.7592, lng: 19.4560, country: 'Poland' },
  'warsaw': { lat: 52.2297, lng: 21.0122, country: 'Poland' },
  'wrocław': { lat: 51.1079, lng: 17.0385, country: 'Poland' },
  'szczecin': { lat: 53.4285, lng: 14.5528, country: 'Poland' },
  'bílý potok, czech republic': { lat: 50.8167, lng: 15.2333, country: 'Czech Republic' },
  'amsterdam': { lat: 52.3676, lng: 4.9041, country: 'Netherlands' },
  'netherlands': { lat: 52.1326, lng: 5.2913, country: 'Netherlands' },
  'belgium': { lat: 50.8503, lng: 4.3517, country: 'Belgium' },
  'braga, portugal': { lat: 41.5454, lng: -8.4265, country: 'Portugal' },
  'morocco': { lat: 31.7917, lng: -7.0926, country: 'Morocco' },
  'dubai': { lat: 25.2048, lng: 55.2708, country: 'UAE' },
  'istanbul, turkey': { lat: 41.0082, lng: 28.9784, country: 'Turkey' },
  'philippines': { lat: 12.8797, lng: 121.7740, country: 'Philippines' },
  'cambodia': { lat: 12.5657, lng: 104.9910, country: 'Cambodia' },
  'vietnam': { lat: 14.0583, lng: 108.2772, country: 'Vietnam' },
  'siargao': { lat: 9.8667, lng: 126.0500, country: 'Philippines' },
  'lahore': { lat: 31.5497, lng: 74.3436, country: 'Pakistan' },
  'dhaka, bangladesh': { lat: 23.8103, lng: 90.4125, country: 'Bangladesh' },
  'tunisia': { lat: 33.8869, lng: 9.5375, country: 'Tunisia' },
  'lebanon': { lat: 33.8547, lng: 35.8623, country: 'Lebanon' },
  'amman-jordan': { lat: 31.9454, lng: 35.9284, country: 'Jordan' },
  'algeria, biskra, sidi khaled, rue al akid amirouche': { lat: 34.4346, lng: 4.2295, country: 'Algeria' },
  'oran, algeria': { lat: 35.6969, lng: -0.6331, country: 'Algeria' },
  'egypt': { lat: 26.8206, lng: 30.8025, country: 'Egypt' },
  'kenya': { lat: -1.2921, lng: 36.8219, country: 'Kenya' },
  'ghana': { lat: 7.9465, lng: -1.0232, country: 'Ghana' },
  'lagos, nigeria': { lat: 6.5244, lng: 3.3792, country: 'Nigeria' },
  'ulaanbaatar, mongolia': { lat: 47.8864, lng: 106.9057, country: 'Mongolia' },
  'zagreb, croatia': { lat: 45.8150, lng: 15.9819, country: 'Croatia' },
  'lviv, ua': { lat: 49.8397, lng: 24.0297, country: 'Ukraine' },
  'plovdiv': { lat: 42.1354, lng: 24.7453, country: 'Bulgaria' },
  'bergen, norway': { lat: 60.3913, lng: 5.3221, country: 'Norway' },
  'st. gallen': { lat: 47.4245, lng: 9.3767, country: 'Switzerland' },
  'eglisau, switzerland': { lat: 47.5742, lng: 8.5182, country: 'Switzerland' },
  'slovakia/bratislava': { lat: 48.1486, lng: 17.1077, country: 'Slovakia' },
  'argentina': { lat: -38.4161, lng: -63.6167, country: 'Argentina' },
  'medellín, colombia': { lat: 6.2476, lng: -75.5658, country: 'Colombia' },
  'quebec, canada': { lat: 46.8139, lng: -71.2080, country: 'Canada' },
  'italy': { lat: 41.8719, lng: 12.5674, country: 'Italy' },
  'paris': { lat: 48.8566, lng: 2.3522, country: 'France' },
};

async function geocodeWithNominatim(location) {
  try {
    const encoded = encodeURIComponent(location);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'gh-vis-app/1.0 (contributor visualization)'
        }
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        displayName: data[0].display_name
      };
    }
    return null;
  } catch (error) {
    console.error(`Geocoding error for "${location}":`, error.message);
    return null;
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const locationsPath = path.join(__dirname, 'src/data/contributor-locations.json');
  const contributors = JSON.parse(fs.readFileSync(locationsPath, 'utf-8'));

  const geocodedData = [];
  let geocoded = 0;
  let skipped = 0;
  let failed = 0;

  const contributorsWithLocation = contributors.filter(c => c.location);
  console.log(`Geocoding ${contributorsWithLocation.length} contributors with locations...\n`);

  for (let i = 0; i < contributors.length; i++) {
    const contributor = contributors[i];
    
    if (!contributor.location) {
      geocodedData.push({
        ...contributor,
        coords: null,
        country: null
      });
      continue;
    }

    const locationLower = contributor.location.toLowerCase().trim();

    // Check if it's an invalid/joke location
    if (INVALID_LOCATIONS.some(inv => locationLower.includes(inv))) {
      console.log(`[${i + 1}/${contributors.length}] Skipping joke location: ${contributor.location}`);
      geocodedData.push({
        ...contributor,
        coords: null,
        country: null
      });
      skipped++;
      continue;
    }

    // Check manual mappings first
    const manualKey = Object.keys(MANUAL_GEOCODES).find(key => 
      locationLower === key || locationLower.includes(key)
    );

    if (manualKey) {
      const manual = MANUAL_GEOCODES[manualKey];
      console.log(`[${i + 1}/${contributors.length}] ${contributor.login}: ${contributor.location} -> ${manual.country} (manual)`);
      geocodedData.push({
        ...contributor,
        coords: { lat: manual.lat, lng: manual.lng },
        country: manual.country
      });
      geocoded++;
      continue;
    }

    // Try Nominatim API
    console.log(`[${i + 1}/${contributors.length}] ${contributor.login}: Geocoding "${contributor.location}"...`);
    const result = await geocodeWithNominatim(contributor.location);

    if (result) {
      console.log(`  -> Found: ${result.lat}, ${result.lng}`);
      geocodedData.push({
        ...contributor,
        coords: { lat: result.lat, lng: result.lng },
        country: result.displayName.split(',').pop()?.trim() || 'Unknown'
      });
      geocoded++;
    } else {
      console.log(`  -> FAILED to geocode`);
      geocodedData.push({
        ...contributor,
        coords: null,
        country: null
      });
      failed++;
    }

    // Rate limit for Nominatim (1 request per second)
    await sleep(1100);
  }

  // Save the geocoded data
  const outputPath = path.join(__dirname, 'src/data/contributor-locations-geocoded.json');
  fs.writeFileSync(outputPath, JSON.stringify(geocodedData, null, 2));

  // Summary
  console.log('\n=== Summary ===');
  console.log(`Total contributors: ${contributors.length}`);
  console.log(`Successfully geocoded: ${geocoded}`);
  console.log(`Skipped (joke locations): ${skipped}`);
  console.log(`Failed to geocode: ${failed}`);
  console.log(`No location set: ${contributors.length - contributorsWithLocation.length}`);
  console.log(`\nData saved to ${outputPath}`);

  // Country breakdown
  const countryCounts = {};
  geocodedData.filter(d => d.country).forEach(d => {
    countryCounts[d.country] = (countryCounts[d.country] || 0) + 1;
  });
  
  console.log('\n=== Country Breakdown ===');
  Object.entries(countryCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([country, count]) => {
      console.log(`  ${country}: ${count}`);
    });
}

main().catch(console.error);
