import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
export default defineConfig([
  ...nextVitals, ...nextTypescript,
  globalIgnores(['.next/**', '.npm-cache/**', 'next-env.d.ts']),
  // The original preview remains frozen for the later data migration.
  { files: ['src/app/dashboard/workspace.tsx'], rules: { 'react-hooks/set-state-in-effect': 'off', 'react-hooks/exhaustive-deps': 'off' } },
  { files: ['src/components/company-logos.tsx', 'src/components/footer.tsx', 'src/components/login-form.tsx'], rules: { '@next/next/no-img-element': 'off' } },
]);
