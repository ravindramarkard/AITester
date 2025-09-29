const fs = require('fs');
const path = require('path');

// Fix .tags() usage in a file
function fixTagsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;
    
    // Pattern to match various .tags() usage patterns
    const tagsPatterns = [
      /(\}\s*)\)\.tags\([^)]*\);/g,  // }).tags('tag1', 'tag2');
      /(\s*)\)\.tags\([^)]*\);/g,    // ).tags('tag1', 'tag2');
      /test\([^)]*\)\.tags\([^)]*\);/g  // test('name').tags('tag1', 'tag2');
    ];
    
    let tagsFound = false;
    let extractedTags = [];
    
    // Process all tag patterns
    tagsPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        tagsFound = true;
        hasChanges = true;
        matches.forEach(match => {
          // Extract tags from the match
          const tagsMatch = match.match(/\.tags\(([^)]*)\)/);
          if (tagsMatch && tagsMatch[1]) {
            // Parse the tags (remove quotes and split by comma)
            const tagsString = tagsMatch[1];
            const tags = tagsString.split(',').map(tag => tag.trim().replace(/['"]/g, ''));
            extractedTags.push(...tags);
            
            // Remove the .tags() call
            if (match.includes('}).tags(')) {
              content = content.replace(match, match.replace(/\.tags\([^)]*\)/, ''));
            } else if (match.includes(').tags(')) {
              content = content.replace(match, match.replace(/\.tags\([^)]*\)/, ''));
            } else {
              content = content.replace(match, match.replace(/\.tags\([^)]*\);/, ';'));
            }
          }
        });
      }
    });
    
    // If tags were found, add them to beforeEach
    if (tagsFound && extractedTags.length > 0) {
      // Remove duplicates
      const uniqueTags = [...new Set(extractedTags)];
      const tagCalls = uniqueTags.map(tag => `    await allure.tag('${tag}');`).join('\n');
      
      // Check if there's already a beforeEach hook
      const beforeEachMatch = content.match(/(test\.beforeEach\(async \([^)]*\) => \{[\s\S]*?)([\s]*\}\);)/);
      
      if (beforeEachMatch) {
        // Add tags to existing beforeEach (before the closing })
        const beforeContent = beforeEachMatch[1];
        const afterContent = beforeEachMatch[2];
        
        // Check if allure tags already exist
        if (!beforeContent.includes('await allure.tag(')) {
          content = content.replace(beforeEachMatch[0], `${beforeContent}\n${tagCalls}\n${afterContent}`);
        }
      } else {
        // Add a new beforeEach hook after the describe line
        const describePattern = /(test\.describe\([^{]*\{[\s\n]*)/;
        if (content.match(describePattern)) {
          content = content.replace(describePattern, 
            `$1  test.beforeEach(async ({ page }) => {\n${tagCalls}\n  });\n\n`
          );
        }
      }
    }
    
    // Clean up any remaining .tags() calls
    content = content.replace(/\.tags\([^)]*\);?/g, '');
    
    // Clean up any double semicolons or empty lines
    content = content.replace(/;;/g, ';');
    content = content.replace(/\n\n\n+/g, '\n\n');
    
    // Write back if there were changes
    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed .tags() usage in: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing file ${filePath}:`, error.message);
    return false;
  }
}

// Recursively find all .spec.ts files
function findSpecFiles(dir) {
  const specFiles = [];
  
  function traverse(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          traverse(fullPath);
        } else if (item.endsWith('.spec.ts')) {
          specFiles.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`Warning: Cannot read directory ${currentDir}:`, error.message);
    }
  }
  
  traverse(dir);
  return specFiles;
}

// Main execution
function main() {
  const testsDir = path.join(__dirname, '../../tests');
  
  console.log('🔍 Searching for .spec.ts files with .tags() usage...');
  
  const specFiles = findSpecFiles(testsDir);
  console.log(`📁 Found ${specFiles.length} spec files`);
  
  let fixedCount = 0;
  let filesWithTags = [];
  
  // First, find files with .tags() usage
  specFiles.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('.tags(')) {
        filesWithTags.push(filePath);
      }
    } catch (error) {
      console.warn(`Warning: Cannot read file ${filePath}:`, error.message);
    }
  });
  
  console.log(`🔧 Found ${filesWithTags.length} files with .tags() usage`);
  
  // Fix each file with .tags() usage
  filesWithTags.forEach(filePath => {
    if (fixTagsInFile(filePath)) {
      fixedCount++;
    }
  });
  
  console.log(`\n✅ Fixed .tags() usage in ${fixedCount} files`);
  
  if (fixedCount === 0) {
    console.log('🎉 No files needed fixing - all .tags() usage is already clean!');
  } else {
    console.log('🎉 All .tags() usage has been fixed and converted to proper allure tagging!');
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { fixTagsInFile, findSpecFiles }; 