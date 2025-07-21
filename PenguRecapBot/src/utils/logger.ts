export class Logger {
  static info(message: string, ...args: any[]) {
    console.log(`ℹ️  ${new Date().toISOString()} - ${message}`, ...args);
  }
  
  static error(message: string, error?: any) {
    console.error(`❌ ${new Date().toISOString()} - ${message}`, error);
  }
  
  static success(message: string, ...args: any[]) {
    console.log(`✅ ${new Date().toISOString()} - ${message}`, ...args);
  }
  
  static warn(message: string, ...args: any[]) {
    console.warn(`⚠️  ${new Date().toISOString()} - ${message}`, ...args);
  }
  
  static debug(message: string, ...args: any[]) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🐛 ${new Date().toISOString()} - ${message}`, ...args);
    }
  }
}
