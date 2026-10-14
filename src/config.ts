/**
 * Konfigurasi situs PT. Cipta Mas Jaya (single source of truth identitas & kontak).
 * Data diambil dari halaman kontak WordPress lama (ciptamasjaya.co.id/contact/).
 */
export const site = {
  name: 'PT. Cipta Mas Jaya',
  shortName: 'Cipta Mas Jaya',
  tagline: 'Mitra PJK3 Riksa Uji Anda',
  description:
    'PT. Cipta Mas Jaya (PJK3) menyediakan jasa Riksa Uji dan inspeksi K3: pesawat angkat dan angkut, pesawat uap dan bejana tekan, proteksi kebakaran, instalasi listrik, penyalur petir, serta elevator dan eskalator.',
  domain: 'ciptamasjaya.co.id',
  address: {
    street: 'Jl. Raya Taktakan Ruko Golden Paradise No. 7',
    locality: 'Kota Serang',
    region: 'Banten',
    postalCode: '42116',
    country: 'ID',
  },
  phone: '+62 254-4074039',
  phoneMobile: '+62 856-8258-841',
  whatsapp: '628568258841', // format internasional tanpa '+'
  email: 'info@ciptamasjaya.co.id',
  openingHours: {
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    opens: '09:00',
    closes: '18:00',
  },
  geo: {
    latitude: -6.1181,
    longitude: 106.1542,
  },
  priceRange: 'Sesuai konsultasi',
} as const;

/** Env aktif: `.lan` untuk lokal, produksi via env `SITE_URL` saat build. */
export const siteUrl = (path = '/', absolute = false) => {
  const base = absolute ? (process.env.SITE_URL || 'http://astro-ciptamasjaya.lan').replace(/\/$/, '') : '';
  const pathNorm = path.startsWith('/') ? path : `/${path}`;
  return `${base}${pathNorm}`;
};

export interface ServiceEntry {
  /** id STABIL — jangan diubah dan jangan dipakai ulang. */
  id: number;
  /** Path halaman layanan tanpa slash, mis. `layanan/riksa-uji-lift-dan-eskalator`. */
  path: string;
  /** Slug terakhir (anchor di block service-directory). */
  slug: string;
  title: string;
  badge: string;
  description: string;
  features: string[];
  cta: string;
  target: string;
  /** href relatif lengkap dengan slash, mis. `/layanan/riksa-uji-boiler-2/`. */
  href: string;
}

const svc = (
  id: number,
  path: string,
  title: string,
  description: string,
  features: string[],
  target: string,
  badge: string,
): ServiceEntry => ({
  id,
  path,
  slug: path.split('/').pop() ?? path,
  title,
  badge,
  description,
  features,
  cta: 'Lihat Detail Layanan',
  target,
  href: `/${path}/`,
});

/** Daftar layanan inti (untuk navigasi, footer, home, dan block layanan). */
export const services: ServiceEntry[] = [
  svc(
    1,
    'layanan/riksa-uji-pesawat-angkat-dan-angkut',
    'Riksa Uji Pesawat Angkat dan Angkut',
    'Inspeksi dan pengujian crane, overhead crane, tower crane, gantry crane, serta alat angkat dan angkut lainnya sesuai peraturan Kemnaker RI.',
    ['Crane & overhead crane', 'Tower & gantry crane', 'Forklift & mobile crane', 'Load test & NDT'],
    'Perusahaan manufaktur, konstruksi, pelabuhan, dan logistik yang mengoperasikan alat angkat dan angkut.',
    'Pesawat Angkat & Angkut',
  ),
  svc(
    2,
    'layanan/riksa-uji-pesawat-uap-dan-bejana-tekan',
    'Riksa Uji Pesawat Uap dan Bejana Tekan',
    'Inspeksi boiler, pesawat uap, bejana tekan, dan tangki timbun untuk memastikan keamanan operasional di bawah tekanan.',
    ['Boiler & steam generator', 'Bejana tekan (pressure vessel)', 'Tangki timbun', 'Ultrasonic testing (UT)'],
    'Industri yang menggunakan steam, udara tekan, atau menyimpan cairan/gas bertekanan.',
    'Pesawat Uap & Bejana Tekan',
  ),
  svc(
    3,
    'layanan/riksa-uji-pesawat-tenaga-dan-produksi',
    'Riksa Uji Pesawat Tenaga dan Produksi',
    'Inspeksi mesin pembangkit tenaga dan mesin produksi agar tetap andal, aman, dan sesuai ketentuan keselamatan kerja.',
    ['Genset & motor bakar', 'Kompresor & pompa', 'Mesin produksi', 'Peralatan bantu'],
    'Pabrik dan fasilitas industri dengan mesin tenaga dan produksi aktif.',
    'Pesawat Tenaga & Produksi',
  ),
  svc(
    4,
    'layanan/riksa-uji-instalasi-listrik-dan-penyalur-petir',
    'Riksa Uji Instalasi Listrik dan Penyalur Petir',
    'Pengujian instalasi listrik dan sistem penyalur petir untuk mencegah kebakaran, sengatan listrik, dan kerusakan peralatan.',
    ['Pengukuran pembumian', 'Instalasi kabel & panel', 'Proteksi petir (LPATS)', 'Uji resistensi isolasi'],
    'Gedung kantor, pabrik, fasilitas publik, dan kawasan industri.',
    'Instalasi Listrik & Petir',
  ),
  svc(
    5,
    'layanan/riksa-uji-instalasi-proteksi-kebakaran',
    'Riksa Uji Sarana Proteksi Kebakaran',
    'Pemeriksaan hydrant, alarm kebakaran, dan sarana proteksi aktif lainnya agar siaga saat keadaan darurat.',
    ['Hydrant (indoor & outdoor)', 'Alarm & deteksi kebakaran', 'APAR & sprinkler', 'Fire pump test'],
    'Bangunan industri, komersial, dan gudang penyimpanan barang berbahaya.',
    'Proteksi Kebakaran',
  ),
  svc(
    6,
    'layanan/riksa-uji-lift-dan-eskalator',
    'Riksa Uji Lift dan Eskalator',
    'Inspeksi elevator, eskalator, dan lift penumpang/barang untuk menjamin keselamatan pengguna dan kepatuhan regulasi.',
    ['Lift penumpang & barang', 'Eskalator & moving walk', 'Uji keselamatan lengkap', 'Sertifikat laik operasi'],
    'Mal, rumah sakit, hotel, apartemen, dan gedung perkantoran.',
    'Lift & Eskalator',
  ),
];

export function getServiceById(id: number | undefined | null): ServiceEntry | null {
  if (!id) return null;
  return services.find((s) => s.id === id) ?? null;
}

/** Daftar id layanan (untuk validasi block-schema). */
export const serviceIds = services.map((s) => s.id);
