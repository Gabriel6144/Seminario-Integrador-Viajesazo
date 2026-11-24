import type { Categoria } from '@/types/api'

export interface CategoriaDescubrir {
  region: string
  descripcion: string
  gradiente: string
}

/**
 * Copy editorial de la vista `/descubrir`.
 *
 * La base solo guarda la categoría de cada propuesta; estos textos y regiones son fijos y se
 * inspiran en el prototipo de Stitch. Si cambia una categoría del backend, TypeScript obliga a
 * completarla acá.
 */
export const CATEGORIAS_DESCUBRIR: Record<Categoria, CategoriaDescubrir> = {
  NATURALEZA: {
    region: 'Altas Cumbres · Valle de Calamuchita',
    descripcion:
      'Valles imponentes, microclimas únicos y formaciones geológicas milenarias. Descubrí la majestuosidad de la Quebrada del Condorito, el ascenso a Los Gigantes y la tranquilidad alpina de La Cumbrecita entre pinares y cascadas cristalinas.',
    gradiente: 'linear-gradient(135deg, #0c3b2e 0%, #0b1117 70%)',
  },
  GASTRONOMIA: {
    region: 'Colonia Caroya · Calamuchita · Traslasierra',
    descripcion:
      'Herencia de inmigrantes y tradiciones criollas: saboreá los célebres salames de Colonia Caroya con sello de origen, los chivitos serranos a las brasas y la vibrante Ruta de los Vinos de Altura con cepas premiadas internacionalmente.',
    gradiente: 'linear-gradient(135deg, #4a1d12 0%, #0b1117 70%)',
  },
  CULTURA: {
    region: 'Córdoba Capital · Traslasierra',
    descripcion:
      'Epicentro intelectual y artístico del interior argentino. Recorré el legado arquitectónico de la Manzana Jesuítica, los talleres de cerámica negra en Traslasierra y el circuito de museos de bellas artes junto al tradicional arroyo La Cañada.',
    gradiente: 'linear-gradient(135deg, #2b1a4a 0%, #0b1117 70%)',
  },
  HISTORIA: {
    region: 'Valle de Punilla · Sierras Chicas',
    descripcion:
      'Cuatro siglos de relatos grabados en piedra: las históricas Estancias Jesuíticas de Santa Catalina y Alta Gracia del siglo XVII, el Camino Real al Alto Perú y las centenarias capillas coloniales protegidas entre quebradas.',
    gradiente: 'linear-gradient(135deg, #3d2c14 0%, #0b1117 70%)',
  },
  AVENTURA: {
    region: 'La Cumbre · Champaquí · Carlos Paz',
    descripcion:
      'Adrenalina pura en escenarios naturales sin igual: vuelos en parapente sobre el abismo de Cuchi Corral, travesías náuticas en kayak por el Dique San Roque y la mítica cumbre del Cerro Champaquí a 2.790 metros.',
    gradiente: 'linear-gradient(135deg, #0b2f4a 0%, #0b1117 70%)',
  },
  VIDA_NOCTURNA: {
    region: 'Villa Carlos Paz · Barrio Güemes',
    descripcion:
      'La energía de las noches cordobesas: las terrazas y coctelería de autor en las galerías de Barrio Güemes, teatros y discotecas icónicas a orillas del lago en Carlos Paz, y la algarabía de las noches cálidas de verano.',
    gradiente: 'linear-gradient(135deg, #2b0f3a 0%, #0b1117 70%)',
  },
  MUSICA: {
    region: 'Cosquín · Jesús María · Santa María',
    descripcion:
      'Tierra de compases legendarios y festivales masivos: la mística de las 9 lunas de folklore en la Plaza Próspero Molina de Cosquín, el coraje de Jesús María y la mayor fiesta de rock de Sudamérica entre las sierras.',
    gradiente: 'linear-gradient(135deg, #3a0f2b 0%, #0b1117 70%)',
  },
  COMPRAS: {
    region: 'Villa General Belgrano · Sierras Chicas',
    descripcion:
      'Diseño de autor, orfebrería y texturas serranas: recorré el encanto centroeuropeo de los comercios de madera y tejidos en Villa General Belgrano, los paseos de artesanos de Traslasierra y las tiendas de diseño de la capital.',
    gradiente: 'linear-gradient(135deg, #0f2f3a 0%, #0b1117 70%)',
  },
  FAMILIAR_Y_RELAX: {
    region: 'Miramar Ansenuza · Mina Clavero · Punilla',
    descripcion:
      'Remansos de paz y naturaleza para toda la familia: aguas termales y flamencos rosados en el inmenso Mar de Ansenuza, balnearios serenos con playitas de arena dorada en Mina Clavero y el clásico descanso junto a arroyos sombreados.',
    gradiente: 'linear-gradient(135deg, #123a33 0%, #0b1117 70%)',
  },
}
