const { build } = require('esbuild');
const fs = require('fs');
const path = require('path');

async function testBuild(format, isProduction) {
  const env = isProduction ? 'production' : 'development';
  const outfile = path.join(__dirname, `../dist/test-${env}-bundle.${format === 'esm' ? 'mjs' : 'js'}`);
  
  // Build with appropriate settings
  await build({
    entryPoints: [path.join(__dirname, '../src/index.ts')],
    bundle: true,
    format,
    outfile,
    minify: isProduction,
    define: {
      'process.env.NODE_ENV': `"${env}"`
    }
  });

  const bundle = fs.readFileSync(outfile, 'utf8');
  
  // Check for developer toolbar implementation code
  // Note: 'initializeDeveloperToolbar' method name will always exist on the class,
  // but the actual toolbar UI code should be eliminated in production
  const hasToolbarImplementation = bundle.includes('schematic-developer-toolbar') || 
                                   bundle.includes('Schematic Dev Toolbar') ||
                                   bundle.includes('createDOM');
  
  // Check if process.env.NODE_ENV was replaced
  const hasUnreplacedEnv = /process\.env\.NODE_ENV/.test(bundle);
  
  // Clean up
  fs.unlinkSync(outfile);
  
  return {
    format,
    env,
    hasToolbarCode: hasToolbarImplementation,
    hasUnreplacedEnv,
    isProduction
  };
}

async function runTests() {
  const builds = await Promise.all([
    // Production builds
    testBuild('esm', true),
    testBuild('cjs', true),
    // Development builds
    testBuild('esm', false),
    testBuild('cjs', false)
  ]);
  
  const results = builds.map(result => {
    const { format, env, hasToolbarCode, hasUnreplacedEnv, isProduction } = result;
    
    console.log(`\nTesting ${format.toUpperCase()} format (${env})...`);
    
    if (isProduction) {
      // Production build tests
      if (hasUnreplacedEnv) {
        console.error(`❌ FAIL (${format}, ${env}): process.env.NODE_ENV was not replaced in production build`);
        return false;
      }
      
      if (hasToolbarCode) {
        // Toolbar implementation code is still present - this is a failure
        console.error(`❌ FAIL (${format}, ${env}): Developer toolbar implementation code is still present in production build`);
        return false;
      } else {
        // No toolbar implementation code - ideal case (fully eliminated by dead code elimination)
        console.log(`✅ PASS (${format}, ${env}): Developer toolbar implementation code fully eliminated`);
        return true;
      }
    } else {
      // Development build tests
      if (!hasToolbarCode) {
        console.error(`❌ FAIL (${format}, ${env}): Developer toolbar code not found in development build`);
        return false;
      }
      
      // In dev, the code should be present and accessible
      // process.env.NODE_ENV might or might not be replaced depending on build tool
      console.log(`✅ PASS (${format}, ${env}): Developer toolbar code is present and accessible`);
      return true;
    }
  });
  
  if (results.every(r => r)) {
    console.log('\n✅ All build tests passed');
    process.exit(0);
  } else {
    console.error('\n❌ Some build tests failed');
    process.exit(1);
  }
}

runTests().catch(console.error);
