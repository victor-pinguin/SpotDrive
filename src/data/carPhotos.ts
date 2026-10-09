/**
 * Echte Katalogfotos aller Modelle – von Wikimedia Commons (freie Lizenzen, meist CC BY-SA).
 * Werden angezeigt, solange ein Nutzer noch kein eigenes Foto des Modells hat
 * (Garage, Sammlung, Modellauswahl, Testdaten im Feed).
 *
 * Lizenzpflicht: Urheber + Lizenz müssen sichtbar sein → siehe PhotoCredit-Overlay
 * und die Bildnachweise im Profil (⚙️).
 * TODO(backend): Später eigene, lizenzierte Bilder im Storage ablegen statt Hotlinking.
 */

export interface PhotoCredit {
  author: string;
  license: string;
  /** Commons-Dateiseite */
  sourceUrl: string;
}

export interface CatalogPhoto extends PhotoCredit {
  url: string;
}

// Pfad unter /wikipedia/commons/thumb/ | Urheber | Lizenz
const RAW: Record<string, [path: string, author: string, license: string]> = {
  'lamborghini-huracan-evo': ['f/fa/Lamborghini_Hurac%C3%A1n_Evo_GT_Celebration_1X7A1627.jpg', 'Alexander-93', 'CC BY-SA 4.0'],
  'lamborghini-huracan-sto': ['6/68/Lamborghini_Huracan_STO_1X7A0297.jpg', 'Alexander Migl', 'CC BY-SA 4.0'],
  'lamborghini-huracan-sterrato': ['9/91/Lamborghini_Hurac%C3%A1n_Sterrato_IMG_9631.jpg', 'Alexander-93', 'CC BY-SA 4.0'],
  'lamborghini-temerario': ['c/cf/Lamborghini_Temerario_IMG_5361.jpg', 'Alexander Migl', 'CC BY-SA 4.0'],
  'lamborghini-aventador-s': ['4/46/Lamborghini_Aventador_S_Roadster%2C_IAA_2017%2C_Frankfurt_%281Y7A2846%29.jpg', 'Matti Blume', 'CC BY-SA 4.0'],
  'lamborghini-aventador-svj': ['d/da/Lamborghini_Aventador_SVJ_Roadster_IMG_9580.jpg', 'Alexander-93', 'CC BY-SA 4.0'],
  'lamborghini-revuelto': ['0/0a/Lamborghini_Revuelto_DSC_6987.jpg', 'Alexander Migl', 'CC BY-SA 4.0'],
  'lamborghini-urus-s': ['7/74/Lamborghini_Urus_S_1X7A6796.jpg', 'Alexander-93', 'CC BY-SA 4.0'],
  'lamborghini-urus-performante': ['0/0a/Lamborghini_Urus_Performante_1X7A6805.jpg', 'Alexander-93', 'CC BY-SA 4.0'],
  'lamborghini-countach-lpi-800-4': ['2/2e/Lamborghini_Countach_LPI_800-4_IMG_8019.jpg', 'Alexander-93', 'CC BY-SA 4.0'],
  'lamborghini-sian-fkp-37': ['1/18/Lamborghini_Sian_at_IAA_2019_IMG_0332.jpg', 'Alexander Migl', 'CC BY-SA 4.0'],
  'lamborghini-miura-klassiker': ['e/e0/1971_Lamborghini_Miura_P400_SV.jpg', 'Chelsea Jay', 'CC BY-SA 4.0'],
  'ferrari-roma': ['9/9b/Ferrari_Roma_IMG_9620.jpg', 'Alexander-93', 'CC BY-SA 4.0'],
  'ferrari-296-gtb': ['5/51/Ferrari_296_GTB_1X7A6377.jpg', 'Alexander Migl', 'CC BY-SA 4.0'],
  'ferrari-f8-tributo': ['d/d6/Ferrari_F8_Tributo_DSC_7013.jpg', 'Alexander Migl', 'CC BY-SA 4.0'],
  'ferrari-sf90-stradale': ['a/aa/Ferrari_SF90%2C_BAS_24%2C_Brussels_%28P1170502-RR%29.jpg', 'Matti Blume', 'CC BY-SA 4.0'],
  'ferrari-812-superfast': ['2/24/Ferrari_812_Superfast_IMG_8829.jpg', 'Alexander-93', 'CC BY-SA 4.0'],
  'ferrari-purosangue': ['b/b5/Ferrari_Purosangue_IMG_9554.jpg', 'Alexander-93', 'CC BY-SA 4.0'],
  'ferrari-12cilindri': ['8/87/Ferrari_12Cilindri_at_the_2025_Shannons_Adelaide_Rally_%28028A4546%29.jpg', 'Yu Chu Chin', 'CC BY 4.0'],
  'ferrari-f40': ['c/cb/F40_Ferrari_20090509.jpg', 'Will ainsworth', 'CC BY-SA 3.0'],
  'ferrari-laferrari': ['3/3e/Ferrari_LaFerrari_GIMS_2024_1X7A2272.jpg', 'Alexander-93', 'CC BY-SA 4.0'],
  'ferrari-daytona-sp3': ['0/06/Ferrari_Daytona_SP3_front_side_at_CF_2022.jpg', 'Prova MO', 'CC BY-SA 4.0'],
  'ferrari-f80': ['e/e2/FerrariF80_%28resized%29.jpg', 'Pauls.127', 'CC0'],
  'porsche-911-carrera': ['5/5d/2025_Porsche_992_Carrera_convertible_DSC_7026_%28cropped%29.jpg', 'Alexander Migl', 'CC BY-SA 4.0'],
  'porsche-911-carrera-s': ['3/38/Porsche_992_Carrera_S_coupe_IMG_5832.jpg', 'Alexander Migl', 'CC BY-SA 4.0'],
  'porsche-911-turbo-s': ['e/ee/Porsche_992_Turbo_S_1X7A0413.jpg', 'Alexander Migl', 'CC BY-SA 4.0'],
  'porsche-911-gt3': ['8/85/Porsche_992_GT3_with_touring_package_1X7A6511.jpg', 'Alexander Migl', 'CC BY-SA 4.0'],
  'porsche-911-gt3-rs': ['d/d3/Porsche_911_GT3_RS_%282022%29_1X7A7164.jpg', 'Alexander-93', 'CC BY-SA 4.0'],
  'porsche-911-gt2-rs': ['1/15/Porsche_GT2_RS%2C_IAA_2017%2C_Frankfurt_%281Y7A2769%29.jpg', 'Matti Blume', 'CC BY-SA 4.0'],
  'porsche-911-s-t': ['2/23/Porsche_911_S-T_IAA_2023_1X7A0526.jpg', 'Alexander-93', 'CC BY-SA 4.0'],
  'porsche-911-dakar': ['f/f7/2023_Porsche_911_Dakar_HCC24.jpg', 'MrWalkr', 'CC BY-SA 4.0'],
  'porsche-718-cayman-gt4-rs': ['a/a9/2024_Porsche_718_Cayman_GT4_RS_SCD24.jpg', 'MrWalkr', 'CC BY-SA 4.0'],
  'porsche-718-spyder-rs': ['3/38/Porsche_718_Boxster_Spyder_RS_IAA_2023_1X7A0535.jpg', 'Alexander-93', 'CC BY-SA 4.0'],
  'porsche-taycan-turbo-gt': ['b/bc/Porsche_Taycan_Turbo_GT_MYLE_Festival_2025_DSC_9442.jpg', 'Alexander Migl', 'CC BY-SA 4.0'],
  'porsche-panamera-turbo-e-hybrid': ['0/00/Porsche_972_Turbo_E-Hybrid_IMG_0445.jpg', 'Alexander-93', 'CC BY-SA 4.0'],
  'porsche-cayenne-turbo-gt': ['b/b3/Porsche_Cayenne_Turbo_GT_DSC_7899.jpg', 'Alexander Migl', 'CC BY-SA 4.0'],
  'porsche-carrera-gt': ['5/57/Porsche_Carrera_GT%2C_Techno-Classica_2025%2C_Essen_%28P1046086%29.jpg', 'Matti Blume', 'CC BY-SA 4.0'],
  'porsche-918-spyder': ['9/91/Porsche_918_Spyder_IAA_2013.jpg', 'Thomas Wolf, www.foto-tw.de', 'CC BY-SA 3.0 DE'],
  'mclaren-artura': ['1/1a/McLaren_Artura_IMG_0527.jpg', 'Alexander-93', 'CC BY-SA 4.0'],
  'mclaren-750s': ['e/e6/2024_McLaren_750S_5.jpg', 'Calreyn88', 'CC BY-SA 4.0'],
  'mclaren-720s': ['9/94/McLaren_720S%2C_IAA_2017%2C_%281Y7A3406%29.jpg', 'Matti Blume', 'CC BY-SA 4.0'],
  'mclaren-765lt': ['6/62/McLaren_765LT_IMG_3930.jpg', 'Alexander Migl', 'CC BY-SA 4.0'],
  'mclaren-gt': ['7/77/McLaren_GT%2C_Klassikstadt%2C_Frankfurt_am_Main_%28P1032520%29.jpg', 'Matti Blume', 'CC BY-SA 4.0'],
  'mclaren-senna': ['1/1f/McLaren_Senna%2C_GIMS_2018%2C_Le_Grand-Saconnex_%281X7A0404%29.jpg', 'Matti Blume', 'CC BY-SA 4.0'],
  'mclaren-elva': ['8/8a/McLaren_Elva_2.jpg', 'Calreyn88', 'CC BY-SA 4.0'],
  'mclaren-w1': ['2/28/2024_McLaren_W1_SP25.jpg', 'MrWalkr', 'CC BY-SA 4.0'],
  'mclaren-p1': ['4/42/2014_McLaren_P1_3.8.jpg', 'Chelsea Jay', 'CC BY-SA 4.0'],
  'bugatti-chiron': ['6/6f/Bugatti_Chiron%2C_GIMS_2018%2C_Le_Grand-Saconnex_%281X7A1765%29.jpg', 'Matti Blume', 'CC BY-SA 4.0'],
  'bugatti-chiron-super-sport': ['7/7c/Bugatti_Chiron_Super_Sport.jpg', 'MrWalkr', 'CC BY-SA 4.0'],
  'bugatti-veyron': ['9/94/Bugatti_Veyron_16.4_%E2%80%93_Frontansicht_%283%29%2C_5._April_2012%2C_D%C3%BCsseldorf.jpg', 'M 93', 'CC BY-SA 3.0 DE'],
  'bugatti-divo': ['1/16/Bugatti_Divo%2C_GIMS_2019%2C_Le_Grand-Saconnex_%28GIMS0029%29.jpg', 'Matti Blume', 'CC BY-SA 4.0'],
  'bugatti-tourbillon': ['5/51/Bugatti_Tourbillon.jpg', 'MrWalkr', 'CC BY-SA 4.0'],
  'koenigsegg-jesko': ['f/f7/Koenigsegg_Jesko_Auto_Zuerich_2023_1X7A1382.jpg', 'Alexander-93', 'CC BY-SA 4.0'],
  'koenigsegg-regera': ['7/71/Koenigsegg_Regera_White.jpg', 'MrWalkr', 'CC BY-SA 4.0'],
  'koenigsegg-gemera': ['5/5f/Koenigsegg_Gemera_Auto_Zuerich_2023_1X7A1381.jpg', 'Alexander-93', 'CC BY-SA 4.0'],
  'koenigsegg-cc850': ['a/a8/Koenigsegg_CC850_Auto_Zuerich_2025_DSC_3664.jpg', 'Alexander Migl', 'CC BY-SA 4.0'],
  'koenigsegg-agera-rs': ['2/25/Koenigsegg_Agera_S%2C_GIMS_2014_%28Ank_Kumar%29_01.jpg', 'Ank Kumar', 'CC BY-SA 4.0'],
  'pagani-huayra': ['0/0d/Pagani_Huayra_BC_Roadster%2C_BAS_24%2C_Brussels_%28P1170496%29.jpg', 'Matti Blume', 'CC BY-SA 4.0'],
  'pagani-zonda': ['9/91/Pagani_Zonda%2C_GIMS_2019%2C_Le_Grand-Saconnex_%28GIMS0014%29.jpg', 'Matti Blume', 'CC BY-SA 4.0'],
  'pagani-utopia': ['0/01/Pagani_Utopia_Auto_Zuerich_2023_1X7A1451.jpg', 'Alexander-93', 'CC BY-SA 4.0'],
  'aston-martin-vantage': ['1/1b/Aston_Martin_Vantage_%282024%29_IMG_0002.jpg', 'Alexander-93', 'CC BY-SA 4.0'],
  'aston-martin-db12': ['c/ca/Aston_Martin_DB12_1X7A1921.jpg', 'Alexander-93', 'CC BY-SA 4.0'],
  'aston-martin-dbs-770-ultimate': ['f/f9/2023_Aston_Martin_DBS_770_Ultimate_HCC25.jpg', 'MrWalkr', 'CC BY-SA 4.0'],
  'aston-martin-valkyrie': ['c/c6/Aston_Martin_Valkyrie%2C_BAS_24%2C_Brussels_%28P1170224-RR%29.jpg', 'Matti Blume', 'CC BY-SA 4.0'],
  'aston-martin-dbx707': ['d/d8/Aston_Martin_DBX707_1X7A0360.jpg', 'Alexander Migl', 'CC BY-SA 4.0'],
  'mercedes-amg-amg-gt-63': ['e/e5/Mercedes-AMG_GT_63_S_E_Performance_IMG_0296.jpg', 'Alexander-93', 'CC BY-SA 4.0'],
  'mercedes-amg-amg-gt-black-series': ['5/5a/Mercedes-AMG_GT_Black_Series_IMG_0324.jpg', 'Alexander-93', 'CC BY-SA 4.0'],
  'mercedes-amg-sls-amg': ['2/2e/Mercedes-Benz_SLS_AMG_%28C_197%29_%E2%80%93_Frontansicht_ge%C3%B6ffnet%2C_10._August_2011%2C_D%C3%BCsseldorf.jpg', 'M 93', 'CC BY-SA 3.0 DE'],
  'mercedes-amg-amg-one': ['0/0f/Mercedes-AMG_One_IAA_2023_1X7A0454.jpg', 'Alexander-93', 'CC BY-SA 4.0'],
  'mercedes-amg-g-63': ['9/9c/Mercedes-AMG_G_63_%282018%29_IMG_4370.jpg', 'Alexander Migl', 'CC BY-SA 4.0'],
  'bmw-m2': ['4/42/BMW_M2_CS_%28G87%29_DSC_9723.jpg', 'Alexander Migl', 'CC BY-SA 4.0'],
  'bmw-m4-csl': ['d/d7/BMW_M4_CSL_IMG_7638.jpg', 'Alexander-93', 'CC BY-SA 4.0'],
  'bmw-m5': ['0/0b/BMW_M5_%28G90%29_MYLE_Festival_2025_DSC_9764.jpg', 'Alexander Migl', 'CC BY-SA 4.0'],
  'bmw-m8-competition': ['7/7a/BMW_M8_Gran_Coupe_Competition_%28Facelift%29_1X7A6106.jpg', 'Alexander Migl', 'CC BY-SA 4.0'],
  'bmw-3-0-csl': ['3/3a/BMW_3.0_CSL_1X7A7215.jpg', 'Alexander-93', 'CC BY-SA 4.0'],
  'audi-r8-v10-performance': ['0/0e/2024_Audi_R8_Performance_V10.jpg', 'Calreyn88', 'CC BY-SA 4.0'],
  'audi-rs-6-avant': ['6/61/Audi_RS_6_Avant_C8_Merlin_Purple_%286%29.jpg', 'Damian B Oh', 'CC BY-SA 4.0'],
  'audi-rs-e-tron-gt': ['c/c2/Audi_RS_e-tron_GT_1X7A1874.jpg', 'Alexander-93', 'CC BY-SA 4.0'],
  'audi-rs-q8': ['b/b9/2020_Audi_RS_Q8_Front.jpg', 'Vauxford', 'CC BY-SA 4.0'],
  'rolls-royce-cullinan': ['9/9c/Rolls-Royce_Cullinan_001.jpg', 'Jengtingchen', 'CC BY-SA 4.0'],
  'rolls-royce-spectre': ['b/b6/Rolls-Royce_Spectre%2C_Monaco_%2820260620-IMG_3854%29.jpg', 'Matti Blume', 'CC BY-SA 4.0'],
  'rolls-royce-phantom': ['b/b8/Rolls-Royce_Phantom_VIII_Series_I_IMG_9101.jpg', 'Alexander-93', 'CC BY-SA 4.0'],
  'rolls-royce-ghost': ['5/5e/2020_Rolls-Royce_Ghost_V12_4X4_Automatic_6.75.jpg', 'Liam Walker', 'CC BY-SA 4.0'],
  'bentley-continental-gt-speed': ['b/bc/Bentley_Continental_GT_%284th_gen.%29_IMG_0556.jpg', 'Alexander-93', 'CC BY-SA 4.0'],
  'bentley-bentayga': ['3/36/Bentley_Bentayga_2015_-_front.jpg', 'DeFacto', 'CC BY-SA 4.0'],
  'rimac-nevera': ['0/0d/Rimac_Nevera_R_Auto_Zuerich_2024_DSC_6340.jpg', 'Alexander-93', 'CC BY-SA 4.0'],
  'ford-gt-2017': ['f/f5/Ford_GT_%282nd_generation%29_coupes_IMG_0224.jpg', 'Alexander-93', 'CC BY-SA 4.0'],
  'ford-mustang-dark-horse': ['1/11/Ford_Mustang_Dark_Horse_Rutesheimer_Autoschau_2025_DSC_9229.jpg', 'Alexander Migl', 'CC BY-SA 4.0'],
  'nissan-gt-r-nismo': ['2/28/Nissan_GT-R_Nismo_%2828492%29.jpg', 'Calreyn88', 'CC BY-SA 4.0'],
  'nissan-skyline-gt-r-r34': ['c/cf/2001_Nissan_Skyline_GT-R_V-Spec_II_R34_%2879241%29.jpg', 'Calreyn88', 'CC BY-SA 4.0'],
};

