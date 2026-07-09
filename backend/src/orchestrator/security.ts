const ALLOWED_NUMBERS = [
    "6281234567890",
  ];
  
  const requestLog = new Map<string, number[]>();
  
  export function isAuthorized(
    waNumber: string
  ): boolean {
    return ALLOWED_NUMBERS.includes(waNumber);
  }
  
  export function checkRateLimit(
    waNumber: string,
    maxPerMinute = 5
  ): boolean {
    const now = Date.now();
  
    const timestamps =
      (requestLog.get(waNumber) || [])
        .filter((t) => now - t < 60000);
  
    if (timestamps.length >= maxPerMinute) {
      return false;
    }
  
    timestamps.push(now);
    requestLog.set(waNumber, timestamps);
  
    return true;
  }