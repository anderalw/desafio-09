import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer not found');
    }

    const productsIds = products.map(product => {
      return {
        id: product.id,
      };
    });
    const allProducts = await this.productsRepository.findAllById(productsIds);

    if (allProducts.length !== products.length) {
      throw new AppError('Product is missing');
    }

    const productsList = allProducts.map(product => {
      const productList = products.find(p => p.id === product.id);

      if (!productList) {
        throw new AppError('Product not found');
      }
      if (product.quantity < productList.quantity) {
        throw new AppError('Product out fo strock');
      }
      return {
        product_id: product.id,
        price: product.price,
        quantity: productList.quantity || 0,
      };
    });
    const dataOrder = {
      customer,
      products: productsList,
    };
    await this.productsRepository.updateQuantity(products);
    const order = await this.ordersRepository.create(dataOrder);
    return order;
  }
}

export default CreateOrderService;