const THUMB = 'https://upload.wikimedia.org/wikipedia/commons/thumb/';

export function catalogPhoto(modelId: string, width: 500 | 960 = 960): CatalogPhoto | null {
  const r = RAW[modelId];
  if (!r) return null; // z. B. Bentley Batur → Illustration als Fallback
  const [path, author, license] = r;
  const file = path.split('/').pop()!;
  return {
    url: `${THUMB}${path}/${width}px-${file}`,
    author,
    license,
    sourceUrl: `https://commons.wikimedia.org/wiki/File:${file}`,
  };
}

export const ALL_CATALOG_PHOTOS = () =>
  Object.keys(RAW).map((id) => ({ modelId: id, ...catalogPhoto(id)! }));

// ─── Demo-Videos (Pro) ────────────────────────────────────────────────────

export interface DemoVideo extends PhotoCredit {
  webm: string;
  mp4: string; // Safari / iOS
}

const TRANS = 'https://upload.wikimedia.org/wikipedia/commons/transcoded/';
const video = (path: string, author: string, license: string): DemoVideo => {
  const file = path.split('/').pop()!;
  return {
    webm: `${TRANS}${path}/${file}.480p.vp9.webm`,
    mp4: `${TRANS}${path}/${file}.360p.mpeg4.mov`,
    author,
    license,
    sourceUrl: `https://commons.wikimedia.org/wiki/File:${file}`,
  };
};

export const DEMO_VIDEOS = {
  f80: video('1/1a/2025-08-15_Monterey_Ferrari_F80.webm', 'VictorDoesCars', 'CC BY 4.0'),
  targa: video('a/a8/Two_Porsche_911_Targa_driving_as_viewed_from_FPV_drone.webm', 'SE FPV', 'CC BY 3.0'),
  gt3: video('5/5f/Porsche_991_GT3_development_mules_in_L%27Ametlla_del_Vall%C3%A9s.ogv', 'Dani Dominguez Mas', 'CC BY 3.0'),
};
