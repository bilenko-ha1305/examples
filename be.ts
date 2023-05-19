import {Injectable} from '@nestjs/common';
import {HttpService} from '@nestjs/axios';
import {DataBaseRepository} from '../../repository/database'
import {SUCCESS} from '../../common/consts';

@Injectable()
export class PaymentService {
    constructor(
        private readonly httpService: HttpService,
        private readonly dataBase: DataBaseRepository,
    ) {
    }

    async processPayment(paymentData: any): Promise<any> {
        const url = process.env.PAYMENT_URL;
        const merchantId = process.env.PAYMENT_MERCHANT_ID;
        const secretKey = process.env.PAYMENT_SECRET_KEY;

        const requestData = {
            paymentAmount: paymentData.amount,
            currency: paymentData.currency,
            paymentDescription: paymentData.description,
            merchantId,
            secretKey,
            ...paymentData.additionalData,
        };

        try {
            const response = await this.httpService.post(url, requestData).toPromise();
            const responseData = response.data;

            if (responseData.status === SUCCESS) {

                await this.dataBase.paymentsStatus.create({
                    id: responseData.transactionId,
                    amount: paymentData.amount,
                    currency: paymentData.currency,
                    description: paymentData.description,
                    status: true
                });

                const graphqlQuery = `
                    mutation {
                        createPaymentTransaction(transactionId: "${responseData.transactionId}", amount: ${paymentData.amount}) {
                            id
                            status
                        }
                    }
                `;

                await this.httpService.post(process.env.PAYMENT_SERVICE_URL, {query: graphqlQuery});

                return {
                    success: true,
                    transactionId: responseData.transactionId,
                };
            } else {
                await this.dataBase.paymentsStatus.create({
                    id: responseData.transactionId,
                    amount: paymentData.amount,
                    currency: paymentData.currency,
                    description: paymentData.description,
                    status: false
                });
                throw new Error(`Payment processing failed | ${paymentData}`);
            }
        } catch (error) {
            throw new Error(`Payment processing failed | ${paymentData}`);
        }
    }
}
