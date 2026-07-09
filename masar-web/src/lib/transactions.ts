import { db } from '@/lib/db';

/**
 * Registra uma transação financeira no banco de dados e atualiza o saldo da primeira conta bancária disponível.
 */
export async function registerFinancialTransaction(
  amount: number,
  type: 'CREDITO' | 'DEBITO',
  description: string
) {
  try {
    if (amount <= 0) return;

    // 1. Localizar ou criar uma conta bancária padrão
    let account = await db.contaBancaria.findFirst();
    if (!account) {
      account = await db.contaBancaria.create({
        data: {
          nome: 'Caixa Geral Central',
          saldoAtual: 0
        }
      });
    }

    // 2. Criar o registro de transação bancária
    await db.transacaoBancaria.create({
      data: {
        contaBancariaId: account.id,
        data: new Date(),
        valor: amount,
        descricao: description,
        tipo: type,
        conciliado: true
      }
    });

    // 3. Atualizar o saldo da conta
    const multiplier = type === 'CREDITO' ? 1 : -1;
    await db.contaBancaria.update({
      where: { id: account.id },
      data: {
        saldoAtual: {
          increment: amount * multiplier
        }
      }
    });
  } catch (error) {
    console.error('Erro ao registrar transação financeira automática:', error);
  }
}
