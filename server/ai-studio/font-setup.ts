/**
 * Ensure libvips / pango / fontconfig can find the bundled Poppins fonts used by
 * the template engine. MUST be imported BEFORE 'sharp' so FONTCONFIG_FILE is set
 * before fontconfig initialises. Import this first in any module that renders text.
 */
import * as path from 'path';
import * as fs from 'fs';

const conf = path.join(process.cwd(), 'assets', 'fonts', 'fonts.conf');
if (!process.env.FONTCONFIG_FILE && fs.existsSync(conf)) {
  process.env.FONTCONFIG_FILE = conf;
}

// Montserrat matches the reference letterforms best (oval numerals, humanist-geometric
// caps); Poppins/Arial are fallbacks if the bundled TTF is missing.
export const FONT = 'Montserrat, Poppins, Arial, sans-serif';
