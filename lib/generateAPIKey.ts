import crypto from "crypto"

export const generateAPIKey = (): string => {
    const rand = crypto.randomBytes(32).toString("hex");
    return `sk_live_${rand}` 
};