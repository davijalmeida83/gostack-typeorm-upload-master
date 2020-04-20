import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find();

    const totalIncome = transactions
      .filter(({ type }) => type === 'income')
      .reduce((sum, record) => sum + Number(record.value), 0);

    const totalOutcome = transactions
      .filter(({ type }) => type === 'outcome')
      .reduce((sum, record) => sum + Number(record.value), 0);

    const balance = {
      income: totalIncome,
      outcome: totalOutcome,
      total: totalIncome - totalOutcome,
    };
    return balance;
  }
}

export default TransactionsRepository;
