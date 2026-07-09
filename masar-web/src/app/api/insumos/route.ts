import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logMutation } from '@/lib/audit';
import { UnidadeMedida, CategoriaInsumo } from '@prisma/client';

// GET: Listar todos os insumos cadastrados
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoria = searchParams.get('categoria');

    const filter: any = {};
    if (categoria) {
      filter.categoria = categoria as CategoriaInsumo;
    }

    const insumos = await db.insumoPadrao.findMany({
      where: filter,
      orderBy: { nome: 'asc' }
    });

    return NextResponse.json(insumos);
  } catch (error: any) {
    console.error('Erro ao buscar insumos:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}

// POST: Criar novo insumo padrão ou popular catálogo padrão MCMV
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nome, unidadeMedida, categoria, populateDefault } = body;

    // Se solicitado, popula o catálogo básico do Minha Casa Minha Vida
    if (populateDefault) {
      const defaultInsumos = [
        // MATERIAIS
        { nome: 'Cimento CP-II (Saco 50kg)', unidadeMedida: 'SC' as UnidadeMedida, categoria: 'MATERIAL' as CategoriaInsumo },
        { nome: 'Aço CA-50 10.0mm (Vara 12m)', unidadeMedida: 'KG' as UnidadeMedida, categoria: 'MATERIAL' as CategoriaInsumo },
        { nome: 'Aço CA-50 8.0mm (Vara 12m)', unidadeMedida: 'KG' as UnidadeMedida, categoria: 'MATERIAL' as CategoriaInsumo },
        { nome: 'Areia Média Lavada', unidadeMedida: 'M3' as UnidadeMedida, categoria: 'MATERIAL' as CategoriaInsumo },
        { nome: 'Pedra Brita nº 1', unidadeMedida: 'M3' as UnidadeMedida, categoria: 'MATERIAL' as CategoriaInsumo },
        { nome: 'Tijolo Baiano 8 Furos (9x19x19cm)', unidadeMedida: 'SC' as UnidadeMedida, categoria: 'MATERIAL' as CategoriaInsumo },
        { nome: 'Bloco de Concreto Estrutural (14x19x39cm)', unidadeMedida: 'SC' as UnidadeMedida, categoria: 'MATERIAL' as CategoriaInsumo },
        { nome: 'Argamassa AC-II (Saco 20kg)', unidadeMedida: 'SC' as UnidadeMedida, categoria: 'MATERIAL' as CategoriaInsumo },
        { nome: 'Concreto Usinado Fck 25 MPa', unidadeMedida: 'M3' as UnidadeMedida, categoria: 'MATERIAL' as CategoriaInsumo },
        { nome: 'Piso Cerâmico PEI-4', unidadeMedida: 'M3' as UnidadeMedida, categoria: 'MATERIAL' as CategoriaInsumo },
        { nome: 'Azulejo de Parede 30x40', unidadeMedida: 'M3' as UnidadeMedida, categoria: 'MATERIAL' as CategoriaInsumo },
        { nome: 'Argamassa de Assentamento', unidadeMedida: 'KG' as UnidadeMedida, categoria: 'MATERIAL' as CategoriaInsumo },
        { nome: 'Tubo Esgoto PVC 100mm (Barra 6m)', unidadeMedida: 'KG' as UnidadeMedida, categoria: 'MATERIAL' as CategoriaInsumo },
        { nome: 'Tubo Água Fria PVC 25mm (Barra 6m)', unidadeMedida: 'KG' as UnidadeMedida, categoria: 'MATERIAL' as CategoriaInsumo },
        { nome: 'Fio Cobre Flexível 2.5mm² (Rolo 100m)', unidadeMedida: 'KG' as UnidadeMedida, categoria: 'MATERIAL' as CategoriaInsumo },
        { nome: 'Eletroduto Corrugado 3/4 (Bobina 50m)', unidadeMedida: 'KG' as UnidadeMedida, categoria: 'MATERIAL' as CategoriaInsumo },
        { nome: 'Telha Cerâmica Portuguesa', unidadeMedida: 'SC' as UnidadeMedida, categoria: 'MATERIAL' as CategoriaInsumo },
        { nome: 'Telha de Fibrocimento 6mm', unidadeMedida: 'SC' as UnidadeMedida, categoria: 'MATERIAL' as CategoriaInsumo },
        { nome: 'Porta de Madeira Interna Completa', unidadeMedida: 'SC' as UnidadeMedida, categoria: 'MATERIAL' as CategoriaInsumo },
        { nome: 'Janela de Alumínio de Correr 1.20x1.00m', unidadeMedida: 'SC' as UnidadeMedida, categoria: 'MATERIAL' as CategoriaInsumo },
        { nome: 'Tinta Acrílica Látex Branca (Lata 18L)', unidadeMedida: 'SC' as UnidadeMedida, categoria: 'MATERIAL' as CategoriaInsumo },
        { nome: 'Caixa d\'Água Polietileno 500L', unidadeMedida: 'SC' as UnidadeMedida, categoria: 'MATERIAL' as CategoriaInsumo },
        { nome: 'Argamassa de Rejunte', unidadeMedida: 'KG' as UnidadeMedida, categoria: 'MATERIAL' as CategoriaInsumo },
        { nome: 'Gesso Liso para Gesso Acartonado', unidadeMedida: 'KG' as UnidadeMedida, categoria: 'MATERIAL' as CategoriaInsumo },

        // MÃO DE OBRA
        { nome: 'Mão de Obra de Terraplenagem', unidadeMedida: 'EMPREITADA' as UnidadeMedida, categoria: 'MAO_DE_OBRA' as CategoriaInsumo },
        { nome: 'Mão de Obra de Fundação/Base', unidadeMedida: 'EMPREITADA' as UnidadeMedida, categoria: 'MAO_DE_OBRA' as CategoriaInsumo },
        { nome: 'Mão de Obra de Alvenaria e Estrutura', unidadeMedida: 'EMPREITADA' as UnidadeMedida, categoria: 'MAO_DE_OBRA' as CategoriaInsumo },
        { nome: 'Mão de Obra de Cobertura/Telhado', unidadeMedida: 'EMPREITADA' as UnidadeMedida, categoria: 'MAO_DE_OBRA' as CategoriaInsumo },
        { nome: 'Mão de Obra de Instalações Elétricas', unidadeMedida: 'EMPREITADA' as UnidadeMedida, categoria: 'MAO_DE_OBRA' as CategoriaInsumo },
        { nome: 'Mão de Obra de Instalações Hidrossanitárias', unidadeMedida: 'EMPREITADA' as UnidadeMedida, categoria: 'MAO_DE_OBRA' as CategoriaInsumo },
        { nome: 'Mão de Obra de Acabamentos e Revestimentos', unidadeMedida: 'EMPREITADA' as UnidadeMedida, categoria: 'MAO_DE_OBRA' as CategoriaInsumo },
        { nome: 'Mão de Obra de Pintura e Textura', unidadeMedida: 'EMPREITADA' as UnidadeMedida, categoria: 'MAO_DE_OBRA' as CategoriaInsumo },
        { nome: 'Mão de Obra de Limpeza de Obra', unidadeMedida: 'EMPREITADA' as UnidadeMedida, categoria: 'MAO_DE_OBRA' as CategoriaInsumo },

        // EQUIPAMENTOS
        { nome: 'Hora de Retroescavadeira JCB', unidadeMedida: 'HORA' as UnidadeMedida, categoria: 'EQUIPAMENTO' as CategoriaInsumo },
        { nome: 'Locação de Betoneira 400L (Mensal)', unidadeMedida: 'EMPREITADA' as UnidadeMedida, categoria: 'EQUIPAMENTO' as CategoriaInsumo },
        { nome: 'Locação de Andaime Metálico (Mensal)', unidadeMedida: 'EMPREITADA' as UnidadeMedida, categoria: 'EQUIPAMENTO' as CategoriaInsumo },
        { nome: 'Locação de Container para Ferramentas (Mensal)', unidadeMedida: 'EMPREITADA' as UnidadeMedida, categoria: 'EQUIPAMENTO' as CategoriaInsumo },
        { nome: 'Locação de Banheiro Químico (Mensal)', unidadeMedida: 'EMPREITADA' as UnidadeMedida, categoria: 'EQUIPAMENTO' as CategoriaInsumo },

        // TAXAS
        { nome: 'Alvará de Construção (Prefeitura)', unidadeMedida: 'EMPREITADA' as UnidadeMedida, categoria: 'TAXA' as CategoriaInsumo },
        { nome: 'Taxa de Registro e Emolumentos de Cartório', unidadeMedida: 'EMPREITADA' as UnidadeMedida, categoria: 'TAXA' as CategoriaInsumo },
        { nome: 'CREA/ART de Execução de Obra', unidadeMedida: 'EMPREITADA' as UnidadeMedida, categoria: 'TAXA' as CategoriaInsumo },
        { nome: 'Seguro de Engenharia (Obra)', unidadeMedida: 'EMPREITADA' as UnidadeMedida, categoria: 'TAXA' as CategoriaInsumo }
      ];

      let createdCount = 0;
      for (const item of defaultInsumos) {
        const exists = await db.insumoPadrao.findFirst({
          where: { nome: item.nome }
        });
        if (!exists) {
          await db.insumoPadrao.create({
            data: item
          });
          createdCount++;
        }
      }

      return NextResponse.json({ 
        success: true, 
        message: `Catálogo padrão MCMV carregado com sucesso. ${createdCount} novos itens adicionados.` 
      }, { status: 201 });
    }

    if (!nome || !unidadeMedida || !categoria) {
      return NextResponse.json(
        { error: 'Nome, unidade de medida e categoria são obrigatórios.' },
        { status: 400 }
      );
    }

    // Verificar duplicidade por nome
    const duplicate = await db.insumoPadrao.findUnique({
      where: { nome }
    });

    if (duplicate) {
      return NextResponse.json(
        { error: 'Já existe um insumo cadastrado com este nome.' },
        { status: 400 }
      );
    }

    const insumo = await db.insumoPadrao.create({
      data: {
        nome,
        unidadeMedida: unidadeMedida as UnidadeMedida,
        categoria: categoria as CategoriaInsumo
      }
    });

    await logMutation({
      usuarioId: 'SYSTEM',
      usuarioNome: 'Sistema',
      acao: 'CREATE_INSUMO',
      tabela: 'InsumoPadrao',
      registroId: insumo.id,
      valoresNovos: insumo
    });

    return NextResponse.json(insumo, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao cadastrar insumo:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}

// DELETE: Excluir insumo padrão se não houver vínculos ativos
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do insumo é obrigatório' }, { status: 400 });
    }

    // Validar dependências no banco de dados para evitar erros de integridade referencial
    const itemOrcamentoCount = await db.itemOrcamento.count({ where: { insumoId: id } });
    const apropriacaoCount = await db.apropriacaoCusto.count({ where: { insumoId: id } });
    const solicitacaoCount = await db.solicitacaoCompra.count({ where: { insumoId: id } });

    if (itemOrcamentoCount > 0 || apropriacaoCount > 0 || solicitacaoCount > 0) {
      return NextResponse.json({ 
        error: 'Este insumo não pode ser excluído pois já possui orçamentos, custos apropriados ou solicitações de compra ativas vinculadas.' 
      }, { status: 400 });
    }

    const insumo = await db.insumoPadrao.delete({
      where: { id }
    });

    await logMutation({
      usuarioId: 'SYSTEM',
      usuarioNome: 'Sistema',
      acao: 'DELETE_INSUMO',
      tabela: 'InsumoPadrao',
      registroId: id,
      valoresAntigos: insumo
    });

    return NextResponse.json({ success: true, message: 'Insumo excluído com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao excluir insumo:', error);
    return NextResponse.json({ error: 'Erro interno do servidor', message: error.message }, { status: 500 });
  }
}
