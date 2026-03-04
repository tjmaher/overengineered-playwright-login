# Development Notes

## Formatting Requirements

⚠️ **CRITICAL**: Always run `npm run format` after making code changes!

The CI/CD pipeline enforces Prettier formatting and will fail if code is not properly formatted. After editing any TypeScript files:

1. Make your code changes
2. **Run `npm run format`** to auto-fix formatting
3. Optionally run `npm run format:check` to verify
4. Commit and push

### Why This Matters

- The GitHub Actions workflow includes a formatting check step
- Formatting violations will cause CI/CD pipeline failures
- Prettier ensures consistent code style across the project
- Saves time by avoiding failed builds due to formatting issues

### Quick Commands

```bash
# After editing code
npm run format

# Check if formatting is correct (optional)
npm run format:check

# Full validation (includes formatting, type checking, and tests)
npm run validate
```

### Recent Issues Resolved

- Empty page title validation in secure area tests (the-internet.herokuapp.com returns empty titles)
- Formatting violations after code modifications
