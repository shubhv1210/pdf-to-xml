const { execSync } = require('child_process');

console.log('Running vercel-build.js...');

// Log the environment variables
console.log('NODE_ENV:', process.env.NODE_ENV || 'Not Set ✗');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Set ✓' : 'Not Set ✗');
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL ? 'Set ✓' : 'Not Set ✗');
console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? 'Set ✓' : 'Not Set ✗');

// If MongoDB URI isn't set, warn about it
if (!process.env.MONGODB_URI) {
  console.warn('WARNING: MONGODB_URI environment variable is not set. Database operations may fail.');
  
  // Check if .env file exists and try to load it
  try {
    require('dotenv').config();
    console.log('Loaded .env file, MONGODB_URI now:', process.env.MONGODB_URI ? 'Set ✓' : 'Still not set ✗');
  } catch (error) {
    console.log('Could not load dotenv:', error.message);
  }
}

// Generate Prisma client if needed
try {
  console.log('Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
} catch (error) {
  console.error('Error generating Prisma client:', error.message);
  // Continue despite error as we primarily use MongoDB
  console.log('Continuing build despite Prisma errors as MongoDB is the primary database.');
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