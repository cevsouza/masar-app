/**
 * Busca latitude e longitude baseada no CEP e endereço (número).
 * Utiliza o ViaCEP para obter o logradouro e cidade, e em seguida
 * o OpenStreetMap Nominatim para geocodificação.
 */
export async function fetchCoordinates(
  cep: string,
  endereco: string
): Promise<{ latitude: number | null; longitude: number | null }> {
  try {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return { latitude: null, longitude: null };

    // 1. Buscar logradouro e localidade via ViaCEP
    const viaCepRes = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`, {
      next: { revalidate: 86400 } // cache de 24 horas para CEPs
    });
    if (!viaCepRes.ok) throw new Error('Falha ao consultar ViaCEP');
    const viaCepData = await viaCepRes.json();
    if (viaCepData.erro) throw new Error('CEP não encontrado na base do ViaCEP');

    const logradouro = viaCepData.logradouro || '';
    const localidade = viaCepData.localidade || '';
    const uf = viaCepData.uf || '';

    // Extrair o número do imóvel do campo de endereço (ex: "Rua X, 123" ou "123")
    const numberMatch = endereco ? endereco.match(/\b\d+\b/) : null;
    const houseNumber = numberMatch ? numberMatch[0] : '';

    const headers = {
      'User-Agent': 'Masar-ERP-App/1.0 (cevsouza@masar.com)'
    };

    // 2. Tentar geocodificar com Logradouro + Número + CEP + Cidade + Estado
    let nominatimUrl = `https://nominatim.openstreetmap.org/search?street=${encodeURIComponent(logradouro + ' ' + houseNumber)}&city=${encodeURIComponent(localidade)}&state=${encodeURIComponent(uf)}&postalcode=${cleanCep}&country=Brazil&format=json&limit=1`;
    let nominatimRes = await fetch(nominatimUrl, { headers });
    let nominatimData = await nominatimRes.json();

    // Fallback 1: Buscar por Logradouro (sem número) + CEP + Cidade
    if (!nominatimData || nominatimData.length === 0) {
      nominatimUrl = `https://nominatim.openstreetmap.org/search?street=${encodeURIComponent(logradouro)}&city=${encodeURIComponent(localidade)}&state=${encodeURIComponent(uf)}&postalcode=${cleanCep}&country=Brazil&format=json&limit=1`;
      nominatimRes = await fetch(nominatimUrl, { headers });
      nominatimData = await nominatimRes.json();
    }

    // Fallback 2: Buscar pelo centróide do CEP apenas
    if (!nominatimData || nominatimData.length === 0) {
      nominatimUrl = `https://nominatim.openstreetmap.org/search?postalcode=${cleanCep}&country=Brazil&format=json&limit=1`;
      nominatimRes = await fetch(nominatimUrl, { headers });
      nominatimData = await nominatimRes.json();
    }

    // Retorna as coordenadas caso encontradas
    if (nominatimData && nominatimData.length > 0) {
      return {
        latitude: parseFloat(nominatimData[0].lat),
        longitude: parseFloat(nominatimData[0].lon)
      };
    }
  } catch (error) {
    console.error('Erro ao buscar coordenadas automaticamente:', error);
  }
  return { latitude: null, longitude: null };
}
