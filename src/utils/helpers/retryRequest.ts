import { DocumentData, DocumentSnapshot } from "firebase/firestore";

const AUTH_CHECK_RETRIES = 5;
const RETRY_DELAY_MS = 250;

export async function retryDocumentRequest<T extends DocumentData>(
  fn: () => Promise<DocumentSnapshot<T, T>>,
  retries: number = AUTH_CHECK_RETRIES,
  initialDelayMs: number = RETRY_DELAY_MS
): Promise<DocumentSnapshot<T, T>> {
  let delayMs = initialDelayMs;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fn();

      if (!res.exists()) {
        throw new Error();
      }

      return res;
    } catch (error) {
      if (i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs = delayMs * 2;
      }
    }
  }

  throw new Error(`Failed after ${retries} retries, please, refresh page`);
}
