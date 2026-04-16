import axios from "axios";
import { LoanStatus, TransactionStatus, TransactionType } from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { HttpError } from "../utils/http-error";

type AccessTokenCache = {
  token: string;
  expiresAt: number;
} | null;

let accessTokenCache: AccessTokenCache = null;

const daraja = axios.create({
  baseURL: env.MPESA_BASE_URL,
  timeout: 20000
});

const getAccessToken = async () => {
  if (accessTokenCache && accessTokenCache.expiresAt > Date.now()) {
    return accessTokenCache.token;
  }

  const auth = Buffer.from(`${env.MPESA_CONSUMER_KEY}:${env.MPESA_CONSUMER_SECRET}`).toString("base64");
  const response = await daraja.get("/oauth/v1/generate?grant_type=client_credentials", {
    headers: {
      Authorization: `Basic ${auth}`
    }
  });

  accessTokenCache = {
    token: response.data.access_token,
    expiresAt: Date.now() + (Number(response.data.expires_in) - 60) * 1000
  };

  return accessTokenCache.token;
};

const buildTimestamp = () => {
  const now = new Date();
  const YYYY = now.getFullYear();
  const MM = String(now.getMonth() + 1).padStart(2, "0");
  const DD = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${YYYY}${MM}${DD}${hh}${mm}${ss}`;
};

export const initiateStkPush = async ({
  phoneNumber,
  amount,
  accountReference,
  transactionDesc,
  transactionId
}: {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
  transactionId: string;
}) => {
  const token = await getAccessToken();
  const timestamp = buildTimestamp();
  const password = Buffer.from(`${env.MPESA_SHORTCODE}${env.MPESA_PASSKEY}${timestamp}`).toString("base64");

  const response = await daraja.post(
    "/mpesa/stkpush/v1/processrequest",
    {
      BusinessShortCode: env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(amount),
      PartyA: phoneNumber,
      PartyB: env.MPESA_SHORTCODE,
      PhoneNumber: phoneNumber,
      CallBackURL: env.MPESA_CALLBACK_URL,
      AccountReference: accountReference,
      TransactionDesc: transactionDesc
    },
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      providerReference: response.data.CheckoutRequestID,
      metadata: {
        merchantRequestId: response.data.MerchantRequestID,
        checkoutRequestId: response.data.CheckoutRequestID,
        responseCode: response.data.ResponseCode,
        responseDescription: response.data.ResponseDescription,
        attempts: 1
      }
    }
  });

  return response.data;
};

export const queryStkPushStatus = async (checkoutRequestId: string) => {
  const token = await getAccessToken();
  const timestamp = buildTimestamp();
  const password = Buffer.from(`${env.MPESA_SHORTCODE}${env.MPESA_PASSKEY}${timestamp}`).toString("base64");

  const response = await daraja.post(
    "/mpesa/stkpushquery/v1/query",
    {
      BusinessShortCode: env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId
    },
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  return response.data;
};

export const sendB2CPayout = async ({
  phoneNumber,
  amount,
  remarks,
  occasion,
  transactionId
}: {
  phoneNumber: string;
  amount: number;
  remarks: string;
  occasion: string;
  transactionId: string;
}) => {
  const token = await getAccessToken();

  const response = await daraja.post(
    "/mpesa/b2c/v1/paymentrequest",
    {
      InitiatorName: env.MPESA_INITIATOR_NAME,
      SecurityCredential: env.MPESA_SECURITY_CREDENTIAL,
      CommandID: env.MPESA_B2C_COMMAND,
      Amount: Math.round(amount),
      PartyA: env.MPESA_SHORTCODE,
      PartyB: phoneNumber,
      Remarks: remarks,
      QueueTimeOutURL: env.MPESA_TIMEOUT_URL,
      ResultURL: env.MPESA_RESULT_URL,
      Occasion: occasion
    },
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      providerReference: response.data.ConversationID,
      metadata: {
        conversationId: response.data.ConversationID,
        originatorConversationId: response.data.OriginatorConversationID,
        responseCode: response.data.ResponseCode,
        responseDescription: response.data.ResponseDescription,
        attempts: 1
      }
    }
  });

  return response.data;
};

const itemMap = (items: Array<{ Name: string; Value?: string | number }>) =>
  items.reduce<Record<string, string | number | undefined>>((acc, item) => {
    acc[item.Name] = item.Value;
    return acc;
  }, {});

export const processStkCallback = async (payload: any) => {
  const stk = payload?.Body?.stkCallback;
  if (!stk?.CheckoutRequestID) {
    throw new HttpError(400, "Invalid STK callback");
  }

  const transaction = await prisma.transaction.findFirst({
    where: {
      providerReference: stk.CheckoutRequestID
    }
  });

  if (!transaction) {
    throw new HttpError(404, "Transaction not found");
  }

  const metadataItems = itemMap(stk.CallbackMetadata?.Item ?? []);
  const succeeded = Number(stk.ResultCode) === 0;

  if (
    (transaction.status === TransactionStatus.SUCCESS && succeeded) ||
    (transaction.status === TransactionStatus.FAILED && !succeeded)
  ) {
    return transaction.id;
  }

  await prisma.$transaction(async (tx) => {
    await tx.transaction.update({
      where: { id: transaction.id },
      data: {
        status: succeeded ? TransactionStatus.SUCCESS : TransactionStatus.FAILED,
        metadata: {
          ...(typeof transaction.metadata === "object" && transaction.metadata ? transaction.metadata : {}),
          callbackResultCode: stk.ResultCode,
          callbackResultDesc: stk.ResultDesc,
          receiptNumber: metadataItems.MpesaReceiptNumber,
          callbackPhoneNumber: metadataItems.PhoneNumber,
          callbackAmount: metadataItems.Amount
        }
      }
    });

    if (!succeeded) {
      return;
    }

    if (transaction.type === TransactionType.VERIFICATION_HOLD) {
      await tx.wallet.update({
        where: { userId: transaction.userId },
        data: {
          balance: { increment: transaction.amount },
          heldAmount: { increment: transaction.amount },
          refundableAmount: { increment: transaction.amount }
        }
      });
    }

    if (transaction.type === TransactionType.REPAYMENT && transaction.loanApplicationId) {
      const application = await tx.loanApplication.findUniqueOrThrow({
        where: { id: transaction.loanApplicationId }
      });

      const repaymentAggregate = await tx.transaction.aggregate({
        _sum: { amount: true },
        where: {
          loanApplicationId: application.id,
          type: TransactionType.REPAYMENT,
          status: TransactionStatus.SUCCESS
        }
      });

      const totalRepaid = Number(repaymentAggregate._sum.amount ?? 0);
      if (totalRepaid >= Number(application.repaymentTotal ?? 0)) {
        await tx.loanApplication.update({
          where: { id: application.id },
          data: {
            status: LoanStatus.REPAID,
            repaidAt: new Date()
          }
        });
      }
    }
  });

  return transaction.id;
};

export const processB2CResult = async (payload: any) => {
  const result = payload?.Result;
  const conversationId = result?.ConversationID;
  if (!conversationId) {
    throw new HttpError(400, "Invalid B2C callback");
  }

  const transaction = await prisma.transaction.findFirst({
    where: { providerReference: conversationId }
  });

  if (!transaction) {
    throw new HttpError(404, "Transaction not found");
  }

  const resultParameters = itemMap(result.ResultParameters?.ResultParameter ?? []);
  const succeeded = Number(result.ResultCode) === 0;

  if (
    (transaction.status === TransactionStatus.SUCCESS && succeeded) ||
    (transaction.status === TransactionStatus.FAILED && !succeeded)
  ) {
    return transaction.id;
  }

  await prisma.$transaction(async (tx) => {
    await tx.transaction.update({
      where: { id: transaction.id },
      data: {
        status: succeeded ? TransactionStatus.SUCCESS : TransactionStatus.FAILED,
        metadata: {
          ...(typeof transaction.metadata === "object" && transaction.metadata ? transaction.metadata : {}),
          resultType: result.ResultType,
          resultCode: result.ResultCode,
          resultDesc: result.ResultDesc,
          receiverPartyPublicName: resultParameters.ReceiverPartyPublicName,
          transactionReceipt: resultParameters.TransactionReceipt
        }
      }
    });

    if (succeeded && transaction.type === TransactionType.LOAN_DISBURSEMENT && transaction.loanApplicationId) {
      await tx.loanApplication.update({
        where: { id: transaction.loanApplicationId },
        data: {
          status: LoanStatus.DISBURSED,
          disbursedAt: new Date()
        }
      });
    }

    if (!succeeded && transaction.type === TransactionType.WALLET_WITHDRAWAL) {
      await tx.wallet.update({
        where: { userId: transaction.userId },
        data: {
          balance: { increment: transaction.amount },
          refundableAmount: { increment: transaction.amount }
        }
      });
    }

    if (!succeeded && transaction.type === TransactionType.LOAN_DISBURSEMENT && transaction.loanApplicationId) {
      await tx.loanApplication.update({
        where: { id: transaction.loanApplicationId },
        data: {
          status: LoanStatus.APPROVED
        }
      });
    }
  });

  return transaction.id;
};

export const processB2CTimeout = async (payload: any) => {
  const conversationId = payload?.OriginatorConversationID ?? payload?.Result?.OriginatorConversationID;
  if (!conversationId) {
    throw new HttpError(400, "Invalid B2C timeout callback");
  }

  const transaction = await prisma.transaction.findFirst({
    where: {
      metadata: {
        path: ["originatorConversationId"],
        equals: conversationId
      }
    }
  });

  if (!transaction) {
    throw new HttpError(404, "Transaction not found");
  }

  if (transaction.status !== TransactionStatus.PENDING) {
    return transaction.id;
  }

  await prisma.transaction.update({
    where: { id: transaction.id },
    data: {
      status: TransactionStatus.MANUAL_REVIEW,
      metadata: {
        ...(typeof transaction.metadata === "object" && transaction.metadata ? transaction.metadata : {}),
        timeoutPayload: payload
      }
    }
  });

  return transaction.id;
};

export const reconcilePendingTransactions = async () => {
  const pendingTransactions = await prisma.transaction.findMany({
    where: {
      status: TransactionStatus.PENDING,
      createdAt: {
        lte: new Date(Date.now() - 60_000)
      }
    }
  });

  for (const transaction of pendingTransactions) {
    if (
      transaction.type === TransactionType.VERIFICATION_HOLD ||
      transaction.type === TransactionType.REPAYMENT
    ) {
      const checkoutRequestId =
        typeof transaction.metadata === "object" && transaction.metadata
          ? (transaction.metadata as Record<string, string>).checkoutRequestId
          : undefined;

      if (!checkoutRequestId) {
        continue;
      }

      try {
        const status = await queryStkPushStatus(checkoutRequestId);
        if (status.ResultCode === "0" || status.ResultCode === 0) {
          await prisma.$transaction(async (tx) => {
            await tx.transaction.update({
              where: { id: transaction.id },
              data: {
                status: TransactionStatus.SUCCESS,
                metadata: {
                  ...(transaction.metadata as Record<string, unknown> | null),
                  reconciliation: status
                }
              }
            });

            if (transaction.type === TransactionType.VERIFICATION_HOLD) {
              await tx.wallet.update({
                where: { userId: transaction.userId },
                data: {
                  balance: { increment: transaction.amount },
                  heldAmount: { increment: transaction.amount },
                  refundableAmount: { increment: transaction.amount }
                }
              });
            }

            if (transaction.type === TransactionType.REPAYMENT && transaction.loanApplicationId) {
              const application = await tx.loanApplication.findUnique({
                where: { id: transaction.loanApplicationId }
              });

              if (application) {
                const repaymentAggregate = await tx.transaction.aggregate({
                  _sum: { amount: true },
                  where: {
                    loanApplicationId: application.id,
                    type: TransactionType.REPAYMENT,
                    status: TransactionStatus.SUCCESS
                  }
                });

                const totalRepaid = Number(repaymentAggregate._sum.amount ?? 0);
                if (totalRepaid >= Number(application.repaymentTotal ?? 0)) {
                  await tx.loanApplication.update({
                    where: { id: application.id },
                    data: {
                      status: LoanStatus.REPAID,
                      repaidAt: new Date()
                    }
                  });
                }
              }
            }
          });
        } else if (String(status.ResultCode) !== "1032") {
          await prisma.transaction.update({
            where: { id: transaction.id },
            data: {
              status: TransactionStatus.FAILED,
              metadata: {
                ...(transaction.metadata as Record<string, unknown> | null),
                reconciliation: status
              }
            }
          });
        }
      } catch {
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: TransactionStatus.MANUAL_REVIEW
          }
        });
      }
    }
  }
};
