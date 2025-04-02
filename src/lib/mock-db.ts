// This is a fallback mock implementation for when the real database is unavailable

// In-memory data structures
const users = new Map();
const conversions = new Map();

// Create a mock implementation that mimics PrismaClient
export class MockPrismaClient {
  user = {
    findUnique: async ({ where }: { where: { email?: string; id?: string } }) => {
      if (where.email) {
        return users.get(where.email) || null;
      }
      if (where.id) {
        for (const user of users.values()) {
          if (user.id === where.id) {
            return user;
          }
        }
      }
      return null;
    },
    create: async ({ data }: { data: any }) => {
      const user = {
        id: data.id || `user-${Date.now()}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      users.set(data.email, user);
      return user;
    },
    update: async ({ where, data }: { where: { email?: string; id?: string }, data: any }) => {
      let user;
      if (where.email) {
        user = users.get(where.email);
      } else if (where.id) {
        for (const u of users.values()) {
          if (u.id === where.id) {
            user = u;
            break;
          }
        }
      }
      
      if (!user) {
        throw new Error('User not found');
      }
      
      const updatedUser = { ...user, ...data, updatedAt: new Date() };
      users.set(updatedUser.email, updatedUser);
      return updatedUser;
    }
  };
  
  conversion = {
    findMany: async ({ where, orderBy, skip, take }: any) => {
      let results = Array.from(conversions.values()).filter(conv => {
        if (!where) return true;
        
        // Match userId if specified
        if (where.userId && conv.userId !== where.userId) {
          return false;
        }
        
        // Other filters can be added here
        
        return true;
      });
      
      // Apply ordering if specified
      if (orderBy) {
        const [field, order] = Object.entries(orderBy)[0];
        results.sort((a: any, b: any) => {
          if (order === 'asc') {
            return a[field] > b[field] ? 1 : -1;
          } else {
            return a[field] < b[field] ? 1 : -1;
          }
        });
      }
      
      // Apply pagination
      if (skip) {
        results = results.slice(skip);
      }
      if (take) {
        results = results.slice(0, take);
      }
      
      return results;
    },
    findUnique: async ({ where }: { where: { id: string } }) => {
      return conversions.get(where.id) || null;
    },
    create: async ({ data }: { data: any }) => {
      const conversion = {
        id: data.id || `conversion-${Date.now()}`,
        ...data,
        createdAt: new Date()
      };
      conversions.set(conversion.id, conversion);
      return conversion;
    },
    update: async ({ where, data }: { where: { id: string }, data: any }) => {
      const conversion = conversions.get(where.id);
      if (!conversion) {
        throw new Error('Conversion not found');
      }
      
      const updatedConversion = { ...conversion, ...data };
      conversions.set(where.id, updatedConversion);
      return updatedConversion;
    },
    count: async ({ where }: any) => {
      let count = 0;
      for (const conv of conversions.values()) {
        if (!where) {
          count++;
          continue;
        }
        
        // Match userId if specified
        if (where.userId && conv.userId !== where.userId) {
          continue;
        }
        
        // Other filters can be added here
        
        count++;
      }
      return count;
    }
  };
  
  $connect() {
    return Promise.resolve();
  }
  
  $disconnect() {
    return Promise.resolve();
  }
}

// Export an instance of the mock client for use as a fallback
export const mockPrisma = new MockPrismaClient(); 