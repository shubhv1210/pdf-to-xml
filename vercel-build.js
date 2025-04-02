const { execSync } = require('child_process');

console.log('Running vercel-build.js...');

// Log the environment variables that will be used by Prisma
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set ✓' : 'Not Set ✗');
console.log('DIRECT_URL:', process.env.DIRECT_URL ? 'Set ✓' : 'Not Set ✗');

// Clean any potentially cached Prisma artifacts
try {
  console.log('Cleaning Prisma cache...');
  execSync('rm -rf node_modules/.prisma');
} catch (error) {
  console.log('Error clearing Prisma cache:', error.message);
}

// Generate Prisma client
try {
  console.log('Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
} catch (error) {
  console.error('Error generating Prisma client:', error.message);
  process.exit(1);
}

// Build the Next.js application
try {
  console.log('Building Next.js application...');
  execSync('next build', { stdio: 'inherit' });
} catch (error) {
  console.error('Error building Next.js application:', error.message);
  process.exit(1);
}

console.log('Build process completed successfully!'); 