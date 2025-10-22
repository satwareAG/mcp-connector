import js from '@eslint/js';
import securityPlugin from 'eslint-plugin-security';
import prettierConfig from 'eslint-config-prettier';

export default [
  // Apply to all JavaScript files
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Node.js globals
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        // Node.js timers
        setTimeout: 'readonly',
        setInterval: 'readonly',
        setImmediate: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        clearImmediate: 'readonly',
        // Browser/Node globals
        URL: 'readonly',
        // Jest globals for test files
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
      },
    },
    plugins: {
      security: securityPlugin,
    },
    rules: {
      // ESLint recommended rules
      ...js.configs.recommended.rules,

      // Code Quality Standards from Rules/code-quality-standards.md

      // Line length: ≤100 characters
      'max-len': [
        'error',
        {
          code: 100,
          ignoreUrls: true,
          ignoreStrings: false,
          ignoreTemplateLiterals: false,
          ignoreRegExpLiterals: true,
        },
      ],

      // Formatting (enforced by ESLint, formatted by Prettier)
      indent: ['error', 2, { SwitchCase: 1 }],
      quotes: ['error', 'single', { avoidEscape: true }],
      semi: ['error', 'always'],

      // Modern JS (ES2020+) - MANDATORY
      'prefer-const': 'error',
      'no-var': 'error',
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],

      // Optional chaining (?.) and nullish coalescing (??) are encouraged
      // but not enforceable via ESLint rules for JavaScript-only projects
      // (these rules only exist in @typescript-eslint/eslint-plugin)

      // Logging - NO console.* allowed
      'no-console': 'error',

      // Constants - NO magic numbers
      'no-magic-numbers': [
        'error',
        {
          ignore: [-1, 0, 1],
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
          enforceConst: true,
        },
      ],

      // Cognitive Complexity - MANDATORY ≤10
      complexity: ['warn', 10],

      // Security rules from eslint-plugin-security
      ...securityPlugin.configs.recommended.rules,

      // Additional best practices
      'no-implicit-coercion': 'error',
      'prefer-template': 'error',
      'prefer-arrow-callback': 'error',
      'arrow-body-style': ['error', 'as-needed'],
      'object-shorthand': ['error', 'always'],
      'no-useless-concat': 'error',
      'prefer-destructuring': [
        'error',
        {
          array: false,
          object: true,
        },
      ],
    },
  },

  // Test files - slightly relaxed rules
  {
    files: ['**/*.test.js', '**/*.spec.js', 'tests/**/*.js'],
    rules: {
      // Allow magic numbers in tests (test data)
      'no-magic-numbers': 'off',
      // Allow longer lines in test descriptions
      'max-len': [
        'error',
        {
          code: 120,
          ignoreUrls: true,
          ignoreStrings: true,
        },
      ],
    },
  },

  // Configuration files - allow numeric configuration values
  {
    files: ['eslint.config.js', 'jest.config.js', '*.config.js'],
    rules: {
      // Configuration files legitimately contain numeric configuration values
      // (indent size, complexity thresholds, timeouts, etc.)
      'no-magic-numbers': 'off',
    },
  },

  // Prettier integration - must be last to override formatting rules
  prettierConfig,
];
