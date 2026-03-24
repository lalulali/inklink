/**
 * Tailwind CSS Configuration
 * 
 * Purpose: Configure Tailwind CSS with Next.js and custom theme
 * Key Settings:
 * - Content paths for template scanning
 * - Custom theme extensions for mind map visualization
 * - Plugin configuration for additional utilities
 */

import type { Config } from 'tailwindcss';

const config: Config = {
  /**
   * Content Configuration
   * Specify which files Tailwind should scan for class names
   */
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/ui/**/*.{js,ts,jsx,tsx,mdx}',
  ],

  /**
   * Theme Configuration
   * Extend default Tailwind theme with custom values
   */
  theme: {
    extend: {
      /**
       * Custom Colors
       * Define color palette for mind map visualization
       */
      colors: {
        // Mind map branch colors (primary palette)
        branch: {
          red: '#FF6B6B',
          orange: '#FFA500',
          yellow: '#FFD93D',
          green: '#6BCB77',
          blue: '#4D96FF',
          purple: '#9D84B7',
          pink: '#FF85C0',
          teal: '#00D9FF',
          lime: '#A8E6CF',
          indigo: '#6366F1',
        },
      },

      /**
       * Custom Spacing
       * Define spacing values for mind map layout
       */
      spacing: {
        'node-sm': '8px',
        'node-md': '12px',
        'node-lg': '16px',
        'level-sm': '40px',
        'level-md': '80px',
        'level-lg': '150px',
      },

      /**
       * Custom Font Sizes
       * Define font sizes for mind map nodes
       */
      fontSize: {
        'node-xs': ['12px', { lineHeight: '1.4' }],
        'node-sm': ['14px', { lineHeight: '1.5' }],
        'node-md': ['16px', { lineHeight: '1.6' }],
        'node-lg': ['18px', { lineHeight: '1.7' }],
      },

      /**
       * Custom Shadows
       * Define shadows for depth and visual hierarchy
       */
      boxShadow: {
        'node-sm': '0 1px 3px rgba(0, 0, 0, 0.1)',
        'node-md': '0 4px 6px rgba(0, 0, 0, 0.1)',
        'node-lg': '0 10px 15px rgba(0, 0, 0, 0.1)',
        'node-focus': '0 0 0 3px rgba(79, 70, 229, 0.1)',
      },

      /**
       * Custom Animations
       * Define animations for smooth transitions
       */
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-in-out',
        'pulse-subtle': 'pulseSubtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },

      /**
       * Custom Keyframes
       * Define keyframe animations
       */
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
      },

      /**
       * Custom Transitions
       * Define transition durations and timing functions
       */
      transitionDuration: {
        'fast': '150ms',
        'normal': '300ms',
        'slow': '500ms',
      },

      /**
       * Custom Border Radius
       * Define border radius for nodes and components
       */
      borderRadius: {
        'node': '4px',
        'node-lg': '6px',
      },

      /**
       * Z-Index Scale
       * Define z-index values for layering
       */
      zIndex: {
        'canvas': '10',
        'minimap': '20',
        'toolbar': '30',
        'modal': '40',
        'tooltip': '50',
      },
    },
  },

  /**
   * Plugins Configuration
   * Add additional Tailwind plugins
   */
  plugins: [],

  /**
   * Dark Mode Configuration
   * Configure dark mode support
   */
  darkMode: 'class',
};

export default config;
