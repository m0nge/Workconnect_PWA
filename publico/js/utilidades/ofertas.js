export function filtrarOfertas(ofertas, termino) {
  const normalizar = (valor) => String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const busqueda = normalizar(termino);
  return ofertas.filter((oferta) => normalizar([oferta.titulo, oferta.sector, oferta.municipio, oferta.departamento, oferta.modalidad, oferta.tipo_contrato, oferta.estado].join(' ')).includes(busqueda));
}
