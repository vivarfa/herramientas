# **App Name**: BILUZ Web Tools

## Core Features:

- Core Replication: Replicates the 'Herramientas Contables BILUZ' Chrome extension as a web application with identical functionality, calculations, UI, and UX.
- Persistent UI: Implements a tabbed interface with persistent visual settings (active tab, theme) stored in localStorage.
- Utility Functions: Includes utility functions for debouncing inputs, copying to clipboard, showing toast notifications, and exporting reports to PDF and Excel.
- Accounting Tools: Features a suite of accounting tools including IGV calculator, Detracciones calculator, Gratificaciones calculator, CTS calculator, Cronograma de Vencimientos, Renta simulator, Asientos generator, Vacaciones truncas calculator, Regimenes tributarios simulator, Multas simulator, Intereses moratorios calculator, Liquidacion de beneficios sociales calculator, Número a letras conversor and Accesos rápidos.
- Intelligent Assistant: Integrates a chatbot, B-IA, powered by a proxy API at https://biluz-ai-proxy.vercel.app/api/chat, limited to 100 daily queries, to answer accounting questions. This chatbot uses a tool which reasons if, when or how to include some element in its response, based on accounting best-practices.
- Data Query: Allows users to query RUC/DNI data via the API https://biluz-apiocr.vercel.app/api/query-api, subject to monthly usage limits.
- User Configuration: Offers a configuration modal with theme selection, tab reordering/visibility toggles, support links, donation option, and a factory reset (excluding API usage counters).

## Style Guidelines:

- Primary color: Deep blue (#3F51B5), inspired by classic accounting practices, which is easily combined with many colors and provides appropriate contrast on both light and dark background schemes.
- Background color: Very light blue (#E8EAF6), providing a calm and professional backdrop.
- Accent color: Purple (#7E57C2), to bring an energetic but still calm feel to key actions and information displays.
- Body and headline font: 'PT Sans', a humanist sans-serif providing both a modern look and approachability, suitable for both headlines and body text.
- Use a consistent set of simple, professional icons to represent tools and actions.
- Maintain a clean and organized layout, with clear separation between tools and sections.
- Employ subtle animations and transitions to enhance user experience.