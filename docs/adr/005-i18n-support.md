# ADR: i18n Support

## Title
Implementing Internationalization (i18n) Support with Spanish (es-DO) as Default

## Status
Proposed

## Context
The Barbasys management system currently uses hardcoded English strings in both the frontend and backend. To support a wider audience, specifically in the Dominican Republic, the system needs to support multiple languages, starting with Spanish (es-DO) as the default.

## Decision
We will implement i18n support using the following strategy:
1. **Frontend**:
   - Use `i18next` and `react-i18next` for translation management.
   - Use `i18next-browser-languagedetector` to handle user language preferences.
   - Store translation files in `frontend/src/locales/{lang}.json`.
   - Default language will be set to `es-DO`.
2. **Backend**:
   - For user-facing error messages, we will eventually implement a similar `i18next` setup or a simple mapping, but the initial focus will be on the frontend UI.
3. **Shared**:
   - Any shared constants or enums that are user-facing will be considered for translation.

## Consequences
- **Positive**: Enables multi-language support, improves user experience for non-English speakers, and standardizes how UI strings are managed.
- **Negative**: Requires extra effort to wrap all UI strings in translation functions and maintain translation files.

## Alternatives Considered
- **React Intl**: A popular alternative, but `i18next` is more flexible and has a larger ecosystem for various platforms.
- **Hardcoded Spanish**: Not scalable if we want to support other languages later.
