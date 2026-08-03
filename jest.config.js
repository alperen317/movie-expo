module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  // supabase/functions runs on Deno, not Node/Jest -- its tests import from a
  // `https://` specifier and call `Deno.test`, both unresolvable here.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/supabase/functions/'],
};
