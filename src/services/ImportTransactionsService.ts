import { getRepository, In, getCustomRepository } from 'typeorm';

import path from 'path';
import csv from 'csv-parse';
import fs from 'fs';
import uploadConfig from '../config/upload';

import TransactionsRepository from '../repositories/TransactionsRepository';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface Request {
  fileName: string;
}

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute({ fileName }: Request): Promise<Transaction[]> {
    const categoriesRepository = getRepository(Category);
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const importName = path.join(uploadConfig.directory, fileName);

    const contactsReadStream = fs.createReadStream(importName);

    const parses = csv({
      // delimiter: ';',
      from_line: 2,
    });

    const parseCSV = contactsReadStream.pipe(parses);

    const transactions: CSVTransaction[] = [];
    const categories: string[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !type || !value || !category) return;

      categories.push(category);
      transactions.push({ title, type, value, category });
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    const existentCategories = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });

    const existenCategoriesTitles = existentCategories.map(
      (category: Category) => category.title,
    );

    const addCategories = categories
      .filter(category => !existenCategoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoriesRepository.create(
      addCategories.map(title => ({
        title,
      })),
    );

    await categoriesRepository.save(newCategories);

    const finalCategories = [...newCategories, ...existentCategories];

    const createdTransactions = transactionsRepository.create(
      transactions.map(transac => ({
        title: transac.title,
        type: transac.type,
        value: transac.value,
        category: finalCategories.find(cat => cat.title === transac.category),
      })),
    );

    await transactionsRepository.save(createdTransactions);

    await fs.promises.unlink(importName);

    return createdTransactions;
  }
}

export default ImportTransactionsService;
