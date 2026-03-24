/**
 * Jest Configuration
 * 
 * Purpose: Configure Jest for unit testing with Next.js and TypeScript
 * Key Settings:
 * - TypeScript support via ts-jest
 * - React Testing Library setup
 * - Path aliases matching tsconfig.json
 * - Coverage thresholds for code quality
 */

const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  /**
   * Setup Files
   * Run setup files before tests
   */
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  /**
   * Test Environment
   * Use jsdom for DOM testing
   */
  testEnvironment: 'jest-environment-jsdom',

  /**
   * Module Name Mapper
   * Map path aliases to actual paths
   */
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@platform/(.*)$': '<rootDir>/src/platform/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
  },

  /**
   * Test Match Patterns
   * Specify which files are test files
   */
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{spec,test}.{js,jsx,ts,tsx}',
  ],

  /**
   * Coverage Configuration
   * Define coverage thresholds and paths
   */
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
  ],

  /**
   * Coverage Thresholds
   * Minimum coverage requirements
   */
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  /**
   * Transform Files
   * Use ts-jest for TypeScript files
   */
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
      },
    }],
  },

  /**
   * Module File Extensions
   * Specify file extensions to resolve
   */
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  /**
   * Test Timeout
   * Set timeout for tests (in milliseconds)
   */
  testTimeout: 10000,

  /**
   * Verbose Output
   * Show detailed test results
   */
  verbose: true,
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
