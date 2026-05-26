import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

// Mocked client to prevent breaking existing references
const createMockProxy = (name = 'base44') => {
  return new Proxy({}, {
    get: (target, prop) => {
      if (prop === 'then') return undefined;
      return createMockProxy(`${name}.${String(prop)}`);
    },
    apply: (target, thisArg, argumentsList) => {
      console.warn(`Calling ${name}(${argumentsList.map(a => JSON.stringify(a)).join(', ')}) - This is a mock implementation.`);
      return Promise.resolve({ data: [], length: 0 });
    }
  });
};

// Create a client with authentication required
export const base44 = {
  auth: {
    me: () => Promise.resolve({ full_name: 'Usuário Local', role: 'admin' }),
    logout: () => console.log('Mock logout'),
    redirectToLogin: () => console.log('Mock redirect to login'),
  },
  entities: createMockProxy('base44.entities'),
  functions: {
    invoke: (name, params) => {
      console.warn(`Invoking function ${name} with params:`, params);
      return Promise.resolve({ data: {} });
    }
  },
  integrations: createMockProxy('base44.integrations'),
};
