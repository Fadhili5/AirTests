declare namespace Express {
  export interface Request {
    auth?: {
      userId: string;
      telegramId: string;
      role: "CUSTOMER" | "ADMIN" | "SUPPORT";
      tokenId: string;
    };
  }
}

