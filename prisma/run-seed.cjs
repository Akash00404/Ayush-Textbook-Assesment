const path = require('path');

// Load env for Prisma
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// Register ts-node for TypeScript execution using backend's ts-node
require(path.resolve(__dirname, '../backend/node_modules/ts-node')).register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    moduleResolution: 'node',
  },
});

// Run the actual seed script
require('./seed.ts');


